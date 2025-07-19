import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentDistribution } from '@/lib/solana/payments'
import { validatePaymentDistribution, waitForTransactionConfirmation } from '@/lib/solana/validation'
import { paymentLogger } from '@/lib/utils/logger'
import { generateRandomNickname, generateRandomBio, generateFullNameFromNickname } from '@/lib/usernames'

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { 
      postId, 
      userId, 
      price, 
      currency, 
      signature, 
      creatorId, 
      hasReferrer,
      distribution,
      flashSaleId 
    }: {
      postId: string | number
      userId: string
      price: number
      currency: string
      signature: string
      creatorId: string | number
      hasReferrer: boolean
      distribution: PaymentDistribution
      flashSaleId?: string
    } = body

    paymentLogger.info('Processing post payment', {
      postId: postId.toString(),
      userId,
      price,
      currency,
      hasReferrer
    })

    // Валидация входных данных
    if (!postId || !userId || !price || !currency || !signature || !creatorId) {
      paymentLogger.warn('Invalid payment data', { postId, userId, price })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Ждём подтверждения транзакции
    paymentLogger.info('Waiting for transaction confirmation', { signature })
    const isConfirmed = await waitForTransactionConfirmation(signature)
    
    if (!isConfirmed) {
      paymentLogger.error('Transaction not confirmed', { signature })
      return NextResponse.json(
        { error: 'Transaction not confirmed. Please try again.' },
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
    let user = await prisma.user.findFirst({
      where: { solanaWallet: userId }
    })

    if (!user) {
      user = await prisma.user.findUnique({
        where: { wallet: userId }
      })
    }

    if (!user) {
      // Создаем нового пользователя если не существует
      paymentLogger.info('Creating new user for payment', { userId })
      
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
          solanaWallet: userId,
          wallet: userId,
          name: fullName,
          nickname,
          fullName,
          bio,
          isCreator: true
        }
      })
    }

    // Проверяем, не была ли уже куплена эта покупка
    const existingPurchase = await prisma.postPurchase.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: postId.toString()
        }
      }
    })

    if (existingPurchase) {
      paymentLogger.warn('Duplicate purchase attempt', { userId: user.id, postId })
      return NextResponse.json({
        success: true,
        purchase: existingPurchase,
        message: 'Already purchased'
      })
    }

    // Создаем запись о покупке
    const purchase = await prisma.postPurchase.create({
      data: {
        postId: postId.toString(),
        userId: user.id,
        price,
        currency,
        txSignature: signature,
        paymentStatus: 'COMPLETED',
        platformFee: distribution.platformAmount,
        referrerFee: distribution.referrerAmount,
        creatorAmount: distribution.creatorAmount
      }
    })

    // Если была использована Flash Sale, создаем запись о её использовании
    if (flashSaleId) {
      const flashSale = await prisma.flashSale.findUnique({
        where: { id: flashSaleId }
      })
      
      if (flashSale) {
        const originalPrice = price / (1 - flashSale.discount / 100)
        const discountAmount = originalPrice - price
        
        await prisma.flashSaleRedemption.create({
          data: {
            flashSaleId,
            userId: user.id,
            originalPrice,
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

    // Создаем транзакцию
    const transaction = await prisma.transaction.create({
      data: {
        postPurchaseId: purchase.id,
        txSignature: signature,
        fromWallet: userId,
        toWallet: distribution.creatorWallet,
        amount: price,
        currency,
        type: 'POST_PURCHASE',
        status: 'CONFIRMED',
        platformFee: distribution.platformAmount,
        referrerFee: distribution.referrerAmount,
        referrerWallet: distribution.referrerWallet,
        confirmedAt: new Date(),
        metadata: {
          postId: postId.toString(),
          creatorId: creatorId.toString(),
          hasReferrer,
          validationDetails: validation.details
        }
      }
    })

    const duration = Date.now() - startTime
    paymentLogger.payment('completed', {
      userId: user.id,
      creatorId: creatorId.toString(),
      amount: price,
      currency,
      signature,
      hasReferrer
    })
    paymentLogger.info(`Payment processed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      purchase,
      transaction
    })

  } catch (error) {
    const duration = Date.now() - startTime
    paymentLogger.payment('error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    paymentLogger.error(`Payment processing failed in ${duration}ms`, error)
    
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
} 