import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format, subDays, subMonths, startOfWeek } from 'date-fns'
import { TransactionStatus } from '@prisma/client'

// Force dynamic rendering for analytics API (uses query parameters)
export const dynamic = 'force-dynamic'

// GET /api/creators/analytics?creatorId=xxx&period=day|week|month
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const creatorId = searchParams.get('creatorId')
    const period = searchParams.get('period') || 'week' // day, week, month
    
    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      )
    }

    // Get date ranges based on period
    const now = new Date()
    let startDate: Date
    let groupByFormat: string
    let previousStartDate: Date

    switch (period) {
      case 'day':
        startDate = subDays(now, 7) // Last 7 days
        previousStartDate = subDays(now, 14)
        groupByFormat = 'yyyy-MM-dd'
        break
      case 'week':
        startDate = subDays(now, 28) // Last 4 weeks
        previousStartDate = subDays(now, 56)
        groupByFormat = 'yyyy-MM-dd' // Will group by week start date
        break
      case 'month':
        startDate = subMonths(now, 12) // Last 12 months
        previousStartDate = subMonths(now, 24)
        groupByFormat = 'yyyy-MM'
        break
      default:
        startDate = subDays(now, 7)
        previousStartDate = subDays(now, 14)
        groupByFormat = 'yyyy-MM-dd'
    }

    // Get creator's wallets
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { 
        wallet: true, 
        solanaWallet: true,
        tierSettings: true
      }
    })

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const creatorWallets = [creator.wallet, creator.solanaWallet].filter(Boolean) as string[]

    // Get all transactions for the creator
    const transactions = await prisma.transaction.findMany({
      where: {
        toWallet: {
          in: creatorWallets
        },
        status: TransactionStatus.CONFIRMED,
        createdAt: {
          gte: previousStartDate
        }
      },
      include: {
        // Try to get sender info through subscription or post purchase
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                fullName: true,
                avatar: true,
                wallet: true
              }
            }
          }
        },
        postPurchase: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                fullName: true,
                avatar: true,
                wallet: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get subscriptions with tier information
    const subscriptions = await prisma.subscription.findMany({
      where: {
        creatorId,
        subscribedAt: {
          gte: previousStartDate
        }
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            wallet: true
          }
        },
        transactions: {
          where: {
            status: TransactionStatus.CONFIRMED
          }
        }
      }
    })

    // Get post purchases
    const postPurchases = await prisma.postPurchase.findMany({
      where: {
        post: {
          creatorId
        },
        purchasedAt: {
          gte: previousStartDate
        }
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            price: true
          }
        },
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            wallet: true
          }
        }
      }
    })

    // Get message purchases and tips through transactions
    const messagePurchases = transactions.filter(tx => 
      tx.type === 'MESSAGE_PURCHASE' || tx.type === 'TIP'
    )

    // Calculate revenue by period
    const revenueByPeriod: Record<string, number> = {}
    const currentPeriodTransactions = transactions.filter(tx => tx.createdAt >= startDate)
    const previousPeriodTransactions = transactions.filter(
      tx => tx.createdAt >= previousStartDate && tx.createdAt < startDate
    )

    // Group transactions by period with special handling for weeks
    currentPeriodTransactions.forEach(tx => {
      let periodKey: string
      if (period === 'week') {
        // Group by week start date
        const weekStart = startOfWeek(tx.createdAt, { weekStartsOn: 1 }) // Monday
        periodKey = format(weekStart, 'yyyy-MM-dd')
      } else {
        periodKey = format(tx.createdAt, groupByFormat)
      }
      
      if (!revenueByPeriod[periodKey]) {
        revenueByPeriod[periodKey] = 0
      }
      // Creator gets amount minus platform fee
      const creatorAmount = tx.amount - (tx.platformFee || 0) - (tx.referrerFee || 0)
      revenueByPeriod[periodKey] += creatorAmount
    })

    // Calculate totals
    const currentTotal = currentPeriodTransactions.reduce((sum, tx) => {
      return sum + tx.amount - (tx.platformFee || 0) - (tx.referrerFee || 0)
    }, 0)

    const previousTotal = previousPeriodTransactions.reduce((sum, tx) => {
      return sum + tx.amount - (tx.platformFee || 0) - (tx.referrerFee || 0)
    }, 0)

    const growthRate = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0

    // Revenue breakdown by source
    const revenueBySource = {
      subscriptions: {
        total: 0,
        byTier: {
          basic: { revenue: 0, count: 0 },
          premium: { revenue: 0, count: 0 },
          vip: { revenue: 0, count: 0 }
        }
      },
      posts: {
        total: 0,
        count: 0,
        topPosts: [] as any[]
      },
      messages: {
        ppv: { total: 0, count: 0 },
        tips: { total: 0, count: 0 }
      }
    }

    // Process transactions by type
    currentPeriodTransactions.forEach(tx => {
      const creatorAmount = tx.amount - (tx.platformFee || 0) - (tx.referrerFee || 0)
      
      switch (tx.type) {
        case 'SUBSCRIPTION':
          revenueBySource.subscriptions.total += creatorAmount
          // Find matching subscription to get tier
          const matchingSub = subscriptions.find(sub => 
            sub.txSignature === tx.txSignature || 
            (Math.abs(sub.subscribedAt.getTime() - tx.createdAt.getTime()) < 60000) // Within 1 minute
          )
          if (matchingSub) {
            const tier = matchingSub.plan.toLowerCase() as 'basic' | 'premium' | 'vip'
            if (revenueBySource.subscriptions.byTier[tier]) {
              revenueBySource.subscriptions.byTier[tier].revenue += creatorAmount
              revenueBySource.subscriptions.byTier[tier].count += 1
            }
          }
          break
          
        case 'POST_PURCHASE':
          revenueBySource.posts.total += creatorAmount
          revenueBySource.posts.count += 1
          break
          
        case 'MESSAGE_PURCHASE':
          revenueBySource.messages.ppv.total += creatorAmount
          revenueBySource.messages.ppv.count += 1
          break
          
        case 'TIP':
          revenueBySource.messages.tips.total += creatorAmount
          revenueBySource.messages.tips.count += 1
          break
      }
    })

    // Calculate top posts by revenue
    const postRevenueMap: Record<string, { post: any, revenue: number, purchases: number }> = {}
    
    postPurchases
      .filter(pp => pp.purchasedAt >= startDate)
      .forEach(pp => {
        if (!postRevenueMap[pp.postId]) {
          postRevenueMap[pp.postId] = {
            post: pp.post,
            revenue: 0,
            purchases: 0
          }
        }
        const creatorAmount = pp.price - (pp.platformFee || 0) - (pp.referrerFee || 0)
        postRevenueMap[pp.postId].revenue += creatorAmount
        postRevenueMap[pp.postId].purchases += 1
      })

    revenueBySource.posts.topPosts = Object.values(postRevenueMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Calculate tier efficiency (revenue per tier normalized by price)
    const tierEfficiency = {
      basic: 0,
      premium: 0,
      vip: 0
    }

    if (creator.tierSettings) {
      const tierData = creator.tierSettings as any
      
      ['basic', 'premium', 'vip'].forEach(tier => {
        const tierKey = `${tier}Tier`
        const tierConfig = tierData[tierKey]
        if (tierConfig && tierConfig.enabled && tierConfig.price > 0) {
          const tierStats = revenueBySource.subscriptions.byTier[tier as keyof typeof revenueBySource.subscriptions.byTier]
          // Efficiency = revenue per subscriber / price
          tierEfficiency[tier as keyof typeof tierEfficiency] = 
            tierStats.count > 0 ? (tierStats.revenue / tierStats.count) / tierConfig.price : 0
        }
      })
    }

    // Get ALL subscribers with detailed spending breakdown
    const subscriberDetailedSpending: Record<string, { 
      user: any, 
      totalSpent: number, 
      breakdown: {
        subscriptions: number,
        posts: number,
        messages: number,
        tips: number
      },
      transactions: number,
      lastActivity: Date | null
    }> = {}
    
    // Process all transactions (not just current period) for complete picture
    transactions.forEach(tx => {
      let userId: string | null = null
      let user: any = null
      
      // Try to get user from various sources
      if (tx.subscription?.user) {
        userId = tx.subscription.user.id
        user = tx.subscription.user
      } else if (tx.postPurchase?.user) {
        userId = tx.postPurchase.user.id
        user = tx.postPurchase.user
      } else if (tx.senderId) {
        userId = tx.senderId
      } else if ((tx.metadata as any)?.userId) {
        userId = (tx.metadata as any).userId
      }
      
      // If we don't have user info yet, try to find from other sources
      if (userId && !user) {
        const sub = subscriptions.find(s => s.userId === userId)
        const purchase = postPurchases.find(p => p.userId === userId)
        user = sub?.user || purchase?.user
      }
      
      if (userId && user) {
        if (!subscriberDetailedSpending[userId]) {
          subscriberDetailedSpending[userId] = {
            user,
            totalSpent: 0,
            breakdown: {
              subscriptions: 0,
              posts: 0,
              messages: 0,
              tips: 0
            },
            transactions: 0,
            lastActivity: null
          }
        }
        
        const spending = subscriberDetailedSpending[userId]
        const amount = tx.amount
        spending.totalSpent += amount
        spending.transactions += 1
        
        // Update last activity
        if (!spending.lastActivity || tx.createdAt > spending.lastActivity) {
          spending.lastActivity = tx.createdAt
        }
        
        // Update breakdown by type
        switch (tx.type) {
          case 'SUBSCRIPTION':
            spending.breakdown.subscriptions += amount
            break
          case 'POST_PURCHASE':
            spending.breakdown.posts += amount
            break
          case 'MESSAGE_PURCHASE':
            spending.breakdown.messages += amount
            break
          case 'TIP':
            spending.breakdown.tips += amount
            break
        }
      }
    })

    // Also process subscriptions that might not have transactions yet
    subscriptions.forEach(sub => {
      if (!subscriberDetailedSpending[sub.userId] && sub.user) {
        subscriberDetailedSpending[sub.userId] = {
          user: sub.user,
          totalSpent: 0,
          breakdown: {
            subscriptions: 0,
            posts: 0,
            messages: 0,
            tips: 0
          },
          transactions: 0,
          lastActivity: sub.subscribedAt
        }
      }
    })

    // Convert to sorted arrays
    const allSubscribers = Object.values(subscriberDetailedSpending)
      .sort((a, b) => b.totalSpent - a.totalSpent)
    
    const topSubscribers = allSubscribers.slice(0, 10)

    // Get view statistics
    const posts = await prisma.post.findMany({
      where: { creatorId },
      select: {
        id: true,
        title: true,
        viewsCount: true,
        likesCount: true,
        commentsCount: true,
        createdAt: true
      },
      orderBy: {
        viewsCount: 'desc'
      }
    })

    const totalViews = posts.reduce((sum, post) => sum + (post.viewsCount || 0), 0)
    const totalLikes = posts.reduce((sum, post) => sum + (post.likesCount || 0), 0)
    const totalComments = posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0)

    // Get active subscribers count
    const activeSubscribers = await prisma.subscription.count({
      where: {
        creatorId,
        isActive: true
      }
    })

    // Get new subscribers this period
    const newSubscribers = await prisma.subscription.count({
      where: {
        creatorId,
        subscribedAt: {
          gte: startDate
        }
      }
    })

    return NextResponse.json({
      period,
      revenue: {
        current: currentTotal,
        previous: previousTotal,
        growth: growthRate,
        byPeriod: revenueByPeriod,
        bySource: revenueBySource
      },
      tierEfficiency,
      topSubscribers,
      allSubscribers,
      engagement: {
        totalViews,
        totalLikes,
        totalComments,
        averageViews: posts.length > 0 ? Math.round(totalViews / posts.length) : 0,
        engagementRate: totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0
      },
      subscribers: {
        total: activeSubscribers,
        new: newSubscribers,
        growthRate: activeSubscribers > 0 ? (newSubscribers / activeSubscribers) * 100 : 0
      }
    })

  } catch (error) {
    console.error('Error fetching creator analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
} 