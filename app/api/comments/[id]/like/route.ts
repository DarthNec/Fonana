import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Проверяем существует ли комментарий
    const comment = await prisma.comment.findUnique({
      where: { id: params.id }
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Проверяем, есть ли уже лайк
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId: params.id
        }
      }
    })

    if (existingLike) {
      // Удаляем лайк
      await prisma.$transaction([
        prisma.like.delete({
          where: { id: existingLike.id }
        }),
        prisma.comment.update({
          where: { id: params.id },
          data: { likesCount: { decrement: 1 } }
        })
      ])

      return NextResponse.json({
        success: true,
        isLiked: false,
        likesCount: comment.likesCount - 1
      })
    } else {
      // Добавляем лайк
      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId,
            commentId: params.id
          }
        }),
        prisma.comment.update({
          where: { id: params.id },
          data: { likesCount: { increment: 1 } }
        })
      ])

      return NextResponse.json({
        success: true,
        isLiked: true,
        likesCount: comment.likesCount + 1
      })
    }
  } catch (error) {
    console.error('Error toggling comment like:', error)
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    )
  }
} 