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
    let user = await prisma.user.findUnique({
      where: { wallet }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          wallet,
          nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
          solanaWallet: wallet
        }
      })
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

    return NextResponse.json({
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
    })
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