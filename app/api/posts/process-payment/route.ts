import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentDistribution } from '@/lib/solana/payments'

export async function POST(request: Request) {
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
      user = await prisma.user.create({
        data: {
          solanaWallet: userId,
          wallet: userId,
          name: `User ${userId.slice(0, 8)}`,
          nickname: `user_${userId.slice(0, 8).toLowerCase()}`
        }
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

    return NextResponse.json({
      success: true,
      purchase,
      transaction
    })

  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
} 