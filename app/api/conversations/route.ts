import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

export async function GET(request: NextRequest) {
  console.log('[Conversations API] Starting GET request')
  
  try {
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Conversations API] No token provided')
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
      console.log('[Conversations API] Token verified:', decoded.userId)
    } catch (error) {
      console.log('[Conversations API] Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Получаем пользователя по ID из токена
    console.log('[Conversations API] Fetching user by ID...')
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    console.log('[Conversations API] User found:', user?.id, user?.nickname)
    
    if (!user) {
      console.log('[Conversations API] User not found')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Получаем все чаты пользователя используя raw query для обхода проблем с типами
    console.log('[Conversations API] Fetching conversations...')
    
    // Сначала получаем ID всех conversations где участвует пользователь
    const conversationIds = await prisma.$queryRaw<{conversation_id: string}[]>`
      SELECT "A" as conversation_id 
      FROM "_UserConversations" 
      WHERE "B" = ${user.id}
    `
    console.log('[Conversations API] Found conversation IDs:', conversationIds.length)
    
    if (conversationIds.length === 0) {
      console.log('[Conversations API] No conversations found for user')
      return NextResponse.json({ conversations: [] })
    }
    
    // Теперь получаем полные данные conversations
    const conversations = await prisma.conversation.findMany({
      where: {
        id: {
          in: conversationIds.map(c => c.conversation_id)
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                nickname: true
              }
            },
            purchases: {
              select: {
                userId: true
              }
            }
          }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      }
    })
    console.log('[Conversations API] Found conversations with details:', conversations.length)
    
    // Получаем участников для каждого conversation
    const conversationsWithParticipants = await Promise.all(
      conversations.map(async (conv) => {
        // Получаем участников через raw query
        const participants = await prisma.$queryRaw<{id: string, wallet: string | null, nickname: string | null, fullName: string | null, avatar: string | null}[]>`
          SELECT u.id, u.wallet, u.nickname, u."fullName", u.avatar
          FROM users u
          INNER JOIN "_UserConversations" uc ON u.id = uc."B"
          WHERE uc."A" = ${conv.id}
        `
        
        return {
          ...conv,
          participants
        }
      })
    )
    
    // Получаем непрочитанные сообщения для каждого чата
    const unreadCounts = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map(c => c.id) },
        senderId: { not: user.id },
        isRead: false
      },
      _count: {
        id: true
      }
    })
    console.log('[Conversations API] Unread counts:', unreadCounts.length)
    
    // Создаем map для быстрого доступа к количеству непрочитанных
    const unreadMap = new Map(
      unreadCounts.map((item: any) => [item.conversationId, item._count.id])
    )
    
    // Форматируем данные
    console.log('[Conversations API] Formatting conversations...')
    const formattedConversations = conversationsWithParticipants.map((conv: any) => {
      const otherParticipant = conv.participants.find((p: any) => p.id !== user.id)
      const lastMessage = conv.messages[0]
      
      // Убедимся что participant всегда существует
      if (!otherParticipant) {
        console.log('[Conversations API] Warning: No other participant found for conversation', conv.id)
        return null
      }
      
      return {
        id: conv.id,
        participant: {
          id: otherParticipant.id,
          nickname: otherParticipant.nickname || 'Unknown',
          fullName: otherParticipant.fullName || null,
          avatar: otherParticipant.avatar || null
        },
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.isPaid && !lastMessage.purchases?.some((p: any) => p.userId === user.id) 
            ? '💰 Paid message' 
            : lastMessage.content,
          senderId: lastMessage.senderId,
          senderName: lastMessage.sender.nickname || 'Unknown',
          createdAt: lastMessage.createdAt,
          isPaid: lastMessage.isPaid,
          price: lastMessage.price
        } : null,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        unreadCount: unreadMap.get(conv.id) || 0
      }
    }).filter(Boolean) // Фильтруем null значения
    
    console.log('[Conversations API] Successfully formatted', formattedConversations.length, 'conversations')
    return NextResponse.json({ conversations: formattedConversations })
  } catch (error: any) {
    console.error('[Conversations API] Error details:', error)
    console.error('[Conversations API] Error stack:', error.stack)
    console.error('[Conversations API] Error name:', error.name)
    console.error('[Conversations API] Error message:', error.message)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}

