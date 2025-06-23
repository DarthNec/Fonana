import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentDistribution } from '@/lib/solana/payments'
import { validatePaymentDistribution, waitForTransactionConfirmation } from '@/lib/solana/validation'
import { paymentLogger } from '@/lib/utils/logger'
import { generateRandomNickname, generateRandomBio, generateFullNameFromNickname } from '@/lib/usernames'
import { notifyNewSubscriber } from '@/lib/notifications'

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    let { 
      creatorId, 
      plan, 
      price, 
      originalPrice,
      currency = 'SOL', 
      signature, 
      hasReferrer,
      distribution,
      flashSaleId 
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
    } = body

    // Получаем пользователя из заголовков
    const userWallet = request.headers.get('x-user-wallet')
    
    if (!userWallet) {
      paymentLogger.warn('No user wallet in headers')
      return NextResponse.json(
        { error: 'User wallet required' },
        { status: 401 }
      )
    }

    paymentLogger.info('Processing subscription payment', {
      creatorId,
      plan,
      price,
      originalPrice,
      currency,
      hasReferrer,
      flashSaleId,
      userWallet: userWallet.slice(0, 8) + '...',
      distribution: {
        creatorAmount: distribution.creatorAmount,
        platformAmount: distribution.platformAmount,
        referrerAmount: distribution.referrerAmount
      }
    })

    // Валидация входных данных
    if (!creatorId || !plan || price === undefined || price === null || !signature || !distribution) {
      paymentLogger.warn('Invalid payment data', { creatorId, plan, price })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Валидация цены
    if (price <= 0 || isNaN(price)) {
      paymentLogger.error('Invalid price value', { price, plan })
      return NextResponse.json(
        { error: 'Invalid price value' },
        { status: 400 }
      )
    }
    
    // Получаем настройки тиров создателя
    const creatorTierSettings = await prisma.creatorTierSettings.findUnique({
      where: { creatorId }
    })
    
    // Определяем ожидаемые цены (кастомные или дефолтные)
    const tierPrices: Record<string, number> = {
      'basic': 0.05,
      'premium': 0.15,
      'vip': 0.35
    }
    
    // Если есть кастомные настройки, используем их
    if (creatorTierSettings) {
      const basicTier = creatorTierSettings.basicTier as any
      const premiumTier = creatorTierSettings.premiumTier as any
      const vipTier = creatorTierSettings.vipTier as any
      
      if (basicTier?.enabled !== false && basicTier?.price) {
        tierPrices.basic = basicTier.price
      }
      if (premiumTier?.enabled !== false && premiumTier?.price) {
        tierPrices.premium = premiumTier.price
      }
      if (vipTier?.enabled !== false && vipTier?.price) {
        tierPrices.vip = vipTier.price
      }
    }
    
    paymentLogger.info('Creator tier prices', {
      creatorId,
      hasCustomTiers: !!creatorTierSettings,
      tierPrices
    })
    
    // Нормализуем план к нижнему регистру для проверки
    const normalizedPlan = plan.toLowerCase()
    
    // Проверяем валидность цены, НО НЕ КОРРЕКТИРУЕМ ПЛАН!
    if (!flashSaleId) {
      const requestedTierPrice = tierPrices[normalizedPlan]
      
      // Проверяем, соответствует ли оплаченная цена ЛЮБОМУ из тиров создателя
      const paidTierExists = Object.values(tierPrices).some(tierPrice => 
        Math.abs(price - tierPrice) < 0.001
      )
      
      if (!paidTierExists) {
        // Цена не соответствует ни одному тиру
        paymentLogger.error('Price does not match any tier', {
          price,
          requestedPlan: plan,
          availableTiers: tierPrices,
          hasCustomTiers: !!creatorTierSettings
        })
        
        return NextResponse.json(
          { error: `Invalid subscription price ${price} SOL. Available tiers: Basic ${tierPrices.basic} SOL, Premium ${tierPrices.premium} SOL, VIP ${tierPrices.vip} SOL` },
          { status: 400 }
        )
      }
      
      // Если цена валидна, но не соответствует запрошенному плану - это предупреждение, не ошибка
      if (requestedTierPrice && Math.abs(price - requestedTierPrice) > 0.001) {
        paymentLogger.warn('Price mismatch for requested plan - but price is valid for another tier', {
          requestedPlan: plan,
          requestedPrice: requestedTierPrice,
          actualPrice: price,
          customTiers: !!creatorTierSettings,
          note: 'Saving requested plan as is'
        })
      }
      
      // ВАЖНО: Мы НЕ изменяем план! Сохраняем тот, который был запрошен
      paymentLogger.info('Saving subscription with requested plan', {
        plan,
        price,
        tierPrices
      })
    }

    // Ждём подтверждения транзакции
    paymentLogger.info('Waiting for transaction confirmation', { signature })
    const isConfirmed = await waitForTransactionConfirmation(signature)
    
    if (!isConfirmed) {
      paymentLogger.error('Transaction not confirmed', { signature })
      return NextResponse.json(
        { error: 'Transaction not confirmed' },
        { status: 400 }
      )
    }

    // Валидация распределения платежа
    paymentLogger.info('Validating payment distribution', { signature })
    const validation = await validatePaymentDistribution(signature, distribution)
    
    if (!validation.isValid) {
      paymentLogger.error('Payment validation failed', { 
        signature, 
        error: validation.error,
        details: validation.details 
      })
      return NextResponse.json(
        { error: validation.error || 'Payment validation failed' },
        { status: 400 }
      )
    }

    // Найти или создать пользователя по кошельку
    let user = await prisma.user.findUnique({
      where: { solanaWallet: userWallet }
    })

    if (!user) {
      user = await prisma.user.findUnique({
        where: { wallet: userWallet }
      })
    }

    if (!user) {
      // Создаем нового пользователя если не существует
      paymentLogger.info('Creating new user for subscription', { userWallet })
      
      // Генерируем уникальный никнейм
      let nickname = generateRandomNickname()
      let attempts = 0
      
      // Проверяем уникальность никнейма
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
      
      // Если не смогли сгенерировать уникальный никнейм, используем timestamp
      if (attempts >= 100) {
        nickname = `user${Date.now()}`
      }
      
      // Генерируем остальные данные
      const fullName = generateFullNameFromNickname(nickname)
      const bio = generateRandomBio()
      
      user = await prisma.user.create({
        data: {
          solanaWallet: userWallet,
          wallet: userWallet,
          name: fullName,
          nickname,
          fullName,
          bio,
          isCreator: true
        }
      })
    }

    // Проверяем, есть ли уже активная подписка
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId_creatorId: {
          userId: user.id,
          creatorId
        }
      }
    })

    if (existingSubscription && existingSubscription.isActive && 
        new Date(existingSubscription.validUntil) > new Date()) {
      paymentLogger.warn('Active subscription already exists', { 
        userId: user.id, 
        creatorId 
      })
      return NextResponse.json({
        success: true,
        subscription: existingSubscription,
        message: 'Active subscription already exists'
      })
    }

    // Рассчитываем срок действия подписки
    const validUntil = new Date()
    // Всегда устанавливаем месяц для любого плана подписки
    validUntil.setMonth(validUntil.getMonth() + 1)

    // Создаем или обновляем подписку
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
            paymentStatus: 'COMPLETED',
            paymentAmount: price,
            platformFee: distribution.platformAmount,
            referrerFee: distribution.referrerAmount,
            creatorAmount: distribution.creatorAmount
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
            paymentStatus: 'COMPLETED',
            paymentAmount: price,
            platformFee: distribution.platformAmount,
            referrerFee: distribution.referrerAmount,
            creatorAmount: distribution.creatorAmount
          }
        })

    // Создаем транзакцию
    const transaction = await prisma.transaction.create({
      data: {
        subscriptionId: subscription.id,
        txSignature: signature,
        fromWallet: userWallet,
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
          validationDetails: validation.details
        }
      }
    })

    // Если была использована Flash Sale, создаем запись о её использовании
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
        
        // Обновляем счетчик использования
        await prisma.flashSale.update({
          where: { id: flashSaleId },
          data: { usedCount: { increment: 1 } }
        })
      }
    }

    // Создаем уведомление для креатора о новом подписчике
    if (!existingSubscription || !existingSubscription.isActive) {
      // Это новая подписка, отправляем уведомление
      const subscriberName = user.fullName || user.nickname || 'A user'
      
      // Проверяем настройки уведомлений креатора
      const creatorSettings = await prisma.userSettings.findUnique({
        where: { userId: creatorId }
      })
      
      if (!creatorSettings || creatorSettings.notifySubscriptions) {
        await notifyNewSubscriber(creatorId, subscriberName, plan)
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
    paymentLogger.info(`Subscription payment processed in ${duration}ms`)

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
    paymentLogger.error(`Subscription payment processing failed in ${duration}ms`, error)
    
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
} 