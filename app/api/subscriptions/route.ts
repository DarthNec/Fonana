import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

// GET /api/subscriptions?userId=... или /api/subscriptions?creatorId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const creatorId = searchParams.get('creatorId')

    // Если указан creatorId, возвращаем подписчиков создателя
    if (creatorId) {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          creatorId: creatorId,
          isActive: true,
          validUntil: {
            gt: new Date()
          }
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              fullName: true,
              avatar: true,
              wallet: true
            }
          }
        },
        orderBy: {
          subscribedAt: 'desc'
        }
      })

      const formattedSubscriptions = subscriptions.map(sub => ({
        id: sub.id,
        userId: sub.userId,
        user: sub.user,
        plan: sub.plan,
        price: sub.price,
        currency: sub.currency,
        subscribedAt: sub.subscribedAt.toISOString(),
        validUntil: sub.validUntil.toISOString(),
        isActive: sub.isActive && new Date(sub.validUntil) > new Date()
      }))

      return NextResponse.json({
        subscriptions: formattedSubscriptions
      })
    }

    // Если указан userId, возвращаем подписки пользователя
    if (userId) {
      // Получаем только активные подписки пользователя с информацией об авторах
      const subscriptions = await prisma.subscription.findMany({
        where: {
          userId: userId,
          isActive: true,
          validUntil: {
            gt: new Date()
          }
        },
        orderBy: {
          subscribedAt: 'desc'
        }
      })

      // Для каждой подписки получаем информацию об авторе
      const subscriptionsWithCreators = await Promise.all(
        subscriptions.map(async (sub) => {
          const creator = await prisma.user.findUnique({
            where: { id: sub.creatorId },
            select: {
              id: true,
              nickname: true,
              fullName: true,
              avatar: true,
              isVerified: true,
            }
          })

          return {
            id: sub.id,
            creatorId: sub.creatorId,
            creator: creator,
            plan: sub.plan,
            price: sub.price,
            currency: sub.currency,
            subscribedAt: sub.subscribedAt.toISOString(),
            validUntil: sub.validUntil.toISOString(),
            isActive: sub.isActive && new Date(sub.validUntil) > new Date()
          }
        })
      )

      return NextResponse.json({
        subscriptions: subscriptionsWithCreators
      })
    }

    return NextResponse.json(
      { error: 'userId or creatorId is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}

// POST /api/subscriptions
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { userId, creatorId, plan, price } = data

    if (!userId || !creatorId || !plan || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Проверяем, есть ли существующая подписка (активная или неактивная)
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId_creatorId: {
          userId: userId,
          creatorId: creatorId
        }
      }
    })

    let subscription

    if (existingSubscription) {
      // Если подписка существует, проверяем её статус
      if (existingSubscription.isActive && existingSubscription.validUntil > new Date()) {
        return NextResponse.json(
          { error: 'Active subscription already exists' },
          { status: 400 }
        )
      }

      // Обновляем существующую подписку
      subscription = await prisma.subscription.update({
        where: {
          id: existingSubscription.id
        },
        data: {
          plan: plan,
          price: price,
          isActive: true,
          subscribedAt: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
          currency: 'SOL'
        }
      })
    } else {
      // Создаем новую подписку
      subscription = await prisma.subscription.create({
        data: {
          userId: userId,
          creatorId: creatorId,
          plan: plan,
          price: price,
          currency: 'SOL',
          isActive: true,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
        }
      })
    }

    // Получаем информацию о создателе
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        avatar: true,
        isVerified: true,
      }
    })

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        creatorId: subscription.creatorId,
        creator: creator,
        plan: subscription.plan,
        price: subscription.price,
        currency: subscription.currency,
        subscribedAt: subscription.subscribedAt.toISOString(),
        validUntil: subscription.validUntil.toISOString(),
        isActive: true
      }
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
} 