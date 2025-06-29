import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || 'not-set'
  
  return NextResponse.json({
    secretConfigured: !!process.env.NEXTAUTH_SECRET,
    secretLength: secret.length,
    secretPrefix: secret.substring(0, 10) + '...',
    isDefaultSecret: secret === 'your-secret-key',
    nodeEnv: process.env.NODE_ENV
  })
} 