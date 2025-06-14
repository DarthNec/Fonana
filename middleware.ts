import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Check if this is a profile page visit
  const pathname = request.nextUrl.pathname
  const isProfileVisit = pathname.match(/^\/[a-zA-Z0-9_-]+$/) && 
                        !pathname.startsWith('/api') && 
                        !pathname.startsWith('/_next') &&
                        !pathname.includes('.')
  
  if (isProfileVisit) {
    const referrer = pathname.slice(1) // Remove leading slash
    
    // Set referrer cookie for 7 days
    response.cookies.set('fonana_referrer', referrer, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    })
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