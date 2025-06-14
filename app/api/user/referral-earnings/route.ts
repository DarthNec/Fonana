import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const wallet = searchParams.get('wallet')

  if (!userId && !wallet) {
    return NextResponse.json(
      { error: 'userId or wallet is required' },
      { status: 400 }
    )
  }

  try {
    // Найти пользователя
    let user
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId }
      })
    } else if (wallet) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { wallet: wallet },
            { solanaWallet: wallet }
          ]
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userWallets = [user.wallet, user.solanaWallet].filter((w): w is string => w !== null)

    // Получить все транзакции где пользователь является реферером
    const referralTransactions = await prisma.transaction.findMany({
      where: {
        referrerWallet: {
          in: userWallets
        },
        status: 'CONFIRMED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Подсчитать общую статистику
    const totalEarnings = referralTransactions.reduce((sum, tx) => sum + (tx.referrerFee || 0), 0)
    const totalTransactions = referralTransactions.length

    // Группировать заработок по типам
    const earningsByType = {
      subscriptions: 0,
      posts: 0
    }

    // Группировать заработок по валютам
    const earningsByCurrency: Record<string, number> = {}

    // Получить связанные данные для транзакций
    const transactionDetails = await Promise.all(
      referralTransactions.map(async (tx) => {
        let details: any = {
          id: tx.id,
          amount: tx.referrerFee,
          currency: tx.currency,
          date: tx.createdAt,
          type: null as string | null,
          creator: null as any,
          buyer: null as any,
          plan: null as string | null,
          postTitle: null as string | null
        }

        // Проверяем тип транзакции и получаем дополнительные данные
        if (tx.type === 'SUBSCRIPTION' && tx.subscriptionId) {
          const subscription = await prisma.subscription.findUnique({
            where: { id: tx.subscriptionId },
            include: {
              creator: true,
              user: true
            }
          })
          if (subscription) {
            details.type = 'subscription'
            details.creator = subscription.creator
            details.buyer = subscription.user
            details.plan = subscription.plan
            earningsByType.subscriptions += tx.referrerFee || 0
          }
        } else if (tx.type === 'POST_PURCHASE' && tx.postPurchaseId) {
          const postPurchase = await prisma.postPurchase.findUnique({
            where: { id: tx.postPurchaseId },
            include: {
              post: {
                include: {
                  creator: true
                }
              },
              user: true
            }
          })
          if (postPurchase) {
            details.type = 'post'
            details.creator = postPurchase.post.creator
            details.buyer = postPurchase.user
            details.postTitle = postPurchase.post.title
            earningsByType.posts += tx.referrerFee || 0
          }
        }

        // По валютам
        if (!earningsByCurrency[tx.currency]) {
          earningsByCurrency[tx.currency] = 0
        }
        earningsByCurrency[tx.currency] += tx.referrerFee || 0

        return details
      })
    )

    // Фильтруем только успешные транзакции и берем последние 10
    const recentTransactions = transactionDetails
      .filter(tx => tx.type !== null)
      .slice(0, 10)

    return NextResponse.json({
      totalEarnings,
      totalTransactions,
      earningsByType,
      earningsByCurrency,
      recentTransactions
    })

  } catch (error) {
    console.error('Error fetching referral earnings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referral earnings' },
      { status: 500 }
    )
  }
} 