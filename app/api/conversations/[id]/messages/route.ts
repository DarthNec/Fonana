import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

const prisma = new PrismaClient()

// Получение сообщений
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const conversationId = params.id
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем что пользователь участник чата через raw query
    const conversation = await prisma.$queryRaw<{fromUserId: string, toUserId: string}[]>`
      SELECT "fromUserId", "toUserId"
      FROM "Conversation"
      WHERE id = ${conversationId}
    `
    
    if (!conversation || conversation.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    const conv = conversation[0]
    if (conv.fromUserId !== user.id && conv.toUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Получаем параметры пагинации
    const url = new URL(request.url)
    const before = url.searchParams.get('before')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    
    // Создаем условие для пагинации
    let whereCondition: any = { conversationId }
    if (before) {
      // Получаем дату сообщения before для пагинации
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
          where: { userId: user.id },
          select: {
            id: true,
            createdAt: true
          }
        }
      }
    })
    
    // Проверяем есть ли еще сообщения
    const hasMore = messages.length === limit
    
    // Помечаем сообщения как прочитанные
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: user.id },
        isRead: false
      },
      data: { isRead: true }
    })
    
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
    const formattedMessages = messages.map((message: any) => ({
      ...message,
      sender: sendersMap[message.senderId],
      content: message.isPaid && message.purchases.length === 0 && message.senderId !== user.id
        ? null 
        : message.content,
      isPurchased: message.purchases.length > 0,
      isOwn: message.senderId === user.id
    }))
    
    return NextResponse.json({ 
      messages: formattedMessages,
      hasMore: hasMore
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// Отправка сообщения
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let message: any
  try {
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const conversationId = params.id
    const { content, mediaUrl, mediaType, isPaid, price, metadata } = await request.json()
    
    // Валидация
    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content or media required' }, { status: 400 })
    }
    
    if (isPaid && (!price || price <= 0)) {
      return NextResponse.json({ error: 'Valid price required for paid messages' }, { status: 400 })
    }
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем что пользователь участник чата через raw query
    const conversation = await prisma.$queryRaw<{fromUserId: string, toUserId: string}[]>`
      SELECT "fromUserId", "toUserId"
      FROM "Conversation"
      WHERE id = ${conversationId}
    `
    
    if (!conversation || conversation.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    const conv = conversation[0]
    if (conv.fromUserId !== user.id && conv.toUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Создаем сообщение
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content,
        mediaUrl,
        mediaType,
        isPaid: isPaid || false,
        price: isPaid ? price : null,
        metadata
      },
      // NOTE: sender relation not available in schema
    })
    
    // NOTE: Conversation model is @@ignore in schema, skip lastMessageAt update
    
    // Получаем получателя сообщения для создания уведомления
    const recipientId = conv.fromUserId === user.id ? conv.toUserId : conv.fromUserId
    
    // Создаем уведомление для получателя
    await prisma.notification.create({
      data: {
        userId: recipientId,
          type: 'NEW_MESSAGE',
          title: 'New message',
          message: isPaid 
            ? `${user.nickname || 'User'} sent you a paid message (${price} SOL)`
            : `${user.nickname || 'User'}: ${content?.substring(0, 50) || 'Sent a media'}`,
          metadata: {
            conversationId,
            messageId: message.id,
            senderId: user.id,
            senderName: user.nickname || 'User',
            isPaid,
            price
          }
        }
      })
    
    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
} 