import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPostAccess } from '@/lib/utils/access'
import { getUserByWallet } from '@/lib/db'

/**
 * GET /api/posts/explore
 * 
 * Возвращает данные для Explore страницы из БД:
 * - 150 бесплатных постов
 * - 100 подписочных постов
 * - 100 платных постов
 * - Приоритетные криэйторы: nana, -chnytng, mia-
 * - Исключён: vizer36
 * - БЕЗ ремиксов
 * - С эмоциями
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userWallet = searchParams.get('userWallet')
    
    console.log('[API /posts/explore] Loading explore data from DB')

    // Получаем текущего пользователя если передан wallet
    let currentUser = null
    if (userWallet) {
      currentUser = await getUserByWallet(userWallet)
      console.log('[API /posts/explore] Current user:', currentUser?.id, currentUser?.nickname)
    }

    // Получаем подписки текущего пользователя
    let userSubscriptionsMap = new Map<string, string>()
    if (currentUser) {
      const userSubscriptions = await prisma.subscription.findMany({
        where: {
          userId: currentUser.id,
          isActive: true
        },
        select: { creatorId: true, plan: true }
      })
      
      userSubscriptions.forEach(sub => {
        userSubscriptionsMap.set(sub.creatorId, sub.plan.toLowerCase())
      })
    }

    // Получаем покупки постов
    let userPostPurchasesSet = new Set<string>()
    if (currentUser) {
      const userPostPurchases = await prisma.postPurchase.findMany({
        where: {
          userId: currentUser.id
        },
        select: { postId: true }
      })
      
      userPostPurchases.forEach(purchase => {
        userPostPurchasesSet.add(purchase.postId)
      })
    }

    // Приоритетные криэйторы
    const priorityCreators = ['nana', '-chnytng', 'mia-']
    const excludedCreators = ['vizer36']

    // Получаем ID криэйторов для исключения
    const excludedCreatorIds = await prisma.user.findMany({
      where: {
        nickname: { in: excludedCreators }
      },
      select: { id: true }
    })
    const excludedIds = excludedCreatorIds.map(c => c.id)

    // Базовые условия для всех постов
    const baseWhere: any = {
      creatorId: {
        notIn: excludedIds
      },
      // Исключаем ремиксы
      containerId: null,
      // Исключаем посты с ошибками
      error: null
    }

    // 1️⃣ Получаем 150 бесплатных постов (isLocked != true)
    console.log('[API /posts/explore] Fetching 150 free posts...')
    const freePosts = await prisma.post.findMany({
      where: {
        ...baseWhere,
        NOT: {
          isLocked: true
        }
      },
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
      take: 150
    })

    // 2️⃣ Получаем 100 подписочных постов (isLocked = true, price = null или 0)
    console.log('[API /posts/explore] Fetching 100 subscription posts...')
    const subscriptionPosts = await prisma.post.findMany({
      where: {
        ...baseWhere,
        isLocked: true,
        price: {
          lte: 0
        }
      },
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
      take: 100
    })

    // 3️⃣ Получаем 100 платных постов (isLocked = true, price > 0)
    console.log('[API /posts/explore] Fetching 100 paid posts...')
    const paidPosts = await prisma.post.findMany({
      where: {
        ...baseWhere,
        isLocked: true,
        price: {
          gt: 0
        }
      },
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
      take: 100
    })

    // Объединяем все посты
    const allPosts = [...freePosts, ...subscriptionPosts, ...paidPosts]
    const postIds = allPosts.map(p => p.id)

    console.log('[API /posts/explore] Loaded posts:', {
      free: freePosts.length,
      subscription: subscriptionPosts.length,
      paid: paidPosts.length,
      total: allPosts.length
    })

    // 🎭 Получаем эмоции для всех постов
    const emotions = await (prisma as any).emotion.findMany({
      where: {
        postId: { in: postIds }
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        }
      }
    })

    // Группируем эмоции по postId
    const emotionsMap = new Map<string, any[]>()
    emotions.forEach((emotion: any) => {
      if (emotion.postId) {
        if (!emotionsMap.has(emotion.postId)) {
          emotionsMap.set(emotion.postId, [])
        }
        emotionsMap.get(emotion.postId)!.push({
          id: emotion.id,
          emotionId: emotion.emotionId,
          userId: emotion.userId,
          createdAt: emotion.createdAt,
          user: {
            id: emotion.user.id,
            name: emotion.user.fullName || emotion.user.nickname || 'Unknown',
            username: emotion.user.nickname || 'unknown',
            avatar: emotion.user.avatar
          }
        })
      }
    })

    console.log('[API /posts/explore] Loaded emotions for', emotionsMap.size, 'posts')

    // Форматируем посты
    const formatPost = (post: any) => {
      const isCreatorPost = currentUser?.id === post.creatorId
      const isSubscribed = userSubscriptionsMap.has(post.creatorId)
      const hasPurchased = userPostPurchasesSet.has(post.id)

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
      const requiredTier = post.minSubscriptionTier || (post.isPremium ? 'vip' : null)

      return {
        ...post,
        creator: {
          ...post.creator,
          name: post.creator.fullName || post.creator.nickname || 'Unknown',
          username: post.creator.nickname || 'unknown',
        },
        likes: post.likesCount || 0,
        comments: post.commentsCount || 0,
        isSubscribed,
        hasPurchased,
        isCreatorPost,
        requiredTier,
        userTier: userSubscriptionPlan,
        hasAccess: accessStatus.hasAccess,
        shouldBlur: accessStatus.shouldBlur,
        shouldDim: accessStatus.shouldDim,
        upgradePrompt: accessStatus.upgradePrompt,
        accessType: accessStatus.accessType,
        access: {
          isLocked: post.isLocked,
          tier: requiredTier,
          price: post.price,
          currency: post.currency || 'SOL',
          isPurchased: hasPurchased,
          isSubscribed,
          userTier: userSubscriptionPlan,
          shouldHideContent: shouldHideContent && !isCreatorPost,
          isCreatorPost,
          hasAccess: accessStatus.hasAccess,
          shouldBlur: accessStatus.shouldBlur,
          shouldDim: accessStatus.shouldDim,
          upgradePrompt: accessStatus.upgradePrompt,
          requiredTier,
        },
        media: {
          type: post.type,
          url: post.mediaUrl,
          thumbnail: post.thumbnail,
          preview: post.previewUrl,
          error: post.error,
          blurUrl: post.blurUrl
        },
        content: (shouldHideContent && !isCreatorPost) ? '' : post.content,
        shouldHideContent: shouldHideContent && !isCreatorPost,
        emotions: emotionsMap.get(post.id) || []
      }
    }

    // Форматируем все категории постов
    const formattedFreePosts = freePosts.map(formatPost)
    const formattedSubscriptionPosts = subscriptionPosts.map(formatPost)
    const formattedPaidPosts = paidPosts.map(formatPost)
    const formattedAllPosts = allPosts.map(formatPost)

    // 👥 Получаем криэйторов с ранжированием
    console.log('[API /posts/explore] Fetching creators...')
    
    // Получаем приоритетных криэйторов
    const priorityCreatorsList = await prisma.user.findMany({
      where: {
        nickname: { in: priorityCreators },
        isCreator: true
      },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        avatar: true,
        bio: true,
        isVerified: true,
        _count: {
          select: {
            posts: true,
            subscriptions: true
          }
        }
      }
    })

    // Сортируем приоритетных криэйторов в порядке priorityCreators массива
    const sortedPriorityCreators = priorityCreators
      .map(nickname => priorityCreatorsList.find(c => c.nickname === nickname))
      .filter(Boolean)

    // Получаем остальных криэйторов
    const otherCreators = await prisma.user.findMany({
      where: {
        isCreator: true,
        nickname: {
          notIn: [...priorityCreators, ...excludedCreators]
        }
      },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        avatar: true,
        bio: true,
        isVerified: true,
        _count: {
          select: {
            posts: true,
            subscriptions: true
          }
        }
      },
      orderBy: {
        subscriptions: {
          _count: 'desc'
        }
      },
      take: 50
    })

    // Объединяем: сначала приоритетные, потом остальные
    const allCreators = [...sortedPriorityCreators, ...otherCreators]

    // Форматируем криэйторов
    const formattedCreators = allCreators.map((creator: any) => ({
      id: creator.id,
      name: creator.fullName || creator.nickname || 'Unknown',
      username: creator.nickname || 'unknown',
      avatar: creator.avatar,
      description: creator.bio || '',
      isVerified: creator.isVerified || false,
      subscribers: creator._count?.subscriptions || 0,
      posts: creator._count?.posts || 0,
      tags: []
    }))

    console.log('[API /posts/explore] Loaded creators:', {
      priority: sortedPriorityCreators.length,
      others: otherCreators.length,
      total: formattedCreators.length
    })

    // Возвращаем данные
    return NextResponse.json({
      creators: formattedCreators,
      posts: {
        all: formattedAllPosts,
        free: formattedFreePosts,
        paid: formattedPaidPosts,
        premium: formattedSubscriptionPosts
      },
      meta: {
        generatedAt: new Date().toISOString(),
        source: 'database',
        counts: {
          total: formattedAllPosts.length,
          free: formattedFreePosts.length,
          paid: formattedPaidPosts.length,
          premium: formattedSubscriptionPosts.length,
          creators: formattedCreators.length
        }
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800', // Кэш на 10 минут
      }
    })
    
  } catch (error) {
    console.error('[API /posts/explore] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load explore posts data',
        details: error instanceof Error ? error.message : 'Unknown error',
        creators: [],
        posts: {
          all: [],
          free: [],
          paid: [],
          premium: []
        }
      },
      { status: 500 }
    )
  }
}
