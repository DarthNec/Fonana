import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveRemixToFile } from '@/lib/remixFileSystem'

// 🔥 ИСПРАВЛЕНО: Используем синглтон prisma вместо new PrismaClient()

// GET /api/posts/remix?postId={postId} - получить цепочку ремиксов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    
    if (!postId) {
      return NextResponse.json(
        { error: 'postId parameter is required' },
        { status: 400 }
      )
    }

    console.log('[API /posts/remix] Building remix chain for post:', postId)

    // Функция для построения полной цепочки ремиксов
    const buildRemixChain = async (startPostId: string): Promise<any[]> => {
      const allPosts = new Map<string, any>() // Все найденные посты
      const visited = new Set<string>() // Защита от циклических ссылок
      const toProcess = new Set<string>() // Посты для обработки
      
      // Добавляем стартовый пост в очередь
      toProcess.add(startPostId)
      
      // Функция для получения поста с полной информацией
      const getPostWithDetails = async (postId: string) => {
        return await prisma.post.findUnique({
          where: { id: postId },
          include: {
            creator: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                fullName: true
              }
            },
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          }
        })
      }
      
      // Обрабатываем все посты в очереди
      while (toProcess.size > 0) {
        const currentPostId = Array.from(toProcess)[0]
        toProcess.delete(currentPostId)
        
        if (visited.has(currentPostId)) {
          continue // Уже обработан
        }
        
        visited.add(currentPostId)
        
        // Получаем текущий пост
        const currentPost = await getPostWithDetails(currentPostId)
        if (currentPost) {
          // Добавляем в коллекцию всех постов
          allPosts.set(currentPost.id, {
            id: currentPost.id,
            title: currentPost.title,
            content: currentPost.content,
            type: currentPost.type,
            category: currentPost.category,
            thumbnail: currentPost.thumbnail,
            mediaUrl: currentPost.mediaUrl,
            requestId: currentPost.requestId,
            isLocked: currentPost.isLocked,
            minSubscriptionTier: currentPost.minSubscriptionTier,
            remixId: currentPost.remixId,
            createdAt: currentPost.createdAt,
            updatedAt: currentPost.updatedAt,
            creator: currentPost.creator,
            likesCount: currentPost._count.likes,
            commentsCount: currentPost._count.comments
          })
          
          // Ищем что ремиксит этот пост (remixId == currentPostId)
          const remixesOfThis = await prisma.post.findMany({
            where: {
              remixId: currentPostId
            },
            select: { id: true }
          })
          
          // Добавляем найденные ремиксы в очередь
          remixesOfThis.forEach(remix => {
            if (!visited.has(remix.id) && !allPosts.has(remix.id)) {
              toProcess.add(remix.id)
            }
          })
          
          // Если у текущего поста есть remixId, добавляем его в очередь
          if (currentPost.remixId && !visited.has(currentPost.remixId) && !allPosts.has(currentPost.remixId)) {
            toProcess.add(currentPost.remixId)
          }
        }
      }
      
      // Преобразуем Map в массив и сортируем по дате создания
      const chain = Array.from(allPosts.values()).sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      
      return chain
    }

    // Строим цепочку ремиксов
    const remixChain = await buildRemixChain(postId)

    console.log('[API /posts/remix] Remix chain built:', {
      startPostId: postId,
      chainLength: remixChain.length
    })

    return NextResponse.json({
      success: true,
      data: {
        startPostId: postId,
        chain: remixChain,
        totalCount: remixChain.length
      }
    })

  } catch (error) {
    console.error('[API /posts/remix] Error building remix chain:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userWallet,
      title,
      content,
      type,
      category,
      tags,
      thumbnail,
      mediaUrl,
      requestId,
      isLocked,
      accessType,
      originalPostId,
      remixPrompt,
      originalVideoUrl
    } = body

    console.log('[API /posts/remix] Creating remix post:', {
      userWallet,
      title,
      originalPostId,
      remixPrompt
    })

    // Проверяем, что пользователь существует
    const user = await prisma.user.findFirst({
      where: {
        wallet: userWallet
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Проверяем, что оригинальный пост существует
    const originalPost = await prisma.post.findUnique({
      where: {
        id: originalPostId
      }
    })

    if (!originalPost) {
      return NextResponse.json(
        { error: 'Original post not found' },
        { status: 404 }
      )
    }

    // Создаем новый пост-ремикс
    const remixPost = await prisma.post.create({
      data: {
        creatorId: user.id,
        title,
        content,
        type,
        category,
        thumbnail,
        mediaUrl,
        requestId,
        isLocked,
        minSubscriptionTier: accessType === 'vip' ? 'vip' : 
                            accessType === 'premium' ? 'premium' :
                            accessType === 'subscribers' ? 'basic' : 
                            null,
        // Используем поле remixId для связи с оригинальным постом
        remixId: originalPostId,
        // containerId группирует все ремиксы одного поста (будет доступно после миграции)
        // Если оригинал уже в контейнере - используем его containerId, иначе - originalPostId
        containerId: (originalPost as any).containerId || originalPostId,
      } as any
    })

    console.log('[API /posts/remix] Remix post created:', remixPost.id)

    // 🔥 [REMIX_CACHE] Получаем полную информацию о созданном ремиксе для кеширования
    const fullRemixPost = await prisma.post.findUnique({
      where: { id: remixPost.id },
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

    if (fullRemixPost) {
      // 🔥 [REMIX_OPTIMIZATION_2025] Сохраняем ремикс в файловую систему для цепочек
      // При первом ремиксе также сохраняем оригинальный пост
      try {
        console.log('[API /posts/remix] 🎯 Saving remix to file system')
        
        // Определяем containerId для группировки ремиксов
        const containerId = (originalPost as any).containerId || originalPostId
        
        // 🔥 [REMIX_OPTIMIZATION_2025] Проверяем, существует ли файл
        const { getRemixFromFile } = await import('@/lib/remixFileSystem')
        const existingRemixData = await getRemixFromFile(containerId)
        
        // Если файл не существует, это первый ремикс - нужно сохранить оригинальный пост
        if (!existingRemixData) {
          console.log('[API /posts/remix] 📝 First remix detected - saving original post to file system')
          
          // Получаем полную информацию об оригинальном посте
          const fullOriginalPost = await prisma.post.findUnique({
            where: { id: originalPostId },
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
          
          if (fullOriginalPost) {
            // Форматируем оригинальный пост для сохранения
            const originalPostForCache = {
              ...fullOriginalPost,
              creator: {
                ...fullOriginalPost.creator,
                name: fullOriginalPost.creator.fullName || fullOriginalPost.creator.nickname || 'Unknown',
                username: fullOriginalPost.creator.nickname || 'unknown',
              },
              likes: fullOriginalPost.likesCount || 0,
              comments: fullOriginalPost.commentsCount || 0,
              isSubscribed: false,
              hasPurchased: false,
              isCreatorPost: true,
              requiredTier: fullOriginalPost.minSubscriptionTier,
              userTier: null,
              hasAccess: true,
              shouldBlur: false,
              shouldDim: false,
              upgradePrompt: null,
              accessType: 'creator',
              access: {
                isLocked: fullOriginalPost.isLocked,
                tier: fullOriginalPost.minSubscriptionTier,
                price: fullOriginalPost.price,
                currency: fullOriginalPost.currency || 'SOL',
                isPurchased: false,
                isSubscribed: false,
                userTier: null,
                shouldHideContent: false,
                isCreatorPost: true,
                hasAccess: true,
                shouldBlur: false,
                shouldDim: false,
                upgradePrompt: null,
                requiredTier: fullOriginalPost.minSubscriptionTier,
              },
              media: {
                type: fullOriginalPost.type,
                url: fullOriginalPost.mediaUrl,
                thumbnail: fullOriginalPost.thumbnail,
                error: fullOriginalPost.error,
                blurUrl: fullOriginalPost.blurUrl,
                requestId: fullOriginalPost.requestId
              },
              shouldHideContent: false
            }
            
            // Сохраняем оригинальный пост
            const savedOriginal = await saveRemixToFile(containerId, originalPostForCache)
            
            if (savedOriginal) {
              console.log('[API /posts/remix] ✅ Original post saved to file system:', {
                containerId,
                originalPostId,
                filePath: `app/remixes/${containerId}.json`
              })
            } else {
              console.warn('[API /posts/remix] ⚠️ Failed to save original post to file system')
            }
          }
        } else {
          console.log('[API /posts/remix] ℹ️ Remix file already exists, original post already saved')
        }
        
        // Создаем полный объект поста-ремикса (как в posts/route.ts)
        const fullPostForCache = {
          ...fullRemixPost,
          creator: {
            ...fullRemixPost.creator,
            name: fullRemixPost.creator.fullName || fullRemixPost.creator.nickname || 'Unknown',
            username: fullRemixPost.creator.nickname || 'unknown',
          },
          likes: fullRemixPost.likesCount || 0,
          comments: fullRemixPost.commentsCount || 0,
          isSubscribed: false,
          hasPurchased: false,
          isCreatorPost: true,
          requiredTier: fullRemixPost.minSubscriptionTier,
          userTier: null,
          hasAccess: true,
          shouldBlur: false,
          shouldDim: false,
          upgradePrompt: null,
          accessType: 'creator',
          access: {
            isLocked: fullRemixPost.isLocked,
            tier: fullRemixPost.minSubscriptionTier,
            price: fullRemixPost.price,
            currency: fullRemixPost.currency || 'SOL',
            isPurchased: false,
            isSubscribed: false,
            userTier: null,
            shouldHideContent: false,
            isCreatorPost: true,
            hasAccess: true,
            shouldBlur: false,
            shouldDim: false,
            upgradePrompt: null,
            requiredTier: fullRemixPost.minSubscriptionTier,
          },
          media: {
            type: fullRemixPost.type,
            url: fullRemixPost.mediaUrl,
            thumbnail: fullRemixPost.thumbnail,
            error: fullRemixPost.error,
            blurUrl: fullRemixPost.blurUrl,
            requestId: fullRemixPost.requestId
          },
          shouldHideContent: false
        }
        
        // Сохраняем ремикс в файловую систему (non-blocking)
        const saved = await saveRemixToFile(containerId, fullPostForCache)
        
        if (saved) {
          console.log('[API /posts/remix] ✅ Remix saved to file system:', {
            containerId,
            remixId: remixPost.id,
            filePath: `app/remixes/${containerId}.json`
          })
        } else {
          console.warn('[API /posts/remix] ⚠️ Failed to save remix to file system')
        }
        
      } catch (cacheError) {
        // Не блокируем создание ремикса при ошибке сохранения
        console.error('[API /posts/remix] ⚠️ File system save error (non-critical):', cacheError instanceof Error ? cacheError.message : String(cacheError))
      }
    }

    // Возвращаем созданный пост
    return NextResponse.json({
      success: true,
      post: {
        id: remixPost.id,
        title: remixPost.title,
        content: remixPost.content,
        type: remixPost.type,
        category: remixPost.category,
        thumbnail: remixPost.thumbnail,
        mediaUrl: remixPost.mediaUrl,
        requestId: remixPost.requestId,
        isLocked: remixPost.isLocked,
        minSubscriptionTier: remixPost.minSubscriptionTier,
        remixId: remixPost.remixId,
        createdAt: remixPost.createdAt,
        updatedAt: remixPost.updatedAt
      }
    })

  } catch (error) {
    console.error('[API /posts/remix] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
