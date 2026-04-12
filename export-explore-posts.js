const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

/**
 * Export Explore Posts Script
 * 
 * Экспортирует криэйторов и посты для страницы Explore в JSON файл
 * 
 * Структура:
 * - creators: ранжированный список криэйторов (первые 3: @mia-, @nana, @-chnytng)
 * - allPosts: 750 последних постов (все типы)
 * - paidPosts: платные посты (price > 0)
 * - premiumPosts: подписочные посты (isSubscription = true)
 * 
 * Usage:
 * node export-explore-posts.js
 */

/**
 * Трансформирует пост в формат совместимый с UnifiedPost
 * Добавляет недостающие поля для совместимости с /api/posts
 */
function transformPostForExplore(post) {
  // Определяем статус Sora-2 генерации
  let requestStatus = null
  if (post.requestId && post.type === 'ai-video') {
    if (post.error) {
      requestStatus = 'failed'
    } else if (post.mediaUrl) {
      requestStatus = 'completed'
    } else {
      requestStatus = 'processing'
    }
  }

  // Определяем требуемый тир для доступа
  const requiredTier = post.minSubscriptionTier || (post.isPremium ? 'vip' : null)

  return {
    // Оригинальные поля из БД
    id: post.id,
    title: post.title,
    content: post.content,
    mediaUrl: post.mediaUrl,
    type: post.type,
    category: post.category,
    thumbnail: post.thumbnail,
    blurUrl: post.blurUrl,
    previewUrl: post.previewUrl,
    price: post.price,
    currency: post.currency || 'SOL',
    isLocked: post.isLocked,
    isPremium: post.isPremium,
    minSubscriptionTier: post.minSubscriptionTier,
    imageAspectRatio: post.imageAspectRatio,
    isSellable: post.isSellable,
    requestId: post.requestId,
    error: post.error,
    remixId: post.remixId,
    containerId: post.containerId,
    likesCount: post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
    viewsCount: post.viewsCount || 0,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    creatorId: post.creatorId,

    // ✅ Добавляем поля для совместимости с /api/posts
    likes: post.likesCount || 0,
    comments: post.commentsCount || 0,
    
    // Creator с дополнительными полями
    creator: {
      id: post.creator.id,
      nickname: post.creator.nickname,
      wallet: post.creator.wallet,
      fullName: post.creator.fullName,
      avatar: post.creator.avatar,
      isCreator: post.creator.isCreator,
      // Добавляем name и username для UnifiedPost
      name: post.creator.fullName || post.creator.nickname || 'Unknown',
      username: post.creator.nickname || 'unknown',
    },

    // ✅ Объект access (для UnifiedPost) - БЕЗ user-specific данных
    access: {
      isLocked: post.isLocked,
      tier: requiredTier,
      price: post.price,
      currency: post.currency || 'SOL',
      // User-specific поля будут заполняться на фронте из localStorage
      isPurchased: false,
      isSubscribed: false,
      userTier: null,
      shouldHideContent: post.isLocked, // По умолчанию скрываем если заблокирован
      isCreatorPost: false,
      hasAccess: !post.isLocked, // По умолчанию доступ есть только если не заблокирован
      shouldBlur: false,
      shouldDim: false,
      upgradePrompt: null,
      requiredTier,
    },

    // ✅ Объект media (для UnifiedPost)
    media: {
      type: post.type,
      url: post.mediaUrl,
      thumbnail: post.thumbnail,
      preview: post.previewUrl,
      error: post.error,
      blurUrl: post.blurUrl,
    },

    // ✅ Объект engagement (для UnifiedPost)
    engagement: {
      likes: post.likesCount || 0,
      comments: post.commentsCount || 0,
      views: post.viewsCount || 0,
      isLiked: false, // User-specific, заполняется на фронте
    },

    // User-specific поля (будут обновляться на фронте)
    isSubscribed: false,
    hasPurchased: false,
    isCreatorPost: false,
    requestStatus,
    requiredTier,
    userTier: null,
    hasAccess: !post.isLocked,
    shouldBlur: false,
    shouldDim: false,
    upgradePrompt: null,
    accessType: post.isLocked ? 'restricted' : 'public',
    shouldHideContent: post.isLocked,

    // ✅ Emotions (пустой массив, можно заполнить позже если нужно)
    emotions: [],

    // ✅ _count сохраняем для совместимости
    _count: post._count || {
      likes: post.likesCount || 0,
      comments: post.commentsCount || 0,
      purchases: 0,
    },
  }
}

