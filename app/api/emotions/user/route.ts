import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET /api/emotions/user?userId=xxx
 * Получить все эмоции пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    console.log('[Emotions User API] GET request for userId:', userId)

    // Валидация userId
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    // Получаем все эмоции пользователя
    const emotions = await (prisma as any).emotion.findMany({
      where: {
        userId: userId
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            type: true,
            mediaUrl: true,
            createdAt: true,
            creator: {
              select: {
                id: true,
                nickname: true,
                fullName: true,
                avatar: true
              }
            }
          }
        },
        comment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            postId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('[Emotions User API] Found emotions:', emotions.length)

    // Форматируем ответ
    const formattedEmotions = emotions.map((emotion: any) => ({
      id: emotion.id,
      emotionId: emotion.emotionId,
      createdAt: emotion.createdAt,
      postId: emotion.post.id
    }))

    return NextResponse.json({
      success: true,
      data: formattedEmotions,
      count: formattedEmotions.length
    })

  } catch (error) {
    console.error('[Emotions User API] Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

