import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// GET /api/user/activity - get recent activity for a creator
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const creatorId = searchParams.get('creatorId')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 })
    }

    // Get recent subscriptions to this creator
    const recentSubscriptions = await prisma.subscription.findMany({
      where: {
        creatorId,
        isActive: true
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
      orderBy: {
        subscribedAt: 'desc'
      },
      take: Math.floor(limit / 3)
    })

    // Get recent likes on creator's posts
    const creatorPosts = await prisma.post.findMany({
      where: { creatorId },
      select: { id: true, title: true }
    })
    
    const postIds = creatorPosts.map(post => post.id)
    const postMap = Object.fromEntries(creatorPosts.map(p => [p.id, p]))
    
    const recentLikes = await prisma.like.findMany({
      where: {
        postId: { in: postIds }
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
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.floor(limit / 3)
    })

    // Get recent comments on creator's posts
    const recentComments = await prisma.comment.findMany({
      where: {
        postId: { in: postIds }
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
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.floor(limit / 3)
    })

    // Format activities
    const activities: any[] = []

    // Add subscriptions
    recentSubscriptions.forEach(sub => {
      activities.push({
        id: `sub-${sub.id}`,
        type: 'subscription',
        user: sub.user,
        createdAt: sub.subscribedAt,
        subscription: {
          plan: sub.plan,
          price: sub.price
        }
      })
    })

    // Add likes
    recentLikes.forEach(like => {
      if (like.postId && postMap[like.postId]) {
        activities.push({
          id: `like-${like.id}`,
          type: 'like',
          user: like.user,
          createdAt: like.createdAt,
          post: postMap[like.postId]
        })
      }
    })

    // Add comments
    recentComments.forEach(comment => {
      if (comment.postId && postMap[comment.postId]) {
        activities.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          user: comment.user,
          createdAt: comment.createdAt,
          post: postMap[comment.postId],
          comment: {
            content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : '')
          }
        })
      }
    })

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Limit to requested amount
    const limitedActivities = activities.slice(0, limit)

    return NextResponse.json({ activities: limitedActivities })
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 