import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format, subDays, subMonths } from 'date-fns'
import { TransactionStatus } from '@prisma/client'

// GET /api/creators/analytics?creatorId=xxx&period=day|week|month
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
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
        groupByFormat = 'yyyy-ww'
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

    // Get all transactions for the creator
    const transactions = await prisma.transaction.findMany({
      where: {
        toWallet: {
          in: await prisma.user.findUnique({
            where: { id: creatorId },
            select: { wallet: true, solanaWallet: true }
          }).then(user => [user?.wallet, user?.solanaWallet].filter(Boolean) as string[])
        },
        status: TransactionStatus.CONFIRMED,
        createdAt: {
          gte: previousStartDate
        }
      },
        
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate revenue by period
    const revenueByPeriod: Record<string, number> = {}
    const currentPeriodTransactions = transactions.filter(tx => tx.createdAt >= startDate)
    const previousPeriodTransactions = transactions.filter(
      tx => tx.createdAt >= previousStartDate && tx.createdAt < startDate
    )

    // Group transactions by period
    currentPeriodTransactions.forEach(tx => {
      const periodKey = format(tx.createdAt, groupByFormat)
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

    // Get top posts by revenue - simplified for now
    const topPosts: any[] = []

    // Get top subscribers - simplified for now
    const topSubscribers: any[] = []

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

    // Get recent posts performance
    const recentPosts = posts
      .filter(post => post.createdAt >= startDate)
      .slice(0, 5)

    // Get revenue breakdown by type
    const revenueByType = {
      subscriptions: 0,
      posts: 0,
      tips: 0,
      messages: 0
    }

    currentPeriodTransactions.forEach(tx => {
      const creatorAmount = tx.amount - (tx.platformFee || 0) - (tx.referrerFee || 0)
      switch (tx.type) {
        case 'SUBSCRIPTION':
          revenueByType.subscriptions += creatorAmount
          break
        case 'POST_PURCHASE':
          revenueByType.posts += creatorAmount
          break
        case 'TIP':
          revenueByType.tips += creatorAmount
          break
        case 'MESSAGE_PURCHASE':
          revenueByType.messages += creatorAmount
          break
      }
    })

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
        byType: revenueByType
      },
      topPosts,
      topSubscribers,
      engagement: {
        totalViews,
        totalLikes,
        totalComments,
        averageViews: posts.length > 0 ? Math.round(totalViews / posts.length) : 0,
        engagementRate: totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0
      },
      recentPosts,
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