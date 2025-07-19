import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// [media_only_tab_optimization_2025_017] Легкий API для подсчета постов по типам
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get('creatorId')
    const types = searchParams.get('type')?.split(',') || []
    
    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 })
    }

    console.log('[API] Posts count request:', { creatorId, types })

    // Базовый WHERE для фильтрации по креатору
    const baseWhere = {
      creatorId: creatorId
    }

    // Если типы не указаны, возвращаем общий count
    if (types.length === 0) {
      const totalCount = await prisma.post.count({
        where: baseWhere
      })
      
      return NextResponse.json({ 
        total: totalCount,
        counts: { all: totalCount }
      })
    }

    // Параллельные запросы для каждого типа
    const countPromises = types.map(async (type) => {
      const count = await prisma.post.count({
        where: {
          ...baseWhere,
          type: type.trim()
        }
      })
      return { [type.trim()]: count }
    })

    // Также получаем общий count
    const totalPromise = prisma.post.count({
      where: baseWhere
    })

    // Выполняем все запросы параллельно
    const [typeResults, total] = await Promise.all([
      Promise.all(countPromises),
      totalPromise
    ])

    // Объединяем результаты
    const counts = typeResults.reduce((acc, result) => ({ ...acc, ...result }), {})
    
    // Добавляем медиа count (image + video + audio)
    const mediaTypes = ['image', 'video', 'audio']
    const mediaCount = mediaTypes.reduce((sum, type) => sum + (counts[type] || 0), 0)
    
    console.log('[API] Posts count result:', { total, counts, media: mediaCount })

    return NextResponse.json({
      total,
      counts: {
        ...counts,
        media: mediaCount,
        all: total
      }
    })

  } catch (error) {
    console.error('[API] Posts count error:', error)
    return NextResponse.json(
      { error: 'Failed to count posts' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 