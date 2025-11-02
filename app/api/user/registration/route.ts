import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Приватный ключ кошелька для отправки регистрационной награды
const SENDER_PRIVATE_KEY = '2GTLeohbNhpfdenQEXjan7erw391b7qCwErzzR6bQJ1NczosBLj7gJ6DpabgMJB6v5Vxt2Hu2R5JgbL2FFfd1a4u'

// RPC endpoint
const RPC_ENDPOINT = 'https://rpc.helius.xyz/?api-key=29fc7f17-2a08-48da-9c14-88780e1fedd0'

// In-memory блокировка для предотвращения одновременных транзакций на один кошелек
const pendingTransactions = new Map<string, { timestamp: number, inProgress: boolean }>()

// Функция для получения актуального курса SOL/USD
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

// Функция для проверки существующих транзакций в сети
async function checkExistingTransaction(
  connection: Connection, 
  senderPubkey: PublicKey, 
  recipientPubkey: PublicKey
): Promise<boolean> {
  try {
    console.log('[registration] Checking existing transactions...')
    
    // Получаем последние подтвержденные транзакции отправителя
    const signatures = await connection.getSignaturesForAddress(senderPubkey, {
      limit: 50, // Проверяем последние 50 транзакций
    })

    console.log('[registration] Found', signatures.length, 'recent transactions')

    // Проверяем каждую транзакцию
    for (const signatureInfo of signatures) {
      try {
        const tx = await connection.getParsedTransaction(signatureInfo.signature, {
          maxSupportedTransactionVersion: 0
        })

        if (!tx || !tx.transaction) continue

        // Проверяем инструкции транзакции
        const instructions = tx.transaction.message.instructions
        
        for (const instruction of instructions) {
          // Проверяем только инструкции трансфера
          if ('parsed' in instruction && instruction.parsed?.type === 'transfer') {
            const info = instruction.parsed.info
            
            // Если нашли трансфер от нашего кошелька к целевому
            if (
              info.source === senderPubkey.toBase58() &&
              info.destination === recipientPubkey.toBase58()
            ) {
              console.log('[registration] Found existing transfer:', {
                signature: signatureInfo.signature,
                amount: info.lamports / LAMPORTS_PER_SOL,
                time: new Date(signatureInfo.blockTime! * 1000).toISOString()
              })
              return true // Транзакция уже существует
            }
          }
        }
      } catch (txError) {
        console.error('[registration] Error checking transaction:', txError)
        // Продолжаем проверку других транзакций
        continue
      }
    }

    return false // Транзакций не найдено
  } catch (error) {
    console.error('[registration] Error checking existing transactions:', error)
    // В случае ошибки проверки, лучше не блокировать отправку
    return false
  }
}