// Создание нового чата
export async function POST(request: NextRequest) {
  try {
    console.log('[API/conversations] POST request started')
    
    // Health check - test database connection first
    try {
      console.log('[API/conversations] Health check - testing basic DB query')
      const healthCheck = await prisma.user.count()
      console.log('[API/conversations] Health check passed, user count:', healthCheck)
    } catch (healthError) {
      console.error('[API/conversations] Health check failed:', healthError)
      return NextResponse.json({ error: 'Database health check failed' }, { status: 500 })
    }
    
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    console.log('[API/conversations] Auth header present:', !!authHeader)
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[API/conversations] No valid auth header')
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('[API/conversations] Token extracted, length:', token.length)
    
    let decoded: any
    
    try {
      console.log('[API/conversations] Starting JWT verification')
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
      console.log('[API/conversations] JWT verified successfully, userId:', decoded.userId)
      console.log('[API/conversations] JWT payload:', { userId: decoded.userId, wallet: decoded.wallet, sub: decoded.sub })
    } catch (jwtError) {
      console.error('[API/conversations] JWT Error:', {
        error: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error',
        stack: jwtError instanceof Error ? jwtError.stack : undefined,
        token: token?.slice(0, 50) + '...'
      })
      return NextResponse.json({ error: 'JWT verification failed' }, { status: 401 })
    }
    
    const { participantId } = await request.json()
    console.log('[API/conversations] Request body parsed, participantId:', participantId)
    
    if (!participantId) {
      console.log('[API/conversations] No participantId provided')
      return NextResponse.json({ error: 'Participant ID required' }, { status: 400 })
    }
    
    console.log('[API/conversations] Looking up users - userId:', decoded.userId, 'participantId:', participantId)
    
    // Enhanced user lookup with better error handling
    let user, participant
    try {
      console.log('[API/conversations] Starting user lookup')
      
      // Sequential user lookup for debugging
      user = await prisma.user.findUnique({ 
        where: { id: decoded.userId }
      })
      console.log('[API/conversations] User lookup result:', user ? { id: user.id, nickname: user.nickname } : 'null')
      
      participant = await prisma.user.findUnique({ 
        where: { id: participantId }
      })
      console.log('[API/conversations] Participant lookup result:', participant ? { id: participant.id, nickname: participant.nickname } : 'null')
      
      console.log('[API/conversations] User lookup results:', {
        user: user ? { id: user.id, nickname: user.nickname } : null,
        participant: participant ? { id: participant.id, nickname: participant.nickname } : null
      })
      
      if (!user) {
        console.log('[API/conversations] Current user not found for ID:', decoded.userId)
        return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
      }
      
      if (!participant) {
        console.log('[API/conversations] Participant not found for ID:', participantId)
        return NextResponse.json({ error: 'Conversation participant not found' }, { status: 404 })
      }
      
    } catch (userLookupError) {
      console.error('[API/conversations] User lookup error:', {
        error: userLookupError instanceof Error ? userLookupError.message : 'Unknown lookup error',
        stack: userLookupError instanceof Error ? userLookupError.stack : undefined,
        userId: decoded.userId,
        participantId
      })
      return NextResponse.json({ error: 'Failed to lookup users' }, { status: 500 })
    }
    
    // Enhanced existing conversation check with error handling
    console.log('[API/conversations] Checking for existing conversations')
    let existingConversations: {conversation_id: string}[] = []
    
    try {
      console.log('[API/conversations] Executing existing conversation query')
      existingConversations = await prisma.$queryRaw<{conversation_id: string}[]>`
        SELECT DISTINCT c1."A" as conversation_id
        FROM "_UserConversations" c1
        INNER JOIN "_UserConversations" c2 ON c1."A" = c2."A"
        WHERE c1."B" = ${user.id} AND c2."B" = ${participant.id}
        LIMIT 1
      `
      console.log('[API/conversations] Existing conversations found:', existingConversations.length)
    } catch (queryError) {
      console.error('[API/conversations] Error checking existing conversations:', {
        error: queryError instanceof Error ? queryError.message : 'Unknown query error',
        stack: queryError instanceof Error ? queryError.stack : undefined,
        userId: user.id,
        participantId: participant.id
      })
      // Continue with creation - don't fail on check error
      console.log('[API/conversations] Continuing with new conversation creation despite check error')
    }
    
    if (existingConversations.length > 0) {
      console.log('[API/conversations] Found existing conversation, returning it')
      
      const existingConversation = await prisma.conversation.findUnique({
        where: { id: existingConversations[0].conversation_id }
      })
      
      // Получаем участников
      const participants = await prisma.$queryRaw<{id: string, wallet: string | null, nickname: string | null, fullName: string | null, avatar: string | null}[]>`
        SELECT u.id, u.wallet, u.nickname, u."fullName", u.avatar
        FROM users u
        INNER JOIN "_UserConversations" uc ON u.id = uc."B"
        WHERE uc."A" = ${existingConversations[0].conversation_id}
      `
      
      console.log('[API/conversations] Existing conversation returned with participants:', participants.length)
      
      return NextResponse.json({ 
        conversation: {
          ...existingConversation,
          participants
        }
      })
    }
    
    console.log('[API/conversations] Creating new conversation')
    
    let conversation
    try {
      // Создаем новый чат без участников сначала
      console.log('[API/conversations] Starting simple conversation creation')
      conversation = await prisma.conversation.create({
        data: {}
      })
      console.log('[API/conversations] Conversation created with ID:', conversation.id)
    } catch (createError) {
      console.error('[API/conversations] Error creating conversation:', {
        error: createError instanceof Error ? createError.message : 'Unknown create error',
        stack: createError instanceof Error ? createError.stack : undefined
      })
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }
    
    // Добавляем участников через raw SQL
    try {
      console.log('[API/conversations] Adding participants via raw SQL')
      await prisma.$executeRaw`
        INSERT INTO "_UserConversations" ("A", "B")
        VALUES 
          (${conversation.id}, ${user.id}),
          (${conversation.id}, ${participant.id})
      `
      console.log('[API/conversations] Participants added successfully via raw SQL')
    } catch (participantsError) {
      console.error('[API/conversations] Error adding participants via raw SQL:', {
        error: participantsError instanceof Error ? participantsError.message : 'Unknown participants error',
        stack: participantsError instanceof Error ? participantsError.stack : undefined,
        conversationId: conversation.id,
        userId: user.id,
        participantId: participant.id
      })
      return NextResponse.json({ error: 'Failed to add participants to conversation' }, { status: 500 })
    }
    
    // Получаем участников для ответа
    let participants = []
    try {
      console.log('[API/conversations] Getting participants for response')
      participants = await prisma.$queryRaw<{id: string, wallet: string | null, nickname: string | null, fullName: string | null, avatar: string | null}[]>`
        SELECT u.id, u.wallet, u.nickname, u."fullName", u.avatar
        FROM users u
        WHERE u.id IN (${user.id}, ${participant.id})
      `
      console.log('[API/conversations] Participants retrieved for response:', participants.length)
    } catch (participantsResponseError) {
      console.error('[API/conversations] Error getting participants for response:', {
        error: participantsResponseError instanceof Error ? participantsResponseError.message : 'Unknown response error',
        stack: participantsResponseError instanceof Error ? participantsResponseError.stack : undefined
      })
      // Use fallback participants data from user lookup
      participants = [
        { id: user.id, nickname: user.nickname, fullName: user.fullName, wallet: user.wallet, avatar: user.avatar },
        { id: participant.id, nickname: participant.nickname, fullName: participant.fullName, wallet: participant.wallet, avatar: participant.avatar }
      ]
      console.log('[API/conversations] Using fallback participants data')
    }
    
    console.log('[API/conversations] Successfully created conversation, returning response')
    
    return NextResponse.json({ 
      conversation: {
        ...conversation,
        participants
      }
    })
  } catch (error: any) {
    console.error('[API/conversations] ERROR creating conversation:', error)
    console.error('[API/conversations] Error stack:', error.stack)
    console.error('[API/conversations] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    })
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }
} 