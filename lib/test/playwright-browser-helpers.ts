// import { Page } from '@playwright/test'

export interface PlaywrightAuthOptions {
  userType: 'admin' | 'user' | 'creator'
  skipWalletConnection?: boolean
}

export async function authenticatePlaywrightUser(
  page: any, // Page type 
  options: PlaywrightAuthOptions = { userType: 'user' }
) {
  console.log(`🎭 Authenticating Playwright user: ${options.userType}`)

  // Method 1: URL Parameter approach (simpler and faster)
  const currentUrl = new URL(page.url())
  currentUrl.searchParams.set('playwright_test', 'true')
  currentUrl.searchParams.set('playwright_user', options.userType)
  
  await page.goto(currentUrl.toString())
  
  // Wait for authentication to complete - look for user menu or authenticated content
  try {
    await page.waitForSelector('[data-testid="user-menu"]', { 
      timeout: 10000,
      state: 'visible'
    })
    console.log(`✅ Playwright user authenticated: ${options.userType}`)
  } catch (error) {
    // Fallback: check for other authenticated indicators
    const hasAuthenticatedContent = await page.locator('body').evaluate((body: HTMLElement) => {
      // Check if we're not seeing authentication required message
      return !body.textContent?.includes('Connect your wallet') &&
             !body.textContent?.includes('Authentication Required')
    })
    
    if (hasAuthenticatedContent) {
      console.log(`✅ Playwright user authenticated (fallback check): ${options.userType}`)
    } else {
      console.warn(`⚠️ Authentication may have failed for: ${options.userType}`)
      throw error
    }
  }
}

export async function authenticatePlaywrightUserViaAPI(
  page: any, // Page type
  options: PlaywrightAuthOptions = { userType: 'user' }
) {
  console.log(`🎭 Authenticating via API: ${options.userType}`)

  // Method 2: API Token approach (for API testing)
  const response = await page.request.post('/api/test/playwright-auth', {
    data: { userType: options.userType }
  })

  if (!response.ok()) {
    throw new Error(`Failed to get auth token: ${response.status()} ${await response.text()}`)
  }

  const { token, user } = await response.json()

  // Inject token into browser storage
  await page.evaluate(({ token, user }: { token: string; user: any }) => {
    localStorage.setItem('playwright_auth_token', token)
    localStorage.setItem('playwright_user', JSON.stringify(user))
    
    // Trigger auth state update
    window.dispatchEvent(new CustomEvent('playwright-auth-ready', { detail: { user, token } }))
  }, { token, user })

  // Refresh to apply authentication
  await page.reload()
  
  // Wait for authentication to be applied
  await page.waitForSelector('[data-testid="user-menu"]', { 
    timeout: 5000,
    state: 'visible'
  })
  
  console.log(`✅ API authentication complete: ${options.userType}`)
}

export async function logoutPlaywrightUser(page: any) {
  console.log('🚪 Logging out Playwright user...')
  
  await page.evaluate(() => {
    // Clear all auth-related storage
    localStorage.removeItem('playwright_auth_token')
    localStorage.removeItem('playwright_user')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    
    // Clear URL parameters
    const url = new URL(window.location.href)
    url.searchParams.delete('playwright_test')
    url.searchParams.delete('playwright_user')
    window.history.replaceState({}, '', url.toString())
    
    // Trigger logout event
    window.dispatchEvent(new CustomEvent('playwright-logout'))
  })

  await page.reload()
  
  // Wait for logout to complete
  try {
    await page.waitForSelector('button:has-text("Connect")', { 
      timeout: 5000,
      state: 'visible'
    })
    console.log('✅ Playwright user logged out successfully')
  } catch (error) {
    console.warn('⚠️ Logout verification failed, but logout was attempted')
  }
}

export async function getAuthenticatedUser(page: any): Promise<any | null> {
  return await page.evaluate(() => {
    const userStr = localStorage.getItem('playwright_user') || localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  })
}

export async function isAuthenticated(page: any): Promise<boolean> {
  const user = await getAuthenticatedUser(page)
  return user !== null
}

export async function waitForAuthentication(page: any, timeout: number = 10000): Promise<void> {
  await page.waitForFunction(() => {
    return localStorage.getItem('playwright_user') !== null || 
           localStorage.getItem('user') !== null
  }, { timeout })
} 