import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Check if this is a profile page visit or referral link
  const pathname = request.nextUrl.pathname
  
  // Match both /username and /r/username patterns
  const isReferralLink = pathname.match(/^\/r\/[a-zA-Z0-9_-]+$/)
  const isProfileVisit = pathname.match(/^\/[a-zA-Z0-9_-]+$/) && 
                        !pathname.startsWith('/api') && 
                        !pathname.startsWith('/_next') &&
                        !pathname.includes('.') &&
                        !pathname.startsWith('/create') &&
                        !pathname.startsWith('/feed') &&
                        !pathname.startsWith('/profile') &&
                        !pathname.startsWith('/dashboard') &&
                        !pathname.startsWith('/analytics') &&
                        !pathname.startsWith('/creators') &&
                        !pathname.startsWith('/creator') &&
                        !pathname.startsWith('/post') &&
                        !pathname.startsWith('/category') &&
                        !pathname.startsWith('/intimate') &&
                        !pathname.startsWith('/test') &&
                        !pathname.startsWith('/admin')
  
  // Handle old /r/username format - redirect to /username
  if (isReferralLink) {
    const username = pathname.substring(3) // Remove '/r/' prefix
    const newUrl = new URL(`/${username}`, request.url)
    // Preserve query parameters
    newUrl.search = request.nextUrl.search
    
    // Log via header for debugging (can be read by API)
    response.headers.set('X-Referral-Redirect', `${pathname} -> ${newUrl.pathname}`)
    
    return NextResponse.redirect(newUrl, { status: 301 }) // Permanent redirect
  }
  
  // Handle profile visits (both new and old formats)
  if (isProfileVisit) {
    const username = pathname.substring(1) // Remove leading slash
    
    // Check for existing referrer cookie
    const existingReferrer = request.cookies.get('fonana_referrer')
    
    // Only set referrer cookie if:
    // 1. No existing referrer cookie (first visitor wins)
    // 2. Valid username format
    if (!existingReferrer && username && /^[a-zA-Z0-9_-]+$/.test(username)) {
      // Set referrer cookie for 7 days
      response.cookies.set('fonana_referrer', username, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      })
      
      // Also set a header to pass referrer info to the client for localStorage
      response.headers.set('X-Fonana-Referrer', username)
      response.headers.set('X-Referral-Cookie-Set', 'true')
    } else if (existingReferrer) {
      // Pass existing referrer to client
      response.headers.set('X-Fonana-Referrer', existingReferrer.value)
      response.headers.set('X-Referral-Cookie-Exists', 'true')
    }
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
} 