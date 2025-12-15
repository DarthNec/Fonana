import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'
import OpenAI from 'openai'

// Инициализация OpenAI клиента
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

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
    
    // Проверяем, нужно ли автоматически ответить от имени получателя
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        isAutoAnswerInChat: true
      }
    })
    
    // Если у получателя включен автоответ, генерируем ответ через OpenAI
    if (recipient?.isAutoAnswerInChat && process.env.NEXT_PUBLIC_OPENAI_API_KEY && !isPaid && content) {
      try {
        console.log('[Auto-reply] Generating automatic response for recipient:', recipientId)
        
        // Получаем последние 10 сообщений для контекста
        const recentMessages = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            senderId: true,
            content: true,
            createdAt: true
          }
        })
        
        // Формируем историю чата для контекста
        const chatHistory = recentMessages
          .reverse()
          .map(msg => {
            const isRecipient = msg.senderId === recipientId
            const senderName = isRecipient ? (recipient.nickname || recipient.fullName || 'Me') : (user.nickname || user.fullName || 'User')
            return `${senderName}: ${msg.content || '[Media]'}`
          })
          .join('\n')
        
        // Системный промпт для генерации ответа
        const systemPrompt = `Ты - ${recipient.nickname || recipient.fullName || 'пользователь'}, участник чата.
Твоя задача - отвечать на сообщения естественным, дружелюбным образом.

Правила:
- Отвечай кратко и по существу (1-3 предложения)
- Сохраняй контекст предыдущих сообщений
- Будь вежливым и естественным
- Используй тот же язык, что и собеседник
- Не упоминай, что ты AI или автоматический бот
- Отвечай как обычный человек в переписке
- НИКОГДА не задавай вопросы в ответ
- Не инициируй новые темы разговора
- Просто реагируй и отвечай на то, что тебе написали
- Завершай свой ответ утверждением или комментарием, а не вопросом

История чата:
${chatHistory}

Последнее сообщение от ${user.nickname || user.fullName || 'собеседника'}: ${content}

Сгенерируй естественный ответ от имени ${recipient.nickname || recipient.fullName || 'меня'}. Помни: НЕ задавай вопросы, только отвечай!`

        // Генерируем ответ через OpenAI
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: content
            }
          ],
          temperature: 0.8,
          max_tokens: 200
        })
        
        const autoReplyContent = completion.choices[0].message.content
        
        if (autoReplyContent) {
          console.log('[Auto-reply] Generated response:', autoReplyContent.substring(0, 100))
          
          // Создаем автоматическое сообщение от имени получателя
          const autoMessage = await prisma.message.create({
            data: {
              conversationId,
              senderId: recipientId,
              content: autoReplyContent,
              isPaid: false
            }
          })
          
          console.log('[Auto-reply] Auto-reply message created:', autoMessage.id)
          
          // Создаем уведомление для отправителя о автоответе
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'NEW_MESSAGE',
              title: 'New message',
              message: `${recipient.nickname || 'User'}: ${autoReplyContent.substring(0, 50)}`,
              metadata: {
                conversationId,
                messageId: autoMessage.id,
                senderId: recipientId,
                senderName: recipient.nickname || 'User',
                isAutoReply: true
              }
            }
          })
        }
      } catch (autoReplyError) {
        console.error('[Auto-reply] Error generating automatic response:', autoReplyError)
        // Не падаем если автоответ не сработал, просто логируем ошибку
      }
    }
    
    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
} 