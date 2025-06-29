import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { isValidSolanaAddress } from '@/lib/solana/validation'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = '30m' // 30 минут

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
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { wallet }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          wallet,
          nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
          isCreator: false,
          isVerified: false
        }
      })
    }
    
    // Create JWT token
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
        audience: 'fonana-websocket',
        issuer: 'fonana.me'
      }
    )
    
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
    console.error('Error in wallet auth:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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