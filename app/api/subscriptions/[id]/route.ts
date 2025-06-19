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

// PUT endpoint удален для безопасности
// Апгрейд подписки должен происходить через создание новой транзакции и оплату 