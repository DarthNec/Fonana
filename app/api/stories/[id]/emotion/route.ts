import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/stories/[id]/emotion
 * Добавить или удалить эмоцию на историю
 * 
 * Body: { userWallet: string, emotionId: number }
 * Params: id - storyId
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userWallet, emotionId } = await request.json()
    const storyId = params.id

    console.log('[Story Emotion API] POST request:', { userWallet, storyId, emotionId })

    // Валидация входных данных
    if (!userWallet) {
      return NextResponse.json(
        { success: false, error: 'userWallet is required' },
        { status: 400 }
      )
    }

    if (emotionId === undefined || emotionId === null) {
      return NextResponse.json(
        { success: false, error: 'emotionId is required' },
        { status: 400 }
      )
    }

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'storyId is required' },
        { status: 400 }
      )
    }

    // Находим пользователя по wallet
    const user = await prisma.user.findUnique({
      where: { wallet: userWallet }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Проверяем существование истории
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        userId: true
      }
    })

    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      )
    }

    // Проверяем, есть ли уже такая эмоция от этого пользователя на эту историю
    const existingEmotion = await (prisma as any).emotion.findUnique({
      where: {
        userId_storyId_emotionId: {
          userId: user.id,
          storyId: storyId,
          emotionId: emotionId
        }
      }
    })

    if (existingEmotion) {
      // Удаляем эмоцию (toggle behavior)
      await (prisma as any).emotion.delete({
        where: { id: existingEmotion.id }
      })

      console.log('[Story Emotion API] Emotion removed:', existingEmotion.id)

      return NextResponse.json({
        success: true,
        action: 'removed',
        emotionId: emotionId,
        message: 'Emotion removed from story'
      })
    } else {
      // Добавляем новую эмоцию
      const newEmotion = await (prisma as any).emotion.create({
        data: {
          userId: user.id,
          storyId: storyId,
          emotionId: emotionId,
          postId: null, // Для истории postId = null
          commentId: null, // Для истории commentId = null
          creatorId: story.userId // ID создателя истории
        }
      })

      console.log('[Story Emotion API] Emotion added:', newEmotion.id)

      return NextResponse.json({
        success: true,
        action: 'added',
        emotionId: emotionId,
        emotion: newEmotion,
        message: 'Emotion added to story'
      })
    }

  } catch (error) {
    console.error('[Story Emotion API] POST Error:', error)
    
    // Обработка ошибки уникального констрейнта
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This emotion is already added to this story'
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

