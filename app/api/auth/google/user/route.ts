import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Находим пользователя по email
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Проверяем, новый ли это пользователь (создан менее минуты назад)
    const isNewUser = (Date.now() - user.createdAt.getTime()) < 60000

    console.log('✅ [GOOGLE USER LOOKUP] User found:', {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      wallet: user.wallet,
      isNewUser
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        wallet: user.wallet,
        avatar: user.avatar,
        fullName: user.fullName,
        solanaWallet: user.solanaWallet,
        isCreator: user.isCreator
      },
      isNewUser
    })

  } catch (error) {
    console.error('❌ [GOOGLE USER LOOKUP] Error:', error)
    return NextResponse.json(
      { error: 'Failed to lookup user' },
      { status: 500 }
    )
  }
}
