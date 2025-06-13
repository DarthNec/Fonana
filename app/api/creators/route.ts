import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    
    // Получаем всех авторов (пользователей, которые являются создателями контента)
    const creators = await prisma.user.findMany({
      where: {
        isCreator: true
      },
      include: {
        posts: {
          include: {
            tags: {
              include: {
                tag: true
              }
            }
          }
        },
        _count: {
          select: {
            followers: true,
            posts: true
          }
        }
      }
    })

    // Обрабатываем данные для фронтенда
    const formattedCreators = creators.map(creator => {
      // Собираем все теги из постов автора
      const allTags = new Set<string>()
      creator.posts.forEach(post => {
        if (post.category) allTags.add(post.category)
        post.tags.forEach(postTag => {
          allTags.add(postTag.tag.name)
        })
      })

      return {
        id: creator.id,
        wallet: creator.wallet,
        nickname: creator.nickname,
        fullName: creator.fullName,
        bio: creator.bio,
        name: creator.fullName || creator.nickname || 'Неизвестный автор',
        username: creator.nickname || creator.wallet.slice(0, 8),
        description: creator.bio || 'Контент-криейтор на платформе Fonana',
        avatar: creator.avatar || null,
        backgroundImage: creator.backgroundImage || null,
        coverImage: `/api/og?title=${encodeURIComponent(creator.fullName || creator.nickname || 'Creator')}`,
        isVerified: creator.isVerified,
        followersCount: creator._count.followers,
        postsCount: creator._count.posts,
        subscribers: creator._count.followers, // для обратной совместимости
        posts: creator._count.posts, // для обратной совместимости
        tags: Array.from(allTags),
        monthlyEarnings: '~100 SOL', // TODO: Рассчитать из реальных подписок
        createdAt: creator.createdAt
      }
    })

    // Фильтруем по категории, если указана
    let filteredCreators = formattedCreators
    if (category && category !== 'All') {
      filteredCreators = formattedCreators.filter(creator => 
        creator.tags.includes(category)
      )
    }

    // Сортируем по количеству подписчиков
    filteredCreators.sort((a, b) => b.subscribers - a.subscribers)

    return NextResponse.json({
      creators: filteredCreators,
      total: filteredCreators.length
    })
  } catch (error) {
    console.error('Error fetching creators:', error)
    return NextResponse.json(
      { error: 'Failed to fetch creators' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 