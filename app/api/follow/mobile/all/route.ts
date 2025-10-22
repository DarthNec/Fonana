import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/follow/mobile/all - получить всех создателей, на которых подписан пользователь
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    console.log('[API/follow/mobile/all] Getting all followings for user:', userId)
    
    // Валидация
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Получаем все подписки пользователя с полной информацией о создателях
    const follows = await prisma.follow.findMany({
      where: {
        followerId: userId
      },
      include: {
        following: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            bio: true,
            avatar: true,
            wallet: true,
            solanaWallet: true,
            isCreator: true,
            isVerified: true,
            // Счетчики
            followersCount: true,
            followingCount: true,
            backgroundImage: true,
            postsCount: true,
            // Pricing для подписок
            // tierPricing: true,
            // Timestamps
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Сначала последние подписки
      }
    })
    
    console.log('[API/follow/mobile/all] Found', follows.length, 'followings')
    
    // Форматируем результат - возвращаем только создателей
    const creators = follows.map(follow => follow.following)
    
    // Получаем статистику для каждого создателя (количество постов, подписчиков и т.д.)
    const creatorsWithStats = await Promise.all(
        follows.map(async (creator) => {
        // Получаем количество постов
        const postsCount = await prisma.post.count({
          where: { creatorId: creator.id }
        })
        
        // Проверяем, есть ли активная подписка у текущего пользователя на этого создателя
        const activeSubscription = await prisma.subscription.findFirst({
          where: {
            userId: userId,
            creatorId: creator.id,
            isActive: true,
            validUntil: {
              gte: new Date()
            }
          },
          select: {
            id: true,
            plan: true,
            validUntil: true
          }
        })
        
        return {
          ...creator,
          postsCount,
          subscription: activeSubscription || null
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      creators: follows,
      count: follows.length
    })
    
  } catch (error) {
    console.error('[API/follow/mobile/all] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get followings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


