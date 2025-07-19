import { PlaywrightTestUser, PLAYWRIGHT_TEST_USERS } from './playwright-auth-helpers'

export function isPlaywrightTestMode(): boolean {
  // Only in browser environment
  if (typeof window === 'undefined') return false
  
  // Check for Playwright test indicators
  const urlParams = new URLSearchParams(window.location.search)
  const hasPlaywrightParam = urlParams.has('playwright_test')
  const hasTestUserAgent = navigator.userAgent.includes('Playwright')
  
  return (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && 
         (hasPlaywrightParam || hasTestUserAgent)
}

export function getPlaywrightTestUser(): PlaywrightTestUser | null {
  if (!isPlaywrightTestMode()) return null
  
  const urlParams = new URLSearchParams(window.location.search)
  const userType = urlParams.get('playwright_user') || 'user'
  
  const user = PLAYWRIGHT_TEST_USERS[userType as keyof typeof PLAYWRIGHT_TEST_USERS]
  
  if (user) {
    console.log(`[Playwright] Using test user: ${user.nickname} (${userType})`)
    console.log(`[Playwright] User avatar: ${user.avatar}`)
    return user
  }
  
  console.log(`[Playwright] Unknown user type: ${userType}, falling back to default user`)
  return PLAYWRIGHT_TEST_USERS.user
}

export function getPlaywrightUserType(): string | null {
  if (!isPlaywrightTestMode()) return null
  
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('playwright_user') || 'user'
} 