import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    // Валидация
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Ищем пользователя по email
    const user = await prisma.user.findFirst({
      where: { 
        email: email.toLowerCase(),
        password: { not: null } // Только пользователи с паролем
      }
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('✅ [EMAIL LOGIN] User authenticated:', {
      id: user.id,
      email: user.email,
      nickname: user.nickname
    })

    // Возвращаем данные пользователя (без пароля)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        wallet: user.wallet,
        avatar: user.avatar,
        fullName: user.fullName,
        solanaWallet: user.solanaWallet,
        isCreator: user.isCreator
      }
    })

  } catch (error) {
    console.error('❌ [EMAIL LOGIN] Error:', error)
    return NextResponse.json(
      { error: 'Failed to log in' },
      { status: 500 }
    )
  }
}
