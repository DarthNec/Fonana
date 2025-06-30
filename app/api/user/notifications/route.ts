import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

// WebSocket события  
import { sendNotification } from '@/lib/services/websocket-client'

export const dynamic = 'force-dynamic'

const JWT_SECRET = ENV.NEXTAUTH_SECRET

// Вспомогательная функция для получения пользователя из запроса
async function getUserFromRequest(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  // 1. Проверяем JWT токен в заголовке Authorization
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      if (decoded.userId) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        })
        if (user) {
          return user
        }
      }
    } catch (error) {
      console.log('[Notifications] Invalid JWT token:', error)
    }
  }
  
  // 2. Fallback: проверяем wallet в заголовках
  let wallet = req.headers.get('x-user-wallet')
  
  // 3. Fallback: проверяем wallet в query параметрах
  if (!wallet) {
    wallet = searchParams.get('wallet')
  }
  
  if (!wallet) {
    return null
  }
  
  return getUserByWallet(wallet)
}

// POST /api/user/notifications - создать новое уведомление
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, type, title, message, metadata } = body
    
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Создаем уведомление в базе данных
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata,
        isRead: false
      }
    })
    
    // Отправляем WebSocket событие
    try {
      await sendNotification(userId, {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: {
          ...notification.metadata as any,
          id: notification.id,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        }
      })
    } catch (error) {
      console.error('WebSocket notification failed:', error)
    }
    
    return NextResponse.json({ success: true, notification })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

// GET /api/user/notifications - получить уведомления пользователя
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const where = {
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {})
    }
    
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false
        }
      })
    ])
    
    return NextResponse.json({
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// PUT /api/user/notifications - пометить уведомления как прочитанные
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const body = await req.json()
    const { notificationIds, markAllAsRead } = body
    
    if (markAllAsRead) {
      // Помечаем все уведомления как прочитанные
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false
        },
        data: {
          isRead: true
        }
      })
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Помечаем конкретные уведомления как прочитанные
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.id
        },
        data: {
          isRead: true
        }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}

// DELETE /api/user/notifications - удалить уведомления
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const notificationId = searchParams.get('id')
    
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    if (notificationId) {
      // Удаляем конкретное уведомление
      await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId: user.id
        }
      })
    } else {
      // Удаляем все прочитанные уведомления
      await prisma.notification.deleteMany({
        where: {
          userId: user.id,
          isRead: true
        }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notifications:', error)
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
  }
}

// PATCH /api/user/notifications - обновить уведомления (для совместимости с клиентом)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const body = await req.json()
    const { notificationId, isRead, markAllAsRead } = body
    
    if (markAllAsRead) {
      // Помечаем все уведомления как прочитанные
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false
        },
        data: {
          isRead: true
        }
      })
    } else if (notificationId && typeof isRead === 'boolean') {
      // Помечаем конкретное уведомление
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId: user.id
        },
        data: {
          isRead
        }
      })
      
      // Отправляем WebSocket событие о прочтении
      if (isRead) {
        try {
          await sendNotification(user.id, {
            type: 'notification_read',
            title: 'Уведомление прочитано',
            message: '',
            metadata: { notificationId }
          })
        } catch (error) {
          console.error('WebSocket notification failed:', error)
        }
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
} 