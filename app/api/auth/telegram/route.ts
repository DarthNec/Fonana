import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextAvatar } from '@/lib/utils/avatarAssigner'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'

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

interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

/**
 * Проверка подписи от Telegram
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */
function verifyTelegramAuth(authData: TelegramAuthData): boolean {
  const { hash, ...data } = authData
  
  // Создаем строку для проверки (сортируем ключи)
  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${(data as any)[key]}`)
    .join('\n')
  
  // Вычисляем hash
  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest()
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')
  
  return calculatedHash === hash
}

export async function POST(request: NextRequest) {
  try {
    const authData: TelegramAuthData = await request.json()
    
    console.log('🔵 [TELEGRAM AUTH] Received data:', {
      id: authData.id,
      username: authData.username,
      first_name: authData.first_name
    })
    
    // 1. Проверяем подпись
    if (!verifyTelegramAuth(authData)) {
      console.error('🔵 [TELEGRAM AUTH] Invalid signature!')
      return NextResponse.json(
        { error: 'Invalid signature', success: false },
        { status: 401 }
      )
    }
    
    // 2. Проверяем, что данные не устарели (не старше 1 часа)
    const authDate = authData.auth_date * 1000
    const now = Date.now()
    if (now - authDate > 3600000) {
      console.error('🔵 [TELEGRAM AUTH] Auth data expired')
      return NextResponse.json(
        { error: 'Auth data expired', success: false },
        { status: 401 }
      )
    }
    
    // 3. Ищем пользователя по telegramId
    let user = await prisma.user.findFirst({
      where: { telegramId: authData.id.toString() }
    })
    
    // 4. Если не найден - создаем нового
    if (!user) {
      console.log('🔵 [TELEGRAM AUTH] Creating new user for Telegram ID:', authData.id)
      
      // Генерируем базовый nickname
      const baseNickname = authData.username || 
        `${authData.first_name}${authData.last_name || ''}`.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, '')
      
      let nickname = baseNickname || `tg_user_${authData.id}`
      let counter = 1
      
      // Проверяем уникальность nickname
      while (await prisma.user.findFirst({ where: { nickname } })) {
        nickname = `${baseNickname}${counter}`
        counter++
      }
      
      // 🔥 Генерируем НЕвалидный Solana адрес с префиксом TG_
      // Это НЕ настоящий кошелек, а идентификатор Telegram пользователя
      const telegramIdHash = crypto
        .createHash('sha256')
        .update(`telegram:${authData.id}`)
        .digest()
      
      // Берем первые 20 байт hash для короткого адреса
      const shortHash = telegramIdHash.slice(0, 20)
      
      // Кодируем в base58 и добавляем префикс TG_
      const fakeWallet = `TG_${bs58.encode(shortHash)}`
      
      console.log('🔵 [TELEGRAM AUTH] Generated fake wallet with TG_ prefix:', fakeWallet)
      
      // Получаем следующий доступный CDN аватар
      const avatarUrl = await getNextAvatar()
      console.log('🔵 [TELEGRAM AUTH] 🎨 Assigned avatar:', avatarUrl)
      
      user = await prisma.user.create({
        data: {
          telegramId: authData.id.toString(),
          nickname: nickname,
          fullName: `${authData.first_name} ${authData.last_name || ''}`.trim(),
          avatar: authData.photo_url || avatarUrl,  // Используем Telegram фото или CDN аватар
          wallet: fakeWallet, // TG_... адрес (НЕ валидный Solana адрес)
          solanaWallet: null,
          isCreator: true,
          isVerified: false,
        }
      })
      
      console.log('🔵 [TELEGRAM AUTH] User created:', {
        id: user.id,
        nickname: user.nickname,
        telegramId: user.telegramId
      })
      
      // 📱 Отправляем уведомление в Telegram
      console.log('🔵 [TELEGRAM AUTH] 📱 Sending Telegram notification...')
      const notificationMessage = 
        `🎉 <b>Новый пользователь через Telegram!</b>\n` +
        `<i>(создан через POST /api/auth/telegram)</i>\n\n` +
        `👤 Ник: <b>${user.nickname}</b>\n` +
        `🆔 Telegram ID: <code>${authData.id}</code>\n` +
        `👤 Telegram: ${authData.username ? '@' + authData.username : authData.first_name}\n` +
        `💳 Fake Wallet: <code>${fakeWallet}</code>\n` +
        `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
      
      console.log('🔵 [TELEGRAM AUTH] Notification message prepared:')
      console.log(notificationMessage)
      
      // Вызываем функцию отправки (она сама логирует детали)
      await sendTelegramNotification(notificationMessage)
      
      console.log('🔵 [TELEGRAM AUTH] 📱 Telegram notification process completed')
    } else {
      console.log('🔵 [TELEGRAM AUTH] Existing user found:', {
        id: user.id,
        nickname: user.nickname
      })
    }
    
    // 5. Генерируем JWT токен
    const token = jwt.sign(
      {
        userId: user.id,
        telegramId: authData.id,
        sub: user.id,
        wallet: user.wallet,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )
    
    // 6. Сохраняем токен в БД
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
    await prisma.user.update({
      where: { id: user.id },
      data: {
        token,
        tokenExpiresAt,
      }
    })
    
    console.log('🔵 [TELEGRAM AUTH] User authenticated successfully:', user.id)
    
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        fullName: user.fullName,
        avatar: user.avatar,
        wallet: user.wallet,
        telegramId: user.telegramId,
      }
    })
    
  } catch (error) {
    console.error('🔵 [TELEGRAM AUTH] Error:', error)
    return NextResponse.json(
      { error: 'Authentication failed', success: false, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
