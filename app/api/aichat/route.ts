import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 30

// GET - получить сообщения AI чата
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const cursor = searchParams.get('cursor') // ID последнего сообщения для пагинации
    
    console.log('[AiChat API] GET request - fetching messages', { limit, cursor })
    
    const messages = await (prisma as any).aiChatMessage.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      ...(cursor ? {
        cursor: { id: cursor },
        skip: 1 // Пропускаем сам курсор
      } : {})
    })
    
    // Возвращаем в хронологическом порядке (старые сначала)
    const sortedMessages = messages.reverse()
    
    console.log('[AiChat API] Found messages:', messages.length)
    
    return NextResponse.json({
      success: true,
      messages: sortedMessages,
      nextCursor: messages.length === limit ? messages[messages.length - 1]?.id : null
    })
    
  } catch (error) {
    console.error('[AiChat API] GET error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch AI chat messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - добавить сообщение в AI чат
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, nickname, avatar, message } = body
    
    if (!userId || !nickname || !message) {
      return NextResponse.json(
        { error: 'userId, nickname and message are required' },
        { status: 400 }
      )
    }
    
    console.log('[AiChat API] POST request - creating message', { userId, nickname, messageLength: message.length })
    
    const newMessage = await (prisma as any).aiChatMessage.create({
      data: {
        userId,
        nickname,
        avatar: avatar || null,
        message
      }
    })
    
    console.log('[AiChat API] Message created:', newMessage.id)
    
    return NextResponse.json({
      success: true,
      message: newMessage
    })
    
  } catch (error) {
    console.error('[AiChat API] POST error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create AI chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
