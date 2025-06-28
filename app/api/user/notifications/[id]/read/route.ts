import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

// WebSocket события
import { sendNotification } from '@/lib/services/websocket-client'

// PUT /api/user/notifications/[id]/read - отметить уведомление как прочитанное
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }
    
    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем, что уведомление принадлежит пользователю
    const notification = await prisma.notification.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }
    
    // Отмечаем как прочитанное
    await prisma.notification.update({
      where: { id: params.id },
      data: { isRead: true }
    })
    
    // Отправляем WebSocket событие
    try {
      await sendNotification(user.id, {
        type: 'notification_read',
        title: 'Уведомление прочитано',
        message: '',
        metadata: { notificationId: params.id }
      })
    } catch (error) {
      console.error('WebSocket notification failed:', error)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
} 