import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasAccessToTier, checkPostAccess, normalizeTierName } from '@/lib/utils/access'
import { TIER_HIERARCHY } from '@/lib/constants/tiers'
import { detectPostType } from '@/lib/utils/postTypeDetection'
import { getRedisPosts } from '@/app/api/redis/redisClient'
import redis from '@/app/api/redis/redisClient'
import { decode } from '@msgpack/msgpack'
import { saveRemixToFile, getRemixFromFile } from '@/lib/remixFileSystem'

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

// [tier_access_system_2025_017] GET /api/posts - получить список постов с проверкой доступа по тирам
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Posts API with tier access called')
    
    const { searchParams } = new URL(request.url)
    const userWallet = searchParams.get('userWallet')
    const creatorId = searchParams.get('creatorId')
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const category = searchParams.get('category')
    const skip = (page - 1) * limit

    // Построение условий фильтрации
    let where: any = {}
    if (category && category !== 'All') {
      where.category = category
    }
    
    // [profile_system_expansion_bugs_2025_017] Фильтрация по создателю
    if (creatorId) {
      where.creatorId = creatorId
      console.log('[API] Filtering posts by creatorId:', creatorId)
    }

    // Получаем посты с информацией о создателе
    const posts = await prisma.post.findMany({
      where,
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

    const totalCount = await prisma.post.count({ where })

    // 🎭 [EMOTIONS] Получаем эмоции для всех постов
    const postIds = posts.map(p => p.id)
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
    const emotionsMap = new Map<string, any[]>() // postId -> массив эмоций
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

    console.log('[API] 🎭 Loaded emotions for', emotionsMap.size, 'posts')

    // 🔥 [REMIX_CACHE] Получаем ремиксы для видео-постов из файловой системы
    const postRemixesMap = new Map<string, any[]>() // postId -> ремиксы
    
    for (const post of posts) {
      // Проверяем условия: requestId есть, error нет, тип = video
      if (post.requestId && !post.error && post.type === 'video' && (post as any).containerId !== null) {
        try {
          // Используем containerId если есть, иначе post.id
          const containerId = (post as any).containerId || post.id
          
          console.log('[API] 🎯 Fetching remixes from file system for post:', post.id, 'containerId:', containerId)
          
          // Получаем ремиксы из файловой системы
          const remixData = await getRemixFromFile(containerId)
          
          if (remixData && remixData.posts && remixData.posts.length > 0) {
            postRemixesMap.set(post.id, remixData.posts)
            console.log('[API] ✅ Found remixes in file system:', {
              postId: post.id,
              containerId,
              remixCount: remixData.posts.length,
              filePath: `app/remixes/${containerId}.json`
            })
          } else {
            console.log('[API] No remixes found for post:', post.id)
          }
        } catch (error) {
          console.error('[API] ⚠️ Error fetching remixes from file system (non-critical):', error instanceof Error ? error.message : String(error))
        }
      }
    }

    // [tier_access_system_2025_017] Получаем текущего пользователя если передан wallet
    let currentUser = null
    if (userWallet) {
      currentUser = await getUserByWallet(userWallet)
      console.log('[API] Current user:', currentUser?.id, currentUser?.nickname)
    } else {
      console.log('[API] No userWallet provided - anonymous access')
    }

    // [tier_access_system_2025_017] Получаем подписки текущего пользователя с планами
    let userSubscriptionsMap = new Map<string, string>() // creatorId -> plan
    if (currentUser) {
      const userSubscriptions = await prisma.subscription.findMany({
        where: {
          userId: currentUser.id,
          isActive: true
          // ИСПРАВЛЕНО: убрал paymentStatus - поля нет в БД
        },
        select: { creatorId: true, plan: true }
      })
      
      userSubscriptions.forEach(sub => {
        userSubscriptionsMap.set(sub.creatorId, sub.plan.toLowerCase())
      })
      
      console.log('[API] User subscriptions:', userSubscriptionsMap.size, 'active')
    }

    // [tier_access_system_2025_017] Получаем покупки постов текущего пользователя
    let userPostPurchasesSet = new Set<string>() // postId
    if (currentUser) {
      const userPostPurchases = await prisma.postPurchase.findMany({
        where: {
          userId: currentUser.id
          // ИСПРАВЛЕНО: убрал paymentStatus - поля нет в БД
        },
        select: { postId: true }
      })
      
      userPostPurchases.forEach(purchase => {
        userPostPurchasesSet.add(purchase.postId)
      })
    }

    // [tier_access_system_2025_017] Форматируем посты с информацией о доступе
    const formattedPosts = posts.map((post: any) => {
      const isCreatorPost = currentUser?.id === post.creatorId
      const isSubscribed = userSubscriptionsMap.has(post.creatorId)
      const hasPurchased = userPostPurchasesSet.has(post.id)
      
      // Логирование для автора
      if (isCreatorPost) {
        console.log(`[API] User viewing own post "${post.title}" - AUTHOR ACCESS`)
      }
      
      // [tier_access_system_2025_017] Используем централизованную функцию проверки доступа
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

      // Определяем требуемый тир для доступа
      const requiredTier = post.minSubscriptionTier || (post.isPremium ? 'vip' : null)

      console.log(`[API] Post "${post.title}" - locked: ${post.isLocked}, requiredTier: ${requiredTier}, userTier: ${userSubscriptionPlan}, hasAccess: ${accessStatus.hasAccess}`)

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
        // [tier_access_system_2025_017] Информация о доступе для frontend
        requiredTier,
        userTier: userSubscriptionPlan,
        hasAccess: accessStatus.hasAccess,
        // [content_access_system_2025_017] Новые поля для визуальной системы
        shouldBlur: accessStatus.shouldBlur,
        shouldDim: accessStatus.shouldDim, // [tier_access_visual_fix_2025_017]
        upgradePrompt: accessStatus.upgradePrompt,
        accessType: accessStatus.accessType,
        // Передаем полный объект access для UnifiedPost
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
          shouldDim: accessStatus.shouldDim, // [tier_access_visual_fix_2025_017]
          upgradePrompt: accessStatus.upgradePrompt,
          requiredTier,
        },
        // Добавляем media объект для UnifiedPost
        media: {
          type: post.type,
          url: post.mediaUrl,
          thumbnail: post.thumbnail,
          error: post.error,
          blurUrl: post.blurUrl
        },
        // Скрываем контент для заблокированных постов, но НЕ для автора
        content: (shouldHideContent && !isCreatorPost) ? '' : post.content,
        shouldHideContent: shouldHideContent && !isCreatorPost,
        // 🔥 [REMIX_CACHE] Массив ремиксов из Redis (если есть)
        postRemixes: postRemixesMap.get(post.id) || [],
        // 🎭 [EMOTIONS] Массив эмоций поста
        emotions: emotionsMap.get(post.id) || []
      }
    })

    console.log(`[API] Returning ${formattedPosts.length} posts with tier access info`)

    return NextResponse.json({ 
      posts: formattedPosts,
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
      hasMedia: !!body.mediaUrl || !!body.thumbnail,
      // [tier_access_system_2025_017] Log tier information
      minSubscriptionTier: body.minSubscriptionTier,
      // [sora2_ai_video_2025_017] Log requestId for AI videos
      requestId: body.requestId || null
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
    
    // Проверка генераций для ai-video постов
    if (body.type === 'ai-video') {
      console.log('[API] AI-video post detected, checking available generations...')
      
      const availableGenerations = (user as any).availableGenerationCount || 0
      
      console.log('[API] User generation count:', availableGenerations)
      
      if (availableGenerations <= 0) {
        console.log('[API] Insufficient generations for AI-video creation')
        return NextResponse.json({ 
          error: 'Insufficient generations. You need at least 1 generation to create AI videos.',
          availableGenerations: 0
        }, { status: 403 })
      }
      
      // Декрементируем счетчик генераций
      await prisma.user.update({
        where: { id: user.id },
        data: {
          availableGenerationCount: { decrement: 1 }
        }
      })
      
      console.log('[API] Generation count decremented:', {
        previous: availableGenerations,
        new: availableGenerations - 1
      })
    }
    
    // Для медиа-постов нужен хотя бы thumbnail или mediaUrl (кроме ai-video с requestId)
    if (body.type !== 'text' && body.type !== 'ai-video' && !body.mediaUrl && !body.thumbnail) {
      console.log('[API] Media post missing media files')
      return NextResponse.json({ error: 'Media files required for media posts' }, { status: 400 })
    }
    
    // Для ai-video проверяем наличие requestId
    if (body.type === 'ai-video' && !body.requestId) {
      console.log('[API] AI video post missing requestId')
      return NextResponse.json({ error: 'requestId required for AI video posts' }, { status: 400 })
    }
    
    // [post_type_detection_fix_2025_017] Автоматическое определение типа поста
    const detectedType = detectPostType(body.mediaUrl, body.type)
    const finalType = detectedType !== 'text' ? detectedType : body.type
    
    console.log('[API] Post type detection:', {
      providedType: body.type,
      detectedType: detectedType,
      finalType: finalType,
      mediaUrl: body.mediaUrl
    })

    // [tier_access_system_2025_017] Создаем пост с поддержкой тиров
    const postData = {
      creatorId: user.id,
      title: body.title || '',
      content: body.content || '',
      type: finalType, // [post_type_detection_fix_2025_017] Используем автоматически определенный тип
      category: body.category || 'General',
      thumbnail: body.thumbnail || null,
      mediaUrl: body.mediaUrl || null,
      blurUrl: body.blurUrl || null, // Размытое превью для заблокированного контента
      previewUrl: body.previewUrl || null, // Preview URL для видео и изображений
      isLocked: body.isLocked || false,
      isPremium: body.isPremium || false,
      price: body.price ? parseFloat(body.price) : null,
      currency: body.currency || 'SOL',
      imageAspectRatio: transformAspectRatio(body.imageAspectRatio), // [post_creation_500_error_2025_017] Transform string to number
      isSellable: body.isSellable || false,
      // [tier_access_system_2025_017] Добавляем поддержку тиров
      minSubscriptionTier: body.minSubscriptionTier || null,
      // [sora2_ai_video_2025_017] Добавляем requestId для AI-генерированных видео
      requestId: body.requestId || null
    }
    
    // [post_creation_500_error_2025_017] Log aspect ratio transformation
    console.log('[API] Image aspect ratio transformation:', {
      original: body.imageAspectRatio,
      transformed: postData.imageAspectRatio,
      type: typeof body.imageAspectRatio
    })
    
    // [tier_access_system_2025_017] Log tier setup
    console.log('[API] Tier setup:', {
      minSubscriptionTier: postData.minSubscriptionTier,
      isLocked: postData.isLocked,
      isPremium: postData.isPremium
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
    
    // 🔥 [REMIX_OPTIMIZATION_2025] Для AI-видео устанавливаем containerId = post.id, но НЕ создаём файл
    // Файл будет создан только при создании первого ремикса
    if (postData.type === 'ai-video') {
      console.log('[API] 🎯 AI-video detected, setting containerId = post.id')
      // containerId will be available after migration
      await prisma.post.update({
        where: { id: post.id },
        data: { containerId: post.id } as any
      })
      console.log('[API] ✅ containerId set to:', post.id)
      console.log('[API] ℹ️ File creation SKIPPED - will be created on first remix')
      
      // Обновляем объект post для дальнейшего использования
      // @ts-ignore - containerId will be available after migration
      post.containerId = post.id
    }
    
    // NEW: WebSocket уведомление автора (non-blocking)
    try {
      // Динамический импорт WebSocket функции
      const { notifyPostAuthor } = await import('@/websocket-server/src/events/posts')
      
      const success = await notifyPostAuthor(post, user.id)
      console.log(`[API] ${success ? '✅' : '⚠️'} Author WebSocket notification: ${success ? 'sent' : 'failed'}`)
    } catch (error) {
      // Не блокируем API response при ошибке WebSocket
      console.error('[API] ⚠️ WebSocket notification failed:', error instanceof Error ? error.message : String(error))
    }
    
    // [tier_access_system_2025_017] Возвращаем пост с информацией о доступе для автора
    const responsePost = {
      id: post.id,
      title: post.title,
      content: post.content,
      type: post.type,
      category: post.category,
      thumbnail: post.thumbnail,
      mediaUrl: post.mediaUrl,
      isLocked: post.isLocked,
      minSubscriptionTier: post.minSubscriptionTier,
      createdAt: post.createdAt,
      creator: post.creator,
      // Для автора поста - всегда полный доступ
      hasAccess: true,
      isCreatorPost: true,
      requiredTier: post.minSubscriptionTier,
      userTier: null, // Автор не нуждается в подписке на себя
      shouldHideContent: false
    }
    
    return NextResponse.json({ 
      success: true,
      post: responsePost
    })
  } catch (error) {
    console.error('[API] Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 