import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

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

export interface TrackingData {
  userId: string
  nickname: string
  deviceId?: string | null
  wallet: string
  request: NextRequest
  source?: string
  campaign?: string
  userType: 'guest' | 'wallet' | 'telegram' | 'payment'
}

export interface TrackingResult {
  source: string
  adsFrom: string
  userAgent: string | undefined
}

/**
 * Универсальная функция для отслеживания создания пользователей
 * Сохраняет метрики в БД и возвращает данные для Telegram уведомления
 */
export async function trackUserCreation(data: TrackingData): Promise<TrackingResult> {
  try {
    console.log('[UserTracking] 📊 Starting user tracking...')
    
    // 1. Source & Campaign (ads_from)
    const source = data.source || 'None'
    const adsFrom = data.campaign || 'None'
    
    console.log('[UserTracking] 🏷️ Source:', source)
    console.log('[UserTracking] 📢 Ads From:', adsFrom)
    
    // 2. User Agent
    const userAgent = data.request.headers.get('user-agent') || undefined
    
    // 3. Save Metrics
    try {
      await prisma.metrics.create({
        data: {
          userId: data.userId,
          nickname: data.nickname,
          deviceId: data.deviceId || null,
          wallet: data.wallet,
          source: source,
          ads_from: adsFrom,
          userAgent: userAgent,
        }
      })
      
      console.log('[UserTracking] ✅ Metrics saved successfully')
    } catch (error) {
      console.error('[UserTracking] ⚠️ Failed to save metrics:', error)
      // Не бросаем exception - не блокируем создание пользователя
    }
    
    // 4. Return data for Telegram notification
    return {
      source,
      adsFrom,
      userAgent
    }
    
  } catch (error) {
    console.error('[UserTracking] ⚠️ Failed to track user:', error)
    // Не бросаем exception - не блокируем создание пользователя
    return {
      source: 'None',
      adsFrom: 'None',
      userAgent: undefined
    }
  }
}

/**
 * Отправка Telegram уведомления о новом пользователе
 */
export async function notifyNewUser(data: {
  userType: 'guest' | 'wallet' | 'payment'
  nickname: string
  wallet: string
  deviceId?: string
  source: string
  adsFrom?: string
}) {
  try {
    const userTypeEmoji = {
      guest: '👤',
      wallet: '💳',
      payment: '💰'
    }[data.userType]
    
    const userTypeText = {
      guest: 'Новый гостевой пользователь!',
      wallet: 'Новый пользователь через Wallet!',
      payment: 'Новый пользователь через Payment!'
    }[data.userType]
    
    const userTypeRoute = {
      guest: 'POST /api/auth/guest',
      wallet: 'POST /api/user',
      payment: 'POST /api/posts/process-payment'
    }[data.userType]
    
    let message = 
      `${userTypeEmoji} <b>${userTypeText}</b>\n` +
      `<i>(создан через ${userTypeRoute})</i>\n\n` +
      `👤 Ник: <b>${data.nickname}</b>\n`
    
    if (data.deviceId) {
      message += `🆔 Device ID: <code>${data.deviceId}</code>\n`
    }
    
    message += `💳 Wallet: <code>${data.wallet}</code>\n`
    
    if (data.source && data.source !== 'None') {
      message += `🏷️ Source: ${data.source}\n`
    }
    
    if (data.adsFrom && data.adsFrom !== 'None') {
      message += `📢 Ads From: ${data.adsFrom}\n`
    }
    
    message += `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
    
    await sendTelegramNotification(message)
    console.log('[UserTracking] 📱 Telegram notification sent')
    
  } catch (error) {
    console.error('[UserTracking] ⚠️ Failed to send Telegram notification:', error)
    // Не бросаем exception
  }
}
