import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET /api/posts/video
 * Получение всех видео-постов
 */
export async function GET(request: NextRequest) {
  try {
    // userId опциональный - только для проверки isLiked
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || undefined

    console.log('[API /posts/video] GET request - fetching all videos', userId ? `(userId: ${userId})` : '')

    // Получаем все посты с типом video
    const videos = await prisma.post.findMany({
      where: {
        type: 'video'
      },
      include: {
        creator: {
          select: {
            id: true,
            wallet: true,
            nickname: true,
            fullName: true,
            avatar: true,
            bio: true,
            isCreator: true,
            isVerified: true
          }
        },
        // Лайки включаем только если userId передан
        ...(userId && {
          likes: {
            where: {
              userId: userId
            },
            select: {
              id: true,
              userId: true
            }
          }
        }),
        emotions: {
          select: {
            id: true,
            emotionId: true,
            userId: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                nickname: true,
                fullName: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            emotions: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`[API /posts/video] Found ${videos.length} videos`)

    // Преобразуем данные в формат для фронтенда
    const formattedVideos = videos.map(video => ({
      id: video.id,
      creatorId: video.creatorId,
      creator: video.creator,
      title: video.title,
      content: video.content || '',
      type: video.type,
      category: video.category,
      thumbnail: video.thumbnail,
      mediaUrl: video.mediaUrl,
      requestId: video.requestId,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      likesCount: video._count.likes,
      emotionsCount: video._count.emotions,
      commentsCount: video._count.comments,
      viewsCount: 0, // TODO: Add views tracking
      isLiked: userId && 'likes' in video ? (video.likes as any[]).length > 0 : false,
      emotions: video.emotions
    }))

    return NextResponse.json({
      success: true,
      posts: formattedVideos,
      totalCount: formattedVideos.length
    })

  } catch (error) {
    console.error('[API /posts/video] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch videos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

