import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'
import { checkPostAccess } from '@/lib/utils/access'
import { generateOptimizedImageUrls, getSafeThumbnail } from '@/lib/utils/thumbnails'

export const dynamic = 'force-dynamic'

// GET /api/posts/following - получить посты только от подписок пользователя
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userWallet = searchParams.get('userWallet')
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'latest'

    console.log('[API/posts/following] Request params:', { userWallet, page, limit, category })

    if (!userWallet) {
      return NextResponse.json({ error: 'User wallet required' }, { status: 400 })
    }

    // Получаем текущего пользователя
    const currentUser = await getUserByWallet(userWallet)
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('[API/posts/following] Current user:', currentUser.id, currentUser.nickname)

    // Получаем активные подписки пользователя
    const userSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: currentUser.id,
        isActive: true,
        validUntil: { gte: new Date() },
        paymentStatus: 'COMPLETED'
      },
      select: { 
        creatorId: true,
        plan: true
      }
    })

    if (userSubscriptions.length === 0) {
      return NextResponse.json({
        posts: [],
        totalCount: 0,
        message: 'No active subscriptions found'
      })
    }

    const subscribedCreatorIds = userSubscriptions.map(sub => sub.creatorId)
    console.log('[API/posts/following] Subscribed creators:', subscribedCreatorIds.length)

    // Создаем Map для быстрого доступа к планам подписок
    const userSubscriptionsMap = new Map<string, string>()
    userSubscriptions.forEach(sub => {
      userSubscriptionsMap.set(sub.creatorId, sub.plan.toLowerCase())
    })

    // Построение условий фильтрации
    let where: any = {
      // ИСКЛЮЧАЕМ собственные посты пользователя
      creatorId: { 
        in: subscribedCreatorIds,
        not: currentUser.id // Важно: исключаем посты самого пользователя
      }
    }
    
    // Если указана категория, добавляем фильтр
    if (category && category !== 'All') {
      where.category = category
    }

    // Подсчет общего количества постов
    const totalCount = await prisma.post.count({ where })

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
      orderBy: sortBy === 'popular' 
        ? [
            { likesCount: 'desc' },
            { commentsCount: 'desc' },
            { createdAt: 'desc' }
          ]
        : sortBy === 'trending'
        ? [
            { viewsCount: 'desc' },
            { likesCount: 'desc' },
            { createdAt: 'desc' }
          ]
        : [
            { createdAt: 'desc' }
          ],
      skip: (page - 1) * limit,
      take: limit,
    })

    // Получаем покупки постов текущего пользователя
    const userPurchasedPosts = await prisma.postPurchase.findMany({
      where: {
        userId: currentUser.id,
        paymentStatus: 'COMPLETED'
      },
      select: { postId: true }
    })
    const purchasedPostIds = userPurchasedPosts.map(p => p.postId)
    
    // Получаем купленные sellable посты
    const userPurchasedSellablePosts = await prisma.post.findMany({
      where: {
        soldToId: currentUser.id,
        isSellable: true
      },
      select: { id: true }
    })
    const purchasedSellablePostIds = userPurchasedSellablePosts.map(p => p.id)

    // Форматируем посты для фронтенда
    const formattedPosts = posts.map((post: any) => {
      const isCreatorPost = false // В following НЕ показываем собственные посты
      const isSubscribed = userSubscriptionsMap.has(post.creatorId)
      const hasPurchased = purchasedPostIds.includes(post.id)
      const hasPurchasedSellable = purchasedSellablePostIds.includes(post.id)
      
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

      console.log(`[API/posts/following] Post "${post.title}" (ID: ${post.id}) - locked: ${post.isLocked}, tier: ${post.minSubscriptionTier}, userTier: ${userSubscriptionPlan}, subscribed: ${isSubscribed}, purchased: ${hasPurchased}, shouldHide: ${shouldHideContent}`)

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
        // Скрываем контент для заблокированных постов
        content: shouldHideContent ? '' : post.content,
        // Всегда возвращаем оригинальные пути для редактирования
        mediaUrl: post.mediaUrl,
        thumbnail: getSafeThumbnail(optimizedImages?.thumb || post.thumbnail, post.mediaUrl, post.type),
        preview: optimizedImages?.preview,
        shouldHideContent,
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
        soldTo: post.soldTo ? {
          id: post.soldTo.id,
          name: post.soldTo.nickname || post.soldTo.wallet.slice(0, 6) + '...',
          username: post.soldTo.nickname || post.soldTo.wallet.slice(0, 6) + '...' + post.soldTo.wallet.slice(-4),
          wallet: post.soldTo.wallet
        } : null,
        soldPrice: post.soldPrice,
        // Flash Sale информация
        flashSale: post.flashSales?.[0] ? {
          id: post.flashSales[0].id,
          discount: post.flashSales[0].discount,
          endAt: post.flashSales[0].endAt,
          maxRedemptions: post.flashSales[0].maxRedemptions,
          usedCount: post.flashSales[0].usedCount,
          remainingRedemptions: post.flashSales[0].maxRedemptions ? 
            post.flashSales[0].maxRedemptions - post.flashSales[0].usedCount : null,
          timeLeft: post.flashSales[0].endAt ? 
            Math.max(0, new Date(post.flashSales[0].endAt).getTime() - Date.now()) : null
        } : null,
        // Engagement данные
        engagement: {
          likes: post._count?.likes || 0,
          comments: post._count?.comments || 0
        }
      }
    })

    console.log('[API/posts/following] Returning', formattedPosts.length, 'posts from', subscribedCreatorIds.length, 'subscribed creators')

    return NextResponse.json({
      posts: formattedPosts,
      totalCount,
      subscribedCreatorsCount: subscribedCreatorIds.length
    })

  } catch (error) {
    console.error('Error fetching following posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch following posts' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 