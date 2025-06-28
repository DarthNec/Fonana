// @ts-nocheck
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
    
    // Получаем все чаты пользователя
    console.log('[Conversations API] Fetching conversations...')
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            id: user.id
          }
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            wallet: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        },
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
    console.log('[Conversations API] Found conversations:', conversations.length)
    
    // Получаем непрочитанные сообщения для каждого чата
    const conversationIds = conversations.map((conv: any) => conv.id)
    console.log('[Conversations API] Getting unread counts for conversation IDs:', conversationIds)
    
    const unreadCounts = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
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
  } catch (error) {
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
    
    // Проверяем, существует ли уже чат между этими пользователями
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: user.id } } },
          { participants: { some: { id: participant.id } } }
        ]
      }
    })
    
    if (existingConversation) {
      return NextResponse.json({ conversation: existingConversation })
    }
    
    // Создаем новый чат
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          connect: [
            { id: user.id },
            { id: participant.id }
          ]
        }
      },
      include: {
        participants: {
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
    
    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }
} 