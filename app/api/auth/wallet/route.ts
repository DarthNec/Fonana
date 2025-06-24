import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifySignature, isMessageValid, isValidSolanaAddress } from '@/lib/auth/solana'
import { createJWT, setAuthCookie, removeAuthCookie, verifyJWT } from '@/lib/auth/jwt'

// POST /api/auth/wallet - Авторизация через подпись
export async function POST(req: NextRequest) {
  try {
    const { message, signature, publicKey, action } = await req.json()

    // Logout action
    if (action === 'logout') {
      await removeAuthCookie()
      return NextResponse.json({ success: true })
    }

    // Валидация входных данных
    if (!message || !signature || !publicKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Проверка валидности адреса
    if (!isValidSolanaAddress(publicKey)) {
      return NextResponse.json(
        { error: 'Invalid Solana address' },
        { status: 400 }
      )
    }

    // Проверка временной метки (защита от replay атак)
    if (!isMessageValid(message)) {
      return NextResponse.json(
        { error: 'Message expired or invalid' },
        { status: 400 }
      )
    }

    // Проверка подписи
    if (!verifySignature(message, signature, publicKey)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Находим или создаем пользователя
    let user = await prisma.user.findUnique({
      where: { solanaWallet: publicKey }
    })

    if (!user) {
      // Проверяем реферера из заголовков или cookies
      const referrerFromCookie = req.cookies.get('fonana_referrer')?.value
      const referrerFromHeader = req.headers.get('x-referrer')
      const referrerId = referrerFromHeader || referrerFromCookie || undefined

      user = await prisma.user.create({
        data: {
          solanaWallet: publicKey,
          wallet: publicKey,
          referrerId,
          nickname: `user_${publicKey.slice(0, 8).toLowerCase()}`,
        }
      })
    }

    // Создаем JWT токен
    const token = await createJWT({
      wallet: publicKey,
      userId: user.id
    })

    // Устанавливаем cookie
    await setAuthCookie(token)

    // Возвращаем данные пользователя
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
        isCreator: user.isCreator,
        isNewUser: !user.fullName && !user.bio
      },
      token // Также возвращаем токен для localStorage fallback
    })
  } catch (error) {
    console.error('Wallet auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// GET /api/auth/wallet - Проверка текущей авторизации
export async function GET() {
  try {
    const authToken = cookies().get('fonana-auth')?.value
    
    if (!authToken) {
      return NextResponse.json({ authenticated: false })
    }

    const payload = await verifyJWT(authToken)
    if (!payload) {
      return NextResponse.json({ authenticated: false })
    }

    // Получаем актуальные данные пользователя
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      await removeAuthCookie()
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
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
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false })
  }
} 