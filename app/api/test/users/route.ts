import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Получаем пользователей у которых есть кошельки И nickname
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { wallet: { not: null } },
              { solanaWallet: { not: null } }
            ]
          },
          {
            nickname: { not: null }
          }
        ]
      },
      select: {
        id: true,
        nickname: true,
        wallet: true,
        solanaWallet: true,
        referrerId: true,
        referrer: {
          select: {
            id: true,
            nickname: true,
            wallet: true,
            solanaWallet: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Ограничиваем для теста
    })

    console.log(`Found ${users.length} users with wallets and nicknames`)

    return NextResponse.json({
      success: true,
      users: users,
      count: users.length
    })
  } catch (error) {
    console.error('Error fetching test users:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users',
      users: []
    }, { status: 500 })
  }
} 