import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        postId: params.id,
        parentId: null // Только комментарии верхнего уровня
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            isVerified: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                fullName: true,
                avatar: true,
                isVerified: true
              }
            },
            _count: {
              select: { likes: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { likes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Форматируем комментарии для клиента
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      user: {
        id: comment.user.id,
        name: comment.user.fullName || comment.user.nickname,
        username: comment.user.nickname || comment.user.id,
        avatar: comment.user.avatar,
        isVerified: comment.user.isVerified
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      likes: comment._count.likes,
      replies: comment.replies.map(reply => ({
        id: reply.id,
        user: {
          id: reply.user.id,
          name: reply.user.fullName || reply.user.nickname,
          username: reply.user.nickname || reply.user.id,
          avatar: reply.user.avatar,
          isVerified: reply.user.isVerified
        },
        content: reply.content,
        createdAt: reply.createdAt.toISOString(),
        likes: reply._count.likes
      }))
    }))

    return NextResponse.json({ comments: formattedComments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, content, parentId } = await request.json()

    if (!userId || !content) {
      return NextResponse.json(
        { error: 'User ID and content are required' },
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

    // Создаем комментарий
    const comment = await prisma.comment.create({
      data: {
        postId: params.id,
        userId,
        content,
        parentId
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            isVerified: true
          }
        }
      }
    })

    // Увеличиваем счетчик комментариев
    await prisma.post.update({
      where: { id: params.id },
      data: { commentsCount: { increment: 1 } }
    })

    // Форматируем комментарий для клиента
    const formattedComment = {
      id: comment.id,
      user: {
        id: comment.user.id,
        name: comment.user.fullName || comment.user.nickname,
        username: comment.user.nickname || comment.user.id,
        avatar: comment.user.avatar,
        isVerified: comment.user.isVerified
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      likes: 0,
      replies: []
    }

    return NextResponse.json({
      success: true,
      comment: formattedComment
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
} 