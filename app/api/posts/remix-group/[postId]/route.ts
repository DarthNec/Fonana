import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { remixGroupCache, RemixGroupCache } from '@/lib/cache/remixGroupCache'

const prisma = new PrismaClient()

// GET /api/posts/remix-group/{postId}
export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params
    const { searchParams } = new URL(request.url)
    
    // Параметры запроса
    const includeOriginal = searchParams.get('includeOriginal') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Создаем ключ для кэша
    const cacheKey = RemixGroupCache.createRemixGroupKey(postId, includeOriginal, limit, offset)
    
    // Проверяем кэш
    const cachedData = remixGroupCache.get(cacheKey)
    if (cachedData) {
      console.log('[API /posts/remix-group] Cache hit for:', postId)
      return NextResponse.json(cachedData)
    }
    
    console.log('[API /posts/remix-group] Cache miss, fetching from database:', postId)
    
    // Получаем оригинальный пост
    const originalPost = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            fullName: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    })
    
    if (!originalPost) {
      return NextResponse.json(
        { success: false, error: 'Original post not found' },
        { status: 404 }
      )
    }
    
    // Получаем ремиксы этого поста
    const remixes = await prisma.post.findMany({
      where: { remixId: postId },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            fullName: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset
    })
    
    // Получаем общее количество ремиксов
    const totalCount = await prisma.post.count({
      where: { remixId: postId }
    })
    
    // Формируем группу ремиксов
    const remixGroup = includeOriginal 
      ? [originalPost, ...remixes]
      : remixes
    
    console.log('[API /posts/remix-group] Found remix group:', {
      originalPostId: postId,
      remixesCount: remixes.length,
      totalCount,
      includeOriginal
    })
    
    const response = {
      success: true,
      data: {
        originalPost: {
          id: originalPost.id,
          title: originalPost.title,
          content: originalPost.content,
          type: originalPost.type,
          category: originalPost.category,
          thumbnail: originalPost.thumbnail,
          mediaUrl: originalPost.mediaUrl,
          requestId: originalPost.requestId,
          isLocked: originalPost.isLocked,
          minSubscriptionTier: originalPost.minSubscriptionTier,
          remixId: originalPost.remixId,
          createdAt: originalPost.createdAt,
          updatedAt: originalPost.updatedAt,
          creator: originalPost.creator,
          likesCount: originalPost._count.likes,
          commentsCount: originalPost._count.comments
        },
        remixes: remixes.map(remix => ({
          id: remix.id,
          title: remix.title,
          content: remix.content,
          type: remix.type,
          category: remix.category,
          thumbnail: remix.thumbnail,
          mediaUrl: remix.mediaUrl,
          requestId: remix.requestId,
          isLocked: remix.isLocked,
          minSubscriptionTier: remix.minSubscriptionTier,
          remixId: remix.remixId,
          createdAt: remix.createdAt,
          updatedAt: remix.updatedAt,
          creator: remix.creator,
          likesCount: remix._count.likes,
          commentsCount: remix._count.comments
        })),
        totalCount,
        hasMore: offset + remixes.length < totalCount,
        pagination: {
          limit,
          offset,
          total: totalCount
        }
      }
    }
    
    // Сохраняем в кэш
    remixGroupCache.set(cacheKey, response)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[API /posts/remix-group] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
 