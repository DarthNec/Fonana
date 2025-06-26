import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Список системных путей, которые точно не являются профилями пользователей
const SYSTEM_PATHS = [
  '/api',
  '/_next',
  '/create',
  '/feed',
  '/profile',
  '/dashboard',
  '/analytics',
  '/creators',
  '/creator',
  '/post',
  '/category',
  '/intimate',
  '/test',
  '/admin',
  '/search',
  '/messages',
  '/auth',
  '/posts',
  '/error',
  '/404',
  '/500',
  '/_error',
  '/favicon',
  '/manifest',
  '/robots',
  '/sitemap',
  '/not-found'
]

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Check if this is a profile page visit or referral link
  const pathname = request.nextUrl.pathname
  
  // Match both /username and /r/username patterns
  const isReferralLink = pathname.match(/^\/r\/[a-zA-Z0-9_-]+$/)
  
  // Check if path is a system path
  const isSystemPath = SYSTEM_PATHS.some(path => pathname.startsWith(path)) || 
                      pathname.includes('.') || // файлы с расширениями
                      pathname === '/' // главная страница
  
  // Profile visit = путь вида /username, где username начинается с буквы
  const isProfileVisit = !isSystemPath && 
                        pathname.match(/^\/[a-zA-Z][a-zA-Z0-9_-]*$/) &&
                        pathname.length > 1 // не просто "/"
  
  // Handle old /r/username format - redirect to /username
  if (isReferralLink) {
    const username = pathname.substring(3) // Remove '/r/' prefix
    const newUrl = new URL(`/${username}`, request.url)
    // Preserve query parameters
    newUrl.search = request.nextUrl.search
    
    return NextResponse.redirect(newUrl, { status: 301 }) // Permanent redirect
  }
  
  // Handle profile visits
  if (isProfileVisit) {
    const username = pathname.substring(1) // Remove leading slash
    
    // Дополнительная валидация username
    // - Должен начинаться с буквы
    // - Может содержать буквы, цифры, _ и -
    // - Минимум 3 символа
    if (!username || 
        username.length < 3 || 
        !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(username) ||
        username.toLowerCase() === 'undefined' || 
        username.toLowerCase() === 'null' ||
        username.toLowerCase() === 'feed' ||
        username.toLowerCase() === 'error') {
      return response
    }
    
    // Check for existing referrer cookie
    const existingReferrer = request.cookies.get('fonana_referrer')
    
    // Only set NEW referrer cookie if:
    // 1. No existing referrer cookie (first visitor wins)
    // 2. Valid username format
    if (!existingReferrer && username) {
      // Set referrer cookie for 7 days
      response.cookies.set('fonana_referrer', username, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      })
      
      // ВАЖНО: Передаем header ТОЛЬКО при первой установке cookie
      // Это предотвратит постоянное появление Welcome окна
      response.headers.set('X-Fonana-Referrer', username)
      response.headers.set('X-Referral-Cookie-Set', 'true')
      response.headers.set('X-Is-New-Referral', 'true')
    }
    // НЕ передаем существующий referrer через header
    // Это была главная причина бага с постоянным появлением окна
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