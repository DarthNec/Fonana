import { NextRequest, NextResponse } from 'next/server'
import { getPosts, createPost, getPostsByCreator, getUserByWallet } from '@/lib/db'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/posts - получить список постов
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userWallet = searchParams.get('userWallet')
    const creatorId = searchParams.get('creatorId')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    console.log('[API/posts] Request params:', { userWallet, creatorId, limit })

    let where = {}
    
    // If creatorId is specified, filter by creator
    if (creatorId) {
      where = { creatorId }
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            wallet: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    // Получаем текущего пользователя если передан wallet
    let currentUser = null
    if (userWallet) {
      currentUser = await getUserByWallet(userWallet)
      console.log('[API/posts] Current user:', currentUser?.id, currentUser?.nickname)
    } else {
      console.log('[API/posts] No userWallet provided')
    }

    // Получаем подписки текущего пользователя
    let userSubscriptions: string[] = []
    if (currentUser) {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          userId: currentUser.id,
          isActive: true,
          validUntil: { gte: new Date() }
        },
        select: { creatorId: true }
      })
      userSubscriptions = subscriptions.map(sub => sub.creatorId)
      console.log('[API/posts] User subscriptions:', userSubscriptions.length, 'active subscriptions')
    }

    // Получаем покупки постов текущего пользователя
    let userPurchasedPosts: string[] = []
    if (currentUser) {
      const purchases = await prisma.postPurchase.findMany({
        where: {
          userId: currentUser.id,
          paymentStatus: 'COMPLETED'
        },
        select: { postId: true }
      })
      userPurchasedPosts = purchases.map((purchase: { postId: string }) => purchase.postId)
      console.log('[API/posts] User purchased posts:', userPurchasedPosts.length, 'posts')
    }

    // Форматируем посты для фронтенда
    const formattedPosts = posts.map((post: any) => {
      const isCreatorPost = currentUser?.id === post.creatorId
      const isSubscribed = userSubscriptions.includes(post.creatorId)
      const hasPurchased = userPurchasedPosts.includes(post.id)
      
      // Проверяем доступ к контенту
      // Если пост заблокирован, проверяем:
      // 1. Это пост самого пользователя
      // 2. У пользователя есть подписка
      // 3. Пользователь купил этот конкретный пост
      const shouldHideContent = post.isLocked && !isCreatorPost && !isSubscribed && !hasPurchased

      console.log(`[API/posts] Post "${post.title}" (ID: ${post.id}) - locked: ${post.isLocked}, subscribed: ${isSubscribed}, purchased: ${hasPurchased}, shouldHide: ${shouldHideContent}`)

      return {
        ...post,
        creator: {
          ...post.creator,
          name: post.creator.fullName || post.creator.nickname || post.creator.wallet.slice(0, 6) + '...',
          username: post.creator.nickname || post.creator.wallet.slice(0, 6) + '...' + post.creator.wallet.slice(-4),
        },
        image: post.mediaUrl || post.thumbnail,
        likes: post._count?.likes || post.likesCount || 0,
        comments: post._count?.comments || post.commentsCount || 0,
        tags: post.tags?.map((t: any) => typeof t === 'string' ? t : t.tag?.name || '') || [],
        isSubscribed,
        hasPurchased,
        // Скрываем контент для заблокированных постов
        content: shouldHideContent ? '' : post.content,
        mediaUrl: shouldHideContent ? null : post.mediaUrl,
        shouldHideContent
      }
    })

    console.log('[API/posts] Returning', formattedPosts.length, 'posts')
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