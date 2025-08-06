import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { ENV } from '@/lib/constants/env'

// 🔥 ДОБАВЛЯЕМ ПРЯМОЙ ИМПОРТ СЕКРЕТА
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U='

export async function GET(request: NextRequest) {
  console.log('[Conversations API] Starting GET request')
  
  try {
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    console.log('[Conversations API] Authorization header:', authHeader ? 'present' : 'missing')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Conversations API] No token provided')
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('[Conversations API] JWT token received:', token.substring(0, 20) + '...')
    console.log('[Conversations API] Using secret:', JWT_SECRET.substring(0, 20) + '...')
    
    let decoded: any
    
    try {
      decoded = jwt.verify(token, JWT_SECRET)
      console.log('[Conversations API] Token verified successfully:', {
        userId: decoded.userId,
        wallet: decoded.wallet,
        exp: decoded.exp ? new Date(decoded.exp * 1000) : 'no exp'
      })
    } catch (error) {
      console.error('[Conversations API] JWT verification failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenLength: token.length,
        secretLength: JWT_SECRET.length
      })
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
    
    // Получаем все чаты пользователя используя новую структуру
    console.log('[Conversations API] Fetching conversations...')
    
    // Получаем чаты где пользователь является fromUserId или toUserId
    const conversations = await prisma.$queryRaw<{
      id: string
      fromUserId: string
      toUserId: string
      lastMessageAt: Date | null
      createdAt: Date
      updatedAt: Date
      fromUser: any
      toUser: any
      lastMessage: any
    }[]>`
      SELECT 
        c.id,
        c."fromUserId",
        c."toUserId",
        c."lastMessageAt",
        c."createdAt",
        c."updatedAt",
        json_build_object(
          'id', fu.id,
          'wallet', fu.wallet,
          'nickname', fu.nickname,
          'fullName', fu."fullName",
          'avatar', fu.avatar
        ) as "fromUser",
        json_build_object(
          'id', tu.id,
          'wallet', tu.wallet,
          'nickname', tu.nickname,
          'fullName', tu."fullName",
          'avatar', tu.avatar
        ) as "toUser",
        (
          SELECT json_build_object(
            'id', m.id,
            'content', m.content,
            'senderId', m."senderId",
            'isPaid', m."isPaid",
            'price', m.price,
            'createdAt', m."createdAt",
            'sender', json_build_object(
              'id', s.id,
              'nickname', s.nickname
            ),
            'purchases', COALESCE(
              (SELECT json_agg(json_build_object('userId', mp."userId"))
               FROM "MessagePurchase" mp
               WHERE mp."messageId" = m.id), 
              '[]'::json
            )
          )
          FROM "Message" m
          INNER JOIN users s ON m."senderId" = s.id
          WHERE m."conversationId" = c.id
          ORDER BY m."createdAt" DESC
          LIMIT 1
        ) as "lastMessage"
      FROM "Conversation" c
      INNER JOIN users fu ON c."fromUserId" = fu.id
      INNER JOIN users tu ON c."toUserId" = tu.id
      WHERE c."fromUserId" = ${user.id} OR c."toUserId" = ${user.id}
      ORDER BY c."lastMessageAt" DESC NULLS LAST, c."createdAt" DESC
    `
    
    console.log('[Conversations API] Found conversations:', conversations.length)
    
    if (conversations.length === 0) {
      console.log('[Conversations API] No conversations found for user')
      return NextResponse.json({ conversations: [] })
    }
    
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
    const formattedConversations = conversations.map((conv: any) => {
      // Определяем другого участника
      const otherParticipant = conv.fromUserId === user.id ? conv.toUser : conv.fromUser
      const lastMessage = conv.lastMessage
      
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
    console.log('[Conversations API] Returning response with conversations:', formattedConversations.map(c => ({
      id: c.id,
      participant: c.participant.nickname,
      hasLastMessage: !!c.lastMessage
    })))
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
      console.log('[API/conversations] Token length:', token.length)
      console.log('[API/conversations] Token preview:', token)
      console.log('[API/conversations] Using secret:', JWT_SECRET.substring(0, 20) + '...')
      console.log('[API/conversations] Full secret length:', JWT_SECRET.length)
      
      // 🔥 ДОБАВЛЯЕМ ДЕКОДИРОВАНИЕ БЕЗ ПРОВЕРКИ ПОДПИСИ
      try {
        const decodedWithoutVerify = jwt.decode(token) as any
        console.log('[API/conversations] Decoded without verify:', {
          userId: decodedWithoutVerify?.userId,
          wallet: decodedWithoutVerify?.wallet,
          exp: decodedWithoutVerify?.exp,
          iat: decodedWithoutVerify?.iat
        })
      } catch (decodeError: any) {
        console.log('[API/conversations] Failed to decode token:', decodeError?.message || 'Unknown error')
      }
      
      decoded = jwt.verify(token, JWT_SECRET)
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
    
    // Проверяем существующий чат в обеих направлениях используя raw SQL
    const existingConversations = await prisma.$queryRaw<{
      id: string
      fromUserId: string
      toUserId: string
      lastMessageAt: Date | null
      createdAt: Date
      updatedAt: Date
      fromUser: any
      toUser: any
    }[]>`
      SELECT 
        c.id,
        c."fromUserId",
        c."toUserId",
        c."lastMessageAt",
        c."createdAt",
        c."updatedAt",
        json_build_object(
          'id', fu.id,
          'wallet', fu.wallet,
          'nickname', fu.nickname,
          'fullName', fu."fullName",
          'avatar', fu.avatar
        ) as "fromUser",
        json_build_object(
          'id', tu.id,
          'wallet', tu.wallet,
          'nickname', tu.nickname,
          'fullName', tu."fullName",
          'avatar', tu.avatar
        ) as "toUser"
      FROM "Conversation" c
      INNER JOIN users fu ON c."fromUserId" = fu.id
      INNER JOIN users tu ON c."toUserId" = tu.id
      WHERE (c."fromUserId" = ${user.id} AND c."toUserId" = ${participant.id})
         OR (c."fromUserId" = ${participant.id} AND c."toUserId" = ${user.id})
      LIMIT 1
    `
    
    console.log('[API/conversations] Existing conversation check result:', existingConversations.length > 0 ? 'found' : 'not found')
    
    if (existingConversations.length > 0) {
      const existingConversation = existingConversations[0]
      console.log('[API/conversations] Found existing conversation, returning it')
      
      const participants = [
        existingConversation.fromUser,
        existingConversation.toUser
      ]
      
      console.log('[API/conversations] Existing conversation returned with participants:', participants.length)
      
      return NextResponse.json({ 
        conversation: {
          id: existingConversation.id,
          fromUserId: existingConversation.fromUserId,
          toUserId: existingConversation.toUserId,
          lastMessageAt: existingConversation.lastMessageAt,
          createdAt: existingConversation.createdAt,
          updatedAt: existingConversation.updatedAt,
          participants
        }
      })
    }
    
    console.log('[API/conversations] Creating new conversation')
    
    let conversation
    try {
      // Создаем новый чат с fromUserId и toUserId
      console.log('[API/conversations] Starting conversation creation with participants')
      conversation = await prisma.conversation.create({
        data: {
          fromUserId: user.id,
          toUserId: participant.id
        }
      })
      
      console.log('[API/conversations] Conversation created with ID:', conversation.id)
      
      // Получаем участников для ответа
      const participants = await prisma.$queryRaw<{id: string, wallet: string | null, nickname: string | null, fullName: string | null, avatar: string | null}[]>`
        SELECT u.id, u.wallet, u.nickname, u."fullName", u.avatar
        FROM users u
        WHERE u.id IN (${user.id}, ${participant.id})
        ORDER BY u.id
      `
      
      console.log('[API/conversations] Successfully created conversation, returning response')
      
      return NextResponse.json({ 
        conversation: {
          id: conversation.id,
          fromUserId: conversation.fromUserId,
          toUserId: conversation.toUserId,
          lastMessageAt: conversation.lastMessageAt,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          participants
        }
      })
      
    } catch (createError) {
      console.error('[API/conversations] Error creating conversation:', {
        error: createError instanceof Error ? createError.message : 'Unknown create error',
        stack: createError instanceof Error ? createError.stack : undefined
      })
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }
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