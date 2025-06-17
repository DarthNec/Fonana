import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateTransaction } from '@/lib/solana/validation'

// POST /api/posts/[id]/buy - купить пост с фиксированной ценой
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    if (!post.price || post.price <= 0) {
      return NextResponse.json(
        { error: 'Invalid post price' },
        { status: 400 }
      )
    }

    // Получаем покупателя
    const buyer = await prisma.user.findFirst({
      where: {
        OR: [
          { wallet: buyerWallet },
          { solanaWallet: buyerWallet }
        ]
      }
    })

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer not found' },
        { status: 404 }
      )
    }

    // Проверяем, что покупатель не является создателем
    if (buyer.id === post.creatorId) {
      return NextResponse.json(
        { error: 'You cannot buy your own post' },
        { status: 400 }
      )
    }

    // Проверяем транзакцию
    const validation = await validateTransaction(
      txSignature,
      post.price,
      [post.creator.wallet || post.creator.solanaWallet || '']
    )

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid or insufficient payment transaction' },
        { status: 400 }
      )
    }

    // Обновляем пост как проданный в транзакции
    const [updatedPost, transaction] = await prisma.$transaction([
      // Обновляем пост
      prisma.post.update({
        where: { id: params.id },
        data: {
          soldAt: new Date(),
          soldToId: buyer.id,
          soldPrice: post.price,
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
          toWallet: post.creator.wallet || post.creator.solanaWallet || '',
          amount: post.price,
          currency: post.currency || 'SOL',
          type: 'POST_PURCHASE',
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          metadata: {
            postId: params.id,
            sellType: 'FIXED_PRICE'
          }
        }
      })
    ])

    // Отправляем уведомление продавцу
    await prisma.notification.create({
      data: {
        userId: post.creatorId,
        type: 'POST_PURCHASE',
        title: 'Your post has been sold!',
        message: `${buyer.nickname || (buyer.wallet ? buyer.wallet.slice(0, 6) + '...' : 'User')} bought your post "${post.title}" for ${post.price} ${post.currency}`,
        metadata: {
          postId: params.id,
          buyerId: buyer.id,
          price: post.price,
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