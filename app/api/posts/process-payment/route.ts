import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentDistribution } from '@/lib/solana/payments'
import { paymentLogger } from '@/lib/utils/logger'

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
      distribution 
    }: {
      postId: string | number
      userId: string
      price: number
      currency: string
      signature: string
      creatorId: string | number
      hasReferrer: boolean
      distribution: PaymentDistribution
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

    // Найти или создать пользователя по кошельку
    let user = await prisma.user.findUnique({
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
      user = await prisma.user.create({
        data: {
          solanaWallet: userId,
          wallet: userId,
          name: `User ${userId.slice(0, 8)}`,
          nickname: `user_${userId.slice(0, 8).toLowerCase()}_${Date.now()}`
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
        paymentStatus: 'PROCESSING',
        platformFee: distribution.platformAmount,
        referrerFee: distribution.referrerAmount,
        creatorAmount: distribution.creatorAmount
      }
    })

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
        status: 'PENDING',
        platformFee: distribution.platformAmount,
        referrerFee: distribution.referrerAmount,
        referrerWallet: distribution.referrerWallet,
        metadata: {
          postId: postId.toString(),
          creatorId: creatorId.toString(),
          hasReferrer
        }
      }
    })

    // В реальном приложении здесь должна быть проверка транзакции в блокчейне
    // Для демонстрации сразу помечаем как успешную
    
    // Обновляем статус покупки
    await prisma.postPurchase.update({
      where: { id: purchase.id },
      data: { paymentStatus: 'COMPLETED' }
    })

    // Обновляем статус транзакции
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { 
        status: 'CONFIRMED',
        confirmedAt: new Date()
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