import { NextRequest, NextResponse } from 'next/server'
import { createOrUpdateUser, getUserByWallet, updateUserProfile, deleteUser } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { generateRandomNickname, generateRandomBio, generateFullNameFromNickname } from '@/lib/usernames'
import { referralLogger, apiLogger } from '@/lib/utils/logger'
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js'
import bs58 from 'bs58'
import fs from 'fs'
import path from 'path'

// Отключаем кеширование для этого route
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Приватный ключ кошелька для отправки регистрационной награды
const SENDER_PRIVATE_KEY = '2GTLeohbNhpfdenQEXjan7erw391b7qCwErzzR6bQJ1NczosBLj7gJ6DpabgMJB6v5Vxt2Hu2R5JgbL2FFfd1a4u'

// RPC endpoint
const RPC_ENDPOINT = 'https://rpc.helius.xyz/?api-key=29fc7f17-2a08-48da-9c14-88780e1fedd0'

// In-memory блокировка для предотвращения одновременных транзакций на один кошелек
const pendingRewards = new Map<string, { timestamp: number, inProgress: boolean }>()

// Telegram уведомление о новом пользователе
const TG_BOT_TOKEN = '8304644010:AAF2W5q8I7cfNz2NXgvASRtna-J2ATi6pvY'
const TG_ADMIN_CHAT_ID = '5879286931'

