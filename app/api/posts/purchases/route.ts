import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/posts/purchases - получить покупки постов по userId
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Posts purchases API called')
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      console.log('[API] Missing userId parameter')
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 })
    }

    console.log('[API] Getting post purchases for user:', userId)

    // Получаем все покупки постов для пользователя
    const postPurchases = await prisma.postPurchase.findMany({
      where: {
        userId: userId
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            creatorId: true,
            createdAt: true,
            creator: {
              select: {
                id: true,
                nickname: true,
                fullName: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    })

    console.log(`[API] Found ${postPurchases.length} post purchases for user ${userId}`)

    // Форматируем ответ
    const formattedPurchases = postPurchases.map(purchase => ({
      id: purchase.id,
      postId: purchase.postId,
      userId: purchase.userId,
      price: purchase.price,
      currency: purchase.currency,
      txSignature: purchase.txSignature,
      purchasedAt: purchase.purchasedAt,
      paymentStatus: purchase.paymentStatus,
      platformFee: purchase.platformFee,
      referrerFee: purchase.referrerFee,
      creatorAmount: purchase.creatorAmount,
      post: {
        id: purchase.post.id,
        title: purchase.post.title,
        price: purchase.post.price,
        currency: purchase.post.currency,
        creatorId: purchase.post.creatorId,
        createdAt: purchase.post.createdAt,
        creator: {
          id: purchase.post.creator.id,
          nickname: purchase.post.creator.nickname,
          fullName: purchase.post.creator.fullName,
          avatar: purchase.post.creator.avatar,
          name: purchase.post.creator.fullName || purchase.post.creator.nickname || 'Unknown'
        }
      }
    }))

    return NextResponse.json({
      purchases: formattedPurchases,
      totalCount: postPurchases.length
    })

  } catch (error) {
    console.error('[API] Posts purchases error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch post purchases', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
