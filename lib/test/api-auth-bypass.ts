import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'
import { isPlaywrightTestToken, getPlaywrightUserFromToken } from './playwright-auth-helpers'
import { prisma } from '@/lib/prisma'

export interface AuthenticationResult {
  success: boolean
  user?: any
  error?: string
}

export async function authenticateRequest(request: NextRequest): Promise<AuthenticationResult> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'No token provided' }
  }

  const token = authHeader.substring(7)

  try {
    // [NEW] Check for Playwright test token first (development only)
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && 
        isPlaywrightTestToken(token)) {
      const testUser = getPlaywrightUserFromToken(token)
      if (testUser) {
        console.log(`[Playwright Auth] Using test user: ${testUser.nickname}`)
        return { success: true, user: testUser }
      }
    }

    // EXISTING: Normal JWT verification
    const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET) as any
    
    // Lookup real user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    return { success: true, user }

  } catch (error) {
    console.error('[Auth] Token verification failed:', error)
    return { success: false, error: 'Invalid token' }
  }
}

// Legacy function for backward compatibility
export async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  const result = await authenticateRequest(request)
  return result.success ? result.user : null
} 