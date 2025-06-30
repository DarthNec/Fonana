import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateTransaction, waitForTransactionConfirmation } from '@/lib/solana/validation'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

// POST /api/posts/[id]/buy - купить пост с фиксированной ценой
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { buyerWallet, txSignature } = body

    if (!buyerWallet || !txSignature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Получаем пост
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        creator: true,
        soldTo: true
      }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }
    
    // Проверяем наличие кошелька создателя
    const creatorWallet = post.creator.wallet || post.creator.solanaWallet
    if (!creatorWallet) {
      return NextResponse.json(
        { error: 'Creator wallet not configured' },
        { status: 400 }
      )
    }

    // Проверяем, что пост продается
    if (!post.isSellable || post.sellType !== 'FIXED_PRICE') {
      return NextResponse.json(
        { error: 'This post is not for sale' },
        { status: 400 }
      )
    }

    // Проверяем, что пост еще не продан
    if (post.soldAt || post.soldToId) {
      return NextResponse.json(
        { error: 'This post has already been sold' },
        { status: 400 }
      )
    }

    // Проверяем цену
    const price = post.price
    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Invalid post price' },
        { status: 400 }
      )
    }

    // Получаем покупателя по ID из токена
    const buyer = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer not found' },
        { status: 404 }
      )
    }

    // Проверяем, что кошелек покупателя совпадает с указанным
    const userWallet = buyer.wallet || buyer.solanaWallet
    if (userWallet !== buyerWallet) {
      return NextResponse.json(
        { error: 'Wallet mismatch' },
        { status: 400 }
      )
    }

    // Проверяем, что покупатель не является создателем
    if (buyer.id === post.creatorId) {
      return NextResponse.json(
        { error: 'You cannot buy your own post' },
        { status: 400 }
      )
    }

    // Ждем подтверждения транзакции
    console.log(`Waiting for transaction confirmation: ${txSignature}`)
    const isConfirmed = await waitForTransactionConfirmation(txSignature, 60, 2000)
    
    if (!isConfirmed) {
      return NextResponse.json(
        { error: 'Transaction not confirmed. Please check your wallet and try again.' },
        { status: 400 }
      )
    }
    
    // Проверяем транзакцию
    const validation = await validateTransaction(
      txSignature,
      price,
      [creatorWallet]
    )

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid or insufficient payment transaction' },
        { status: 400 }
      )
    }

    // Обновляем пост как проданный в транзакции
    const [updatedPost, transaction, postPurchase] = await prisma.$transaction([
      // Обновляем пост
      prisma.post.update({
        where: { id: params.id },
        data: {
          soldAt: new Date(),
          soldToId: buyer.id,
          soldPrice: price,
          auctionStatus: 'SOLD'
        },
        include: {
          creator: true,
          soldTo: true
        }
      }),
      
      // Создаем запись транзакции
      prisma.transaction.create({
        data: {
          txSignature,
          fromWallet: buyerWallet,
          toWallet: creatorWallet,
          amount: price,
          currency: post.currency || 'SOL',
          type: 'POST_PURCHASE',
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          metadata: {
            postId: params.id,
            sellType: 'FIXED_PRICE'
          }
        }
      }),
      
      // Создаем запись о покупке поста для доступа
      prisma.postPurchase.create({
        data: {
          postId: params.id,
          userId: buyer.id,
          price: price,
          currency: post.currency || 'SOL',
          txSignature,
          paymentStatus: 'COMPLETED',
          creatorAmount: price // Пока без учета комиссий
        }
      })
    ])

    // Отправляем уведомление продавцу
    await prisma.notification.create({
      data: {
        userId: post.creatorId,
        type: 'POST_PURCHASE',
        title: 'Your post has been sold!',
        message: `${buyer.nickname || (buyer.wallet ? buyer.wallet.slice(0, 6) + '...' : 'User')} bought your post "${post.title}" for ${price} ${post.currency}`,
        metadata: {
          postId: params.id,
          buyerId: buyer.id,
          price: price,
          currency: post.currency,
          buyerName: buyer.nickname || 'User',
          buyerWallet: buyer.wallet || ''
        }
      }
    })

    return NextResponse.json({
      success: true,
      post: updatedPost,
      transaction
    })
  } catch (error) {
    console.error('Error buying post:', error)
    return NextResponse.json(
      { error: 'Failed to buy post' },
      { status: 500 }
    )
  }
} 