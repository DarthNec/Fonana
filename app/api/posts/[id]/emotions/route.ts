import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/posts/[id]/emotions
 * Получить эмоции для поста
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    console.log('[Emotions API] GET request for post:', params.id, 'userId:', userId)

    // Получаем все эмоции для поста
    const emotions = await (prisma as any).emotion.findMany({
      where: {
        postId: params.id
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedEmotions = emotions.map((emotion: any) => ({
      id: emotion.id,
      emotionId: emotion.emotionId,
      userId: emotion.userId,
      createdAt: emotion.createdAt,
      user: {
        id: emotion.user.id,
        name: emotion.user.fullName || emotion.user.nickname || 'Unknown',
        username: emotion.user.nickname || 'unknown',
        avatar: emotion.user.avatar
      }
    }))

    // Если передан userId, добавляем информацию о выбранных эмоциях пользователя
    let userEmotions: number[] = []
    if (userId) {
      userEmotions = formattedEmotions
        .filter((e: any) => e.userId === userId)
        .map((e: any) => e.emotionId)
    }

    return NextResponse.json({
      success: true,
      data: formattedEmotions,
      count: formattedEmotions.length,
      userEmotions // ID эмоций текущего пользователя
    })

  } catch (error) {
    console.error('[Emotions API] GET Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/posts/[id]/emotions
 * Добавить, обновить или удалить эмоцию
 * 
 * Body: { userId: string, emotionId: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { userId, emotionId } = body

    console.log('[Emotions API] POST request:', {
      postId: params.id,
      userId,
      emotionId
    })

    // Валидация входных данных
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    if (emotionId === undefined || emotionId === null) {
      return NextResponse.json(
        { success: false, error: 'emotionId is required' },
        { status: 400 }
      )
    }

    if (typeof emotionId !== 'number' || emotionId < 1 || emotionId > 6) {
      return NextResponse.json(
        { success: false, error: 'emotionId must be a number between 1 and 6' },
        { status: 400 }
      )
    }

    // Проверяем, существует ли пост и получаем creatorId
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, creatorId: true }
    })

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    console.log('[Emotions API] Post found:', post.id, post.title, 'creatorId:', post.creatorId)

    // Проверяем существующие эмоции пользователя на этом посту
    const existingEmotions = await (prisma as any).emotion.findMany({
      where: {
        userId: userId,
        postId: params.id
      }
    })

    console.log('[Emotions API] Existing emotions:', existingEmotions.length)

    // Проверяем, есть ли уже эмоция с таким же emotionId
    const sameEmotion = existingEmotions.find((e: any) => e.emotionId === emotionId)
    
    if (sameEmotion) {
      // Если эмоция с таким же ID существует - удаляем (toggle off)
      console.log('[Emotions API] Same emotion found, deleting:', sameEmotion.id)
      
      await (prisma as any).emotion.delete({
        where: { id: sameEmotion.id }
      })

      return NextResponse.json({
        success: true,
        action: 'removed',
        data: {
          userId: userId,
          postId: params.id,
          emotionId: emotionId,
          message: 'Emotion removed'
        }
      })
    }

    // Проверяем, есть ли другая эмоция
    const otherEmotion = existingEmotions.find((e: any) => e.emotionId !== emotionId)
    
    if (otherEmotion) {
      // Если есть другая эмоция - обновляем
      console.log('[Emotions API] Other emotion found, updating:', otherEmotion.id, 'from', otherEmotion.emotionId, 'to', emotionId)
      
      const updatedEmotion = await (prisma as any).emotion.update({
        where: { id: otherEmotion.id },
        data: { 
          emotionId: emotionId,
          creatorId: post.creatorId // Добавляем creatorId
        }
      })

      return NextResponse.json({
        success: true,
        action: 'updated',
        data: {
          id: updatedEmotion.id,
          userId: userId,
          postId: params.id,
          emotionId: emotionId,
          createdAt: updatedEmotion.createdAt,
          message: 'Emotion updated'
        }
      })
    }

    // Если эмоций нет - создаём новую
    console.log('[Emotions API] No emotions found, creating new')
    
    const newEmotion = await (prisma as any).emotion.create({
      data: {
        userId: userId,
        postId: params.id,
        emotionId: emotionId,
        creatorId: post.creatorId // Добавляем creatorId
      }
    })

    return NextResponse.json({
      success: true,
      action: 'created',
      data: {
        id: newEmotion.id,
        userId: userId,
        postId: params.id,
        emotionId: emotionId,
        createdAt: newEmotion.createdAt,
        message: 'Emotion created'
      }
    })

  } catch (error) {
    console.error('[Emotions API] POST Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

