import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/conversations/[id]/messages/mobile?userId=xxx - получить сообщения чата
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API/messages/mobile] GET request started')
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const conversationId = params.id
    
    // Валидация
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    console.log('[API/messages/mobile] Fetching messages:', { conversationId, userId })
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем что чат существует и пользователь участник
    const conversation = await prisma.$queryRaw<{fromUserId: string, toUserId: string}[]>`
      SELECT "fromUserId", "toUserId"
      FROM "Conversation"
      WHERE id = ${conversationId}
    `
    
    if (!conversation || conversation.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    const conv = conversation[0]
    if (conv.fromUserId !== userId && conv.toUserId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Параметры пагинации
    const before = searchParams.get('before') // ID сообщения, до которого загружать
    const limit = parseInt(searchParams.get('limit') || '20')
    
    console.log('[API/messages/mobile] Pagination:', { before, limit })
    
    // Условие для пагинации
    let whereCondition: any = { conversationId }
    if (before) {
      // Получаем дату сообщения для пагинации
      const beforeMessage = await prisma.message.findUnique({
        where: { id: before },
        select: { createdAt: true }
      })
      
      if (beforeMessage) {
        whereCondition.createdAt = {
          lt: beforeMessage.createdAt
        }
      }
    }
    
    // Получаем сообщения с пагинацией
    const messages = await prisma.message.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        purchases: {
          where: { userId },
          select: {
            id: true,
            createdAt: true
          }
        }
      }
    })
    
    console.log('[API/messages/mobile] Found messages:', messages.length)
    
    // Проверяем есть ли еще сообщения
    const hasMore = messages.length === limit
    
    // Помечаем сообщения как прочитанные (только от других пользователей)
    const markReadResult = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    })
    
    console.log('[API/messages/mobile] Marked as read:', markReadResult.count)
    
    // Получаем данные отправителей
    const senderIds = Array.from(new Set(messages.map(m => m.senderId)))
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: {
        id: true,
        wallet: true,
        nickname: true,
        fullName: true,
        avatar: true
      }
    })
    const sendersMap = Object.fromEntries(senders.map(s => [s.id, s]))
    
    // Форматируем сообщения
    const formattedMessages = messages.map((message: any) => {
      const isPurchased = message.purchases.length > 0
      const isOwn = message.senderId === userId
      const isPaidAndLocked = message.isPaid && !isPurchased && !isOwn
      
      return {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        sender: sendersMap[message.senderId] || {
          id: message.senderId,
          nickname: 'Unknown',
          fullName: null,
          avatar: null,
          wallet: null
        },
        // Скрываем контент платного сообщения если не куплено
        content: isPaidAndLocked ? null : message.content,
        mediaUrl: isPaidAndLocked ? null : message.mediaUrl,
        mediaType: message.mediaType,
        isDeleted: message.isDeleted || false,
        isEdited: message.isEdited || false,
        isPaid: message.isPaid || false,
        price: message.price,
        isPurchased,
        isOwn,
        isRead: message.isRead || false,
        createdAt: message.createdAt,
        metadata: message.metadata
      }
    })
    
    console.log('[API/messages/mobile] Formatted messages:', formattedMessages.length)
    
    return NextResponse.json({ 
      success: true,
      messages: formattedMessages,
      hasMore
    })
    
  } catch (error) {
    console.error('[API/messages/mobile] GET Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/conversations/[id]/messages/mobile - отправить сообщение
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API/messages/mobile] POST request started')
    
    const conversationId = params.id
    const { 
      userId, 
      content, 
      mediaUrl, 
      mediaType, 
      isPaid, 
      price, 
      metadata 
    } = await request.json()
    
    // Валидация
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content or media required' }, { status: 400 })
    }
    
    if (isPaid && (!price || price <= 0)) {
      return NextResponse.json({ error: 'Valid price required for paid messages' }, { status: 400 })
    }
    
    console.log('[API/messages/mobile] Creating message:', { 
      conversationId, 
      userId, 
      isPaid, 
      price 
    })
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем что чат существует и пользователь участник
    const conversation = await prisma.$queryRaw<{fromUserId: string, toUserId: string}[]>`
      SELECT "fromUserId", "toUserId"
      FROM "Conversation"
      WHERE id = ${conversationId}
    `
    
    if (!conversation || conversation.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    const conv = conversation[0]
    if (conv.fromUserId !== userId && conv.toUserId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Создаем сообщение
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: content || '',
        mediaUrl,
        mediaType,
        isPaid: isPaid || false,
        price: isPaid ? price : null,
        metadata
      }
    })
    
    console.log('[API/messages/mobile] Message created:', message.id)
    
    // Обновляем lastMessageAt в чате
    try {
      await prisma.$executeRaw`
        UPDATE "Conversation"
        SET "lastMessageAt" = ${new Date()}
        WHERE id = ${conversationId}
      `
    } catch (updateError) {
      console.warn('[API/messages/mobile] Failed to update lastMessageAt:', updateError)
      // Не критичная ошибка, продолжаем
    }
    
    // Получаем получателя сообщения
    const recipientId = conv.fromUserId === userId ? conv.toUserId : conv.fromUserId
    
    // Создаем уведомление для получателя
    try {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'NEW_MESSAGE',
          title: 'New message',
          message: isPaid 
            ? `${user.nickname || 'User'} sent you a paid message (${price} SOL)`
            : `${user.nickname || 'User'}: ${content?.substring(0, 50) || 'Sent media'}`,
          metadata: {
            conversationId,
            messageId: message.id,
            senderId: userId,
            senderName: user.nickname || 'User',
            isPaid: isPaid || false,
            price,
            source: 'mobile'
          }
        }
      })
      console.log('[API/messages/mobile] Notification created for:', recipientId)
    } catch (notifError) {
      console.warn('[API/messages/mobile] Failed to create notification:', notifError)
      // Не критичная ошибка, продолжаем
    }
    
    // Получаем данные отправителя для ответа
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        wallet: true,
        nickname: true,
        fullName: true,
        avatar: true
      }
    })
    
    // Форматируем ответ
    const formattedMessage = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender,
      content: message.content,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      isPaid: message.isPaid || false,
      price: message.price,
      isPurchased: false,
      isOwn: true,
      isRead: false,
      createdAt: message.createdAt,
      metadata: message.metadata
    }
    
    return NextResponse.json({ 
      success: true,
      message: formattedMessage 
    })
    
  } catch (error) {
    console.error('[API/messages/mobile] POST Error:', error)
    return NextResponse.json({ 
      error: 'Failed to send message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


