import { NextRequest, NextResponse } from 'next/server'
import redis from '../redisClient'
import { encode, decode } from '@msgpack/msgpack'

/**
 * API для обновления постов в Redis кеше
 * 
 * POST /api/redis/updatecache
 * Body: { containerId: string, postId: string, status: string }
 * 
 * Логика:
 * - Получает массив постов из контейнера
 * - Если status === 'completed', меняет type с 'ai-video' на 'video' для указанного поста
 * - Сохраняет обратно в Redis
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { containerId, postId, status, mediaUrl } = body

    // Валидация входных данных
    if (!containerId) {
      return NextResponse.json(
        { success: false, error: 'containerId is required' },
        { status: 400 }
      )
    }

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'postId is required' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      )
    }

    console.log('[UpdateCache] Processing update:', {
      containerId,
      postId,
      status,
      mediaUrl: mediaUrl ? 'provided' : 'not provided'
    })

    // Получаем данные из Redis
    const dataBuffer = await redis.getBuffer(`remix:${containerId}`)

    if (!dataBuffer) {
      return NextResponse.json(
        { success: false, error: 'Container not found in cache' },
        { status: 404 }
      )
    }

    // Декодируем MessagePack данные
    let postsArray: any[] = []
    try {
      const decodedData = decode(dataBuffer)
      postsArray = Array.isArray(decodedData) ? decodedData : []
    } catch (decodeError) {
      console.error('[UpdateCache] Failed to decode MessagePack data:', decodeError)
      return NextResponse.json(
        { success: false, error: 'Failed to decode cache data' },
        { status: 500 }
      )
    }

    let actionPerformed = 'none'

    // Обрабатываем status === 'completed'
    if (status === 'completed') {
      console.log('[UpdateCache] Status is completed, updating post type')
      
      // Находим пост с указанным postId
      const postIndex = postsArray.findIndex(p => p.id === postId)
      
      if (postIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Post not found in container' },
          { status: 404 }
        )
      }

      const post = postsArray[postIndex]
      const oldType = post.type

      // Меняем type с 'ai-video' на 'video'
      if (post.type === 'ai-video') {
        postsArray[postIndex] = {
          ...post,
          type: 'video'
        }

        // Обновляем mediaUrl если предоставлен
        if (mediaUrl) {
          postsArray[postIndex].mediaUrl = mediaUrl
          console.log('[UpdateCache] ✅ mediaUrl updated:', mediaUrl)
        }

        // Обновляем также в media если есть
        if (postsArray[postIndex].media) {
          if (postsArray[postIndex].media.type === 'ai-video') {
            postsArray[postIndex].media.type = 'video'
          }
          
          // Обновляем media.url если mediaUrl предоставлен
          if (mediaUrl) {
            postsArray[postIndex].media.url = mediaUrl
            console.log('[UpdateCache] ✅ media.url updated:', mediaUrl)
          }
        }

        console.log('[UpdateCache] ✅ Post type updated:', {
          postId,
          oldType,
          newType: 'video',
          mediaUrlUpdated: !!mediaUrl
        })
        actionPerformed = 'updated'
      } else {
        console.log('[UpdateCache] Post type is not ai-video, skipping update:', post.type)
      }
    }
    
    // Обрабатываем status === 'failed' - удаляем пост из массива
    if (status === 'failed') {
      console.log('[UpdateCache] Status is failed, removing post from cache')
      
      const postIndex = postsArray.findIndex(p => p.id === postId)
      
      if (postIndex === -1) {
        console.log('[UpdateCache] Post not found in container, nothing to delete')
        return NextResponse.json(
          { success: true, error: 'Post not found (already deleted or never cached)' },
          { status: 200 }
        )
      }

      // Удаляем пост из массива
      postsArray.splice(postIndex, 1)
      
      console.log('[UpdateCache] ✅ Post removed from cache:', {
        postId,
        remainingPosts: postsArray.length
      })
      actionPerformed = 'deleted'
    }

    // Кодируем обратно в MessagePack
    const encodedData = encode(postsArray)
    const originalSize = JSON.stringify(postsArray).length
    const compressedSize = encodedData.length
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2)
    
    console.log('[UpdateCache] 📦 MessagePack compression:', {
      originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
      compressedSize: `${(compressedSize / 1024).toFixed(2)} KB`,
      ratio: `${ratio}% reduction`
    })

    // Сохраняем в Redis
    // TTL: 1 час (3600 секунд)
    await redis.set(
      `remix:${containerId}`, 
      Buffer.from(encodedData),
      'EX',
      3600
    )

    console.log('[UpdateCache] ✅ Cache updated successfully')

    return NextResponse.json({
      success: true,
      data: {
        containerId,
        postId,
        status,
        postsCount: postsArray.length,
        action: actionPerformed
      }
    })

  } catch (error) {
    console.error('[UpdateCache] ❌ Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

