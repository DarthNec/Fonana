# 📋 SOLUTION_PLAN v1: Playwright Authentication Bypass 2025-018

## 📅 Дата: 18.01.2025  
## 🎯 Цель: Детальный план контролируемого байпаса авторизации для Playwright  
## 🔄 Статус: Solution Plan v1 - Complete Planning

## 🎯 CHOSEN APPROACH: Test User Authentication

**Strategy**: Create dedicated test users with persistent credentials that bypass normal wallet authentication flow while maintaining full security isolation.

**Core Principle**: Enterprise-ready solution that tests real authentication logic without compromising production security.

## 📋 IMPLEMENTATION PHASES

### Phase 1: Database Test User Seeding 🗃️

#### 1.1 Create Test User Seeding Script
**File**: `scripts/seed-playwright-users.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PLAYWRIGHT_TEST_USERS = [
  {
    id: 'playwright_admin_user',
    wallet: 'PLAYWRIGHT_ADMIN_WALLET_ADDRESS',
    nickname: 'playwright_admin',
    fullName: 'Playwright Admin User',
    isCreator: true,
    isVerified: true,
    bio: 'Automated test admin user for Playwright testing'
  },
  {
    id: 'playwright_regular_user', 
    wallet: 'PLAYWRIGHT_USER_WALLET_ADDRESS',
    nickname: 'playwright_user',
    fullName: 'Playwright Regular User',
    isCreator: false,
    isVerified: false,
    bio: 'Automated test user for Playwright testing'
  },
  {
    id: 'playwright_creator_user',
    wallet: 'PLAYWRIGHT_CREATOR_WALLET_ADDRESS', 
    nickname: 'playwright_creator',
    fullName: 'Playwright Creator User',
    isCreator: true,
    isVerified: true,
    bio: 'Automated test creator for Playwright testing'
  }
]

export async function seedPlaywrightUsers() {
  // Only run in development/test environments
  if (process.env.NODE_ENV === 'production') {
    console.log('🚫 Playwright user seeding disabled in production')
    return
  }

  console.log('🌱 Seeding Playwright test users...')

  for (const userData of PLAYWRIGHT_TEST_USERS) {
    await prisma.user.upsert({
      where: { wallet: userData.wallet },
      update: userData,
      create: userData
    })
    console.log(`✅ Created/updated test user: ${userData.nickname}`)
  }

  console.log('🎉 Playwright test users seeded successfully')
}

// Execute if run directly
if (require.main === module) {
  seedPlaywrightUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error seeding test users:', error)
      process.exit(1)
    })
}
```

#### 1.2 Add Seed Script to Package.json
```json
{
  "scripts": {
    "seed:playwright": "ts-node scripts/seed-playwright-users.ts",
    "test:playwright:setup": "npm run seed:playwright && playwright test"
  }
}
```

### Phase 2: JWT Test Token Generation 🎫

#### 2.1 Create JWT Test Helper Service
**File**: `lib/test/playwright-auth-helpers.ts`

```typescript
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

export interface PlaywrightTestUser {
  id: string
  wallet: string
  nickname: string
  fullName: string
  isCreator: boolean
  isVerified: boolean
}

export const PLAYWRIGHT_TEST_USERS: Record<string, PlaywrightTestUser> = {
  admin: {
    id: 'playwright_admin_user',
    wallet: 'PLAYWRIGHT_ADMIN_WALLET_ADDRESS',
    nickname: 'playwright_admin',
    fullName: 'Playwright Admin User',
    isCreator: true,
    isVerified: true
  },
  user: {
    id: 'playwright_regular_user',
    wallet: 'PLAYWRIGHT_USER_WALLET_ADDRESS', 
    nickname: 'playwright_user',
    fullName: 'Playwright Regular User',
    isCreator: false,
    isVerified: false
  },
  creator: {
    id: 'playwright_creator_user',
    wallet: 'PLAYWRIGHT_CREATOR_WALLET_ADDRESS',
    nickname: 'playwright_creator', 
    fullName: 'Playwright Creator User',
    isCreator: true,
    isVerified: true
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
  try {
    const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET) as any
    return decoded.playwright_test === true
  } catch {
    return false
  }
}

export function getPlaywrightUserFromToken(token: string): PlaywrightTestUser | null {
  try {
    const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET) as any
    if (!decoded.playwright_test) return null
    
    return PLAYWRIGHT_TEST_USERS[decoded.test_user_type] || null
  } catch {
    return null
  }
}
```