async function sendTelegramNotification(message: string): Promise<void> {
  console.log('[TG Notification] 📤 Preparing to send Telegram notification...')
  console.log('[TG Notification] Bot Token:', TG_BOT_TOKEN ? `${TG_BOT_TOKEN.slice(0, 10)}...` : 'NOT SET')
  console.log('[TG Notification] Chat ID:', TG_ADMIN_CHAT_ID)
  console.log('[TG Notification] Message length:', message.length)
  
  try {
    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`
    console.log('[TG Notification] Request URL:', url.replace(TG_BOT_TOKEN, '***TOKEN***'))
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    })
    
    console.log('[TG Notification] Response status:', response.status)
    console.log('[TG Notification] Response statusText:', response.statusText)
    
    const responseData = await response.json()
    console.log('[TG Notification] Response data:', JSON.stringify(responseData, null, 2))
    
    if (!response.ok) {
      console.error('[TG Notification] ❌ Telegram API returned error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      })
    } else {
      console.log('[TG Notification] ✅ Notification sent successfully!')
    }
  } catch (error) {
    console.error('[TG Notification] ❌ Failed to send:', error)
    if (error instanceof Error) {
      console.error('[TG Notification] Error message:', error.message)
      console.error('[TG Notification] Error stack:', error.stack)
    }
  }
}

// Функция для проверки существующих транзакций в сети
async function checkExistingRewardTransaction(
  connection: Connection, 
  senderPubkey: PublicKey, 
  recipientPubkey: PublicKey
): Promise<boolean> {
  try {
    console.log('[registration] Checking existing reward transactions...')
    
    // Получаем последние подтвержденные транзакции отправителя
    const signatures = await connection.getSignaturesForAddress(senderPubkey, {
      limit: 50,
    })

    // Проверяем каждую транзакцию
    for (const signatureInfo of signatures) {
      try {
        const tx = await connection.getParsedTransaction(signatureInfo.signature, {
          maxSupportedTransactionVersion: 0
        })

        if (!tx || !tx.transaction) continue

        const instructions = tx.transaction.message.instructions
        
        for (const instruction of instructions) {
          if ('parsed' in instruction && instruction.parsed?.type === 'transfer') {
            const info = instruction.parsed.info
            
            if (
              info.source === senderPubkey.toBase58() &&
              info.destination === recipientPubkey.toBase58()
            ) {
              console.log('[registration] Found existing reward transfer:', {
                signature: signatureInfo.signature,
                amount: info.lamports / LAMPORTS_PER_SOL
              })
              return true
            }
          }
        }
      } catch (txError) {
        continue
      }
    }

    return false
  } catch (error) {
    console.error('[registration] Error checking existing reward transactions:', error)
    return false
  }
}

async function getCurrentSOLPrice(): Promise<number> {
  try {
    // Используем Jupiter Price API - самый надежный источник для Solana
    const response = await fetch('https://price.jup.ag/v6/price?ids=SOL', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`Jupiter API returned ${response.status}`)
    }

    const data = await response.json()
    const solPrice = data?.data?.SOL?.price

    if (!solPrice || typeof solPrice !== 'number') {
      throw new Error('Invalid price data from Jupiter API')
    }

    console.log('[registration] Current SOL/USD price from Jupiter:', solPrice)
    return solPrice

  } catch (error) {
    console.error('[registration] Error fetching SOL price from Jupiter, trying CoinGecko:', error)
    
    // Fallback на CoinGecko API
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`CoinGecko API returned ${response.status}`)
      }

      const data = await response.json()
      const solPrice = data?.solana?.usd

      if (!solPrice || typeof solPrice !== 'number') {
        throw new Error('Invalid price data from CoinGecko API')
      }

      console.log('[registration] Current SOL/USD price from CoinGecko:', solPrice)
      return solPrice

    } catch (fallbackError) {
      console.error('[registration] Error fetching SOL price from CoinGecko:', fallbackError)
      // Если оба API не работают, используем безопасное значение по умолчанию
      console.warn('[registration] Using fallback SOL price: 150 USD')
      return 150
    }
  }
}

// Функция для отправки регистрационной награды
async function sendRegistrationReward(userWallet: string, userId: string): Promise<boolean> {
  try {
    console.log('[registration] Sending reward to wallet:', userWallet)

    // Проверяем in-memory блокировку
    const now = Date.now()
    const pending = pendingRewards.get(userWallet)
    
    if (pending) {
      // Если транзакция в процессе (меньше 2 минут назад)
      if (pending.inProgress && (now - pending.timestamp) < 120000) {
        console.log('[registration] Reward transaction already in progress for:', userWallet)
        return false
      }
      
      // Если прошло меньше 5 минут с последней попытки
      if ((now - pending.timestamp) < 300000) {
        console.log('[registration] Recent reward transaction detected, skipping')
        return false
      }
    }
    
    // Устанавливаем блокировку
    pendingRewards.set(userWallet, { timestamp: now, inProgress: true })
    console.log('[registration] Reward lock set for wallet:', userWallet)

    // Валидация формата кошелька
    let recipientPublicKey: PublicKey
    try {
      recipientPublicKey = new PublicKey(userWallet)
    } catch (error) {
      console.error('[registration] Invalid wallet format:', error)
      return false
    }

    // Создаем Keypair из приватного ключа
    let senderKeypair: Keypair
    try {
      const secretKey = bs58.decode(SENDER_PRIVATE_KEY)
      senderKeypair = Keypair.fromSecretKey(secretKey)
      console.log('[registration] Sender wallet:', senderKeypair.publicKey.toBase58())
    } catch (error) {
      console.error('[registration] Failed to decode private key:', error)
      return false
    }

    // Подключаемся к Solana
    const connection = new Connection(RPC_ENDPOINT, 'confirmed')

    // Проверяем историю транзакций в сети Solana
    const existingTransaction = await checkExistingRewardTransaction(
      connection,
      senderKeypair.publicKey,
      recipientPublicKey
    )

    if (existingTransaction) {
      console.log('[registration] Reward transaction already exists in blockchain')
      
      // Снимаем блокировку и обновляем флаг
      pendingRewards.delete(userWallet)
      
      // Обновляем флаг в БД
      await prisma.user.update({
        where: { id: userId },
        // @ts-expect-error - Поле isGetRegistrationReward будет доступно после генерации Prisma Client
        data: { isGetRegistrationReward: true }
      })
      
      return true // Считаем успехом, так как награда уже была отправлена
    }

    // Проверяем баланс отправителя
    const senderBalance = await connection.getBalance(senderKeypair.publicKey)
    console.log('[registration] Sender balance:', senderBalance / LAMPORTS_PER_SOL, 'SOL')

    // Рассчитываем сумму награды
    // 1.1 USD при курсе ~150 USD/SOL = ~0.00733 SOL
    const SOL_TO_USD = await getCurrentSOLPrice();
    const REWARD_USD = 2
    const rewardAmountSOL = REWARD_USD / SOL_TO_USD
    const rewardLamports = Math.floor(rewardAmountSOL * LAMPORTS_PER_SOL)

    console.log('[registration] Reward amount:', {
      usd: REWARD_USD,
      sol: rewardAmountSOL,
      lamports: rewardLamports
    })

    // Проверяем, достаточно ли средств
    if (senderBalance < rewardLamports + 5000) {
      console.error('[registration] Insufficient balance')
      return false
    }

    // Получаем последний blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed')

    // Создаем транзакцию
    const transaction = new Transaction({
      feePayer: senderKeypair.publicKey,
      recentBlockhash: blockhash,
    })

    // Добавляем инструкцию трансфера
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: recipientPublicKey,
        lamports: rewardLamports,
      })
    )

    // Подписываем и отправляем транзакцию
    console.log('[registration] Sending transaction...')
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair],
      {
        commitment: 'confirmed',
        skipPreflight: false,
      }
    )
    console.log('[registration] Transaction confirmed:', signature)

    // Обновляем флаг в базе данных
    await prisma.user.update({
      where: { id: userId },
      // @ts-expect-error - Поле isGetRegistrationReward будет доступно после генерации Prisma Client
      data: { isGetRegistrationReward: true }
    })

    console.log('[registration] User marked as received registration reward:', userId)
    
    // 🔹 Инициализируем ATA для DogWater токена
    try {
      console.log('[registration] Initializing DogWater ATA for user:', userWallet)
      
      // Вызываем внутренний API для создания ATA
      const ataResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dogWater/initwallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userWallet })
      })

      const ataResult = await ataResponse.json()

      if (ataResult.success) {
        console.log('[registration] DogWater ATA initialized successfully:', {
          ata: ataResult.ata,
          alreadyExists: ataResult.alreadyExists,
          signature: ataResult.signature
        })
      } else {
        console.error('[registration] Failed to initialize DogWater ATA:', ataResult.error)
      }
    } catch (ataError) {
      // Не фейлим всю операцию если ATA создание упало
      console.error('[registration] Error initializing DogWater ATA (non-critical):', ataError)
    }
    
    // Снимаем блокировку после успешной отправки
    pendingRewards.set(userWallet, { timestamp: now, inProgress: false })
    
    return true

  } catch (error) {
    console.error('[registration] Error sending reward:', error)
    
    // Снимаем блокировку при ошибке
    pendingRewards.delete(userWallet)
    
    return false
  }
}

// Функция для получения уникального имени из usernames.json
async function getUniqueUsernameFromFile(): Promise<string> {
  try {
    // Читаем файл с именами
    const usernamesPath = path.join(process.cwd(), 'app', 'api', 'usernames.json')
    const usernamesFile = fs.readFileSync(usernamesPath, 'utf-8')
    const usernamesData = JSON.parse(usernamesFile)
    const usernames: string[] = usernamesData.usernames

    if (!usernames || usernames.length === 0) {
      throw new Error('No usernames available in file')
    }

    console.log('[getUniqueUsername] Total usernames in file:', usernames.length)

    // Пытаемся найти уникальное имя (максимум 50 попыток)
    const maxAttempts = 50
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Выбираем случайное имя
      const randomIndex = Math.floor(Math.random() * usernames.length)
      const randomUsername = usernames[randomIndex]

      console.log(`[getUniqueUsername] Attempt ${attempt + 1}: Checking username "${randomUsername}"`)

      // Проверяем, занято ли это имя (в nickname или fullName)
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            {
              nickname: {
                equals: randomUsername,
                mode: 'insensitive'
              }
            },
            {
              fullName: {
                equals: randomUsername,
                mode: 'insensitive'
              }
            }
          ]
        }
      })

      if (!existingUser) {
        console.log(`[getUniqueUsername] Found unique username: "${randomUsername}"`)
        return randomUsername
      }

      console.log(`[getUniqueUsername] Username "${randomUsername}" already taken, trying another...`)
    }

    // Если не нашли уникальное имя за 50 попыток, добавляем случайные цифры
    const fallbackUsername = usernames[Math.floor(Math.random() * usernames.length)] + Math.floor(Math.random() * 10000)
    console.log(`[getUniqueUsername] Max attempts reached, using fallback: "${fallbackUsername}"`)
    return fallbackUsername

  } catch (error) {
    console.error('[getUniqueUsername] Error reading usernames file:', error)
    // Fallback на старый метод генерации
    throw error
  }
}

// GET /api/user?wallet=ADDRESS или /api/user?id=ID или /api/user?nickname=NICKNAME - получить пользователя
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const wallet = searchParams.get('wallet')
    // const wallet = "DDu7nvps6ZAvWVoFT8S9UdtSmn5Ufpmz8aTNiL5hYSmM";
    const id = searchParams.get('id')
    const nickname = searchParams.get('nickname')

    if (!wallet && !id && !nickname) {
      return NextResponse.json({ error: 'Wallet address, ID or nickname required' }, { status: 400 })
    }

    let user
    // 🎯 Отслеживаем создание нового пользователя
    let isNewUser = false
    
    if (id) {
      // Валидация ID (защита от инъекций)
      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
      }
      
      // Получаем пользователя по ID
      user = await prisma.user.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              posts: true,
              followers: true,
              follows: true,
            },
          },
        },
      })
    } else if (nickname) {
      // Валидация nickname (защита от инъекций)
      if (!/^[a-zA-Z0-9_.-]+$/.test(nickname)) {
        return NextResponse.json({ error: 'Invalid nickname format' }, { status: 400 })
      }
      
      // Получаем пользователя по никнейму (case-insensitive)
      user = await prisma.user.findFirst({
        where: { 
          nickname: {
            equals: nickname,
            mode: 'insensitive' // Case-insensitive поиск
          }
        },
        include: {
          _count: {
            select: {
              posts: true,
              followers: true,
              follows: true,
            },
          },
        },
      })
    } else if (wallet) {
      // Валидация wallet (защита от инъекций)
      if (!/^[a-zA-Z0-9]+$/.test(wallet)) {
        return NextResponse.json({ error: 'Invalid wallet format' }, { status: 400 })
      }
      
      console.log('🎯 [API USER] Searching for user with wallet:', wallet)
      
      // Получаем пользователя по wallet с полной информацией
      // 🔥 ИСПРАВЛЕНО: Добавлен поиск по solanaWallet
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { wallet: wallet },
            { solanaWallet: wallet } // 🔥 ВОССТАНОВЛЕНО: Поиск по solanaWallet
          ]
        },
        include: {
          _count: {
            select: {
              posts: true,
              followers: true,
              follows: true,
            },
          },
        },
      })
      
      console.log('🎯 [API USER] Search result:', {
        found: !!user,
        userId: user?.id,
        userWallet: user?.wallet,
        userSolanaWallet: user?.solanaWallet,
        userNickname: user?.nickname
      })
    }
    
    if (!user) {
      isNewUser = true  // ← Устанавливаем флаг для нового пользователя
      console.log('🎯 [API USER] User not found, creating new user with wallet:', wallet)
      
      try {
        // Получаем уникальное имя из usernames.json
        let uniqueUsername: string
        try {
          uniqueUsername = await getUniqueUsernameFromFile()
          console.log('🎯 [API USER] Generated unique username:', uniqueUsername)
        } catch (error) {
          // Fallback: используем старый метод с wallet
          uniqueUsername = `user_${wallet!.slice(0, 8).toLowerCase()}`
          console.log('🎯 [API USER] Using fallback username:', uniqueUsername)
        }
        
        // Создаем нового пользователя
        console.log('🎯 [API USER] 🆕 Creating new user in GET method...')
        console.log('🎯 [API USER] Wallet:', wallet)
        console.log('🎯 [API USER] Username:', uniqueUsername)
        
        user = await prisma.user.create({
          data: {
            wallet: wallet!,
            nickname: uniqueUsername,
            referalCount: 0,
            fullName: uniqueUsername,
            name: uniqueUsername,
            solanaWallet: wallet!
          },
          include: {
            _count: {
              select: {
                posts: true,
                followers: true,
                follows: true,
              },
            },
          },
        })
        
        console.log('🎯 [API USER] ✅ New user created successfully in GET:', {
          userId: user.id,
          userWallet: user.wallet,
          userSolanaWallet: user.solanaWallet,
          userNickname: user.nickname
        })
        
        // Отправляем уведомление в Telegram о новом пользователе
        console.log('🎯 [API USER] 📱 Sending Telegram notification from GET...')
        const notificationMessage = 
          `🎉 <b>Новый пользователь!</b>\n` +
          `<i>(создан через GET)</i>\n\n` +
          `👤 Ник: <b>${uniqueUsername}</b>\n` +
          `💳 Кошелёк: <code>${wallet!.slice(0, 8)}...${wallet!.slice(-6)}</code>\n` +
          `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
        
        console.log('🎯 [API USER] Notification message prepared:')
        console.log(notificationMessage)
        
        // Вызываем функцию отправки (она сама логирует детали)
        await sendTelegramNotification(notificationMessage)
        
        console.log('🎯 [API USER] 📱 Telegram notification process completed')
        
      } catch (error) {
        console.error('🎯 [API USER] ❌ Failed to create user:', error)
        if (error instanceof Error) {
          console.error('🎯 [API USER] Error message:', error.message)
          console.error('🎯 [API USER] Error stack:', error.stack)
        }
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
    }

    // Проверяем, получал ли пользователь регистрационную награду
    // @ts-expect-error - Поле isGetRegistrationReward будет доступно после генерации Prisma Client
    /*
    if (user && !user.isGetRegistrationReward) {
      const userWalletAddress = user.solanaWallet || user.wallet
      console.log('🎁 [API USER] User has not received registration reward, sending...')
      
      // Отправляем награду в фоне (не блокируем ответ)
      sendRegistrationReward(userWalletAddress, user.id).then((success) => {
        if (success) {
          console.log('🎁 [API USER] Registration reward sent successfully to:', userWalletAddress)
        } else {
          console.error('🎁 [API USER] Failed to send registration reward to:', userWalletAddress)
        }
      }).catch((error) => {
        console.error('🎁 [API USER] Error sending registration reward:', error)
      })
    } else {
      console.log('🎁 [API USER] User already received registration reward or flag check failed')
    }
    */
    const response = NextResponse.json({ 
      user,
      isNewUser: isNewUser  // ← Добавляем флаг в ответ
    })
    // Добавляем заголовки для предотвращения кеширования
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/user - создать или обновить пользователя при подключении кошелька
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, referrerFromClient } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    // Сначала проверяем, существует ли пользователь
    const existingUser = await getUserByWallet(wallet)
    
    if (existingUser) {
      // Проверяем, есть ли у пользователя никнейм и полное имя
      // bio является опциональным полем и может быть пустым
      const isProfileEmpty = !existingUser.nickname || !existingUser.fullName
      
      // Пользователь существует - возвращаем его
      const response = NextResponse.json({ 
        user: existingUser,
        isNewUser: isProfileEmpty // Показываем модалку если профиль пустой
      })
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      return response
    }
    
    // Проверяем cookie с реферером
    const referrerCookie = request.cookies.get('fonana_referrer')
    let referrerNickname = referrerCookie?.value
    
    // Fallback на реферера из клиента (localStorage)
    if (!referrerNickname && referrerFromClient) {
      referrerNickname = referrerFromClient
      referralLogger.info('Using referrer from localStorage fallback', {
        referrer: referrerNickname,
        wallet: wallet.slice(0, 8) + '...'
      })
    }
    
    if (referrerNickname) {
      referralLogger.info('Creating user with referrer', {
        referrer: referrerNickname,
        wallet: wallet.slice(0, 8) + '...',
        source: referrerCookie ? 'cookie' : 'localStorage'
      })
    } else {
      referralLogger.info('Creating user without referrer', {
        wallet: wallet.slice(0, 8) + '...'
      })
    }
    
    // Получаем уникальное имя из usernames.json
    let uniqueUsername: string
    try {
      uniqueUsername = await getUniqueUsernameFromFile()
      console.log('[POST /api/user] Generated unique username:', uniqueUsername)
    } catch (error) {
      // Fallback: используем старый метод с wallet
      uniqueUsername = `user_${wallet.slice(0, 8).toLowerCase()}`
      console.log('[POST /api/user] Using fallback username:', uniqueUsername)
    }
    
    // Создаем нового пользователя с автоматически сгенерированным именем
    console.log('[POST /api/user] 🆕 Creating new user...')
    console.log('[POST /api/user] Wallet:', wallet.slice(0, 8) + '...' + wallet.slice(-6))
    console.log('[POST /api/user] Username:', uniqueUsername)
    console.log('[POST /api/user] Referrer:', referrerNickname || 'None')
    
    const newUser = await createOrUpdateUser(wallet, {
      nickname: uniqueUsername,  // Используем уникальное имя из файла
      fullName: uniqueUsername,  // Устанавливаем то же имя в fullName
      bio: undefined
    }, referrerNickname)
    
    console.log('[POST /api/user] ✅ User created successfully!')
    console.log('[POST /api/user] User ID:', newUser.id)
    console.log('[POST /api/user] User nickname:', newUser.nickname)
    
    // Отправляем уведомление в Telegram о новом пользователе
    console.log('[POST /api/user] 📱 Sending Telegram notification...')
    const refInfo = referrerNickname ? `\n🔗 Реферер: @${referrerNickname}` : ''
    const notificationMessage = 
      `🎉 <b>Новый пользователь!</b>\n\n` +
      `👤 Ник: <b>${uniqueUsername}</b>\n` +
      `💳 Кошелёк: <code>${wallet.slice(0, 8)}...${wallet.slice(-6)}</code>${refInfo}\n` +
      `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
    
    console.log('[POST /api/user] Notification message prepared:')
    console.log(notificationMessage)
    
    // Вызываем функцию отправки (она сама логирует детали)
    await sendTelegramNotification(notificationMessage)
    
    console.log('[POST /api/user] 📱 Telegram notification process completed')
    
    const response = NextResponse.json({ 
      user: newUser,
      isNewUser: true // Новый пользователь всегда должен увидеть модалку
    })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response
  } catch (error) {
    console.error('Error creating/updating user:', error)
    apiLogger.error('Failed to create/update user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      wallet: request.body ? JSON.parse(await request.text()).wallet : 'unknown'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/user - обновить профиль пользователя
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, ...profileData } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    const user = await updateUserProfile(wallet, profileData)

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/user - удалить аккаунт пользователя
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    await deleteUser(wallet)

    return NextResponse.json({ success: true, message: 'User account deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 