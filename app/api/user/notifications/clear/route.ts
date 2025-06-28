import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

// WebSocket события
import { sendNotification } from '@/lib/services/websocket-client'

// DELETE /api/user/notifications/clear - очистить все уведомления
export async function DELETE(request: NextRequest) {
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
    
    // Удаляем все прочитанные уведомления
    const result = await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        isRead: true
      }
    })
    
    // Отправляем WebSocket событие
    try {
      await sendNotification(user.id, {
        type: 'notifications_cleared',
        title: 'Уведомления очищены',
        message: `Удалено ${result.count} прочитанных уведомлений`,
        metadata: { count: result.count }
      })
    } catch (error) {
      console.error('WebSocket notification failed:', error)
    }
    
    return NextResponse.json({ 
      success: true,
      clearedCount: result.count 
    })
  } catch (error) {
    console.error('Error clearing notifications:', error)
    return NextResponse.json(
      { error: 'Failed to clear notifications' },
      { status: 500 }
    )
  }
} 