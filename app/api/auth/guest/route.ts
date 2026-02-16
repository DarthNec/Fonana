import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import bs58 from 'bs58'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'

// Telegram уведомление о новом пользователе
const TG_BOT_TOKEN = '8304644010:AAF2W5q8I7cfNz2NXgvASRtna-J2ATi6pvY'
const TG_ADMIN_CHAT_ID = '5879286931'

async function sendTelegramNotification(message: string): Promise<void> {
  console.log('[TG Notification] 📤 Preparing to send Telegram notification...')
  
  try {
    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    })
    
    if (!response.ok) {
      console.error('[TG Notification] ❌ Telegram API returned error')
    } else {
      console.log('[TG Notification] ✅ Notification sent successfully!')
    }
  } catch (error) {
    console.error('[TG Notification] ❌ Failed to send:', error)
  }
}

/**
 * Генерация уникального идентификатора для гостя
 */
function generateGuestId(): string {
  // Генерируем случайный UUID-подобный идентификатор
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Генерация случайного никнейма для гостя
 */
async function generateUniqueNickname(): Promise<string> {
  const adjectives = [
    'Happy', 'Lucky', 'Brave', 'Swift', 'Clever', 'Bright', 'Silent', 
    'Golden', 'Silver', 'Crystal', 'Mystic', 'Shadow', 'Storm', 'Fire',
    'Ocean', 'Mountain', 'Forest', 'Night', 'Star', 'Moon'
  ]
  
  const nouns = [
    'Fox', 'Wolf', 'Eagle', 'Tiger', 'Bear', 'Lion', 'Hawk', 
    'Dragon', 'Phoenix', 'Panther', 'Falcon', 'Raven', 'Snake',
    'Shark', 'Dolphin', 'Whale', 'Leopard', 'Jaguar', 'Cobra'
  ]
  
  let nickname = ''
  let counter = 1
  let attempts = 0
  const maxAttempts = 50
  
  while (attempts < maxAttempts) {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const number = Math.floor(Math.random() * 999) + 1
    
    if (counter === 1) {
      nickname = `${adjective}${noun}${number}`
    } else {
      nickname = `${adjective}${noun}${number}_${counter}`
    }
    
    // Проверяем уникальность
    const existing = await prisma.user.findFirst({ where: { nickname } })
    if (!existing) {
      return nickname
    }
    
    counter++
    attempts++
  }
  
  // Fallback: если не смогли найти уникальный - используем UUID
  return `Guest_${crypto.randomBytes(4).toString('hex')}`
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔓 [GUEST AUTH] Starting guest authentication...')
    
    // 1. Получаем deviceId из запроса (если есть)
    const body = await request.json().catch(() => ({}))
    const existingDeviceId = body.deviceId
    
    console.log('🔓 [GUEST AUTH] Received deviceId from request:', existingDeviceId || 'none')
    
    // 2. Если deviceId предоставлен - ищем существующего пользователя
    if (existingDeviceId) {
      const existingUser = await prisma.user.findFirst({
        where: { telegramId: existingDeviceId } // Используем telegramId для хранения deviceId
      })
      
      if (existingUser) {
        console.log('🔓 [GUEST AUTH] Found existing guest user:', {
          id: existingUser.id,
          nickname: existingUser.nickname,
          wallet: existingUser.wallet
        })
        
        // Генерируем новый JWT токен для существующего пользователя
        const token = jwt.sign(
          {
            userId: existingUser.id,
            guestId: existingDeviceId,
            sub: existingUser.id,
            wallet: existingUser.wallet,
            isGuest: true,
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        )
        
        // Обновляем токен в БД
        const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            token,
            tokenExpiresAt,
          }
        })
        
        console.log('🔓 [GUEST AUTH] Existing guest user authenticated successfully')
        
        return NextResponse.json({
          success: true,
          token,
          isGuest: true,
          deviceId: existingDeviceId,
          isNewUser: false, // Важно: это НЕ новый пользователь
          user: {
            id: existingUser.id,
            nickname: existingUser.nickname,
            fullName: existingUser.fullName,
            avatar: existingUser.avatar,
            wallet: existingUser.wallet,
          }
        })
      } else {
        console.log('🔓 [GUEST AUTH] No existing user found for deviceId, creating new...')
      }
    }
    
    // 3. Генерируем новый deviceId если не был предоставлен
    const deviceId = existingDeviceId || `device_${generateGuestId()}`
    console.log('🔓 [GUEST AUTH] Using deviceId:', deviceId)
    
    // 4. Генерируем уникальный nickname
    const nickname = await generateUniqueNickname()
    console.log('🔓 [GUEST AUTH] Generated nickname:', nickname)
    
    // 5. Генерируем fake wallet с префиксом FK_
    // Это НЕ настоящий кошелек, а идентификатор гостевого пользователя
    const guestIdHash = crypto
      .createHash('sha256')
      .update(`guest:${deviceId}`)
      .digest()
    
    // Берем первые 20 байт hash для короткого адреса
    const shortHash = guestIdHash.slice(0, 20)
    
    // Кодируем в base58 и добавляем префикс FK_
    const fakeWallet = `FK_${bs58.encode(shortHash)}`
    
    console.log('🔓 [GUEST AUTH] Generated fake wallet with FK_ prefix:', fakeWallet)
    
    // 6. Создаем пользователя в БД
    const user = await prisma.user.create({
      data: {
        telegramId: deviceId, // Используем telegramId для хранения deviceId
        nickname: nickname,
        fullName: `Guest ${nickname}`,
        avatar: null,
        wallet: fakeWallet, // FK_... адрес (НЕ валидный Solana адрес)
        solanaWallet: null,
        isCreator: true, // Даем возможность создавать контент
        isVerified: false,
      }
    })
    
    console.log('🔓 [GUEST AUTH] Guest user created:', {
      id: user.id,
      nickname: user.nickname,
      wallet: user.wallet,
      deviceId: deviceId
    })
    
    // 7. Отправляем уведомление в Telegram
    console.log('🔓 [GUEST AUTH] 📱 Sending Telegram notification...')
    const notificationMessage = 
      `👤 <b>Новый гостевой пользователь!</b>\n` +
      `<i>(создан через POST /api/auth/guest)</i>\n\n` +
      `👤 Ник: <b>${user.nickname}</b>\n` +
      `🆔 Device ID: <code>${deviceId}</code>\n` +
      `💳 Fake Wallet: <code>${fakeWallet}</code>\n` +
      `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
    
    await sendTelegramNotification(notificationMessage)
    console.log('🔓 [GUEST AUTH] 📱 Telegram notification sent')
    
    // 8. Генерируем JWT токен
    const token = jwt.sign(
      {
        userId: user.id,
        guestId: deviceId,
        sub: user.id,
        wallet: user.wallet,
        isGuest: true, // Помечаем что это гость
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )
    
    // 9. Сохраняем токен в БД
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
    await prisma.user.update({
      where: { id: user.id },
      data: {
        token,
        tokenExpiresAt,
      }
    })
    
    console.log('🔓 [GUEST AUTH] Guest authenticated successfully:', user.id)
    
    return NextResponse.json({
      success: true,
      token,
      isGuest: true,
      deviceId: deviceId, // Возвращаем deviceId клиенту
      isNewUser: true, // Это новый пользователь
      user: {
        id: user.id,
        nickname: user.nickname,
        fullName: user.fullName,
        avatar: user.avatar,
        wallet: user.wallet,
      }
    })
    
  } catch (error) {
    console.error('🔓 [GUEST AUTH] Error:', error)
    return NextResponse.json(
      { 
        error: 'Guest authentication failed', 
        success: false, 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
