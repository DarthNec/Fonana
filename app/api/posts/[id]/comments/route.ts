import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyNewComment, notifyCommentReply } from '@/lib/notifications'

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
      userId: comment.userId,
      user: {
        id: comment.user.id,
        nickname: comment.user.nickname,
        fullName: comment.user.fullName,
        avatar: comment.user.avatar,
        isVerified: comment.user.isVerified
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      likesCount: comment._count.likes,
      isAnonymous: comment.isAnonymous,
      parentId: comment.parentId,
      replies: comment.replies.map(reply => ({
        id: reply.id,
        userId: reply.userId,
        user: {
          id: reply.user.id,
          nickname: reply.user.nickname,
          fullName: reply.user.fullName,
          avatar: reply.user.avatar,
          isVerified: reply.user.isVerified
        },
        content: reply.content,
        createdAt: reply.createdAt.toISOString(),
        likesCount: reply._count.likes,
        isAnonymous: reply.isAnonymous,
        parentId: reply.parentId
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
    const { userId, content, parentId, isAnonymous = false } = await request.json()

    if (!userId || !content) {
      return NextResponse.json(
        { error: 'User ID and content are required' },
        { status: 400 }
      )
    }

    // Проверяем существует ли пост и получаем информацию об авторе
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: { creator: true }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Если это ответ на комментарий, получаем информацию о родительском комментарии
    let parentComment = null
    if (parentId) {
      parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        include: { user: true }
      })
    }

    // Создаем комментарий
    const comment = await prisma.comment.create({
      data: {
        postId: params.id,
        userId,
        content,
        parentId,
        isAnonymous
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

    // Создаем уведомления
    const commenterName = comment.user.fullName || comment.user.nickname || 'Someone'
    
    if (parentComment) {
      // Это ответ на комментарий
      if (parentComment.userId !== userId) {
        // Проверяем настройки уведомлений пользователя
        const userSettings = await prisma.userSettings.findUnique({
          where: { userId: parentComment.userId }
        })
        
        if (!userSettings || userSettings.notifyComments) {
          await notifyCommentReply(
            parentComment.userId,
            commenterName,
            parentComment.content.slice(0, 50),
            params.id,
            comment.id
          )
        }
      }
    } else {
      // Это комментарий к посту
      if (post.creatorId !== userId) {
        // Проверяем настройки уведомлений автора
        const authorSettings = await prisma.userSettings.findUnique({
          where: { userId: post.creatorId }
        })
        
        if (!authorSettings || authorSettings.notifyComments) {
          await notifyNewComment(
            post.creatorId,
            commenterName,
            post.title || 'your post',
            params.id,
            comment.id
          )
        }
      }
    }

    // Форматируем комментарий для клиента
    const formattedComment = {
      id: comment.id,
      userId: comment.userId,
      user: {
        id: comment.user.id,
        nickname: comment.user.nickname,
        fullName: comment.user.fullName,
        avatar: comment.user.avatar,
        isVerified: comment.user.isVerified
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      likesCount: 0,
      isAnonymous: comment.isAnonymous,
      parentId: comment.parentId,
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