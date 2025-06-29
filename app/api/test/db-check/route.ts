import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    console.log('[DB Check] Starting database check...')
    
    // Test 1: Simple count
    const userCount = await prisma.user.count()
    console.log('[DB Check] User count:', userCount)
    
    // Test 2: Posts count
    const postCount = await prisma.post.count()
    console.log('[DB Check] Post count:', postCount)
    
    // Test 3: Get recent posts
    const recentPosts = await prisma.post.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
      }
    })
    console.log('[DB Check] Recent posts:', recentPosts.length)
    
    return NextResponse.json({
      success: true,
      stats: {
        users: userCount,
        posts: postCount,
        recentPosts: recentPosts.length
      },
      recentPosts
    })
  } catch (error: any) {
    console.error('[DB Check] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      meta: error.meta
    }, { status: 500 })
  }
} 