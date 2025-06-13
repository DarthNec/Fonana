import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

// DELETE /api/subscriptions/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Проверяем существование подписки
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Помечаем подписку как неактивную вместо удаления
    await prisma.subscription.update({
      where: { id },
      data: {
        isActive: false,
        validUntil: new Date() // Устанавливаем дату окончания на сейчас
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subscription:', error)
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    )
  }
}

// PUT /api/subscriptions/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const data = await request.json()
    const { plan, price } = data

    if (!plan || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Проверяем существование подписки
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Обновляем подписку
    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: {
        plan,
        price,
        // При обновлении продлеваем подписку на 30 дней от текущей даты
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })

    // Получаем информацию о создателе
    const creator = await prisma.user.findUnique({
      where: { id: updatedSubscription.creatorId },
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
        id: updatedSubscription.id,
        creatorId: updatedSubscription.creatorId,
        creator: creator,
        plan: updatedSubscription.plan,
        price: updatedSubscription.price,
        currency: updatedSubscription.currency,
        subscribedAt: updatedSubscription.subscribedAt.toISOString(),
        validUntil: updatedSubscription.validUntil.toISOString(),
        isActive: updatedSubscription.isActive
      }
    })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
} 