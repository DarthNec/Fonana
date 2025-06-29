import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { isValidSolanaAddress } from '@/lib/solana/validation'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = '30m' // 30 минут

// Временное логирование для отладки
console.log('[JWT Debug] JWT_SECRET info:', {
  exists: !!process.env.NEXTAUTH_SECRET,
  length: JWT_SECRET.length,
  first10: JWT_SECRET.substring(0, 10),
  last5: JWT_SECRET.substring(JWT_SECRET.length - 5),
  hasQuotes: JWT_SECRET.includes('"'),
  isDefault: JWT_SECRET === 'your-secret-key'
})

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
    
    // Валидация Solana адреса
    if (!isValidSolanaAddress(wallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      )
    }
    
    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { wallet },
      select: {
        id: true,
        wallet: true,
        nickname: true,
        isCreator: true,
        isVerified: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Генерируем JWT токен
    const token = jwt.sign(
      {
        userId: user.id,
        wallet: user.wallet,
        nickname: user.nickname,
        isCreator: user.isCreator,
        isVerified: user.isVerified
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'fonana.me',
        audience: 'fonana-websocket'
      }
    )
    
    // Логируем выдачу токена
    console.log(`[JWT] Token issued for user ${user.nickname || user.id}, expires in ${JWT_EXPIRES_IN}`)
    
    return NextResponse.json({
      success: true,
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: {
        id: user.id,
        wallet: user.wallet,
        nickname: user.nickname
      }
    })
    
  } catch (error) {
    console.error('[JWT] Error generating token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
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