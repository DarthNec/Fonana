import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/emotions/[userid]
 * Получить все эмоции на постах пользователя от других пользователей
 * 
 * Params: userId - ID создателя постов
 * Returns: Массив эмоций с данными пользователя и поста
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userid: string } }
) {
  try {
    const creatorId = params.userid

    console.log('[Emotions Creator API] GET request for creatorId:', creatorId)

    if (!creatorId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    // Проверяем существование пользователя
    const creator = await prisma.user.findUnique({
      where: { id: creatorId }
    })

    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Находим все эмоции на постах этого пользователя от других пользователей
    const emotions = await (prisma as any).emotion.findMany({
      where: {
        creatorId: creatorId,
        userId: {
          not: creatorId // Исключаем эмоции от самого себя
        }
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            wallet: true,
            isVerified: true
          }
        },
        post: {
          include: {
            creator: {
              select: {
                id: true,
                nickname: true,
                fullName: true,
                avatar: true,
                isVerified: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('[Emotions Creator API] Found emotions:', emotions.length)

    // Форматируем данные с проверкой на null
    const formattedEmotions: any[] = []
    
    for (const emotion of emotions) {
      // Проверяем наличие связанных данных
      if (!emotion.user) {
        console.error('[Emotions Creator API] Missing user for emotion:', {
          emotionId: emotion.id,
          emotionType: emotion.emotionId,
          userId: emotion.userId,
          postId: emotion.postId
        })
        continue // Пропускаем эту эмоцию
      }
      
      if (!emotion.post) {
        console.error('[Emotions Creator API] Missing post for emotion:', {
          emotionId: emotion.id,
          emotionType: emotion.emotionId,
          userId: emotion.userId,
          postId: emotion.postId
        })
        continue // Пропускаем эту эмоцию
      }
      
      if (!emotion.post.creator) {
        console.error('[Emotions Creator API] Missing post.creator for emotion:', {
          emotionId: emotion.id,
          emotionType: emotion.emotionId,
          postId: emotion.postId,
          postCreatorId: emotion.post.creatorId
        })
        continue // Пропускаем эту эмоцию
      }
      
      formattedEmotions.push({
        user: {
          id: emotion.user.id,
          name: emotion.user.fullName || emotion.user.nickname || 'Unknown',
          username: emotion.user.nickname || 'unknown',
          avatar: emotion.user.avatar,
          wallet: emotion.user.wallet,
          isVerified: emotion.user.isVerified
        },
        post: {
          id: emotion.post.id,
          title: emotion.post.title,
          content: emotion.post.content,
          type: emotion.post.type,
          category: emotion.post.category,
          thumbnail: emotion.post.thumbnail,
          mediaUrl: emotion.post.mediaUrl,
          blurUrl: emotion.post.blurUrl,
          previewUrl: emotion.post.previewUrl,
          isLocked: emotion.post.isLocked,
          isPremium: emotion.post.isPremium,
          price: emotion.post.price,
          currency: emotion.post.currency,
          likesCount: emotion.post.likesCount,
          commentsCount: emotion.post.commentsCount,
          viewsCount: emotion.post.viewsCount,
          createdAt: emotion.post.createdAt,
          updatedAt: emotion.post.updatedAt,
          creator: {
            id: emotion.post.creator.id,
            name: emotion.post.creator.fullName || emotion.post.creator.nickname || 'Unknown',
            username: emotion.post.creator.nickname || 'unknown',
            avatar: emotion.post.creator.avatar,
            isVerified: emotion.post.creator.isVerified
          }
        },
        emotionId: emotion.emotionId,
        createdAt: emotion.createdAt
      })
    }
    
    console.log('[Emotions Creator API] Formatted emotions:', formattedEmotions.length, 'of', emotions.length)

    return NextResponse.json({
      success: true,
      data: formattedEmotions,
      count: formattedEmotions.length
    })

  } catch (error) {
    console.error('[Emotions Creator API] GET Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

