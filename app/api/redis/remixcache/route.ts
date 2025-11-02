import { NextRequest, NextResponse } from 'next/server'
import redis from '../redisClient'
import { encode, decode } from '@msgpack/msgpack'

/**
 * API для кеширования ремиксов в Redis с использованием MessagePack для сжатия
 * 
 * MessagePack используется для эффективного хранения больших массивов (100-200MB)
 * - Данные кодируются перед сохранением в Redis (уменьшение размера)
 * - Данные декодируются при получении из Redis
 * - Значительно снижает использование RAM на сервере
 * 
 * POST /api/redis/remixcache
 * Body: { containerId: string, post: object }
 * 
 * Логика:
 * - Если containerId нет в Redis - создаёт массив с постом
 * - Если containerId есть - добавляет пост в существующий массив
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { containerId, post } = body

    // Валидация входных данных
    if (!containerId) {
      return NextResponse.json(
        { success: false, error: 'containerId is required' },
        { status: 400 }
      )
    }

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'post is required' },
        { status: 400 }
      )
    }

    console.log('[RemixCache] Processing cache for containerId:', containerId)

    // Проверяем, есть ли контейнер в Redis
    const existingDataBuffer = await redis.getBuffer(`remix:${containerId}`)
    
    let postsArray: any[] = []

    if (existingDataBuffer) {
      // Контейнер существует - декодируем MessagePack данные
      console.log('[RemixCache] Container exists, decoding MessagePack data')
      try {
        const decodedData = decode(existingDataBuffer)
        postsArray = Array.isArray(decodedData) ? decodedData : []
        console.log('[RemixCache] Decoded successfully, posts count:', postsArray.length)
      } catch (decodeError) {
        console.error('[RemixCache] Failed to decode MessagePack data:', decodeError)
        postsArray = []
      }
      
      // Проверяем, что это массив
      if (!Array.isArray(postsArray)) {
        console.warn('[RemixCache] Invalid data in Redis, resetting to array')
        postsArray = []
      }
    } else {
      // Контейнер не существует - создаём новый массив
      console.log('[RemixCache] Container does not exist, creating new')
    }

    // Добавляем пост в массив (проверяем на дубликаты по ID)
    const postExists = postsArray.some(p => p.id === post.id)
    
    if (!postExists) {
      postsArray.push(post)
      console.log('[RemixCache] Post added to array, total posts:', postsArray.length)
    } else {
      console.log('[RemixCache] Post already exists in cache, skipping')
    }

    // Кодируем данные с помощью MessagePack перед сохранением
    const encodedData = encode(postsArray)
    const originalSize = JSON.stringify(postsArray).length
    const compressedSize = encodedData.length
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2)
    
    console.log('[RemixCache] 📦 MessagePack compression:', {
      originalSize: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
      compressedSize: `${(compressedSize / 1024 / 1024).toFixed(2)} MB`,
      ratio: `${ratio}% reduction`
    })

    // Сохраняем в Redis как бинарные данные
    // TTL: 1 час (3600 секунд)
    await redis.set(
      `remix:${containerId}`, 
      Buffer.from(encodedData),
      'EX',
      3600
    )

    console.log('[RemixCache] ✅ Cache updated successfully')

    return NextResponse.json({
      success: true,
      data: {
        containerId,
        postsCount: postsArray.length,
        cached: true
      }
    })

  } catch (error) {
    console.error('[RemixCache] ❌ Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/redis/remixcache?containerId=xxx
 * 
 * Получить кешированные ремиксы для контейнера
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const containerId = searchParams.get('containerId')

    if (!containerId) {
      return NextResponse.json(
        { success: false, error: 'containerId is required' },
        { status: 400 }
      )
    }

    console.log('[RemixCache] Getting cache for containerId:', containerId)

    // Получаем бинарные данные из Redis
    const dataBuffer = await redis.getBuffer(`remix:${containerId}`)

    if (!dataBuffer) {
      console.log('[RemixCache] No cache found')
      return NextResponse.json({
        success: true,
        data: {
          containerId,
          posts: [],
          cached: false
        }
      })
    }

    // Декодируем MessagePack данные
    let posts: any[] = []
    try {
      const decodedData = decode(dataBuffer)
      posts = Array.isArray(decodedData) ? decodedData : []
      
      console.log('[RemixCache] ✅ Cache found and decoded:', {
        postsCount: posts.length,
        compressedSize: `${(dataBuffer.length / 1024 / 1024).toFixed(2)} MB`
      })
    } catch (decodeError) {
      console.error('[RemixCache] Failed to decode MessagePack data:', decodeError)
      return NextResponse.json({
        success: false,
        error: 'Failed to decode cached data'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        containerId,
        posts: posts,
        cached: true,
        postsCount: posts.length
      }
    })

  } catch (error) {
    console.error('[RemixCache] ❌ Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/redis/remixcache?containerId=xxx
 * 
 * Удалить кеш для контейнера
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const containerId = searchParams.get('containerId')

    if (!containerId) {
      return NextResponse.json(
        { success: false, error: 'containerId is required' },
        { status: 400 }
      )
    }

    console.log('[RemixCache] Deleting cache for containerId:', containerId)

    // Удаляем из Redis
    const result = await redis.del(`remix:${containerId}`)

    console.log('[RemixCache] ✅ Cache deleted, keys removed:', result)

    return NextResponse.json({
      success: true,
      data: {
        containerId,
        deleted: result > 0
      }
    })

  } catch (error) {
    console.error('[RemixCache] ❌ Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