#### 2.2 Create API Endpoint for Test Authentication
**File**: `app/api/test/playwright-auth/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generatePlaywrightJWT, PLAYWRIGHT_TEST_USERS } from '@/lib/test/playwright-auth-helpers'

export async function POST(req: NextRequest) {
  // Only allow in development/test environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test authentication not available in production' },
      { status: 403 }
    )
  }

  try {
    const { userType } = await req.json()

    if (!userType || !(userType in PLAYWRIGHT_TEST_USERS)) {
      return NextResponse.json(
        { error: 'Invalid user type. Use: admin, user, or creator' },
        { status: 400 }
      )
    }

    const token = generatePlaywrightJWT(userType)
    const user = PLAYWRIGHT_TEST_USERS[userType]

    return NextResponse.json({
      success: true,
      token,
      user,
      expiresIn: '24h'
    })

  } catch (error) {
    console.error('[Playwright Auth] Error generating test token:', error)
    return NextResponse.json(
      { error: 'Failed to generate test token' },
      { status: 500 }
    )
  }
}
```

### Phase 3: Frontend Authentication Bypass 🎭

#### 3.1 Modify AppProvider for Test Mode Detection
**File**: `lib/providers/AppProvider.tsx` (modifications)

```typescript
// Add to existing imports
import { isPlaywrightTestMode, getPlaywrightTestUser } from '@/lib/test/playwright-detection'

// Modify initializeApp function
const initializeApp = async () => {
  setUserLoading(true)

  try {
    // [NEW] Check for Playwright test mode first
    if (isPlaywrightTestMode()) {
      console.log('[Playwright] Test mode detected, using test user')
      const testUser = getPlaywrightTestUser()
      if (testUser) {
        setUser(testUser)
        setIsInitialized(true)
        return
      }
    }

    // EXISTING: Normal authentication flow
    const cachedUser = await getCachedUser()
    if (cachedUser) {
      setUser(cachedUser)
    }
    
  } catch (error) {
    console.error('[AppProvider] Initialization error:', error)
  } finally {
    setUserLoading(false)
    setIsInitialized(true)
  }
}
```

#### 3.2 Create Playwright Detection Helper
**File**: `lib/test/playwright-detection.ts`

```typescript
import { PlaywrightTestUser, PLAYWRIGHT_TEST_USERS } from './playwright-auth-helpers'

export function isPlaywrightTestMode(): boolean {
  // Only in browser environment
  if (typeof window === 'undefined') return false
  
  // Check for Playwright test indicators
  const urlParams = new URLSearchParams(window.location.search)
  const hasPlaywrightParam = urlParams.has('playwright_test')
  const hasTestUserAgent = navigator.userAgent.includes('Playwright')
  
  return process.env.NODE_ENV === 'development' && (hasPlaywrightParam || hasTestUserAgent)
}

export function getPlaywrightTestUser(): PlaywrightTestUser | null {
  if (!isPlaywrightTestMode()) return null
  
  const urlParams = new URLSearchParams(window.location.search)
  const userType = urlParams.get('playwright_user') || 'user'
  
  return PLAYWRIGHT_TEST_USERS[userType as keyof typeof PLAYWRIGHT_TEST_USERS] || PLAYWRIGHT_TEST_USERS.user
}
```

### Phase 4: API Authentication Bypass 🔐

#### 4.1 Create API Authentication Helper
**File**: `lib/test/api-auth-bypass.ts`

```typescript
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'
import { isPlaywrightTestToken, getPlaywrightUserFromToken } from './playwright-auth-helpers'

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
    if (process.env.NODE_ENV === 'development' && isPlaywrightTestToken(token)) {
      const testUser = getPlaywrightUserFromToken(token)
      if (testUser) {
        console.log(`[Playwright Auth] Using test user: ${testUser.nickname}`)
        return { success: true, user: testUser }
      }
    }

    // EXISTING: Normal JWT verification
    const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET) as any
    
    // Lookup real user in database
    const { prisma } = await import('@/lib/prisma')
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
```

