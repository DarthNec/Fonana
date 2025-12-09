import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/comments/[id]/emotion
 * Добавить или удалить эмоцию на комментарий
 * 
 * Body: { userWallet: string, emotionId: number }
 * Params: id - commentId
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userWallet, emotionId } = await request.json()
    const commentId = params.id

    console.log('[Comment Emotion API] POST request:', { userWallet, commentId, emotionId })

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

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'commentId is required' },
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

    // Проверяем существование комментария
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            creatorId: true
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Проверяем, есть ли уже такая эмоция от этого пользователя на этот комментарий
    const existingEmotion = await (prisma as any).emotion.findUnique({
      where: {
        userId_commentId_emotionId: {
          userId: user.id,
          commentId: commentId,
          emotionId: emotionId
        }
      }
    })

    if (existingEmotion) {
      // Удаляем эмоцию (toggle behavior)
      await (prisma as any).emotion.delete({
        where: { id: existingEmotion.id }
      })

      console.log('[Comment Emotion API] Emotion removed:', existingEmotion.id)

      return NextResponse.json({
        success: true,
        action: 'removed',
        emotionId: emotionId,
        message: 'Emotion removed from comment'
      })
    } else {
      // Добавляем новую эмоцию
      const newEmotion = await (prisma as any).emotion.create({
        data: {
          userId: user.id,
          commentId: commentId,
          emotionId: emotionId,
          postId: null, // Для комментария postId = null
          creatorId: comment.post.creatorId // ID создателя поста
        }
      })

      console.log('[Comment Emotion API] Emotion added:', newEmotion.id)

      return NextResponse.json({
        success: true,
        action: 'added',
        emotionId: emotionId,
        emotion: newEmotion,
        message: 'Emotion added to comment'
      })
    }

  } catch (error) {
    console.error('[Comment Emotion API] POST Error:', error)
    
    // Обработка ошибки уникального констрейнта
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This emotion is already added to this comment'
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

