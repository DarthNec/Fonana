import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

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
    const formattedCreators = creators.map(creator => {
      // Собираем все теги из постов автора
      const allTags = new Set<string>()
      creator.posts.forEach(post => {
        post.tags.forEach(postTag => {
          allTags.add(postTag.tag.name)
        })
      })

      return {
        id: creator.id,
        name: creator.fullName || creator.nickname || 'Неизвестный автор',
        username: creator.nickname || creator.wallet.slice(0, 8),
        description: creator.bio || 'Контент-криейтор на платформе Fonana',
        avatar: creator.avatar || null,
        coverImage: `/api/og?title=${encodeURIComponent(creator.fullName || creator.nickname || 'Creator')}`,
        isVerified: creator.isVerified,
        subscribers: creator.followersCount,
        posts: creator.postsCount,
        tags: Array.from(allTags),
        monthlyEarnings: '~100 SOL', // TODO: Рассчитать из реальных подписок
        createdAt: creator.createdAt
      }
    })

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