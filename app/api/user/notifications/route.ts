import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

// WebSocket события  
import { sendNotification } from '@/websocket-server/src/events/notifications'

export const dynamic = 'force-dynamic'

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
        type: 'notification',
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata,
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
    const wallet = searchParams.get('wallet')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }
    
    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }
    
    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
    const wallet = searchParams.get('wallet')
    const notificationId = searchParams.get('id')
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }
    
    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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