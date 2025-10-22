import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentDistribution } from '@/lib/solana/payments'
import { paymentLogger } from '@/lib/utils/logger'
import { generateRandomNickname, generateRandomBio, generateFullNameFromNickname } from '@/lib/usernames'
import { notifyNewSubscriber } from '@/lib/notifications'
import { DEFAULT_TIER_PRICES } from '@/lib/constants/tiers'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

// WebSocket события
import { notifyNewSubscription, sendNotification } from '@/lib/services/websocket-client'

export const dynamic = 'force-dynamic'

// POST /api/subscriptions/mobile - создать подписку для мобильного приложения
// Упрощенная версия без проверки блокчейна (транзакция уже подтверждена на клиенте)
export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    // Проверяем JWT токен
    /*
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      paymentLogger.warn('[Mobile] No authentication provided')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const token = authHeader.split(' ')[1]
    let userId: string
    
    try {
      const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET) as any
      userId = decoded.userId
    } catch (error) {
      paymentLogger.warn('[Mobile] Invalid JWT token')
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    */
    const body = await request.json()
    const { 
      creatorId, 
      plan, 
      price, 
      originalPrice,
      currency = 'SOL', 
      signature, 
      hasReferrer,
      distribution,
      flashSaleId,
      userWallet,
      userId
    }: {
      creatorId: string
      plan: string
      price: number
      originalPrice?: number
      currency?: string
      signature: string
      hasReferrer: boolean
      distribution: PaymentDistribution
      flashSaleId?: string
      userWallet?: string
      userId?: string
    } = body

    paymentLogger.info('[Mobile] Processing subscription', {
      creatorId,
      plan,
      price,
      originalPrice,
      currency,
      hasReferrer,
      flashSaleId,
      userId,
      userWallet: userWallet ? userWallet.slice(0, 8) + '...' : undefined,
      distribution: {
        creatorAmount: distribution.creatorAmount,
        platformAmount: distribution.platformAmount,
        referrerAmount: distribution.referrerAmount
      }
    })

    // Валидация входных данных
    if (!creatorId || !plan || price === undefined || price === null || !signature || !distribution) {
      paymentLogger.warn('[Mobile] Invalid payment data', { creatorId, plan, price })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Валидация цены
    if (price <= 0 || isNaN(price)) {
      paymentLogger.error('[Mobile] Invalid price value', { price, plan })
      return NextResponse.json(
        { error: 'Invalid price value' },
        { status: 400 }
      )
    }

    // Получаем пользователя по ID
    let user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      // Если пользователь не найден по ID, но передан wallet - создаем нового
      if (userWallet) {
        paymentLogger.info('[Mobile] Creating new user for subscription', { userId, userWallet })
        
        // Генерируем уникальный никнейм
        let nickname = generateRandomNickname()
        let attempts = 0
        
        while (attempts < 100) {
          const existing = await prisma.user.findFirst({
            where: { nickname }
          })
          
          if (!existing) {
            break
          }
          
          nickname = generateRandomNickname()
          attempts++
        }
        
        if (attempts >= 100) {
          nickname = `user${Date.now()}`
        }
        
        const fullName = generateFullNameFromNickname(nickname)
        const bio = generateRandomBio()
        
        user = await prisma.user.create({
          data: {
            id: userId,
            solanaWallet: userWallet,
            wallet: userWallet,
            name: fullName,
            nickname,
            fullName,
            bio,
            isCreator: true
          }
        })
      } else {
        paymentLogger.warn('[Mobile] User not found by ID', { userId })
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // Проверяем, есть ли уже подписка (активная или нет)
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId_creatorId: {
          userId: user.id,
          creatorId
        }
      }
    })

    paymentLogger.info('[Mobile] Processing subscription', { 
      userId: user.id,
      creatorId,
      plan,
      hasExisting: !!existingSubscription,
      previousPlan: existingSubscription?.plan
    })

    // Рассчитываем срок действия подписки (1 месяц)
    const validUntil = new Date()
    validUntil.setMonth(validUntil.getMonth() + 1)

    // Всегда обновляем или создаем подписку с входными данными
    const subscription = existingSubscription
      ? await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            plan,
            price,
            currency,
            validUntil,
            isActive: true,
            txSignature: signature,
            paymentStatus: 'COMPLETED'
          }
        })
      : await prisma.subscription.create({
          data: {
            userId: user.id,
            creatorId,
            plan,
            price,
            currency,
            validUntil,
            isActive: true,
            txSignature: signature,
            paymentStatus: 'COMPLETED'
          }
        })

    // Создаем транзакцию
    const transaction = await prisma.transaction.create({
      data: {
        subscriptionId: subscription.id,
        txSignature: signature,
        fromWallet: user.solanaWallet || user.wallet || '',
        toWallet: distribution.creatorWallet,
        amount: price,
        currency,
        type: 'SUBSCRIPTION',
        status: 'CONFIRMED',
        platformFee: distribution.platformAmount,
        referrerFee: distribution.referrerAmount,
        referrerWallet: distribution.referrerWallet,
        confirmedAt: new Date(),
        metadata: {
          plan,
          creatorId,
          hasReferrer,
          source: 'mobile',
          note: 'Transaction validated on client side',
          previousPlan: existingSubscription?.plan
        }
      }
    })

    // Если была использована Flash Sale, создаем запись
    if (flashSaleId) {
      const flashSale = await prisma.flashSale.findUnique({
        where: { id: flashSaleId }
      })
      
      if (flashSale) {
        const discountAmount = (originalPrice || price) - price
        
        await prisma.flashSaleRedemption.create({
          data: {
            flashSaleId,
            userId: user.id,
            originalPrice: originalPrice || price,
            discountAmount,
            finalPrice: price
          }
        })
        
        await prisma.flashSale.update({
          where: { id: flashSaleId },
          data: { usedCount: { increment: 1 } }
        })
      }
    }

    // Создаем уведомление для креатора
    const subscriberName = user.fullName || user.nickname || 'A user'
    
    const creatorSettings = await prisma.userSettings.findUnique({
      where: { userId: creatorId }
    })
    
    if (!creatorSettings || creatorSettings.notifySubscriptions) {
      await notifyNewSubscriber(creatorId, subscriberName, plan)
      
      // WebSocket уведомления
      try {
        await sendNotification(creatorId, {
          type: 'SUBSCRIPTION',
          title: 'Подписка обновлена',
          message: `${subscriberName} подписался на план ${plan}`,
          metadata: { 
            userId: user.id, 
            plan, 
            source: 'mobile',
            previousPlan: existingSubscription?.plan
          }
        })
        
        await notifyNewSubscription(creatorId, {
          userId: user.id,
          plan,
          userInfo: {
            id: user.id,
            nickname: user.nickname || '',
            fullName: user.fullName || '',
            avatar: user.avatar || null
          }
        })
      } catch (error) {
        console.error('[Mobile] WebSocket notification failed:', error)
      }
    }

    const duration = Date.now() - startTime
    
    paymentLogger.payment('completed', {
      userId: user.id,
      creatorId,
      amount: price,
      currency,
      signature,
      hasReferrer
    })
    paymentLogger.info(`[Mobile] Subscription processed in ${duration}ms`, {
      plan,
      previousPlan: existingSubscription?.plan,
      isUpdate: !!existingSubscription
    })

    return NextResponse.json({
      success: true,
      subscription,
      transaction
    })

  } catch (error) {
    const duration = Date.now() - startTime
    paymentLogger.payment('error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    paymentLogger.error(`[Mobile] Subscription processing failed in ${duration}ms`, error)
    
    return NextResponse.json(
      { error: 'Failed to process subscription', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
