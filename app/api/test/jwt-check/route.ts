import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function GET(req: NextRequest) {
  const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'
  
  // Диагностика всех переменных окружения
  const envKeys = Object.keys(process.env).filter(key => 
    key.includes('NEXTAUTH') || key.includes('DATABASE')
  )
  
  // Создаем тестовый токен
  const testToken = jwt.sign(
    { userId: 'test123', sub: 'test123' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
  
  // Проверяем токен
  let verified = false
  try {
    jwt.verify(testToken, JWT_SECRET)
    verified = true
  } catch (e) {
    verified = false
  }
  
  return NextResponse.json({
    env: {
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      secretPrefix: JWT_SECRET.substring(0, 20),
      isDefault: JWT_SECRET === 'your-secret-key',
      envKeys: envKeys,
      nodeEnv: process.env.NODE_ENV
    },
    test: {
      token: testToken.substring(0, 50) + '...',
      verified: verified
    },
    websocketKey: {
      expected: 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=',
      matches: JWT_SECRET === 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U='
    }
  })
} 