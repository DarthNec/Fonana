import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем userId из query параметров
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ isLiked: false, likesCount: 0 })
    }

    // Проверяем, есть ли лайк от пользователя
    const like = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: params.id
        }
      }
    })

    // Получаем количество лайков
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { likesCount: true }
    })

    return NextResponse.json({
      isLiked: !!like,
      likesCount: post?.likesCount || 0
    })
  } catch (error) {
    console.error('Error getting like status:', error)
    return NextResponse.json(
      { error: 'Failed to get like status' },
      { status: 500 }
    )
  }
}

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

    // Проверяем существует ли пост
    const post = await prisma.post.findUnique({
      where: { id: params.id }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Проверяем, есть ли уже лайк
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: params.id
        }
      }
    })

    if (existingLike) {
      // Удаляем лайк
      await prisma.$transaction([
        prisma.like.delete({
          where: { id: existingLike.id }
        }),
        prisma.post.update({
          where: { id: params.id },
          data: { likesCount: { decrement: 1 } }
        })
      ])

      return NextResponse.json({
        success: true,
        isLiked: false,
        likesCount: post.likesCount - 1
      })
    } else {
      // Добавляем лайк
      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId,
            postId: params.id
          }
        }),
        prisma.post.update({
          where: { id: params.id },
          data: { likesCount: { increment: 1 } }
        })
      ])

      return NextResponse.json({
        success: true,
        isLiked: true,
        likesCount: post.likesCount + 1
      })
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    )
  }
} 