async function exportExplorePosts() {
  try {
    console.log('🔍 [Explore Export] Starting export...\n')
    
    // ==================== 1. CREATORS ====================
    console.log('👥 [Explore Export] Fetching creators...')
    
    const allCreators = await prisma.user.findMany({
      where: {
        // Исключаем B_Julia
        nickname: {
          not: 'B_Julia'
        }
      },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        wallet: true,
        avatar: true,
        bio: true,
        _count: {
          select: {
            posts: true,
            subscribers: true,  // Количество подписчиков
            subscriptions: true // Количество подписок
          }
        }
      }
    })
    
    console.log(`   Found ${allCreators.length} creators (B_Julia excluded)`)
    
    // Приоритетные криэйторы (должны быть первыми 3)
    const priorityNicknames = ['mia-', 'nana', '-chnytng']
    
    // Разделяем на приоритетных и остальных
    const priorityCreators = []
    const otherCreators = []
    
    allCreators.forEach(creator => {
      if (priorityNicknames.includes(creator.nickname)) {
        priorityCreators.push(creator)
      } else {
        otherCreators.push(creator)
      }
    })
    
    // Сортируем приоритетных в нужном порядке
    const sortedPriorityCreators = priorityNicknames
      .map(nick => priorityCreators.find(c => c.nickname === nick))
      .filter(Boolean) // Удаляем undefined если криэйтор не найден
    
    // Сортируем остальных по количеству постов (DESC)
    otherCreators.sort((a, b) => {
      const aPostCount = a._count.posts
      const bPostCount = b._count.posts
      return bPostCount - aPostCount
    })
    
    // Итоговый список криэйторов
    const rankedCreators = [...sortedPriorityCreators, ...otherCreators]
    
    console.log(`   Priority creators: ${sortedPriorityCreators.map(c => c.nickname).join(', ')}`)
    console.log(`   Total creators: ${rankedCreators.length}\n`)
    
    // ==================== 2. ALL POSTS (750) ====================
    console.log('📝 [Explore Export] Fetching 750 latest posts...')
    
    const allPosts = await prisma.post.findMany({
      take: 750,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        content: true,
        mediaUrl: true,
        type: true,
        category: true,
        thumbnail: true,
        blurUrl: true,
        previewUrl: true,
        price: true,
        currency: true,
        isLocked: true,
        isPremium: true,
        minSubscriptionTier: true,
        imageAspectRatio: true,
        isSellable: true,
        requestId: true,
        error: true,
        remixId: true,
        containerId: true,
        likesCount: true,
        commentsCount: true,
        viewsCount: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            nickname: true,
            wallet: true,
            fullName: true,
            avatar: true,
            isCreator: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            purchases: true
          }
        }
      }
    })
    
    // Фильтруем: только CDN URLs и непустые
    const filteredAllPosts = allPosts
      .filter(post => {
        if (!post.mediaUrl || post.mediaUrl.trim() === '') return false
        return post.mediaUrl.startsWith('https://fonanastorage.b-cdn.net/')
      })
      .map(post => transformPostForExplore(post))
    
    console.log(`   Found ${allPosts.length} posts`)
    console.log(`   Filtered to ${filteredAllPosts.length} posts (CDN only)\n`)
    
    // ==================== 3. PAID POSTS ====================
    console.log('💰 [Explore Export] Fetching paid posts...')
    
    const paidPosts = await prisma.post.findMany({
      where: {
        isLocked: true,
        price: {
          not: null,
          gt: 0
        }
      },
      select: {
        id: true,
        title: true,
        content: true,
        mediaUrl: true,
        type: true,
        category: true,
        thumbnail: true,
        blurUrl: true,
        previewUrl: true,
        price: true,
        currency: true,
        isLocked: true,
        isPremium: true,
        minSubscriptionTier: true,
        imageAspectRatio: true,
        isSellable: true,
        requestId: true,
        error: true,
        remixId: true,
        containerId: true,
        likesCount: true,
        commentsCount: true,
        viewsCount: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            nickname: true,
            wallet: true,
            fullName: true,
            avatar: true,
            isCreator: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            purchases: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Фильтруем платные посты
    const filteredPaidPosts = paidPosts
      .filter(post => {
        if (!post.mediaUrl || post.mediaUrl.trim() === '') return false
        return post.mediaUrl.startsWith('https://fonanastorage.b-cdn.net/')
      })
      .map(post => transformPostForExplore(post))
    
    console.log(`   Found ${paidPosts.length} paid posts`)
    console.log(`   Filtered to ${filteredPaidPosts.length} paid posts (CDN only)\n`)
    
    // ==================== 4. PREMIUM/SUBSCRIPTION POSTS ====================
    console.log('⭐ [Explore Export] Fetching premium/subscription posts...')
    
    const premiumPosts = await prisma.post.findMany({
      where: {
        isLocked: true,
        price: null
      },
      select: {
        id: true,
        title: true,
        content: true,
        mediaUrl: true,
        type: true,
        category: true,
        thumbnail: true,
        blurUrl: true,
        previewUrl: true,
        price: true,
        currency: true,
        isLocked: true,
        isPremium: true,
        minSubscriptionTier: true,
        imageAspectRatio: true,
        isSellable: true,
        requestId: true,
        error: true,
        remixId: true,
        containerId: true,
        likesCount: true,
        commentsCount: true,
        viewsCount: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            nickname: true,
            wallet: true,
            fullName: true,
            avatar: true,
            isCreator: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            purchases: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Фильтруем premium посты
    const filteredPremiumPosts = premiumPosts
      .filter(post => {
        if (!post.mediaUrl || post.mediaUrl.trim() === '') return false
        return post.mediaUrl.startsWith('https://fonanastorage.b-cdn.net/')
      })
      .map(post => transformPostForExplore(post))
    
    console.log(`   Found ${premiumPosts.length} premium posts`)
    console.log(`   Filtered to ${filteredPremiumPosts.length} premium posts (CDN only)\n`)
    
    // ==================== 5. STATISTICS ====================
    const stats = {
      exportedAt: new Date().toISOString(),
      creators: {
        total: rankedCreators.length,
        priority: sortedPriorityCreators.length,
        excluded: ['B_Julia']
      },
      posts: {
        all: filteredAllPosts.length,
        paid: filteredPaidPosts.length,
        premium: filteredPremiumPosts.length
      }
    }
    
    // ==================== 6. EXPORT ====================
    const exportData = {
      meta: {
        exportedAt: stats.exportedAt,
        version: '1.0',
        description: 'Explore page data: creators and posts',
        databaseUrl: process.env.DATABASE_URL ? 'Connected' : 'Not configured'
      },
      statistics: stats,
      creators: rankedCreators,
      posts: {
        all: filteredAllPosts,
        paid: filteredPaidPosts,
        premium: filteredPremiumPosts
      }
    }
    
    // Сохраняем в файл
    const outputPath = path.join(__dirname, 'explore_posts.json')
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8')
    
    console.log('📊 [Explore Export] Statistics:')
    console.log(`   Creators: ${stats.creators.total} (Priority: ${stats.creators.priority})`)
    console.log(`   All Posts: ${stats.posts.all}`)
    console.log(`   Paid Posts: ${stats.posts.paid}`)
    console.log(`   Premium Posts: ${stats.posts.premium}`)
    console.log(`\n💾 [Explore Export] Saved to: ${outputPath}`)
    console.log('✅ [Explore Export] Export completed successfully!')
    
  } catch (error) {
    console.error('❌ [Explore Export] Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Запускаем экспорт
exportExplorePosts()
  .then(() => {
    console.log('\n🎉 [Explore Export] Script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 [Explore Export] Script failed:', error)
    process.exit(1)
  })
