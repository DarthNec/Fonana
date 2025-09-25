import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

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

// POST /api/user/referrals - добавить referrerId для текущего пользователя
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, referrerId } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    if (!referrerId) {
      return NextResponse.json({ error: 'Referrer ID is required' }, { status: 400 })
    }

    // Получаем пользователя по кошельку
    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем, что пользователь не пытается указать себя как реферера
    if (user.id === referrerId) {
      return NextResponse.json({ error: 'User cannot refer themselves' }, { status: 400 })
    }

    // Проверяем, что referrer существует
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId }
    })

    if (!referrer) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })
    }

    // Проверяем, что у пользователя еще нет referrerId
    if (user.referrerId) {
      return NextResponse.json({ error: 'User already has a referrer' }, { status: 400 })
    }

    // Проверяем на циклические ссылки - пользователь не может быть реферером своего реферера
    if (referrer.referrerId === user.id) {
      return NextResponse.json({ error: 'Circular referral detected' }, { status: 400 })
    }

    // Обновляем пользователя с referrerId
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { referrerId: referrerId },
      include: {
        referrer: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Referrer added successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error adding referrer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 