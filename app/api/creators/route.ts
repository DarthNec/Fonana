import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Simple creators API called')
    
    // Простой запрос всех креаторов без сложных связей
    const creators = await prisma.user.findMany({
      where: {
        isCreator: true
      },
      select: {
        id: true,
        wallet: true,
        nickname: true,
        fullName: true,
        bio: true,
        avatar: true,
        backgroundImage: true,
        name: true,
        postsCount: true,
        followersCount: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`[API] Found ${creators.length} creators`)

    return NextResponse.json({ 
      creators,
      totalCount: creators.length 
    })
  } catch (error) {
    console.error('[API] Creators error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch creators', details: error.message },
      { status: 500 }
    )
  }
} 