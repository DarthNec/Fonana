import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Force dynamic rendering for user referrals API (uses query parameters)
export const dynamic = 'force-dynamic'

// GET /api/user/referrals?userId=ID - получить список рефералов пользователя
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Получаем всех пользователей, которых привел данный пользователь
    const referrals = await prisma.user.findMany({
      where: {
        referrerId: userId
      },
      include: {
        posts: {
          select: { id: true }
        },
        followers: {
          select: { id: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Также получаем информацию о пользователе, который привел этого пользователя (если есть)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrer: true
      }
    })

    return NextResponse.json({ 
      referrals,
      referrer: user?.referrer 
    })
  } catch (error) {
    console.error('Error getting referrals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 