import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { remixGroupCache, RemixGroupCache } from '@/lib/cache/remixGroupCache'

const prisma = new PrismaClient()

// GET /api/posts/{id}/remixes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    
    // Параметры запроса
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    
    // Создаем ключ для кэша
    const cacheKey = RemixGroupCache.createRemixesKey(id, sortBy, sortOrder, limit, offset)
    
    // Проверяем кэш
    const cachedData = remixGroupCache.get(cacheKey)
    if (cachedData) {
      console.log('[API /posts/{id}/remixes] Cache hit for:', id)
      return NextResponse.json(cachedData)
    }
    
    console.log('[API /posts/{id}/remixes] Cache miss, fetching from database:', id)
    
    // Проверяем, что оригинальный пост существует
    const originalPost = await prisma.post.findUnique({
      where: { id },
      select: { id: true }
    })
    
    if (!originalPost) {
      return NextResponse.json(
        { success: false, error: 'Original post not found' },
        { status: 404 }
      )
    }
    
    // Определяем порядок сортировки
    const orderBy: any = {}
    switch (sortBy) {
      case 'likesCount':
        orderBy.likes = { _count: 'desc' }
        break
      case 'viewsCount':
        orderBy.viewsCount = 'desc'
        break
      case 'createdAt':
      default:
        orderBy.createdAt = sortOrder === 'desc' ? 'desc' : 'asc'
        break
    }
    
    // Получаем ремиксы
    const remixes = await prisma.post.findMany({
      where: { remixId: id },
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
      orderBy,
      take: limit,
      skip: offset
    })
    
    // Получаем общее количество ремиксов
    const totalCount = await prisma.post.count({
      where: { remixId: id }
    })
    
    console.log('[API /posts/{id}/remixes] Found remixes:', {
      originalPostId: id,
      remixesCount: remixes.length,
      totalCount,
      sortBy,
      sortOrder
    })
    
    const response = {
      success: true,
      data: {
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
    console.error('[API /posts/{id}/remixes] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
