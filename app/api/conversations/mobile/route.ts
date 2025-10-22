import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/conversations/mobile?userId=xxx - получить все чаты пользователя
export async function GET(request: Request) {
  try {
    console.log('[API/conversations/mobile] Starting GET request')
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // Валидация userId
    if (!userId) {
      console.log('[API/conversations/mobile] No userId provided')
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    console.log('[API/conversations/mobile] Fetching conversations for user:', userId)
    
    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      console.log('[API/conversations/mobile] User not found')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Получаем все чаты пользователя с использованием raw query для оптимизации
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
      WHERE c."fromUserId" = ${userId} OR c."toUserId" = ${userId}
      ORDER BY c."lastMessageAt" DESC NULLS LAST, c."createdAt" DESC
    `
    
    console.log('[API/conversations/mobile] Found conversations:', conversations.length)
    
    if (conversations.length === 0) {
      console.log('[API/conversations/mobile] No conversations found')
      return NextResponse.json({ 
        success: true,
        conversations: [] 
      })
    }
    
    // Получаем непрочитанные сообщения для каждого чата
    const unreadCounts = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map(c => c.id) },
        senderId: { not: userId },
        isRead: false
      },
      _count: {
        id: true
      }
    })
    
    console.log('[API/conversations/mobile] Unread counts calculated:', unreadCounts.length)
    
    // Создаем map для быстрого доступа к количеству непрочитанных
    const unreadMap = new Map(
      unreadCounts.map((item: any) => [item.conversationId, item._count.id])
    )
    
    // Форматируем данные для клиента
    const formattedConversations = conversations.map((conv: any) => {
      // Определяем другого участника чата
      const otherParticipant = conv.fromUserId === userId ? conv.toUser : conv.fromUser
      const lastMessage = conv.lastMessage
      
      // Проверка на наличие участника
      if (!otherParticipant) {
        console.warn('[API/conversations/mobile] No other participant for conversation:', conv.id)
        return null
      }
      
      return {
        id: conv.id,
        participant: {
          id: otherParticipant.id,
          nickname: otherParticipant.nickname || 'Unknown',
          fullName: otherParticipant.fullName || null,
          avatar: otherParticipant.avatar || null,
          wallet: otherParticipant.wallet || null
        },
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          // Скрываем контент платного сообщения если не куплено
          content: lastMessage.isPaid && !lastMessage.purchases?.some((p: any) => p.userId === userId)
            ? '💰 Paid message' 
            : lastMessage.content,
          senderId: lastMessage.senderId,
          senderName: lastMessage.sender?.nickname || 'Unknown',
          createdAt: lastMessage.createdAt,
          isPaid: lastMessage.isPaid || false,
          price: lastMessage.price || null,
          isPurchased: lastMessage.purchases?.some((p: any) => p.userId === userId) || false
        } : null,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        unreadCount: unreadMap.get(conv.id) || 0
      }
    }).filter(Boolean) // Убираем null значения
    
    console.log('[API/conversations/mobile] Successfully formatted conversations:', formattedConversations.length)
    
    return NextResponse.json({ 
      success: true,
      conversations: formattedConversations 
    })
    
  } catch (error) {
    console.error('[API/conversations/mobile] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch conversations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/conversations/mobile - создать новый чат
export async function POST(request: Request) {
  try {
    console.log('[API/conversations/mobile] Starting POST request')
    
    const { userId, otherUserId } = await request.json()
    
    // Валидация
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    if (!otherUserId) {
      return NextResponse.json({ error: 'Other user ID is required' }, { status: 400 })
    }
    
    if (userId === otherUserId) {
      return NextResponse.json({ error: 'Cannot create conversation with yourself' }, { status: 400 })
    }
    
    console.log('[API/conversations/mobile] Creating conversation:', { userId, otherUserId })
    
    // Проверяем существование обоих пользователей
    const [user, otherUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: otherUserId } })
    ])
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    if (!otherUser) {
      return NextResponse.json({ error: 'Other user not found' }, { status: 404 })
    }
    
    // Проверяем, не существует ли уже чат между этими пользователями
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { fromUserId: userId, toUserId: otherUserId },
          { fromUserId: otherUserId, toUserId: userId }
        ]
      },
      include: {
        fromUser: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            wallet: true
          }
        },
        toUser: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            wallet: true
          }
        }
      }
    })
    
    if (existingConversation) {
      console.log('[API/conversations/mobile] Conversation already exists:', existingConversation.id)
      
      // Форматируем существующий чат
      const otherParticipant = existingConversation.fromUserId === userId 
        ? existingConversation.toUser 
        : existingConversation.fromUser
      
      return NextResponse.json({
        success: true,
        conversation: {
          id: existingConversation.id,
          participant: {
            id: otherParticipant.id,
            nickname: otherParticipant.nickname || 'Unknown',
            fullName: otherParticipant.fullName || null,
            avatar: otherParticipant.avatar || null,
            wallet: otherParticipant.wallet || null
          },
          lastMessage: null,
          lastMessageAt: existingConversation.lastMessageAt,
          createdAt: existingConversation.createdAt,
          unreadCount: 0
        },
        message: 'Conversation already exists'
      })
    }
    
    // Создаем новый чат
    const conversation = await prisma.conversation.create({
      data: {
        fromUserId: userId,
        toUserId: otherUserId
      },
      include: {
        fromUser: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            wallet: true
          }
        },
        toUser: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            wallet: true
          }
        }
      }
    })
    
    console.log('[API/conversations/mobile] Conversation created:', conversation.id)
    
    // Форматируем созданный чат
    const otherParticipant = conversation.fromUserId === userId 
      ? conversation.toUser 
      : conversation.fromUser
    
    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        participant: {
          id: otherParticipant.id,
          nickname: otherParticipant.nickname || 'Unknown',
          fullName: otherParticipant.fullName || null,
          avatar: otherParticipant.avatar || null,
          wallet: otherParticipant.wallet || null
        },
        lastMessage: null,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        unreadCount: 0
      },
      message: 'Conversation created successfully'
    })
    
  } catch (error) {
    console.error('[API/conversations/mobile] POST Error:', error)
    return NextResponse.json({ 
      error: 'Failed to create conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


