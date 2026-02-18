import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { getNextAvatar } from '@/lib/utils/avatarAssigner'
import { ENV } from '@/lib/constants/env'

// 🔥 ИСПОЛЬЗУЕМ ТОТ ЖЕ СЕКРЕТ ЧТО И В CONVERSATIONS API
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U='

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

// GET - получение токена для пользователя
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')
    // const wallet = "DDu7nvps6ZAvWVoFT8S9UdtSmn5Ufpmz8aTNiL5hYSmM";
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }
    
    console.log('🎯 [TOKEN API] GET request for wallet:', wallet.substring(0, 8) + '...')
    
    // Ищем пользователя
    let user = await prisma.user.findUnique({
      where: { wallet }
    })
    
    // 🎯 Отслеживаем создание нового пользователя
    let isNewUser = false
    
    if (!user) {
      isNewUser = true
      console.log('🎯 [TOKEN API] User not found, creating new user')
      console.log('🎯 [TOKEN API] Wallet:', wallet.substring(0, 8) + '...' + wallet.substring(wallet.length - 6))
      
      // Получаем следующий доступный CDN аватар
      const avatarUrl = await getNextAvatar()
      console.log('🎯 [TOKEN API] 🎨 Assigned avatar:', avatarUrl)
      
      user = await prisma.user.create({
        data: {
          wallet,
          nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
          solanaWallet: wallet,
          avatar: avatarUrl  // Устанавливаем CDN аватар
        }
      })
      
      console.log('🎯 [TOKEN API] ✅ New user created successfully!')
      console.log('🎯 [TOKEN API] User ID:', user.id)
      console.log('🎯 [TOKEN API] User nickname:', user.nickname)
      console.log('🎯 [TOKEN API] User wallet:', user.wallet)
      console.log('🎯 [TOKEN API] isNewUser:', isNewUser)
      
      // Отправляем уведомление в Telegram о новом пользователе
      console.log('🎯 [TOKEN API] 📱 Sending Telegram notification...')
      const notificationMessage = 
        `🎉 <b>Новый пользователь!</b>\n` +
        `<i>(создан через GET /api/auth/token)</i>\n\n` +
        `👤 Ник: <b>${user.nickname}</b>\n` +
        `💳 Кошелёк: <code>${wallet.slice(0, 8)}...${wallet.slice(-6)}</code>\n` +
        `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
      
      console.log('🎯 [TOKEN API] Notification message prepared:')
      console.log(notificationMessage)
      
      // Вызываем функцию отправки (она сама логирует детали)
      await sendTelegramNotification(notificationMessage)
      
      console.log('🎯 [TOKEN API] 📱 Telegram notification process completed')
    }
    
    // 🔥 OPTIMIZATION: Check if user already has a valid token before generating new one
    console.log('🎯 [TOKEN API] Checking if user needs new token...')
    
    // Проверяем, есть ли у пользователя уже валидный токен
    if (user.token && user.tokenExpiresAt && user.tokenExpiresAt > new Date()) {
      console.log('🎯 [TOKEN API] User already has valid token, returning existing one')
      return NextResponse.json({
        token: user.token,
        expiresAt: user.tokenExpiresAt.toISOString(),
        isNewUser: false, // Existing user with valid token
        user: {
          id: user.id,
          wallet: user.wallet,
          nickname: user.nickname,
          isCreator: user.isCreator,
          isVerified: user.isVerified,
          avatar: user.avatar,
          fullName: user.fullName
        }
      })
    }
    
    // 🔥 Генерируем новый токен только если старый истек или отсутствует
    console.log('🎯 [TOKEN API] User needs new token, generating...')
    
    // Генерируем новый токен
    console.log('🎯 [TOKEN API] Generating new token')
    console.log('🎯 [TOKEN API] Using secret:', JWT_SECRET.substring(0, 20) + '...')
    console.log('🎯 [TOKEN API] Secret length:', JWT_SECRET.length)
    
    const token = jwt.sign(
      {
        userId: user.id,
        wallet: user.wallet,
        sub: user.id
      },
      JWT_SECRET,
      { 
        expiresIn: '30d'
      }
    )
    
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
    
    // Сохраняем токен в базе данных (используем $executeRaw для обхода TypeScript)
    await prisma.$executeRaw`
      UPDATE users 
      SET token = ${token}, "tokenExpiresAt" = ${tokenExpiresAt}
      WHERE id = ${user.id}
    `
    
    console.log('🎯 [TOKEN API] New token generated and saved')
    
    return NextResponse.json({
      token: token,
      expiresAt: tokenExpiresAt.toISOString(),
      isNewUser: isNewUser, // Flag indicating if user was just created
      user: {
        id: user.id,
        wallet: user.wallet,
        nickname: user.nickname,
        isCreator: user.isCreator,
        isVerified: user.isVerified,
        avatar: user.avatar,
        fullName: user.fullName
      }
    })
    
  } catch (error) {
    console.error('🎯 [TOKEN API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get token' },
      { status: 500 }
    )
  }
}

// POST - обновление токена
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { wallet } = body
    
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }
    
    console.log('🎯 [TOKEN API] POST request for wallet:', wallet.substring(0, 8) + '...')
    
    // Ищем пользователя
    let user = await prisma.user.findUnique({
      where: { wallet }
    })
    
    // 🎯 Отслеживаем создание нового пользователя
    let isNewUser = false
    
    if (!user) {
      isNewUser = true
      console.log('🎯 [TOKEN API] POST: User not found, creating new user')
      console.log('🎯 [TOKEN API] POST: Wallet:', wallet.substring(0, 8) + '...' + wallet.substring(wallet.length - 6))
      
      user = await prisma.user.create({
        data: {
          wallet,
          nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
          solanaWallet: wallet
        }
      })
      
      console.log('🎯 [TOKEN API] POST: ✅ New user created successfully!')
      console.log('🎯 [TOKEN API] POST: User ID:', user.id)
      console.log('🎯 [TOKEN API] POST: User nickname:', user.nickname)
      console.log('🎯 [TOKEN API] POST: User wallet:', user.wallet)
      console.log('🎯 [TOKEN API] POST: isNewUser:', isNewUser)
      
      // Отправляем уведомление в Telegram о новом пользователе
      console.log('🎯 [TOKEN API] POST: 📱 Sending Telegram notification...')
      const notificationMessage = 
        `🎉 <b>Новый пользователь!</b>\n` +
        `<i>(создан через POST /api/auth/token)</i>\n\n` +
        `👤 Ник: <b>${user.nickname}</b>\n` +
        `💳 Кошелёк: <code>${wallet.slice(0, 8)}...${wallet.slice(-6)}</code>\n` +
        `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
      
      console.log('🎯 [TOKEN API] POST: Notification message prepared:')
      console.log(notificationMessage)
      
      // Вызываем функцию отправки (она сама логирует детали)
      await sendTelegramNotification(notificationMessage)
      
      console.log('🎯 [TOKEN API] POST: 📱 Telegram notification process completed')
    }
    
    // 🔥 OPTIMIZATION: Check if user already has a valid token before generating new one
    console.log('🎯 [TOKEN API] POST: Checking if user needs new token...')
    
    // Проверяем, есть ли у пользователя уже валидный токен
    if (user.token && user.tokenExpiresAt && user.tokenExpiresAt > new Date()) {
      console.log('🎯 [TOKEN API] POST: User already has valid token, returning existing one')
      return NextResponse.json({
        token: user.token,
        expiresAt: user.tokenExpiresAt.toISOString(),
        isNewUser: false, // Existing user with valid token
        user: {
          id: user.id,
          wallet: user.wallet,
          nickname: user.nickname,
          isCreator: user.isCreator,
          isVerified: user.isVerified,
          avatar: user.avatar,
          fullName: user.fullName
        }
      })
    }
    
    // 🔥 Генерируем новый токен только если старый истек или отсутствует
    console.log('🎯 [TOKEN API] POST: User needs new token, generating...')
    
    // Генерируем новый токен
    console.log('🎯 [TOKEN API] Generating new token')
    console.log('🎯 [TOKEN API] Using secret:', JWT_SECRET.substring(0, 20) + '...')
    console.log('🎯 [TOKEN API] Secret length:', JWT_SECRET.length)
    
    const token = jwt.sign(
      {
        userId: user.id,
        wallet: user.wallet,
        sub: user.id
      },
      JWT_SECRET,
      { 
        expiresIn: '30d'
      }
    )
    
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
    
    // Сохраняем токен в базе данных (используем $executeRaw для обхода TypeScript)
    await prisma.$executeRaw`
      UPDATE users 
      SET token = ${token}, "tokenExpiresAt" = ${tokenExpiresAt}
      WHERE id = ${user.id}
    `
    
    console.log('🎯 [TOKEN API] Token refreshed and saved')
    
    return NextResponse.json({
      token: token,
      expiresAt: tokenExpiresAt.toISOString(),
      isNewUser: isNewUser, // Flag indicating if user was just created
      user: {
        id: user.id,
        wallet: user.wallet,
        nickname: user.nickname,
        isCreator: user.isCreator,
        isVerified: user.isVerified,
        avatar: user.avatar,
        fullName: user.fullName
      }
    })
    
  } catch (error) {
    console.error('🎯 [TOKEN API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    )
  }
} 