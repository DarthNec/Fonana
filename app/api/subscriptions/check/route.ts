import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const creatorId = searchParams.get('creatorId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Если указан creatorId, проверяем конкретную подписку
    if (creatorId) {
      const subscription = await prisma.subscription.findUnique({
        where: {
          userId_creatorId: {
            userId,
            creatorId
          }
        }
      })

      return NextResponse.json({
        isSubscribed: subscription?.isActive && subscription.validUntil > new Date(),
        subscription
      })
    }

    // Иначе возвращаем все активные подписки пользователя
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
        validUntil: {
          gt: new Date()
        }
      }
    })

    const subscribedCreatorIds = subscriptions.map(sub => sub.creatorId)

    return NextResponse.json({
      subscriptions,
      subscribedCreatorIds
    })
  } catch (error) {
    console.error('Error checking subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to check subscriptions' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 