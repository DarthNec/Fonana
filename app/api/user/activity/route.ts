import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

interface Activity {
  id: string
  type: 'subscription' | 'like' | 'comment'
  user: {
    id: string
    nickname: string | null
    fullName: string | null
    avatar: string | null
  }
  createdAt: Date
  plan?: string
  post?: {
    id: string
    title: string
  }
  content?: string
}

// GET /api/user/activity - get recent activity for a creator
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const creatorId = searchParams.get('creatorId')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID required' }, { status: 400 })
    }

    // Get recent activities related to creator's content
    const activities: Activity[] = []

    // Get recent subscriptions
    const recentSubscriptions = await prisma.subscription.findMany({
      where: {
        creatorId,
        subscribedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        }
      },
      orderBy: { subscribedAt: 'desc' },
      take: Math.floor(limit / 3)
    })

    // Get recent likes on creator's posts
    const creatorPosts = await prisma.post.findMany({
      where: { creatorId },
      select: { id: true, title: true }
    })
    
    const postIds = creatorPosts.map(p => p.id)
    
    const recentLikes = await prisma.like.findMany({
      where: {
        postId: { in: postIds },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        },
        post: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.floor(limit / 3)
    })

    // Get recent comments on creator's posts
    const recentComments = await prisma.comment.findMany({
      where: {
        postId: { in: postIds },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        },
        post: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.floor(limit / 3)
    })

    // Format activities
    recentSubscriptions.forEach(sub => {
      activities.push({
        id: `sub_${sub.id}`,
        type: 'subscription',
        user: sub.user,
        createdAt: sub.subscribedAt,
        plan: sub.plan
      })
    })

    recentLikes.forEach(like => {
      if (like.post) {
        activities.push({
          id: `like_${like.id}`,
          type: 'like',
          user: like.user,
          post: like.post,
          createdAt: like.createdAt
        })
      }
    })

    recentComments.forEach(comment => {
      if (comment.post) {
        activities.push({
          id: `comment_${comment.id}`,
          type: 'comment',
          user: comment.user,
          post: comment.post,
          createdAt: comment.createdAt,
          content: comment.content
        })
      }
    })

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Take only requested limit
    const limitedActivities = activities.slice(0, limit)

    return NextResponse.json({ activities: limitedActivities })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 