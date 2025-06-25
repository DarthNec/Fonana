import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key'
)

// Режим отладки
const DEBUG_MODE = false

export interface AuthJWTPayload {
  wallet: string
  userId: string
  exp?: number
}

export async function createJWT(payload: AuthJWTPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Токен действителен 7 дней
    .sign(JWT_SECRET)
    
  if (DEBUG_MODE) {
    console.log('🔑 JWT created:', {
      wallet: payload.wallet.substring(0, 8) + '...',
      userId: payload.userId,
      expiresIn: '7 days'
    })
  }
  
  return token
}

export async function verifyJWT(token: string): Promise<AuthJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    const result = {
      wallet: payload.wallet as string,
      userId: payload.userId as string,
      exp: payload.exp
    }
    
    if (DEBUG_MODE) {
      const expiresAt = payload.exp ? new Date(payload.exp * 1000) : null
      console.log('✅ JWT verified:', {
        wallet: result.wallet.substring(0, 8) + '...',
        userId: result.userId,
        expiresAt: expiresAt?.toLocaleString()
      })
    }
    
    return result
  } catch (error: any) {
    if (DEBUG_MODE) {
      console.error('❌ JWT verification failed:', {
        error: error.message,
        code: error.code,
        claim: error.claim
      })
    }
    return null
  }
}

// Функции для работы с куками
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  
  // Более гибкие настройки cookie для лучшей совместимости
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const, // Изменено с 'lax' для лучшей совместимости
    maxAge: 60 * 60 * 24 * 7, // 7 дней
    path: '/',
    // Добавляем domain для продакшена
    ...(process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL 
      ? { domain: new URL(process.env.NEXTAUTH_URL).hostname } 
      : {})
  }
  
  cookieStore.set('fonana-auth', token, cookieOptions)
  
  if (DEBUG_MODE) {
    console.log('🍪 Auth cookie set:', {
      name: 'fonana-auth',
      options: cookieOptions,
      tokenPreview: token.substring(0, 20) + '...'
    })
  }
}

export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('fonana-auth')
  
  if (DEBUG_MODE && cookie) {
    console.log('🍪 Auth cookie retrieved:', {
      name: 'fonana-auth',
      exists: !!cookie,
      preview: cookie.value.substring(0, 20) + '...'
    })
  }
  
  return cookie?.value || null
}

export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('fonana-auth')
  
  if (DEBUG_MODE) {
    console.log('🍪 Auth cookie removed')
  }
}

// Проверка авторизации из кук
export async function checkAuth(): Promise<AuthJWTPayload | null> {
  const token = await getAuthCookie()
  if (!token) {
    if (DEBUG_MODE) console.log('❌ No auth cookie found')
    return null
  }
  
  return await verifyJWT(token)
} 