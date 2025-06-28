import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  console.log('[Conversations API] Starting GET request')
  
  try {
    const userWallet = request.headers.get('x-user-wallet')
    console.log('[Conversations API] User wallet:', userWallet)
    
    if (!userWallet) {
      console.log('[Conversations API] No wallet provided')
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }
    
    // Получаем пользователя
    console.log('[Conversations API] Fetching user by wallet...')
    const user = await prisma.user.findUnique({
      where: { wallet: userWallet }
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
      
      return {
        id: conv.id,
        participant: otherParticipant,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.isPaid && !lastMessage.purchases?.some((p: any) => p.userId === user.id) 
            ? '💰 Paid message' 
            : lastMessage.content,
          senderId: lastMessage.senderId,
          senderName: lastMessage.sender.nickname,
          createdAt: lastMessage.createdAt,
          isPaid: lastMessage.isPaid,
          price: lastMessage.price
        } : null,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        unreadCount: unreadMap.get(conv.id) || 0
      }
    })
    
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
    const userWallet = request.headers.get('x-user-wallet')
    
    if (!userWallet) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }
    
    const { participantId } = await request.json()
    
    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID required' }, { status: 400 })
    }
    
    // Получаем обоих пользователей
    const [user, participant] = await Promise.all([
      prisma.user.findUnique({ where: { wallet: userWallet } }),
      prisma.user.findUnique({ where: { id: participantId } })
    ])
    
    if (!user || !participant) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем, существует ли уже чат между этими пользователями через raw query
    const existingConversations = await prisma.$queryRaw<{conversation_id: string}[]>`
      SELECT DISTINCT c1."A" as conversation_id
      FROM "_UserConversations" c1
      INNER JOIN "_UserConversations" c2 ON c1."A" = c2."A"
      WHERE c1."B" = ${user.id} AND c2."B" = ${participant.id}
      LIMIT 1
    `
    
    if (existingConversations.length > 0) {
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
      
      return NextResponse.json({ 
        conversation: {
          ...existingConversation,
          participants
        }
      })
    }
    
    // Создаем новый чат
    const conversation = await prisma.conversation.create({
      data: {}
    })
    
    // Добавляем участников через raw query
    await prisma.$executeRaw`
      INSERT INTO "_UserConversations" ("A", "B")
      VALUES 
        (${conversation.id}, ${user.id}),
        (${conversation.id}, ${participant.id})
    `
    
    // Получаем участников для ответа
    const participants = await prisma.$queryRaw<{id: string, wallet: string | null, nickname: string | null, fullName: string | null, avatar: string | null}[]>`
      SELECT u.id, u.wallet, u.nickname, u."fullName", u.avatar
      FROM users u
      WHERE u.id IN (${user.id}, ${participant.id})
    `
    
    return NextResponse.json({ 
      conversation: {
        ...conversation,
        participants
      }
    })
  } catch (error: any) {
    console.error('Error creating conversation:', error)
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }
} 