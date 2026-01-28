import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PostNormalizer } from '@/services/posts/normalizer'

/**
 * GET /api/purchases - Получить покупки пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userWallet = searchParams.get('userWallet')
    
    if (!userId && !userWallet) {
      return NextResponse.json({ error: 'userId or userWallet is required' }, { status: 400 })
    }

    // Находим пользователя
    let user = null
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } })
    } else if (userWallet) {
      user = await prisma.user.findFirst({ 
        where: { 
          OR: [
            { solanaWallet: userWallet },
            { wallet: userWallet }
          ]
        } 
      })
    }

    if (!user) {
      return NextResponse.json({ purchases: [], count: 0 })
    }

    // Получаем все покупки пользователя с постами
    const purchases = await prisma.postPurchase.findMany({
      where: { userId: user.id },
      include: {
        post: {
          include: {
            creator: {
              select: {
                id: true,
                nickname: true,
                fullName: true,
                avatar: true,
                isVerified: true,
                solanaWallet: true,
                wallet: true
              }
            },
            emotions: true,
            _count: {
              select: {
                comments: true,
                emotions: true
              }
            }
          }
        }
      },
      orderBy: { purchasedAt: 'desc' }
    })

    // Нормализуем посты для фронтенда
    const normalizedPosts = purchases.map(purchase => {
      const post = purchase.post
      return PostNormalizer.normalize({
        ...post,
        // Помечаем как купленный контент
        access: {
          isLocked: false,
          isPurchased: true,
          shouldHideContent: false
        }
      })
    })

    return NextResponse.json({ 
      purchases: normalizedPosts, 
      count: normalizedPosts.length 
    })

  } catch (error) {
    console.error('[API /purchases] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
  }
}
