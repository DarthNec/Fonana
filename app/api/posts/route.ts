import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Simple posts API called')
    
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const skip = (page - 1) * limit

    // Простой запрос всех постов без сложных связей
    const posts = await prisma.post.findMany({
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            isCreator: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    const totalCount = await prisma.post.count()

    console.log(`[API] Found ${posts.length} posts, total: ${totalCount}`)

    return NextResponse.json({ 
      posts,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    })
  } catch (error) {
    console.error('[API] Posts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts', details: error.message },
      { status: 500 }
    )
  }
} 