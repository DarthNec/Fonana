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
                        !pathname.startsWith('/test')
  
  if (isReferralLink || isProfileVisit) {
    // Extract referrer nickname
    let referrer = ''
    if (isReferralLink) {
      referrer = pathname.slice(3) // Remove /r/ prefix
    } else if (isProfileVisit) {
      referrer = pathname.slice(1) // Remove leading slash
    }
    
    // Check if user already has a referrer cookie
    const existingReferrer = request.cookies.get('fonana_referrer')
    
    // Only set cookie if no existing referrer (first visitor wins)
    if (!existingReferrer && referrer) {
      response.cookies.set('fonana_referrer', referrer, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      })
      
      console.log('[Middleware] Set referrer cookie:', referrer)
    }
    
    // If it's a /r/ link, redirect to the profile page
    if (isReferralLink) {
      return NextResponse.redirect(new URL(`/${referrer}`, request.url))
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 