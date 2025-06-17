import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '5')
    const excludeIds = searchParams.get('exclude')?.split(',') || []
    
    // Получаем популярных авторов (сортируем по количеству подписчиков)
    const creators = await prisma.user.findMany({
      where: {
        isCreator: true,
        id: {
          notIn: excludeIds
        }
      },
      orderBy: {
        followersCount: 'desc'
      },
      take: limit * 2, // Берем больше, чтобы потом перемешать
      include: {
        posts: {
          select: {
            id: true,
            tags: {
              include: {
                tag: true
              }
            }
          }
        }
      }
    })

    // Обрабатываем данные для фронтенда
    const formattedCreators = await Promise.all(creators.map(async (creator) => {
      // Собираем все теги из постов автора
      const allTags = new Set<string>()
      creator.posts.forEach((post: any) => {
        post.tags.forEach((postTag: any) => {
          allTags.add(postTag.tag.name)
        })
      })

      // Получаем активные подписки создателя для расчета заработка
      const activeSubscriptions = await prisma.subscription.findMany({
        where: {
          creatorId: creator.id,
          isActive: true,
          validUntil: { gte: new Date() }
        }
      })
      
      // Рассчитываем месячный заработок
      const monthlyEarnings = activeSubscriptions.reduce((sum: number, sub: any) => {
        return sum + (sub.creatorAmount || sub.price * 0.9) // 90% идет создателю
      }, 0)
      
      // Получаем количество подписчиков и постов
      const [subscribersCount, postsCount] = await Promise.all([
        prisma.subscription.count({
          where: {
            creatorId: creator.id,
            isActive: true,
            validUntil: { gte: new Date() }
          }
        }),
        prisma.post.count({
          where: { creatorId: creator.id }
        })
      ])
      
      return {
        id: creator.id,
        name: creator.nickname || creator.fullName || creator.name || 'Unknown Creator',
        username: creator.nickname || creator.wallet?.slice(0, 6) + '...' + creator.wallet?.slice(-4) || 'unknown',
        description: creator.bio || 'New creator on the platform',
        avatar: creator.avatar || null,
        backgroundImage: creator.backgroundImage || null,
        coverImage: creator.backgroundImage || '',
        isVerified: creator.isVerified,
        subscribers: subscribersCount,
        posts: postsCount,
        tags: Array.from(allTags),
        monthlyEarnings: `~${monthlyEarnings.toFixed(2)} SOL`,
        createdAt: creator.createdAt.toISOString()
      }
    }))

    // Перемешиваем и возвращаем запрошенное количество
    const shuffled = formattedCreators.sort(() => 0.5 - Math.random())
    const recommendations = shuffled.slice(0, limit)

    return NextResponse.json({
      recommendations,
      total: recommendations.length
    })
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 