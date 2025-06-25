import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifySignature, isMessageValid, isValidSolanaAddress } from '@/lib/auth/solana'
import { createJWT, setAuthCookie, removeAuthCookie, verifyJWT } from '@/lib/auth/jwt'

// Режим отладки
const DEBUG_MODE = false

// POST /api/auth/wallet - Авторизация через подпись
export async function POST(req: NextRequest) {
  try {
    const { message, signature, publicKey, action } = await req.json()

    if (DEBUG_MODE) {
      console.log('🔐 POST /api/auth/wallet:', {
        action: action || 'authenticate',
        publicKey: publicKey?.substring(0, 8) + '...' || 'none',
        hasMessage: !!message,
        hasSignature: !!signature
      })
    }

    // Logout action
    if (action === 'logout') {
      await removeAuthCookie()
      return NextResponse.json({ success: true })
    }

    // Валидация входных данных
    if (!message || !signature || !publicKey) {
      if (DEBUG_MODE) {
        console.error('❌ Missing fields:', { 
          hasMessage: !!message, 
          hasSignature: !!signature, 
          hasPublicKey: !!publicKey 
        })
      }
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Проверка валидности адреса
    if (!isValidSolanaAddress(publicKey)) {
      if (DEBUG_MODE) console.error('❌ Invalid Solana address:', publicKey)
      return NextResponse.json(
        { error: 'Invalid Solana address' },
        { status: 400 }
      )
    }

    // Проверка временной метки (защита от replay атак)
    if (!isMessageValid(message)) {
      if (DEBUG_MODE) {
        console.error('❌ Message expired or invalid')
        console.log('Message content:', message)
      }
      return NextResponse.json(
        { error: 'Message expired or invalid' },
        { status: 400 }
      )
    }

    // Проверка подписи
    if (!verifySignature(message, signature, publicKey)) {
      if (DEBUG_MODE) {
        console.error('❌ Invalid signature:', {
          publicKey,
          messageLength: message.length,
          signatureLength: signature.length
        })
      }
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    if (DEBUG_MODE) console.log('✅ Signature verified successfully')

    // Находим или создаем пользователя
    let user = await prisma.user.findUnique({
      where: { solanaWallet: publicKey }
    })

    if (!user) {
      // Проверяем реферера из заголовков или cookies
      const referrerFromCookie = req.cookies.get('fonana_referrer')?.value
      const referrerFromHeader = req.headers.get('x-referrer')
      const referrerId = referrerFromHeader || referrerFromCookie || undefined

      if (DEBUG_MODE) console.log('📝 Creating new user with referrer:', referrerId)

      user = await prisma.user.create({
        data: {
          solanaWallet: publicKey,
          wallet: publicKey,
          referrerId,
          nickname: `user_${publicKey.slice(0, 8).toLowerCase()}`,
        }
      })
    } else {
      if (DEBUG_MODE) console.log('👤 Found existing user:', user.id)
    }

    // Создаем JWT токен
    const token = await createJWT({
      wallet: publicKey,
      userId: user.id
    })

    // Устанавливаем cookie
    await setAuthCookie(token)

    if (DEBUG_MODE) {
      console.log('✅ Authentication successful:', {
        userId: user.id,
        wallet: user.wallet?.substring(0, 8) + '...',
        hasToken: !!token
      })
    }

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
  } catch (error: any) {
    console.error('Wallet auth error:', error)
    if (DEBUG_MODE) {
      console.error('❌ Auth error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    return NextResponse.json(
      { error: 'Authentication failed', details: error.message },
      { status: 500 }
    )
  }
}

// GET /api/auth/wallet - Проверка текущей авторизации
export async function GET() {
  try {
    if (DEBUG_MODE) console.log('🔍 GET /api/auth/wallet - checking auth status')
    
    const authToken = cookies().get('fonana-auth')?.value
    
    if (!authToken) {
      if (DEBUG_MODE) console.log('❌ No auth token in cookies')
      return NextResponse.json({ authenticated: false })
    }

    if (DEBUG_MODE) console.log('🍪 Found auth token:', authToken.substring(0, 20) + '...')

    const payload = await verifyJWT(authToken)
    if (!payload) {
      if (DEBUG_MODE) console.log('❌ Invalid JWT token')
      return NextResponse.json({ authenticated: false })
    }

    // Получаем актуальные данные пользователя
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      if (DEBUG_MODE) console.log('❌ User not found:', payload.userId)
      await removeAuthCookie()
      return NextResponse.json({ authenticated: false })
    }

    if (DEBUG_MODE) {
      console.log('✅ User authenticated:', {
        userId: user.id,
        wallet: user.wallet?.substring(0, 8) + '...',
        nickname: user.nickname
      })
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
  } catch (error: any) {
    console.error('Auth check error:', error)
    if (DEBUG_MODE) {
      console.error('❌ Auth check error details:', {
        message: error.message,
        stack: error.stack
      })
    }
    return NextResponse.json({ authenticated: false })
  }
} 