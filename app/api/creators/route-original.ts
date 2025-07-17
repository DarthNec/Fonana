import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Отключаем кеширование для этого route
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    // Получаем количество подписчиков для каждого креатора
    const creatorsWithSubscribers = await Promise.all(
      creators.map(async (creator) => {
        const subscribersCount = await prisma.subscription.count({
          where: {
            creatorId: creator.id,
            isActive: true
          }
        })

        // Получаем заработки за последние 30 дней
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        let monthlyEarnings = 0
        if (creator.wallet) {
          const earnings = await prisma.transaction.aggregate({
            where: {
              toWallet: creator.wallet,
              status: 'CONFIRMED',
              createdAt: {
                gte: thirtyDaysAgo
              }
            },
            _sum: {
              amount: true
            }
          })
          
          monthlyEarnings = earnings._sum?.amount || 0
        }

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
          name: creator.fullName || creator.nickname || 'Unknown Creator',
          username: creator.nickname || creator.wallet?.slice(0, 8) || 'user',
          description: creator.bio || 'Content creator on Fonana platform',
          avatar: creator.avatar || null,
          backgroundImage: creator.backgroundImage || null,
          coverImage: `/api/og?title=${encodeURIComponent(creator.fullName || creator.nickname || 'Creator')}`,
          isVerified: creator.isVerified,
          followersCount: creator._count.followers,
          postsCount: creator._count.posts,
          subscribers: subscribersCount,  // Реальное количество активных подписчиков
          posts: creator._count.posts,
          tags: Array.from(allTags),
          monthlyEarnings: monthlyEarnings > 0 ? `${monthlyEarnings.toFixed(2)} SOL` : '0 SOL',
          createdAt: creator.createdAt
        }
      })
    )

    // Фильтруем по категории, если указана
    let filteredCreators = creatorsWithSubscribers
    if (category && category !== 'All') {
      filteredCreators = creatorsWithSubscribers.filter(creator => 
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