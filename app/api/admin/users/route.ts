import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for admin routes (appropriate for auth)
export const dynamic = 'force-dynamic'

// GET /api/admin/users - получить список всех пользователей
export async function GET(request: NextRequest) {
  try {
    // Get user wallet from headers for admin check
    const userWallet = request.headers.get('x-user-wallet')
    
    // Simple admin check (you should implement proper authentication)
    const adminWallets = [
      'EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw', // ihavecam
      'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG'  // Dogwater
    ]
    
    if (!userWallet || !adminWallets.includes(userWallet)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        fullName: true,
        wallet: true,
        createdAt: true,
        referrerId: true,
        referrer: {
          select: {
            id: true,
            nickname: true,
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 