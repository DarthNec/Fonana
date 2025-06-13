import { NextRequest, NextResponse } from 'next/server'
import { getPosts, createPost, getPostsByCreator, getUserByWallet } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/posts - получить список постов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get('creatorId')
    const wallet = searchParams.get('wallet')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let posts
    if (creatorId) {
      posts = await getPostsByCreator(creatorId, { limit, offset })
    } else if (wallet) {
      const user = await getUserByWallet(wallet)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      posts = await getPostsByCreator(user.id, { limit, offset })
    } else {
      posts = await getPosts({ limit, offset })
    }

    // Форматируем посты для фронтенда
    const formattedPosts = posts.map((post: any) => ({
      ...post,
      creator: {
        ...post.creator,
        name: post.creator.fullName || post.creator.nickname || post.creator.wallet.slice(0, 6) + '...',
        username: post.creator.nickname || post.creator.wallet.slice(0, 6) + '...' + post.creator.wallet.slice(-4),
      },
      image: post.mediaUrl || post.thumbnail,
      likes: post._count?.likes || post.likesCount || 0,
      comments: post._count?.comments || post.commentsCount || 0,
      tags: post.tags?.map((t: any) => typeof t === 'string' ? t : t.tag?.name || '') || []
    }))

    return NextResponse.json({ posts: formattedPosts })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

// POST /api/posts - создать новый пост
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received post data:', body)
    
    if (!body.creatorWallet || !body.title || !body.content || !body.type) {
      console.log('Missing fields:', {
        creatorWallet: !!body.creatorWallet,
        title: !!body.title,
        content: !!body.content,
        type: !!body.type
      })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const post = await createPost(body.creatorWallet, {
      title: body.title,
      content: body.content,
      type: body.type,
      category: body.category,
      thumbnail: body.thumbnail,
      mediaUrl: body.mediaUrl,
      isLocked: body.isLocked || false,
      isPremium: body.isPremium || false,
      price: body.price,
      currency: body.currency,
      tags: body.tags || []
    })

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
} 