// POST /api/user/registration - выдать регистрационную награду в 1.3 USD (в SOL)
export async function POST(request: NextRequest) {
  let userWallet: string | undefined
  
  try {
    const body = await request.json()
    userWallet = body.userWallet

    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      )
    }

    console.log('[registration] Processing registration reward for wallet:', userWallet)

    // 1. Проверяем in-memory блокировку
    const now = Date.now()
    const pending = pendingTransactions.get(userWallet)
    
    if (pending) {
      // Если транзакция в процессе (меньше 2 минут назад)
      if (pending.inProgress && (now - pending.timestamp) < 120000) {
        console.log('[registration] Transaction already in progress for wallet:', userWallet)
        return NextResponse.json({
          status: 200,
          message: 'Transaction already in progress',
          alreadyInProgress: true
        })
      }
      
      // Если прошло меньше 5 минут с последней попытки
      if ((now - pending.timestamp) < 300000) {
        console.log('[registration] Recent transaction attempt detected, blocking duplicate')
        return NextResponse.json({
          status: 200,
          message: 'Transaction recently processed',
          alreadyProcessed: true
        })
      }
    }
    
    // Устанавливаем блокировку
    pendingTransactions.set(userWallet, { timestamp: now, inProgress: true })
    console.log('[registration] Lock set for wallet:', userWallet)

    // Валидация формата кошелька
    let recipientPublicKey: PublicKey
    try {
      recipientPublicKey = new PublicKey(userWallet)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Получаем пользователя по кошельку
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { wallet: userWallet },
          { solanaWallet: userWallet }
        ]
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Проверяем, получал ли пользователь уже награду
    // @ts-expect-error - Поле isGetRegistrationReward будет доступно после генерации Prisma Client
    if (user.isGetRegistrationReward) {
      return NextResponse.json({
        status: 200,
        message: 'Registration reward already claimed',
        alreadyClaimed: true
      })
    }

    // Создаем Keypair из приватного ключа
    let senderKeypair: Keypair
    try {
      const secretKey = bs58.decode(SENDER_PRIVATE_KEY)
      senderKeypair = Keypair.fromSecretKey(secretKey)
      console.log('[registration] Sender wallet:', senderKeypair.publicKey.toBase58())
    } catch (error) {
      console.error('[registration] Failed to decode private key:', error)
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Подключаемся к Solana
    const connection = new Connection(RPC_ENDPOINT, 'confirmed')

    // 2. Проверяем историю транзакций в сети Solana
    const existingTransaction = await checkExistingTransaction(
      connection,
      senderKeypair.publicKey,
      recipientPublicKey
    )

    if (existingTransaction) {
      console.log('[registration] Transaction already exists in blockchain for wallet:', userWallet)
      
      // Снимаем блокировку
      pendingTransactions.delete(userWallet)
      
      // Обновляем флаг в БД, если еще не обновлен
      // @ts-expect-error - Поле isGetRegistrationReward будет доступно после генерации Prisma Client
      if (!user.isGetRegistrationReward) {
        await prisma.user.update({
          where: { id: user.id },
          // @ts-expect-error - Поле isGetRegistrationReward будет доступно после генерации Prisma Client
          data: { isGetRegistrationReward: true }
        })
        console.log('[registration] Flag updated for existing transaction')
      }
      
      return NextResponse.json({
        status: 200,
        message: 'Registration reward already sent to blockchain',
        alreadySent: true
      })
    }

    // Проверяем баланс отправителя
    const senderBalance = await connection.getBalance(senderKeypair.publicKey)
    console.log('[registration] Sender balance:', senderBalance / LAMPORTS_PER_SOL, 'SOL')

    // Получаем актуальный курс SOL/USD
    const SOL_TO_USD = await getCurrentSOLPrice()
    const REWARD_USD = 2 // Награда за регистрацию в долларах
    const rewardAmountSOL = REWARD_USD / SOL_TO_USD
    const rewardLamports = Math.floor(rewardAmountSOL * LAMPORTS_PER_SOL)

    console.log('[registration] Reward calculation:', {
      solPrice: SOL_TO_USD,
      rewardUsd: REWARD_USD,
      rewardSol: rewardAmountSOL,
      rewardLamports: rewardLamports
    })

    // Проверяем, достаточно ли средств у отправителя
    if (senderBalance < rewardLamports + 5000) { // +5000 lamports на комиссию
      console.error('[registration] Insufficient balance')
      return NextResponse.json(
        { error: 'Insufficient funds in reward wallet' },
        { status: 500 }
      )
    }

    // Получаем последний blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

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
    let signature: string
    try {
      signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair],
        {
          commitment: 'confirmed',
          skipPreflight: false,
        }
      )
      console.log('[registration] Transaction confirmed:', signature)
    } catch (error) {
      console.error('[registration] Transaction failed:', error)
      
      // Снимаем блокировку при ошибке
      pendingTransactions.delete(userWallet)
      
      return NextResponse.json(
        { error: 'Failed to send registration reward' },
        { status: 500 }
      )
    }

    // Обновляем флаг в базе данных
    await prisma.user.update({
      where: { id: user.id },
      // @ts-expect-error - Поле isGetRegistrationReward будет доступно после генерации Prisma Client
      data: { isGetRegistrationReward: true }
    })

    console.log('[registration] User marked as received registration reward:', user.id)

    // Снимаем блокировку после успешной отправки
    pendingTransactions.set(userWallet, { timestamp: now, inProgress: false })

    return NextResponse.json({
      status: 200,
      message: 'Registration reward sent successfully',
      txSignature: signature,
      amount: rewardAmountSOL,
      amountUSD: REWARD_USD
    })

  } catch (error) {
    console.error('[registration] Error:', error)
    
    // Снимаем блокировку при любой ошибке
    if (typeof userWallet !== 'undefined') {
      pendingTransactions.delete(userWallet)
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

