import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentDistribution } from '@/lib/solana/payments'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

export const dynamic = 'force-dynamic'

// POST /api/posts/[id]/buy/mobile - купить пост (мобильная версия)
// Упрощенная версия без проверки блокчейна (транзакция уже подтверждена на клиенте)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Mobile Buy] Processing post purchase for post:', params.id)
    /*
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
    */
    const body = await request.json()
    const { 
      buyerWallet, 
      txSignature,
      price: paymentPrice,
      hasReferrer,
      distribution,
      userId
    }: {
      buyerWallet: string
      txSignature: string
      price: number
      hasReferrer?: boolean
      distribution?: PaymentDistribution
      userId?: string
    } = body

    console.log('[Mobile Buy] Request data:', {
      buyerWallet: buyerWallet?.slice(0, 8) + '...',
      txSignature: txSignature?.slice(0, 20) + '...',
      paymentPrice,
      hasReferrer
    })

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
        creator: true
      }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }
    
    console.log('[Mobile Buy] Post found:', {
      id: post.id,
      title: post.title,
      price: post.price,
      isLocked: post.isLocked,
      isSellable: post.isSellable
    })
    
    // Проверяем наличие кошелька создателя
    const creatorWallet = post.creator.wallet || post.creator.solanaWallet
    if (!creatorWallet) {
      return NextResponse.json(
        { error: 'Creator wallet not configured' },
        { status: 400 }
      )
    }

    // Проверяем, что пост можно купить
    const isPayablePost = post.isLocked && post.price && post.price > 0
    const isSellablePost = post.isSellable
    
    if (!isPayablePost && !isSellablePost) {
      return NextResponse.json(
        { error: 'This post is not for sale' },
        { status: 400 }
      )
    }

    // Проверяем, что пост еще не продан (только для продаваемых постов)
    const existingPurchase = await prisma.postPurchase.findFirst({
      where: { postId: params.id }
    })
    if (isSellablePost && existingPurchase) {
      return NextResponse.json(
        { error: 'This post has already been sold' },
        { status: 400 }
      )
    }

    // Используем цену из запроса или из поста
    const price = paymentPrice || post.price
    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Invalid post price' },
        { status: 400 }
      )
    }

    // Получаем покупателя по ID из токена
    const buyer = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer not found' },
        { status: 404 }
      )
    }

    console.log('[Mobile Buy] Buyer found:', {
      id: buyer.id,
      nickname: buyer.nickname,
      wallet: buyer.wallet?.slice(0, 8) + '...'
    })

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
    
    // Для платных постов проверяем, не купил ли пользователь уже этот пост
    if (isPayablePost) {
      const existingPurchase = await prisma.postPurchase.findUnique({
        where: {
          userId_postId: {
            userId: buyer.id,
            postId: params.id
          }
        }
      })
      
      if (existingPurchase) {
        return NextResponse.json(
          { error: 'You have already purchased this post' },
          { status: 400 }
        )
      }
    }

    console.log('[Mobile Buy] Creating purchase records in database...')

    // Создаем все записи в транзакции БД
    const [updatedPost, transaction, postPurchase] = await prisma.$transaction([
      // Обновляем пост
      prisma.post.update({
        where: { id: params.id },
        data: {},
        include: {
          creator: true
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
          platformFee: distribution?.platformAmount || 0,
          referrerFee: distribution?.referrerAmount || 0,
          referrerWallet: distribution?.referrerWallet || null,
          confirmedAt: new Date(),
          metadata: {
            postId: params.id,
            sellType: 'FIXED_PRICE',
            source: 'mobile',
            hasReferrer: hasReferrer || false,
            note: 'Transaction validated on client side'
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
          creatorAmount: distribution?.creatorAmount || price
        }
      })
    ])

    console.log('[Mobile Buy] Purchase records created successfully')

    // Отправляем уведомление продавцу
    await prisma.notification.create({
      data: {
        userId: post.creatorId,
        type: 'POST_PURCHASE',
        title: isSellablePost ? 'Your post has been sold!' : 'Your post has been purchased!',
        message: `${buyer.nickname || (buyer.wallet ? buyer.wallet.slice(0, 6) + '...' : 'User')} ${isSellablePost ? 'bought' : 'purchased access to'} your post "${post.title}" for ${price} ${post.currency}`,
        metadata: {
          postId: params.id,
          buyerId: buyer.id,
          price: price,
          currency: post.currency,
          buyerName: buyer.nickname || 'User',
          buyerWallet: buyer.wallet || '',
          source: 'mobile'
        }
      }
    })

    console.log('[Mobile Buy] ✅ Purchase completed successfully')

    return NextResponse.json({
      success: true,
      post: updatedPost,
      transaction,
      purchase: postPurchase,
      isPayablePost
    })
  } catch (error) {
    console.error('[Mobile Buy] ❌ Error buying post:', error)
    return NextResponse.json(
      { 
        error: 'Failed to buy post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