#### 4.2 Update API Routes to Use Helper
**Example**: Modify `app/api/conversations/[id]/messages/route.ts`

```typescript
// Replace existing auth logic with:
import { authenticateRequest } from '@/lib/test/api-auth-bypass'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Use unified authentication
    const authResult = await authenticateRequest(request)
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const user = authResult.user
    // ... rest of the route logic
    
  } catch (error) {
    // ... error handling
  }
}
```

### Phase 5: Playwright Test Utilities 🎪

#### 5.1 Create Playwright Authentication Functions
**File**: `lib/test/playwright-browser-helpers.ts`

```typescript
import { Page } from '@playwright/test'

export interface PlaywrightAuthOptions {
  userType: 'admin' | 'user' | 'creator'
  skipWalletConnection?: boolean
}

export async function authenticatePlaywrightUser(
  page: Page, 
  options: PlaywrightAuthOptions = { userType: 'user' }
) {
  console.log(`🎭 Authenticating Playwright user: ${options.userType}`)

  // Method 1: URL Parameter approach (simpler)
  const currentUrl = new URL(page.url())
  currentUrl.searchParams.set('playwright_test', 'true')
  currentUrl.searchParams.set('playwright_user', options.userType)
  
  await page.goto(currentUrl.toString())
  
  // Wait for authentication to complete
  await page.waitForSelector('[data-testid="authenticated-content"]', { 
    timeout: 5000,
    state: 'visible'
  })

  console.log(`✅ Playwright user authenticated: ${options.userType}`)
}

export async function authenticatePlaywrightUserViaAPI(
  page: Page,
  options: PlaywrightAuthOptions = { userType: 'user' }
) {
  console.log(`🎭 Authenticating via API: ${options.userType}`)

  // Method 2: API Token approach (for API testing)
  const response = await page.request.post('/api/test/playwright-auth', {
    data: { userType: options.userType }
  })

  const { token, user } = await response.json()

  // Inject token into browser
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('playwright_auth_token', token)
    localStorage.setItem('playwright_user', JSON.stringify(user))
    
    // Trigger auth state update
    window.dispatchEvent(new CustomEvent('playwright-auth-ready'))
  }, { token, user })

  // Refresh to apply authentication
  await page.reload()
  
  console.log(`✅ API authentication complete: ${options.userType}`)
}

export async function logoutPlaywrightUser(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('playwright_auth_token')
    localStorage.removeItem('playwright_user')
    
    // Clear URL parameters
    const url = new URL(window.location.href)
    url.searchParams.delete('playwright_test')
    url.searchParams.delete('playwright_user')
    window.history.replaceState({}, '', url.toString())
  })

  await page.reload()
  console.log('🚪 Playwright user logged out')
}
```

#### 5.2 Create Playwright Test Configuration
**File**: `playwright.config.ts` (add/modify)

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  // ... existing config
  
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'authenticated-tests',
      dependencies: ['setup'],
      use: {
        // Custom test context
        storageState: 'tests/auth-state.json'
      }
    }
  ],
  
  // Global setup
  globalSetup: require.resolve('./tests/global-setup.ts'),
  
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3000',
    
    // Custom test data
    extraHTTPHeaders: {
      'X-Test-Environment': 'playwright'
    }
  }
})
```

#### 5.3 Create Global Test Setup
**File**: `tests/global-setup.ts`

```typescript
import { chromium, FullConfig } from '@playwright/test'
import { seedPlaywrightUsers } from '../scripts/seed-playwright-users'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...')

  // 1. Seed test users
  await seedPlaywrightUsers()

  // 2. Start application (if needed)
  // This could include starting dev server, etc.

  console.log('✅ Playwright global setup complete')
}

