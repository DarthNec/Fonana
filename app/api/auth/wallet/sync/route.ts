import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT, setAuthCookie } from '@/lib/auth/jwt'
import { prisma } from '@/lib/db'

// POST /api/auth/wallet/sync - Синхронизация JWT токена
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      )
    }

    // Проверяем валидность токена
    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Проверяем, что пользователь существует
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Устанавливаем cookie для текущего браузера
    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        wallet: user.wallet,
        nickname: user.nickname,
        fullName: user.fullName,
        bio: user.bio,
        avatar: user.avatar,
        backgroundImage: user.backgroundImage,
        isVerified: user.isVerified,
        isCreator: user.isCreator
      }
    })
  } catch (error) {
    console.error('Token sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
} 