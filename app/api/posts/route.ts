import { NextRequest, NextResponse } from 'next/server'
import { createPost, getPostsByCreator, getAllPosts } from '@/lib/db'
import { getUserByWallet } from '@/lib/db'

// GET /api/posts - получить посты
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const creatorId = searchParams.get('creatorId')
    const wallet = searchParams.get('wallet')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    let posts;
    
    if (creatorId) {
      // Получить посты конкретного креатора
      posts = await getPostsByCreator(creatorId, { limit, offset })
    } else if (wallet) {
      // Получить посты по wallet адресу
      const user = await getUserByWallet(wallet)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      posts = await getPostsByCreator(user.id, { limit, offset })
    } else {
      // Получить все посты
      posts = await getAllPosts({ limit, offset })
    }

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Error getting posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/posts - создать новый пост
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, ...postData } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    if (!postData.title || !postData.content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    // Проверяем существование пользователя
    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Создаем пост
    const post = await createPost(wallet, {
      title: postData.title,
      content: postData.content,
      type: postData.type || 'text',
      category: postData.category,
      thumbnail: postData.thumbnail,
      mediaUrl: postData.mediaUrl,
      isLocked: postData.isLocked || false,
      isPremium: postData.isPremium || false,
      price: postData.price,
      currency: postData.currency || 'SOL',
      tags: postData.tags || []
    })

    return NextResponse.json({ 
      success: true,
      post 
    })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 