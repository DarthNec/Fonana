import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

// GET /api/subscriptions?userId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Получаем все подписки пользователя с информацией об авторах
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: userId,
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

    // Проверяем, есть ли уже активная подписка
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        creatorId: creatorId,
        isActive: true,
        validUntil: {
          gt: new Date()
        }
      }
    })

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Active subscription already exists' },
        { status: 400 }
      )
    }

    // Создаем новую подписку
    const subscription = await prisma.subscription.create({
      data: {
        userId: userId,
        creatorId: creatorId,
        plan: plan,
        price: price,
        isActive: true,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
      }
    })

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