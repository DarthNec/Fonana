import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

export interface PlaywrightTestUser {
  id: string
  wallet: string
  nickname: string
  fullName: string
  isCreator: boolean
  isVerified: boolean
  bio?: string
  avatar?: string
  solanaWallet?: string
  // Required by User type from store
  followersCount: number
  followingCount: number  
  postsCount: number
  createdAt: string
  updatedAt: string
}

export const PLAYWRIGHT_TEST_USERS: Record<string, PlaywrightTestUser> = {
  admin: {
    id: 'playwright_admin_user',
    wallet: 'PLAYWRIGHT_ADMIN_WALLET_ADDRESS',
    nickname: 'playwright_admin',
    fullName: 'Alex Creative',
    isCreator: true,
    isVerified: true,
    bio: '🎨 Digital Artist & Content Creator | 🎵 Music Producer | 💫 AI Art Pioneer\n\nCreating exclusive content for my amazing community! Join different tiers for unique experiences:\n\n✨ Basic: Behind-the-scenes content\n🔥 Premium: Exclusive artworks & tutorials  \n💎 VIP: Personal 1-on-1 sessions\n\nAlways experimenting with new AI tools and creative techniques!',
    avatar: '/media/tests/avatars/playwright-admin-avatar.jpg',
    solanaWallet: 'PLAYWRIGHT_ADMIN_WALLET_ADDRESS',
    followersCount: 1247,
    followingCount: 156,
    postsCount: 10,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  user: {
    id: 'playwright_regular_user',
    wallet: 'PLAYWRIGHT_USER_WALLET_ADDRESS', 
    nickname: 'playwright_user',
    fullName: 'Playwright Regular User',
    isCreator: false,
    isVerified: false,
    bio: 'Automated test user for Playwright testing',
    solanaWallet: 'PLAYWRIGHT_USER_WALLET_ADDRESS',
    followersCount: 10,
    followingCount: 25,
    postsCount: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  creator: {
    id: 'playwright_creator_user',
    wallet: 'PLAYWRIGHT_CREATOR_WALLET_ADDRESS',
    nickname: 'playwright_creator', 
    fullName: 'Playwright Creator User',
    isCreator: true,
    isVerified: true,
    bio: 'Automated test creator for Playwright testing',
    solanaWallet: 'PLAYWRIGHT_CREATOR_WALLET_ADDRESS',
    followersCount: 500,
    followingCount: 100,
    postsCount: 75,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  }
}

export function generatePlaywrightJWT(userType: keyof typeof PLAYWRIGHT_TEST_USERS): string {
  const user = PLAYWRIGHT_TEST_USERS[userType]
  
  const payload = {
    userId: user.id,
    wallet: user.wallet,
    sub: user.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    // Special marker for identification
    playwright_test: true,
    test_user_type: userType
  }

  return jwt.sign(payload, ENV.NEXTAUTH_SECRET)
}

export function isPlaywrightTestToken(token: string): boolean {
  if (!token) return false
  
  try {
    const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET) as any
    return decoded.playwright_test === true
  } catch {
    return false
  }
}

export function getPlaywrightUserFromToken(token: string): PlaywrightTestUser | null {
  if (!token) return null
  
  try {
    const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET) as any
    if (!decoded.playwright_test) return null
    
    return PLAYWRIGHT_TEST_USERS[decoded.test_user_type] || null
  } catch {
    return null
  }
}

export function isPlaywrightEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
} 