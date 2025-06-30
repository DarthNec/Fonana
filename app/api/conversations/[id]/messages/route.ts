import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

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
    const isParticipant = await prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(*) as count
      FROM "_UserConversations"
      WHERE "A" = ${conversationId} AND "B" = ${user.id}
    `
    
    if (!isParticipant[0] || Number(isParticipant[0].count) === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Получаем сообщения
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            wallet: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        },
        purchases: {
          where: { userId: user.id },
          select: {
            id: true,
            createdAt: true
          }
        }
      }
    })
    
    // Помечаем сообщения как прочитанные
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: user.id },
        isRead: false
      },
      data: { isRead: true }
    })
    
    // Форматируем сообщения
    const formattedMessages = messages.map((message: any) => ({
      ...message,
      content: message.isPaid && message.purchases.length === 0 
        ? null 
        : message.content,
      isPurchased: message.purchases.length > 0
    }))
    
    return NextResponse.json({ messages: formattedMessages })
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
    
    // Проверяем, что чат существует
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    // Проверяем что пользователь участник чата через raw query
    const isParticipant = await prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(*) as count
      FROM "_UserConversations"
      WHERE "A" = ${conversationId} AND "B" = ${user.id}
    `
    
    if (!isParticipant[0] || Number(isParticipant[0].count) === 0) {
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
      include: {
        sender: {
          select: {
            id: true,
            wallet: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        }
      }
    })
    
    // Обновляем lastMessageAt в чате
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })
    
    // Получаем участников чата для создания уведомления
    const participants = await prisma.$queryRaw<{id: string}[]>`
      SELECT "B" as id
      FROM "_UserConversations"
      WHERE "A" = ${conversationId} AND "B" != ${user.id}
    `
    
    // Создаем уведомление для получателя
    if (participants.length > 0) {
      const recipient = participants[0]
      await prisma.notification.create({
        data: {
          userId: recipient.id,
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
    }
    
    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
} 