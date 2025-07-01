import { NextRequest, NextResponse } from 'next/server'
import { getPosts, createPost, getPostsByCreator, getUserByWallet } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { hasAccessToTier, checkPostAccess, normalizeTierName } from '@/lib/utils/access'
import { TIER_HIERARCHY } from '@/lib/constants/tiers'
import { generateOptimizedImageUrls, getSafeThumbnail, fixPostThumbnails } from '@/lib/utils/thumbnails'

// WebSocket события
import { notifyNewPost, sendNotification } from '@/lib/services/websocket-client'

export const dynamic = 'force-dynamic'



// GET /api/posts - получить список постов
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userWallet = searchParams.get('userWallet')
    const creatorId = searchParams.get('creatorId')
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'latest'

    console.log('[API/posts] Request params:', { userWallet, creatorId, page, limit, category, sortBy })

    // Построение условий фильтрации
    let where: any = {}
    
    // If creatorId is specified, filter by creator
    if (creatorId) {
      where.creatorId = creatorId
    }
    
    // If category is specified, filter by category
    if (category && category !== 'All') {
      where.category = category
    }

    // Подсчет общего количества постов
    const totalCount = await prisma.post.count({ where })

    // Определяем сортировку на основе sortBy
    let orderBy: any[] = []
    switch (sortBy) {
      case 'popular':
        orderBy = [
          { likesCount: 'desc' },
          { commentsCount: 'desc' },
          { createdAt: 'desc' }
        ]
        break
      case 'trending':
        orderBy = [
          { viewsCount: 'desc' },
          { likesCount: 'desc' },
          { createdAt: 'desc' }
        ]
        break
      case 'latest':
      default:
        orderBy = [{ createdAt: 'desc' }]
        break
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
        tags: {
          include: {
            tag: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        // Новые связи для продаваемых постов
        soldTo: {
          select: {
            id: true,
            nickname: true,
            wallet: true,
          }
        },
        auctionBids: {
          orderBy: { amount: 'desc' },
          take: 1,
          select: {
            amount: true,
            userId: true
          }
        },
        // Flash Sales
        flashSales: {
          where: {
            isActive: true,
            endAt: { gte: new Date() },
            startAt: { lte: new Date() }
          },
          select: {
            id: true,
            discount: true,
            endAt: true,
            maxRedemptions: true,
            usedCount: true
          }
        }
      },
      orderBy,
      skip: (page - 1) * limit,
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

    // Получаем подписки текущего пользователя с планами
    let userSubscriptionsMap = new Map<string, string>() // creatorId -> plan
    if (currentUser) {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          userId: currentUser.id,
          isActive: true,
          validUntil: { gte: new Date() },
          paymentStatus: 'COMPLETED' // ВАЖНО: проверяем оплату!
        },
        select: { 
          creatorId: true,
          plan: true,
          paymentStatus: true
        }
      })
      subscriptions.forEach((sub: { creatorId: string; plan: string }) => {
        userSubscriptionsMap.set(sub.creatorId, sub.plan.toLowerCase())
      })
      console.log('[API/posts] User subscriptions:', userSubscriptionsMap.size, 'active subscriptions')
    }

    // Получаем покупки постов текущего пользователя
    let userPurchasedPosts: string[] = []
    let userPurchasedSellablePosts: string[] = []
    if (currentUser) {
      // Получаем покупки платных постов
      const purchases = await prisma.postPurchase.findMany({
        where: {
          userId: currentUser.id,
          paymentStatus: 'COMPLETED'
        },
        select: { postId: true }
      })
      userPurchasedPosts = purchases.map((purchase: { postId: string }) => purchase.postId)
      
      // Получаем купленные sellable посты
      const sellablePurchases = await prisma.post.findMany({
        where: {
          soldToId: currentUser.id,
          isSellable: true
        },
        select: { id: true }
      })
      userPurchasedSellablePosts = sellablePurchases.map((post: { id: string }) => post.id)
      
      console.log('[API/posts] User purchased posts:', userPurchasedPosts.length, 'posts')
      console.log('[API/posts] User purchased sellable posts:', userPurchasedSellablePosts.length, 'posts')
    }

    // Форматируем посты для фронтенда
    const formattedPosts = posts.map((post: any) => {
      const isCreatorPost = currentUser?.id === post.creatorId
      const isSubscribed = userSubscriptionsMap.has(post.creatorId)
      const hasPurchased = userPurchasedPosts.includes(post.id)
      const hasPurchasedSellable = userPurchasedSellablePosts.includes(post.id)
      
      // Логирование для отладки
      if (isCreatorPost) {
        console.log(`[API/posts] User viewing own post "${post.title}" - currentUser.id: ${currentUser?.id}, post.creatorId: ${post.creatorId}`)
      }
      
      // Используем централизованную функцию проверки доступа
      const accessStatus = checkPostAccess(
        post,
        currentUser,
        userSubscriptionsMap.has(post.creatorId) 
          ? { plan: userSubscriptionsMap.get(post.creatorId)! } 
          : null,
        hasPurchased
      )
      
      const shouldHideContent = !accessStatus.hasAccess

      const userSubscriptionPlan = userSubscriptionsMap.get(post.creatorId) || null

      console.log(`[API/posts] Post "${post.title}" (ID: ${post.id}) - locked: ${post.isLocked}, tier: ${post.minSubscriptionTier}, userTier: ${userSubscriptionPlan}, subscribed: ${isSubscribed}, purchased: ${hasPurchased}, shouldHide: ${shouldHideContent}`)

      // Получаем оптимизированные версии изображений
      const optimizedImages = generateOptimizedImageUrls(post.mediaUrl, post.type)
      
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
        isCreatorPost,
        // Скрываем контент для заблокированных постов, но не для автора
        content: (shouldHideContent && !isCreatorPost) ? '' : post.content,
        // Всегда возвращаем оригинальные пути для редактирования
        mediaUrl: post.mediaUrl,
        thumbnail: getSafeThumbnail(optimizedImages?.thumb || post.thumbnail, post.mediaUrl, post.type),
        preview: optimizedImages?.preview,
        shouldHideContent: shouldHideContent && !isCreatorPost, // Автор всегда видит свой контент
        // Добавляем информацию о тирах
        requiredTier: post.minSubscriptionTier || (post.isPremium ? 'vip' : null),
        userTier: userSubscriptionPlan,
        imageAspectRatio: post.imageAspectRatio,
        // Новые поля для продаваемых постов
        isSellable: post.isSellable,
        sellType: post.sellType,
        quantity: post.quantity,
        auctionStatus: post.auctionStatus,
        auctionStartPrice: post.auctionStartPrice,
        auctionStepPrice: post.auctionStepPrice,
        auctionDepositAmount: post.auctionDepositAmount,
        auctionStartAt: post.auctionStartAt,
        auctionEndAt: post.auctionEndAt,
        soldAt: post.soldAt,
        soldTo: post.soldTo,
        soldPrice: post.soldPrice,
        sellerConfirmedAt: post.sellerConfirmedAt,
        // Текущая ставка для аукционов
        auctionCurrentBid: post.auctionBids && post.auctionBids.length > 0 ? post.auctionBids[0].amount : null,
        // Flash Sale (берем первую активную)
        flashSale: post.flashSales && post.flashSales.length > 0 ? {
          ...post.flashSales[0],
          remainingRedemptions: post.flashSales[0].maxRedemptions ? 
            post.flashSales[0].maxRedemptions - post.flashSales[0].usedCount : null,
          timeLeft: Math.floor((new Date(post.flashSales[0].endAt).getTime() - Date.now()) / 1000)
        } : null
      }
    })

    console.log('[API/posts] Returning', formattedPosts.length, 'posts out of', totalCount, 'total')
    
    // Добавляем заголовки для предотвращения кеширования
    const response = NextResponse.json({ 
      posts: formattedPosts,
      totalCount,
      page,
      pageSize: limit,
      hasMore: page * limit < totalCount
    })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error fetching posts:', error)
    
    // Добавляем детальное логирование ошибки
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/posts - создать новый пост
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received post data:', {
      ...body,
      accessType: body.accessType,
      price: body.price,
      isSellable: body.isSellable,
      sellPrice: body.sellPrice
    })
    
    // Проверяем обязательные поля
    if (!body.creatorWallet || !body.type) {
      console.log('Missing required fields:', {
        creatorWallet: !!body.creatorWallet,
        type: !!body.type
      })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Для текстовых постов title и content обязательны
    if (body.type === 'text' && (!body.title || !body.content)) {
      console.log('Text post missing required fields:', {
        title: !!body.title,
        content: !!body.content
      })
      return NextResponse.json({ error: 'Title and content are required for text posts' }, { status: 400 })
    }
    
    // Для медиа-постов нужен либо mediaUrl, либо он будет загружен
    if (body.type !== 'text' && !body.mediaUrl && !body.thumbnail) {
      console.log('Media post missing media:', {
        mediaUrl: !!body.mediaUrl,
        thumbnail: !!body.thumbnail
      })
      return NextResponse.json({ error: 'Media URL is required for media posts' }, { status: 400 })
    }
    
    // Проверяем, что для платных постов указана цена
    if (body.accessType === 'paid' && (!body.price || body.price <= 0)) {
      console.log('Paid post validation failed:', {
        accessType: body.accessType,
        price: body.price
      })
      return NextResponse.json({ error: 'Please specify a price' }, { status: 400 })
    }
    
    // Проверяем, что для sellable постов с фиксированной ценой указана цена
    if (body.isSellable && body.sellType === 'FIXED_PRICE' && (!body.price || body.price <= 0)) {
      return NextResponse.json({ error: 'Please specify a price for fixed price items' }, { status: 400 })
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
      tags: body.tags || [],
      imageAspectRatio: body.imageAspectRatio,
      // Принимаем minSubscriptionTier от клиента и мапим обратно на tier для createPost
      tier: body.minSubscriptionTier === 'vip' ? 'vip' :
            body.minSubscriptionTier === 'premium' ? 'premium' :
            body.minSubscriptionTier === 'basic' ? 'basic' :
            body.accessType === 'paid' ? 'paid' : 'free',
      // Новые поля для продаваемых постов
      isSellable: body.isSellable || false,
      sellType: body.sellType,
      quantity: body.quantity,
      auctionStartPrice: body.auctionStartPrice,
      auctionStepPrice: body.auctionStepPrice,
      auctionDuration: body.auctionDuration,
      auctionDepositAmount: body.auctionDepositAmount
    })

    // Отправляем WebSocket событие о новом посте
    try {
      // Сначала получаем подписчиков
      const subscribers = await prisma.subscription.findMany({
        where: {
          creatorId: post.creatorId,
          isActive: true,
          paymentStatus: 'COMPLETED'
        },
        select: { userId: true }
      })
      
      const subscriberIds = subscribers.map(sub => sub.userId)
      await notifyNewPost(post, subscriberIds)
      
      // Получаем информацию о создателе
      const creator = await prisma.user.findUnique({
        where: { id: post.creatorId },
        select: { nickname: true, fullName: true }
      })
      
      // Подписчики уже получены выше
      
      // Отправляем уведомления всем подписчикам
      const creatorName = creator?.nickname || creator?.fullName || 'Creator'
      await Promise.all(
        subscribers.map(sub => 
          sendNotification(sub.userId, {
            type: 'NEW_POST_FROM_SUBSCRIPTION',
            title: 'Новый пост',
            message: `${creatorName} опубликовал новый пост: ${post.title}`,
            metadata: { postId: post.id, creatorId: post.creatorId }
          }).catch(err => console.error('Failed to send notification:', err))
        )
      )
    } catch (error) {
      // Не прерываем основной поток если WebSocket недоступен
      console.error('WebSocket notification failed:', error)
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
} 