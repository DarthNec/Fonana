import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key'
)

export interface AuthJWTPayload {
  wallet: string
  userId: string
  exp?: number
}

export async function createJWT(payload: AuthJWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Токен действителен 7 дней
    .sign(JWT_SECRET)
}

export async function verifyJWT(token: string): Promise<AuthJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      wallet: payload.wallet as string,
      userId: payload.userId as string,
      exp: payload.exp
    }
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

// Функции для работы с куками
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('fonana-auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 дней
    path: '/'
  })
}

export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('fonana-auth')
  return cookie?.value || null
}

export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('fonana-auth')
}

// Проверка авторизации из кук
export async function checkAuth(): Promise<AuthJWTPayload | null> {
  const token = await getAuthCookie()
  if (!token) return null
  
  return await verifyJWT(token)
} 