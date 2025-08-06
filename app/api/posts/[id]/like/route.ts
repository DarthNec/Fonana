import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyPostLike } from '@/lib/notifications'
import { validateApiRequest, likePostSchema } from '@/lib/utils/validators'

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
    console.log('🎯 [LIKE API] POST request received for post:', params.id)
    
    const body = await request.json()
    console.log('🎯 [LIKE API] Request body:', body)
    
    // Валидация входных данных
    const validatedData = validateApiRequest(likePostSchema, {
      postId: params.id,
      userId: body.userId
    })

    const { userId } = validatedData
    console.log('🎯 [LIKE API] Validated userId:', userId)
    
    if (!userId) {
      console.error('🎯 [LIKE API] No userId provided')
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

    console.log('🎯 [LIKE API] Post found:', {
      postId: post?.id,
      postTitle: post?.title,
      creatorId: post?.creatorId,
      currentLikesCount: post?.likesCount
    })

    if (!post) {
      console.error('🎯 [LIKE API] Post not found:', params.id)
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

    console.log('🎯 [LIKE API] Existing like check:', {
      userId,
      postId: params.id,
      existingLike: !!existingLike,
      likeId: existingLike?.id
    })

    if (existingLike) {
      console.log('🎯 [LIKE API] Removing like...')
      
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

      const newLikesCount = post.likesCount - 1
      console.log('🎯 [LIKE API] Like removed successfully. New count:', newLikesCount)

      // Отправляем WebSocket событие об удалении лайка
      try {
        await updatePostLikes(params.id, newLikesCount, userId)
      } catch (error) {
        console.error('WebSocket notification failed:', error)
      }

      const response = {
        success: true,
        isLiked: false,
        likesCount: newLikesCount,
        action: 'unliked'
      }
      
      console.log('🎯 [LIKE API] Returning response:', response)
      return NextResponse.json(response)
    } else {
      console.log('🎯 [LIKE API] Adding like...')
      
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

      const newLikesCount = post.likesCount + 1
      console.log('🎯 [LIKE API] Like added successfully. New count:', newLikesCount)

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
        await updatePostLikes(params.id, newLikesCount, userId)
      } catch (error) {
        console.error('WebSocket notification failed:', error)
      }

      const response = {
        success: true,
        isLiked: true,
        likesCount: newLikesCount,
        action: 'liked'
      }
      
      console.log('🎯 [LIKE API] Returning response:', response)
      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    )
  }
} 