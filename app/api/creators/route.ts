import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Simple creators API called')
    
    // Простой запрос всех креаторов без сложных связей
    // [critical_regression_2025_017] Исправлены поля schema
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
        // УБРАНО: name: true, - поле не существует в БД
        postsCount: true,
        followersCount: true,
        createdAt: true,
        isVerified: true,
        website: true,
        twitter: true,
        telegram: true,
        location: true
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
              { error: 'Failed to fetch creators', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 