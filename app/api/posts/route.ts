import { NextRequest, NextResponse } from 'next/server'
import { getPosts, createPost, getPostsByCreator, getUserByWallet } from '@/lib/db'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Функция для генерации путей к оптимизированным изображениям
function getOptimizedImageUrls(mediaUrl: string | null) {
  if (!mediaUrl) return null
  
  // Проверяем, что это изображение в нашей системе
  if (!mediaUrl.includes('/posts/images/') && !mediaUrl.includes('/posts/')) return null
  
  const ext = mediaUrl.substring(mediaUrl.lastIndexOf('.'))
  const fileName = mediaUrl.substring(mediaUrl.lastIndexOf('/') + 1, mediaUrl.lastIndexOf('.'))
  
  // Возвращаем пути только для новых изображений
  // Для старых изображений не генерируем оптимизированные пути
  return {
    original: mediaUrl,
    thumb: null, // Временно отключаем, пока не загружены оптимизированные версии
    preview: null
  }
}

// Определяем иерархию тиров подписок
const TIER_HIERARCHY: Record<string, number> = {
  'vip': 4,
  'premium': 3,
  'basic': 2,
  'free': 1
}

// Функция для проверки, достаточен ли уровень подписки
function hasAccessToTier(userTier: string | undefined, requiredTier: string | undefined): boolean {
  if (!requiredTier) return true // Если тир не указан, доступ есть у всех
  if (!userTier) return false // Если у пользователя нет подписки, доступа нет
  
  const userLevel = TIER_HIERARCHY[userTier.toLowerCase()] || 0
  const requiredLevel = TIER_HIERARCHY[requiredTier.toLowerCase()] || 0
  
  return userLevel >= requiredLevel
}

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
        }
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

    // Получаем подписки текущего пользователя с планами
    let userSubscriptionsMap = new Map<string, string>() // creatorId -> plan
    if (currentUser) {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          userId: currentUser.id,
          isActive: true,
          validUntil: { gte: new Date() }
        },
        select: { 
          creatorId: true,
          plan: true 
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
      
      // Проверяем доступ к контенту
      // Если пост заблокирован, проверяем:
      // 1. Это пост самого пользователя
      // 2. У пользователя есть достаточный уровень подписки
      // Примечание: sellable посты видны согласно обычным правилам доступа,
      // продажа касается реального товара, а не доступа к контенту
      
      let shouldHideContent = false
      
      if (post.isLocked && !isCreatorPost) {
        // Для sellable постов НЕ проверяем покупку товара, так как это не влияет на доступ к контенту
        // Sellable посты продают товары, а не доступ к контенту
        if (post.isSellable && post.minSubscriptionTier) {
          // Проверяем подписку пользователя для доступа к контенту
          const userTier = userSubscriptionsMap.get(post.creatorId)
          const hasRequiredTier = hasAccessToTier(userTier, post.minSubscriptionTier)
          shouldHideContent = !hasRequiredTier
        }
        // Если у поста есть минимальный тир подписки
        else if (!post.isSellable && post.minSubscriptionTier) {
          const userTier = userSubscriptionsMap.get(post.creatorId)
          const hasRequiredTier = hasAccessToTier(userTier, post.minSubscriptionTier)
          shouldHideContent = !hasRequiredTier
        } 
        // Обратная совместимость: если isPremium=true, считаем это VIP постом
        else if (post.isPremium) {
          const userTier = userSubscriptionsMap.get(post.creatorId)
          const hasRequiredTier = hasAccessToTier(userTier, 'vip')
          shouldHideContent = !hasRequiredTier
        }
        // Если у поста есть цена - это платный пост за доступ
        else if (post.price && post.price > 0 && !post.isSellable) {
          shouldHideContent = !hasPurchased
        }
        // Обычный заблокированный пост - доступен любым подписчикам
        else {
          shouldHideContent = !isSubscribed
        }
      }

      const userSubscriptionPlan = userSubscriptionsMap.get(post.creatorId) || null

      console.log(`[API/posts] Post "${post.title}" (ID: ${post.id}) - locked: ${post.isLocked}, tier: ${post.minSubscriptionTier}, userTier: ${userSubscriptionPlan}, subscribed: ${isSubscribed}, purchased: ${hasPurchased}, shouldHide: ${shouldHideContent}`)

      // Получаем оптимизированные версии изображений
      const optimizedImages = getOptimizedImageUrls(post.mediaUrl)
      
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
        // Скрываем контент для заблокированных постов, но не для автора
        content: (shouldHideContent && !isCreatorPost) ? '' : post.content,
        // Всегда возвращаем оригинальные пути для редактирования
        mediaUrl: post.mediaUrl,
        thumbnail: optimizedImages?.thumb || post.thumbnail,
        preview: optimizedImages?.preview,
        shouldHideContent,
        // Добавляем информацию о тирах
        requiredTier: post.minSubscriptionTier || (post.isPremium ? 'vip' : null),
        userTier: userSubscriptionPlan,
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
        auctionCurrentBid: post.auctionBids && post.auctionBids.length > 0 ? post.auctionBids[0].amount : null
      }
    })

    console.log('[API/posts] Returning', formattedPosts.length, 'posts')
    
    // Добавляем заголовки для предотвращения кеширования
    const response = NextResponse.json({ posts: formattedPosts })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
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
    
    if (!body.creatorWallet || !body.title || !body.content || !body.type) {
      console.log('Missing fields:', {
        creatorWallet: !!body.creatorWallet,
        title: !!body.title,
        content: !!body.content,
        type: !!body.type
      })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
} 