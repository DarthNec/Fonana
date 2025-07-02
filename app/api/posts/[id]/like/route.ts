import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyPostLike } from '@/lib/notifications'

// WebSocket события
import { updatePostLikes, sendNotification } from '@/lib/services/websocket-client'

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

    // Проверяем существует ли пост и получаем информацию об авторе
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: { 
        creator: true
      }
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

      // Отправляем WebSocket событие об удалении лайка
      try {
        await updatePostLikes(params.id, post.likesCount - 1)
      } catch (error) {
        console.error('WebSocket notification failed:', error)
      }

      return NextResponse.json({
        success: true,
        isLiked: false,
        likesCount: post.likesCount - 1,
        action: 'unliked'
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

      // Создаем уведомление для автора поста (если это не его собственный пост)
      if (post.creatorId !== userId) {
        // Получаем информацию о пользователе, который поставил лайк
        const liker = await prisma.user.findUnique({
          where: { id: userId },
          select: { nickname: true, fullName: true }
        })
        
        if (liker) {
          const likerName = liker.fullName || liker.nickname || 'Someone'
          const postTitle = post.title || 'your post'
          
          // Проверяем настройки уведомлений автора
          const authorSettings = await prisma.userSettings.findUnique({
            where: { userId: post.creatorId }
          })
          
          if (!authorSettings || authorSettings.notifyLikes) {
            await notifyPostLike(post.creatorId, likerName, postTitle, post.id)
            
            // Отправляем WebSocket уведомление
            try {
              await sendNotification(post.creatorId, {
                type: 'LIKE_POST',
                title: 'Новый лайк',
                message: `${likerName} лайкнул ваш пост "${postTitle}"`,
                metadata: { postId: post.id, userId }
              })
            } catch (error) {
              console.error('WebSocket notification failed:', error)
            }
          }
        }
      }

      // Отправляем WebSocket событие о новом лайке
      try {
        await updatePostLikes(params.id, post.likesCount + 1)
      } catch (error) {
        console.error('WebSocket notification failed:', error)
      }

      return NextResponse.json({
        success: true,
        isLiked: true,
        likesCount: post.likesCount + 1,
        action: 'liked'
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