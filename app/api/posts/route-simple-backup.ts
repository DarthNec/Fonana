import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// [post_creation_500_error_2025_017] Transformation function for imageAspectRatio
function transformAspectRatio(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  
  // Map string values to numeric aspect ratios
  const aspectMap: Record<string, number> = {
    'horizontal': 1.33,  // 4:3 landscape
    'vertical': 0.75,    // 3:4 portrait  
    'square': 1.0        // 1:1 square
  };
  
  return aspectMap[value] || 1.0; // Default to square if unknown
}
import { getUserByWallet } from '@/lib/db'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Simple posts API called')
    
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const skip = (page - 1) * limit

    // Простой запрос всех постов без сложных связей
    const posts = await prisma.post.findMany({
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            isCreator: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    const totalCount = await prisma.post.count()

    console.log(`[API] Found ${posts.length} posts, total: ${totalCount}`)

    return NextResponse.json({ 
      posts,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    })
  } catch (error) {
    console.error('[API] Posts error:', error)
    return NextResponse.json(
              { error: 'Failed to fetch posts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/posts - создать новый пост [create_post_405_2025_017]
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API] Creating post with data:', {
      userWallet: body.userWallet,
      type: body.type,
      category: body.category,
      title: body.title || 'empty',
      hasMedia: !!body.mediaUrl || !!body.thumbnail
    })
    
    // Проверяем обязательные поля
    if (!body.userWallet || !body.type) {
      console.log('[API] Missing required fields:', {
        userWallet: !!body.userWallet,
        type: !!body.type
      })
      return NextResponse.json({ error: 'Missing required fields: userWallet, type' }, { status: 400 })
    }
    
    // Получаем пользователя по кошельку
    const user = await getUserByWallet(body.userWallet)
    if (!user) {
      console.log('[API] User not found for wallet:', body.userWallet)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Для медиа-постов нужен хотя бы thumbnail или mediaUrl
    if (body.type !== 'text' && !body.mediaUrl && !body.thumbnail) {
      console.log('[API] Media post missing media files')
      return NextResponse.json({ error: 'Media files required for media posts' }, { status: 400 })
    }
    
    // Создаем пост с упрощенной структурой
    const postData = {
      creatorId: user.id,
      title: body.title || '',
      content: body.content || '',
      type: body.type,
      category: body.category || 'General',
      thumbnail: body.thumbnail || null,
      mediaUrl: body.mediaUrl || null,
      isLocked: body.isLocked || false,
      isPremium: body.isPremium || false,
      price: body.price || null,
      currency: body.currency || 'SOL',
      imageAspectRatio: transformAspectRatio(body.imageAspectRatio), // [post_creation_500_error_2025_017] Transform string to number
      isSellable: body.isSellable || false
    }
    
    // [post_creation_500_error_2025_017] Log aspect ratio transformation
    console.log('[API] Image aspect ratio transformation:', {
      original: body.imageAspectRatio,
      transformed: postData.imageAspectRatio,
      type: typeof body.imageAspectRatio
    })
    
    console.log('[API] Creating post in database...')
    const post = await prisma.post.create({
      data: postData,
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            isCreator: true
          }
        }
      }
    })
    
    // Обновляем счетчик постов у пользователя
    await prisma.user.update({
      where: { id: user.id },
      data: { postsCount: { increment: 1 } }
    })
    
    console.log('[API] Post created successfully:', post.id)
    
    return NextResponse.json({ 
      success: true,
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        type: post.type,
        category: post.category,
        thumbnail: post.thumbnail,
        mediaUrl: post.mediaUrl,
        createdAt: post.createdAt,
        creator: post.creator
      }
    })
  } catch (error) {
    console.error('[API] Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 