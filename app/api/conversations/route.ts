import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userWallet = request.headers.get('x-user-wallet')
    
    if (!userWallet) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { wallet: userWallet }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Получаем все чаты пользователя
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
            }
          }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      }
    })
    
    // Форматируем данные
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
        createdAt: conv.createdAt
      }
    })
    
    return NextResponse.json({ conversations: formattedConversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
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