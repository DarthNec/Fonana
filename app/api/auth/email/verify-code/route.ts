import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextAvatar } from '@/lib/utils/avatarAssigner'
import crypto from 'crypto'

/**
 * Генерация уникального никнейма (как у гостевых/Google пользователей)
 */
async function generateUniqueNickname(): Promise<string> {
  const adjectives = [
    'Happy', 'Lucky', 'Brave', 'Swift', 'Clever', 'Bright', 'Silent',
    'Golden', 'Silver', 'Crystal', 'Mystic', 'Shadow', 'Storm', 'Fire',
    'Ocean', 'Mountain', 'Forest', 'Night', 'Star', 'Moon'
  ]

  const nouns = [
    'Fox', 'Wolf', 'Eagle', 'Tiger', 'Bear', 'Lion', 'Hawk',
    'Dragon', 'Phoenix', 'Panther', 'Falcon', 'Raven', 'Snake',
    'Shark', 'Dolphin', 'Whale', 'Leopard', 'Jaguar', 'Cobra'
  ]

  let nickname = ''
  let counter = 1
  let attempts = 0
  const maxAttempts = 50

  while (attempts < maxAttempts) {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const number = Math.floor(Math.random() * 999) + 1

    if (counter === 1) {
      nickname = `${adjective}${noun}${number}`
    } else {
      nickname = `${adjective}${noun}${number}_${counter}`
    }

    // Проверяем уникальность
    const existing = await prisma.user.findFirst({ where: { nickname } })
    if (!existing) {
      return nickname
    }

    counter++
    attempts++
  }

  // Fallback: если не смогли найти уникальный - используем hex
  return `user_${crypto.randomBytes(4).toString('hex')}`
}

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json()

    // Валидация
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      )
    }

    // Ищем код в базе
    const verificationRecord = await prisma.emailVerificationCode.findFirst({
      where: {
        email: email.toLowerCase(),
        code: code
      }
    })

    if (!verificationRecord) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Проверяем, не истёк ли код
    if (new Date() > verificationRecord.expiresAt) {
      // Удаляем истекший код
      await prisma.emailVerificationCode.delete({
        where: { id: verificationRecord.id }
      })
      
      return NextResponse.json(
        { error: 'Verification code expired' },
        { status: 400 }
      )
    }

    // Проверяем, не создан ли уже пользователь с таким email
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      // Удаляем код
      await prisma.emailVerificationCode.delete({
        where: { id: verificationRecord.id }
      })
      
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Генерируем данные для нового пользователя
    const nickname = await generateUniqueNickname()
    const avatarUrl = await getNextAvatar()
    const fakeWallet = `EMAIL_${crypto.randomBytes(16).toString('hex')}`

    // Создаём пользователя
    const newUser = await prisma.user.create({
      data: {
        wallet: fakeWallet,
        email: email.toLowerCase(),
        password: verificationRecord.password, // Уже захешированный
        nickname: nickname,
        fullName: nickname,
        avatar: avatarUrl,
        solanaWallet: null,
        isVerified: true // Email подтверждён
      }
    })

    // Удаляем использованный код
    await prisma.emailVerificationCode.delete({
      where: { id: verificationRecord.id }
    })

    console.log('✅ [EMAIL SIGNUP] User created:', {
      id: newUser.id,
      email: newUser.email,
      nickname: newUser.nickname,
      wallet: newUser.wallet
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        nickname: newUser.nickname,
        wallet: newUser.wallet,
        avatar: newUser.avatar,
        fullName: newUser.fullName
      },
      isNewUser: true
    })

  } catch (error) {
    console.error('❌ [EMAIL SIGNUP] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    )
  }
}
