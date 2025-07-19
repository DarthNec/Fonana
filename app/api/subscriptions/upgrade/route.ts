import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    // Временно убираем проверку аутентификации для тестирования
    /*
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    */

    const { userNickname, creatorNickname, newTier, reason = 'MANUAL_UPGRADE' } = await req.json()

    // 2. Валидация входных данных
    if (!userNickname || !creatorNickname || !newTier) {
      return NextResponse.json({ 
        error: 'Missing required fields: userNickname, creatorNickname, newTier' 
      }, { status: 400 })
    }

    const validTiers = ['free', 'basic', 'premium', 'vip']
    if (!validTiers.includes(newTier.toLowerCase())) {
      return NextResponse.json({ 
        error: 'Invalid tier. Must be one of: free, basic, premium, vip' 
      }, { status: 400 })
    }

    // 3. Находим пользователей
    const [user, creator] = await Promise.all([
      prisma.user.findUnique({ where: { nickname: userNickname } }),
      prisma.user.findUnique({ where: { nickname: creatorNickname } })
    ])

    if (!user) {
      return NextResponse.json({ error: `User ${userNickname} not found` }, { status: 404 })
    }
    if (!creator) {
      return NextResponse.json({ error: `Creator ${creatorNickname} not found` }, { status: 404 })
    }

    // 4. Находим активную подписку
    const subscription = await prisma.subscription.findFirst({
      where: { 
        userId: user.id, 
        creatorId: creator.id, 
        isActive: true 
      }
    })

    if (!subscription) {
      return NextResponse.json({ 
        error: `No active subscription found for ${userNickname} to ${creatorNickname}` 
      }, { status: 404 })
    }

    // 5. Проверяем иерархию тиров
    const tierHierarchy = ['free', 'basic', 'premium', 'vip']
    const currentTierIndex = tierHierarchy.indexOf(subscription.plan.toLowerCase())
    const newTierIndex = tierHierarchy.indexOf(newTier.toLowerCase())

    console.log(`[Upgrade] ${userNickname}: ${subscription.plan} (${currentTierIndex}) -> ${newTier} (${newTierIndex})`)

    // 6. Рассчитываем стоимость (для lafufu - бесплатно как исправление)
    const calculateUpgradePrice = (fromTier: string, toTier: string): number => {
      if (reason === 'MANUAL_CORRECTION') return 0 // Бесплатно для исправлений
      
      const prices = { free: 0, basic: 0.05, premium: 0.15, vip: 0.35 }
      return prices[toTier as keyof typeof prices] - prices[fromTier as keyof typeof prices]
    }

    const upgradePrice = calculateUpgradePrice(subscription.plan.toLowerCase(), newTier.toLowerCase())

    // 7. Выполняем upgrade в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Генерируем уникальный ID для фиктивной транзакции
      const txSignature = `manual_correction_${Date.now()}_${Math.random().toString(36).substring(7)}`

      // Создаем запись транзакции для audit trail
      const transaction = await tx.transaction.create({
        data: {
          subscriptionId: subscription.id,
          txSignature: txSignature,
          fromWallet: user.wallet || 'MANUAL_CORRECTION', // Используем wallet пользователя или placeholder
          toWallet: creator.wallet || 'MANUAL_CORRECTION', // Используем wallet создателя или placeholder
          amount: upgradePrice,
          currency: 'SOL',
          type: 'SUBSCRIPTION',
          status: 'CONFIRMED',
          senderId: user.id,
          receiverId: creator.id,
          metadata: {
            previousTier: subscription.plan,
            newTier: newTier,
            reason: reason,
            upgradedBy: 'system',
            timestamp: new Date().toISOString()
          },
          confirmedAt: new Date()
        }
      })

      // Обновляем подписку
      const updatedSubscription = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          plan: newTier,
          // Обновляем validUntil если это upgrade
          ...(newTierIndex > currentTierIndex && {
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 дней
          })
        },
        include: {
          creator: {
            select: { id: true, nickname: true, fullName: true }
          },
          user: {
            select: { id: true, nickname: true, fullName: true }
          }
        }
      })

      return { transaction, subscription: updatedSubscription }
    })

    // 8. Эмитируем событие для real-time обновлений
    const event = {
      type: 'subscription_updated',
      userId: user.id,
      creatorId: creator.id,
      tier: newTier,
      timestamp: new Date().toISOString()
    }

    // TODO: WebSocket broadcast когда будет готов JWT
    console.log('[Subscription Updated]', event)

    // 9. Возвращаем результат
    return NextResponse.json({
      success: true,
      message: `Subscription upgraded from ${subscription.plan} to ${newTier}`,
      subscription: result.subscription,
      transaction: result.transaction,
      event
    })

  } catch (error) {
    console.error('[Subscription Upgrade Error]:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 