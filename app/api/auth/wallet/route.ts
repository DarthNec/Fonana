import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { isValidSolanaAddress } from '@/lib/solana/validation'
import { ENV } from '@/lib/constants/env'

// Используем тот же ключ, который сконфигурирован в .env файле
const JWT_SECRET = ENV.NEXTAUTH_SECRET
const JWT_EXPIRES_IN = '30d'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { wallet } = body
    
    console.log('🎯 [API AUTH] /api/auth/wallet POST called with wallet:', wallet?.substring(0, 8) + '...')
    
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }
    
    if (!isValidSolanaAddress(wallet)) {
      return NextResponse.json(
        { error: 'Invalid Solana wallet address' },
        { status: 400 }
      )
    }
    
    // Логируем предупреждение если используется временный ключ
    if (JWT_SECRET === 'your-secret-key') {
      console.error('⚠️ WARNING: Using temporary JWT secret! NEXTAUTH_SECRET not loaded from environment!')
    }
    
    // Find or create user
    console.log('🎯 [API AUTH] Searching for existing user with wallet:', wallet)
    let user = await prisma.user.findUnique({
      where: { wallet }
    })
    
    console.log('🎯 [API AUTH] Existing user search result:', {
      found: !!user,
      userId: user?.id,
      userWallet: user?.wallet,
      userSolanaWallet: user?.solanaWallet
    })
    
    // 🔥 ДОПОЛНИТЕЛЬНЫЙ ПОИСК ПО SOLANAWALLET
    if (!user) {
      console.log('🎯 [API AUTH] User not found by wallet, searching by solanaWallet:', wallet)
      user = await prisma.user.findFirst({
        where: { solanaWallet: wallet }
      })
      console.log('🎯 [API AUTH] SolanaWallet search result:', {
        found: !!user,
        userId: user?.id,
        userWallet: user?.wallet,
        userSolanaWallet: user?.solanaWallet
      })
    }
    
    if (!user) {
      console.log('🎯 [API AUTH] Creating new user with wallet:', wallet)
      try {
        user = await prisma.user.create({
          data: {
            wallet,
            nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
            solanaWallet: wallet
          }
        })
        console.log('🎯 [API AUTH] New user created successfully:', {
          userId: user.id,
          userWallet: user.wallet,
          userSolanaWallet: user.solanaWallet,
          userNickname: user.nickname
        })
      } catch (error) {
        console.error('🎯 [API AUTH] Failed to create user:', error)
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }
    }
    
    // Генерируем JWT токен для использования в API
    console.log('🔑 JWT generation:', {
      hasEnvSecret: !!process.env.NEXTAUTH_SECRET,
      secretLength: JWT_SECRET.length,
      secretPrefix: JWT_SECRET.substring(0, 10)
    });

    const token = jwt.sign(
      {
        userId: user.id,
        wallet: user.wallet,
        sub: user.id
      },
      JWT_SECRET,
      { 
        expiresIn: '30d'
      }
    );

    console.log('✅ JWT token created successfully');
    
    const responseData = {
      token,
      user: {
        id: user.id,
        wallet: user.wallet,
        nickname: user.nickname,
        isCreator: user.isCreator,
        isVerified: user.isVerified,
        avatar: user.avatar,
        fullName: user.fullName
      }
    }
    
    console.log('🎯 [API AUTH] Response data:', {
      hasToken: !!responseData.token,
      tokenLength: responseData.token?.length,
      userId: responseData.user.id,
      userWallet: responseData.user.wallet,
      userNickname: responseData.user.nickname,
      userIsCreator: responseData.user.isCreator,
      userIsVerified: responseData.user.isVerified
    })
    console.log('🔍 Complete API Response:', JSON.stringify(responseData, null, 2))

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// GET для проверки валидности токена
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      return NextResponse.json({
        valid: true,
        userId: decoded.userId,
        wallet: decoded.wallet,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      })
      
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return NextResponse.json(
          { error: 'Token expired' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
  } catch (error) {
    console.error('[JWT] Error verifying token:', error)
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    )
  }
} 