export default globalSetup
```

### Phase 6: Integration and Testing 🧪

#### 6.1 Create Example Playwright Tests
**File**: `tests/auth/authentication.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { authenticatePlaywrightUser, logoutPlaywrightUser } from '../lib/test/playwright-browser-helpers'

test.describe('Authenticated User Flows', () => {
  test('Admin user can access dashboard', async ({ page }) => {
    // Authenticate as admin
    await authenticatePlaywrightUser(page, { userType: 'admin' })
    
    // Navigate to dashboard
    await page.goto('/dashboard')
    
    // Verify admin-specific content
    await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible()
    await expect(page.locator('text=Admin Dashboard')).toBeVisible()
  })

  test('Regular user cannot access admin features', async ({ page }) => {
    // Authenticate as regular user
    await authenticatePlaywrightUser(page, { userType: 'user' })
    
    // Try to access admin page
    await page.goto('/dashboard')
    
    // Verify restricted access
    await expect(page.locator('[data-testid="admin-panel"]')).not.toBeVisible()
    await expect(page.locator('text=Access Denied')).toBeVisible()
  })

  test('Creator can create and manage posts', async ({ page }) => {
    // Authenticate as creator
    await authenticatePlaywrightUser(page, { userType: 'creator' })
    
    // Navigate to create post
    await page.goto('/create-post')
    
    // Verify creator features
    await expect(page.locator('[data-testid="post-creator"]')).toBeVisible()
    await expect(page.locator('input[name="title"]')).toBeVisible()
  })

  test('Authentication state persists across navigation', async ({ page }) => {
    // Authenticate
    await authenticatePlaywrightUser(page, { userType: 'creator' })
    
    // Navigate between pages
    await page.goto('/dashboard')
    await page.goto('/creators') 
    await page.goto('/feed')
    
    // Verify still authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    await expect(page.locator('text=playwright_creator')).toBeVisible()
  })
})
```

#### 6.2 API Testing with Authentication
**File**: `tests/api/authenticated-api.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { generatePlaywrightJWT } from '../lib/test/playwright-auth-helpers'

test.describe('Authenticated API Endpoints', () => {
  test('Create post with admin token', async ({ request }) => {
    const token = generatePlaywrightJWT('admin')
    
    const response = await request.post('/api/posts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Test Post',
        content: 'This is a test post created by Playwright',
        type: 'text',
        category: 'general'
      }
    })

    expect(response.status()).toBe(201)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.post.title).toBe('Test Post')
  })

  test('Access protected conversation with user token', async ({ request }) => {
    const token = generatePlaywrightJWT('user')
    
    const response = await request.get('/api/conversations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data.conversations)).toBe(true)
  })
})
```

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Database Setup
- [ ] Create `scripts/seed-playwright-users.ts`
- [ ] Add seed script to package.json
- [ ] Test seeding in development environment
- [ ] Verify test users in database

### Phase 2: JWT Infrastructure  
- [ ] Create `lib/test/playwright-auth-helpers.ts`
- [ ] Create test authentication API endpoint
- [ ] Test JWT generation and validation
- [ ] Verify test token identification

### Phase 3: Frontend Integration
- [ ] Modify AppProvider for test mode detection
- [ ] Create Playwright detection helper
- [ ] Test frontend authentication bypass
- [ ] Verify UI state management

### Phase 4: API Integration
- [ ] Create unified authentication helper
- [ ] Update key API routes to use helper  
- [ ] Test API authentication bypass
- [ ] Verify backward compatibility

### Phase 5: Playwright Utilities
- [ ] Create browser authentication helpers
- [ ] Create Playwright configuration
- [ ] Create global test setup
- [ ] Test authentication utilities

### Phase 6: Testing & Validation
- [ ] Create example authentication tests
- [ ] Create API authentication tests
- [ ] Run full test suite
- [ ] Document usage patterns

## 🎯 SUCCESS CRITERIA

1. **Security**: No production code compromise
2. **Functionality**: All authentication flows testable
3. **Performance**: Fast test execution (<5s per auth)
4. **Reliability**: Consistent test results
5. **Maintainability**: Clear, documented code
6. **Compatibility**: Works with existing auth system

Ready for Impact Analysis phase! 🚀 