import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Получение сообщений чата
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userWallet = request.headers.get('x-user-wallet')
    
    if (!userWallet) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }
    
    const conversationId = params.id
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // для пагинации
    
    // Проверяем, что пользователь участник чата
    const user = await prisma.user.findUnique({
      where: { wallet: userWallet }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          select: { id: true }
        }
      }
    })
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    // Проверяем, что пользователь участник чата
    const isParticipant = conversation.participants.some((p: any) => p.id === user.id)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Получаем сообщения
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(before && { createdAt: { lt: new Date(before) } })
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        },
        purchases: {
          select: { 
            id: true,
            userId: true 
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    
    // Форматируем сообщения
    const formattedMessages = messages.map((msg: any) => {
      const isOwn = msg.senderId === user.id
      const isPurchasedByMe = msg.purchases.some((p: any) => p.userId === user.id)
      
      return {
        id: msg.id,
        content: msg.isPaid && !isPurchasedByMe && !isOwn
          ? null // Скрываем контент платных сообщений только если не автор и не куплено
          : msg.content,
        mediaUrl: msg.isPaid && !isPurchasedByMe && !isOwn
          ? null // Скрываем медиа платных сообщений только если не автор и не куплено
          : msg.mediaUrl,
        mediaType: msg.mediaType,
        isPaid: msg.isPaid,
        price: msg.price,
        isPurchased: isPurchasedByMe,
        purchases: isOwn ? msg.purchases : [], // Отправитель видит все покупки
        sender: msg.sender,
        isOwn,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        metadata: msg.metadata as any
      }
    })
    
    // Отмечаем сообщения как прочитанные
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: user.id },
        isRead: false
      },
      data: { isRead: true }
    })
    
    return NextResponse.json({ 
      messages: formattedMessages.reverse(),
      hasMore: messages.length === limit
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
  try {
    const userWallet = request.headers.get('x-user-wallet')
    
    if (!userWallet) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }
    
    const conversationId = params.id
    const { content, mediaUrl, mediaType, isPaid, price } = await request.json()
    
    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content or media required' }, { status: 400 })
    }
    
    if (isPaid && (!price || price <= 0)) {
      return NextResponse.json({ error: 'Valid price required for paid messages' }, { status: 400 })
    }
    
    // Получаем пользователя и проверяем участие в чате
    const user = await prisma.user.findUnique({
      where: { wallet: userWallet }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true
      }
    })
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    // Проверяем, что пользователь участник чата
    const isParticipant = conversation.participants.some((p: any) => p.id === user.id)
    if (!isParticipant) {
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
        price: isPaid ? price : null
      },
      include: {
        sender: {
          select: {
            id: true,
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
    
    // Создаем уведомление для получателя
    const recipient = conversation.participants.find((p: any) => p.id !== user.id)
    if (recipient) {
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
    
    return NextResponse.json({ 
      message: {
        id: message.id,
        content: message.content,
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType,
        isPaid: message.isPaid,
        price: message.price,
        sender: message.sender,
        isOwn: true,
        isPurchased: false,
        isRead: false,
        createdAt: message.createdAt,
        metadata: message.metadata as any
      }
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
} 