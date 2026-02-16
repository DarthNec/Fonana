# 🔧 Soft Auth Technical Specification

**Дата:** 10 февраля 2026  
**Версия:** 1.0  
**M7 Session:** `task_провести-полный-анализ-проекта_4011`  
**Статус:** Ready for Implementation

---

## 📋 API Specification

### Endpoint: POST /api/auth/soft/register

**Purpose:** Register a new soft account with email and password

**Request:**
```typescript
interface RegisterRequest {
  email: string          // Required, valid email format
  username?: string      // Optional, auto-generated if empty
  password: string       // Required, min 12 chars
  captchaToken: string   // Required, hCaptcha/Turnstile token
}
```

**Response (Success):**
```typescript
interface RegisterResponse {
  success: true
  user: {
    id: string
    email: string
    username: string
    authType: 'soft'
    emailVerified: false
    createdAt: string
  }
  message: 'Verification email sent. Please check your inbox.'
}
```

**Response (Error):**
```typescript
interface RegisterErrorResponse {
  success: false
  error: string
  code: 'EMAIL_EXISTS' | 'WEAK_PASSWORD' | 'INVALID_EMAIL' | 'CAPTCHA_FAILED' | 'DISPOSABLE_EMAIL'
}
```

**Validation Rules:**
- Email: Must be valid format, not disposable domain
- Username: 3-20 chars, alphanumeric + underscore, unique
- Password: Min 12 chars, must contain uppercase, lowercase, number, special char
- CAPTCHA: Must be valid token from client-side widget

**Rate Limiting:**
- 5 registration attempts per IP per hour
- 10 email verifications per email per day

---

### Endpoint: POST /api/auth/soft/login

**Purpose:** Login with email and password

**Request:**
```typescript
interface LoginRequest {
  email: string
  password: string
}
```

**Response (Success):**
```typescript
interface LoginResponse {
  success: true
  token: string // JWT token (30-day expiry)
  user: {
    id: string
    email: string
    username: string
    authType: 'soft'
    emailVerified: boolean
  }
}
```

**Response (Error):**
```typescript
interface LoginErrorResponse {
  success: false
  error: string
  code: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'EMAIL_NOT_VERIFIED'
  attemptsRemaining?: number // If account locking is active
}
```

**Security:**
- Max 5 failed attempts → 15-minute account lock
- Log all login attempts (IP, timestamp, success/fail)
- Send email notification on suspicious login (new device/location)

---

### Endpoint: POST /api/auth/soft/verify

**Purpose:** Verify email address with token

**Request:**
```typescript
interface VerifyEmailRequest {
  token: string // 32-char hex token from email link
}
```

**Response (Success):**
```typescript
interface VerifyEmailResponse {
  success: true
  message: 'Email verified successfully'
}
```

**Response (Error):**
```typescript
interface VerifyEmailErrorResponse {
  success: false
  error: string
  code: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'ALREADY_VERIFIED'
}
```

**Token Expiry:** 24 hours

---

### Endpoint: POST /api/auth/soft/upgrade

**Purpose:** Upgrade soft account to full account (wallet or Telegram)

**Request (Wallet Upgrade):**
```typescript
interface UpgradeWalletRequest {
  method: 'wallet'
  wallet: string // Solana address (base58, 32-44 chars)
  signature: string // Signed message to prove ownership
  message: string // Original message that was signed
}
```

**Request (Telegram Upgrade):**
```typescript
interface UpgradeTelegramRequest {
  method: 'telegram'
  telegramId: string
  hash: string // HMAC-SHA256 from Telegram
  // ... other Telegram auth data
}
```

**Response (Success):**
```typescript
interface UpgradeResponse {
  success: true
  user: {
    id: string
    email: string // Preserved from soft account
    username: string
    authType: 'wallet' | 'telegram' // Upgraded!
    wallet?: string
    telegramId?: string
  }
  message: 'Account upgraded successfully'
}
```

**Response (Error):**
```typescript
interface UpgradeErrorResponse {
  success: false
  error: string
  code: 'WALLET_ALREADY_LINKED' | 'INVALID_SIGNATURE' | 'TELEGRAM_ID_EXISTS'
}
```

**Upgrade Logic:**
1. Verify wallet ownership (signature check) OR Telegram auth data
2. Check wallet/telegramId not already used by another account
3. Update user record:
   - `authType` → 'wallet' or 'telegram'
   - `wallet` or `telegramId` → provided value
   - Preserve `email`, `username`, `posts`, `followers`, etc.
4. Invalidate old JWT tokens, issue new one with updated claims
5. Send confirmation email: "Your account has been upgraded"

---

### Endpoint: POST /api/auth/soft/resend

**Purpose:** Resend email verification link

**Request:**
```typescript
interface ResendVerificationRequest {
  email: string
}
```

**Response:**
```typescript
interface ResendVerificationResponse {
  success: true
  message: 'Verification email sent'
}
```

**Rate Limiting:** Max 3 resends per email per hour

---

### Endpoint: POST /api/auth/soft/forgot

**Purpose:** Initiate password reset flow

**Request:**
```typescript
interface ForgotPasswordRequest {
  email: string
}
```

**Response:**
```typescript
interface ForgotPasswordResponse {
  success: true
  message: 'Password reset email sent (if account exists)'
}
```

**Note:** Always return success (don't reveal if email exists)

---

### Endpoint: POST /api/auth/soft/reset

**Purpose:** Reset password with token

**Request:**
```typescript
interface ResetPasswordRequest {
  token: string // From email link
  newPassword: string // Must meet password requirements
}
```

**Response (Success):**
```typescript
interface ResetPasswordResponse {
  success: true
  message: 'Password reset successfully'
}
```

**Token Expiry:** 1 hour

---

## 🗄️ Database Schema

### User Model Changes

```prisma
model User {
  id                        String    @id @default(cuid())
  
  // Auth fields (updated)
  wallet                    String?   @unique // ← Now OPTIONAL
  authType                  String    @default("wallet") // "soft" | "wallet" | "telegram"
  
  // Soft auth fields (NEW)
  email                     String?   @unique
  passwordHash              String?   // bcrypt hash
  emailVerified             Boolean   @default(false)
  emailVerificationToken    String?   @unique
  emailVerificationExpires  DateTime?
  passwordResetToken        String?   @unique
  passwordResetExpires      DateTime?
  
  // Telegram auth (existing)
  telegramId                String?   @unique
  
  // Security fields (NEW)
  failedLoginAttempts       Int       @default(0)
  accountLockedUntil        DateTime?
  lastLoginAt               DateTime?
  lastLoginIp               String?
  
  // Profile fields (existing)
  nickname                  String?   @unique
  fullName                  String?
  bio                       String?
  avatar                    String?
  // ... rest of existing fields
  
  // Timestamps
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt
  
  // Indexes (NEW)
  @@index([authType])
  @@index([emailVerified])
  @@index([email])
  @@map("users")
}
```

---

### RateLimitLog Model (NEW)

```prisma
model RateLimitLog {
  id          String   @id @default(cuid())
  userId      String?  // Null for anonymous (IP-based) rate limits
  identifier  String   // userId or IP address
  action      String   // "register", "login", "post", "comment", etc.
  count       Int      @default(1)
  windowStart DateTime @default(now())
  windowEnd   DateTime
  createdAt   DateTime @default(now())
  
  @@index([identifier, action, windowStart])
  @@map("rate_limit_logs")
}
```

---

### LoginAttempt Model (NEW)

```prisma
model LoginAttempt {
  id         String   @id @default(cuid())
  email      String   // Email attempted
  ip         String   // IP address
  userAgent  String?  // Browser/device
  success    Boolean  // Login succeeded?
  failReason String?  // "invalid_password", "account_locked", etc.
  createdAt  DateTime @default(now())
  
  @@index([email, createdAt])
  @@index([ip, createdAt])
  @@map("login_attempts")
}
```

---

## 🔐 Security Implementation

### Password Hashing

```typescript
import bcrypt from 'bcrypt'

const BCRYPT_ROUNDS = 12 // Cost factor (higher = more secure but slower)

export async function hashPassword(password: string): Promise<string> {
  // Validate password strength
  if (!isStrongPassword(password)) {
    throw new Error('Password does not meet security requirements')
  }
  
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function isStrongPassword(password: string): boolean {
  if (password.length < 12) return false
  if (!/[A-Z]/.test(password)) return false // Uppercase
  if (!/[a-z]/.test(password)) return false // Lowercase
  if (!/[0-9]/.test(password)) return false // Number
  if (!/[^A-Za-z0-9]/.test(password)) return false // Special char
  
  return true
}
```

---

### Email Verification Token Generation

```typescript
import crypto from 'crypto'

export function generateEmailVerificationToken(): {
  token: string
  expires: Date
} {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  
  return { token, expires }
}

export function verifyEmailToken(
  providedToken: string,
  storedToken: string,
  expires: Date
): boolean {
  if (providedToken !== storedToken) return false
  if (new Date() > expires) return false
  return true
}
```

---

### Account Locking (Brute Force Protection)

```typescript
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export async function handleFailedLogin(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return // Don't reveal if user exists
  
  const newAttempts = user.failedLoginAttempts + 1
  
  if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
    // Lock account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
        accountLockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS)
      }
    })
    
    // Send email notification
    await sendEmail({
      to: user.email,
      subject: 'Account Locked - Security Alert',
      body: `Your account has been locked due to ${MAX_LOGIN_ATTEMPTS} failed login attempts. It will unlock automatically in 15 minutes.`
    })
  } else {
    // Increment counter
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: newAttempts }
    })
  }
}

export async function handleSuccessfulLogin(userId: string, ip: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0, // Reset counter
      accountLockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ip
    }
  })
}

export async function isAccountLocked(user: User): Promise<boolean> {
  if (!user.accountLockedUntil) return false
  
  if (new Date() > user.accountLockedUntil) {
    // Lockout expired, unlock account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accountLockedUntil: null,
        failedLoginAttempts: 0
      }
    })
    return false
  }
  
  return true // Still locked
}
```

---

### Disposable Email Detection

```typescript
// lib/disposable-emails.ts
// List of disposable email domains (10000+ domains)
export const disposableEmailDomains = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'throwaway.email',
  // ... 10000+ more
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  
  return disposableEmailDomains.has(domain)
}

export async function validateEmailDomain(email: string): Promise<boolean> {
  const domain = email.split('@')[1]
  
  // Check MX records exist (domain can receive email)
  try {
    const dns = require('dns').promises
    const records = await dns.resolveMx(domain)
    return records.length > 0
  } catch (error) {
    return false // Domain doesn't exist or no MX records
  }
}
```

---

## 🎨 Frontend Components

### SoftAuthRegisterForm.tsx

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import HCaptcha from '@hcaptcha/react-hcaptcha'

export function SoftAuthRegisterForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' })
      setLoading(false)
      return
    }

    if (!captchaToken) {
      setErrors({ captcha: 'Please complete the CAPTCHA' })
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/soft/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username || undefined,
          password: formData.password,
          captchaToken
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setErrors({ general: data.error || 'Registration failed' })
        return
      }

      // Success - redirect to verification page
      router.push('/auth/verify?email=' + encodeURIComponent(formData.email))
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">Create Soft Account</h2>
      
      {errors.general && (
        <div className="text-red-500 text-sm">{errors.general}</div>
      )}

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="w-full px-4 py-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="username">Username (optional)</label>
        <input
          id="username"
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="Leave empty for auto-generated"
          className="w-full px-4 py-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={12}
          className="w-full px-4 py-2 border rounded"
        />
        <p className="text-xs text-gray-500 mt-1">
          Min 12 characters, including uppercase, lowercase, number, and special character
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          className="w-full px-4 py-2 border rounded"
        />
        {errors.confirmPassword && (
          <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
        )}
      </div>

      <div>
        <HCaptcha
          sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
          onVerify={(token) => setCaptchaToken(token)}
        />
        {errors.captcha && (
          <p className="text-red-500 text-sm mt-1">{errors.captcha}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-purple-500 text-white rounded font-semibold hover:bg-purple-600 disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>

      <p className="text-sm text-center text-gray-600">
        Already have an account?{' '}
        <a href="/auth/login" className="text-purple-500 hover:underline">
          Log in
        </a>
      </p>
    </form>
  )
}
```

---

### UpgradePrompt.tsx

```typescript
'use client'

import { useState } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'

interface UpgradePromptProps {
  feature: string // "send tip", "create paid post", etc.
  onClose: () => void
  onUpgradeSuccess?: () => void
}

export function UpgradePrompt({ 
  feature, 
  onClose, 
  onUpgradeSuccess 
}: UpgradePromptProps) {
  const user = useUser()
  const { publicKey, signMessage } = useWallet()
  const { setVisible } = useSafeWalletModal()
  const [loading, setLoading] = useState(false)

  if (user?.authType !== 'soft') {
    return null // Only show for soft accounts
  }

  const handleWalletUpgrade = async () => {
    if (!publicKey || !signMessage) {
      // Wallet not connected, open modal
      setVisible(true)
      return
    }

    setLoading(true)

    try {
      // Create message to sign
      const message = `Upgrade Fonana account\nEmail: ${user.email}\nTimestamp: ${Date.now()}`
      const encodedMessage = new TextEncoder().encode(message)
      
      // Request signature
      const signature = await signMessage(encodedMessage)
      const signatureBase64 = Buffer.from(signature).toString('base64')

      // Call upgrade API
      const res = await fetch('/api/auth/soft/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'wallet',
          wallet: publicKey.toBase58(),
          signature: signatureBase64,
          message
        })
      })

      const data = await res.json()

      if (!res.ok) {
        alert('Upgrade failed: ' + data.error)
        return
      }

      // Success!
      alert('Account upgraded successfully! ✅')
      onUpgradeSuccess?.()
      onClose()
      
      // Refresh page to update user state
      window.location.reload()
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('Upgrade failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">
          🔓 Upgrade to Full Account
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          To use <b>{feature}</b>, you need to upgrade your account by connecting a wallet or Telegram.
        </p>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">✨ Full Account Benefits:</h3>
          <ul className="space-y-2 text-sm">
            <li>✅ Create paid content & earn SOL</li>
            <li>✅ Receive tips & donations</li>
            <li>✅ View premium content</li>
            <li>✅ Unlimited AI generations</li>
            <li>✅ Direct messages with creators</li>
            <li>✅ Live streaming (coming soon)</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleWalletUpgrade}
            disabled={loading}
            className="w-full py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition disabled:opacity-50"
          >
            {loading ? 'Upgrading...' : '🔗 Connect Phantom Wallet'}
          </button>

          <button
            onClick={() => {
              // TODO: Implement Telegram upgrade
              alert('Telegram upgrade coming soon!')
            }}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            💬 Connect Telegram
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// __tests__/soft-auth.test.ts
import { hashPassword, verifyPassword, isStrongPassword } from '@/lib/auth/soft'

describe('Soft Auth - Password Security', () => {
  test('hashPassword should create bcrypt hash', async () => {
    const password = 'StrongP@ssw0rd123'
    const hash = await hashPassword(password)
    
    expect(hash).toMatch(/^\$2[aby]\$12\$/)
    expect(hash.length).toBeGreaterThan(50)
  })

  test('verifyPassword should validate correct password', async () => {
    const password = 'StrongP@ssw0rd123'
    const hash = await hashPassword(password)
    
    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  test('verifyPassword should reject incorrect password', async () => {
    const password = 'StrongP@ssw0rd123'
    const hash = await hashPassword(password)
    
    const isValid = await verifyPassword('WrongPassword', hash)
    expect(isValid).toBe(false)
  })

  test('isStrongPassword should reject weak passwords', () => {
    expect(isStrongPassword('short')).toBe(false) // Too short
    expect(isStrongPassword('nouppercase123!')).toBe(false) // No uppercase
    expect(isStrongPassword('NOLOWERCASE123!')).toBe(false) // No lowercase
    expect(isStrongPassword('NoNumbers!')).toBe(false) // No number
    expect(isStrongPassword('NoSpecialChar123')).toBe(false) // No special
  })

  test('isStrongPassword should accept strong passwords', () => {
    expect(isStrongPassword('StrongP@ssw0rd123')).toBe(true)
    expect(isStrongPassword('An0ther$ecureP@ss')).toBe(true)
  })
})
```

---

### Integration Tests

```typescript
// __tests__/api/soft-auth.test.ts
import { POST as registerAPI } from '@/app/api/auth/soft/register/route'
import { POST as loginAPI } from '@/app/api/auth/soft/login/route'
import { prisma } from '@/lib/prisma'

describe('Soft Auth API', () => {
  beforeEach(async () => {
    // Clean test database
    await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } })
  })

  test('POST /api/auth/soft/register should create soft account', async () => {
    const req = new Request('http://localhost/api/auth/soft/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@test.com',
        password: 'StrongP@ssw0rd123',
        captchaToken: 'mock_captcha_token'
      })
    })

    const res = await registerAPI(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user.email).toBe('newuser@test.com')
    expect(data.user.authType).toBe('soft')
    expect(data.user.emailVerified).toBe(false)

    // Verify user created in database
    const user = await prisma.user.findUnique({
      where: { email: 'newuser@test.com' }
    })
    expect(user).not.toBeNull()
    expect(user?.passwordHash).toBeTruthy()
  })

  test('POST /api/auth/soft/login should return JWT token', async () => {
    // Create test user first
    await fetch('http://localhost/api/auth/soft/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'logintest@test.com',
        password: 'StrongP@ssw0rd123',
        captchaToken: 'mock'
      })
    })

    // Attempt login
    const req = new Request('http://localhost/api/auth/soft/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'logintest@test.com',
        password: 'StrongP@ssw0rd123'
      })
    })

    const res = await loginAPI(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.token).toBeTruthy()
    expect(data.user.email).toBe('logintest@test.com')
  })

  test('POST /api/auth/soft/login should reject invalid credentials', async () => {
    const req = new Request('http://localhost/api/auth/soft/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'logintest@test.com',
        password: 'WrongPassword123!'
      })
    })

    const res = await loginAPI(req)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.code).toBe('INVALID_CREDENTIALS')
  })
})
```

---

### E2E Tests (Playwright)

```typescript
// e2e/soft-auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Soft Auth User Flow', () => {
  test('should register, verify email, and login', async ({ page }) => {
    // Step 1: Navigate to registration page
    await page.goto('http://localhost:3000/auth/register')

    // Step 2: Fill registration form
    await page.fill('input[name="email"]', 'e2etest@example.com')
    await page.fill('input[name="password"]', 'StrongP@ssw0rd123')
    await page.fill('input[name="confirmPassword"]', 'StrongP@ssw0rd123')

    // Step 3: Complete CAPTCHA (in test environment, CAPTCHA is bypassed)
    await page.click('button[type="submit"]')

    // Step 4: Verify redirect to verification page
    await expect(page).toHaveURL(/\/auth\/verify/)
    await expect(page.locator('text=Check your email')).toBeVisible()

    // Step 5: Mock email verification (extract token from database)
    // In real test, you'd fetch verification token from test email inbox
    // For now, we manually verify user in database
    // ... (implementation depends on test setup)

    // Step 6: Login with new account
    await page.goto('http://localhost:3000/auth/login')
    await page.fill('input[name="email"]', 'e2etest@example.com')
    await page.fill('input[name="password"]', 'StrongP@ssw0rd123')
    await page.click('button[type="submit"]')

    // Step 7: Verify redirect to feed
    await expect(page).toHaveURL(/\/feed/)
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should show upgrade prompt when attempting paid action', async ({ page }) => {
    // Login as soft account
    await page.goto('http://localhost:3000/auth/login')
    await page.fill('input[name="email"]', 'softuser@example.com')
    await page.fill('input[name="password"]', 'StrongP@ssw0rd123')
    await page.click('button[type="submit"]')

    // Navigate to a creator profile
    await page.goto('http://localhost:3000/profile/some-creator')

    // Click "Send Tip" button
    await page.click('button:has-text("Send Tip")')

    // Expect upgrade prompt to appear
    await expect(page.locator('text=Upgrade to Full Account')).toBeVisible()
    await expect(page.locator('button:has-text("Connect Phantom Wallet")')).toBeVisible()
  })
})
```

---

## 📧 Email Templates

### Verification Email

**Subject:** Verify your Fonana email address

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { 
      display: inline-block; 
      padding: 12px 24px; 
      background: #8B5CF6; 
      color: white; 
      text-decoration: none; 
      border-radius: 8px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 Welcome to Fonana!</h1>
    <p>Hi <strong>{{username}}</strong>,</p>
    <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{verificationUrl}}" class="button">
        Verify Email Address
      </a>
    </p>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
    
    <p>This link will expire in 24 hours.</p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
    
    <p style="font-size: 14px; color: #666;">
      If you didn't create this account, please ignore this email.
    </p>
  </div>
</body>
</html>
```

---

### Upgrade Success Email

**Subject:** Your Fonana account has been upgraded! ✅

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<body>
  <div class="container">
    <h1>🎉 Congratulations!</h1>
    <p>Hi <strong>{{username}}</strong>,</p>
    <p>Your Fonana account has been successfully upgraded to a Full Account.</p>
    
    <h2>✨ You now have access to:</h2>
    <ul>
      <li>✅ Create paid content & earn SOL</li>
      <li>✅ Receive tips & donations</li>
      <li>✅ View premium content</li>
      <li>✅ Unlimited AI generations</li>
      <li>✅ Direct messages with creators</li>
    </ul>
    
    <p>Your wallet address: <code>{{walletAddress}}</code></p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://fonana.io/profile/{{username}}" class="button">
        Go to Your Profile
      </a>
    </p>
    
    <p>Happy creating! 🚀</p>
    <p>- The Fonana Team</p>
  </div>
</body>
</html>
```

---

## 📊 Monitoring & Alerts

### Metrics to Track (Datadog/New Relic)

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

export function trackSoftAuthMetrics(
  action: string,
  success: boolean,
  metadata?: Record<string, any>
) {
  // Send to analytics
  analytics.track('soft_auth_' + action, {
    success,
    timestamp: Date.now(),
    ...metadata
  })

  // Log for monitoring
  if (!success) {
    Sentry.captureMessage(`Soft auth ${action} failed`, {
      level: 'warning',
      extra: metadata
    })
  }
}

// Usage examples:
trackSoftAuthMetrics('register', true, { email: 'user@example.com' })
trackSoftAuthMetrics('login', false, { email: 'user@example.com', reason: 'invalid_password' })
trackSoftAuthMetrics('upgrade', true, { method: 'wallet' })
```

---

### Alerts (PagerDuty/Slack)

**Alert Conditions:**

1. **High Registration Failure Rate**
   - Trigger: >30% registration failures (5-minute window)
   - Severity: Warning
   - Action: Check CAPTCHA service, disposable email blocking

2. **High Login Failure Rate**
   - Trigger: >40% login failures (5-minute window)
   - Severity: Warning
   - Action: Possible credential stuffing attack, enable stricter rate limits

3. **Spam Account Detection**
   - Trigger: >20% of new accounts flagged as spam (1-hour window)
   - Severity: Critical
   - Action: Increase CAPTCHA difficulty, manual review

4. **Email Deliverability Issues**
   - Trigger: >10% bounce rate or >1% spam reports (1-day window)
   - Severity: Critical
   - Action: Check email provider, warm up IPs

---

## 🎯 Success Criteria

**MVP Launch Checklist:**

- [ ] Database migration applied (wallet optional, new auth fields)
- [ ] All API endpoints implemented and tested
- [ ] Frontend components (registration, login, upgrade) completed
- [ ] Email service configured (Resend/SendGrid)
- [ ] CAPTCHA integrated (hCaptcha/Turnstile)
- [ ] Rate limiting implemented (Upstash Redis)
- [ ] Content moderation integrated (OpenAI API)
- [ ] Permission system enforced across all protected routes
- [ ] Unit tests written (80%+ coverage)
- [ ] E2E tests passing (Playwright)
- [ ] Security audit completed
- [ ] Monitoring & alerts configured
- [ ] Privacy Policy & ToS updated
- [ ] Feature flag ready for gradual rollout

**Post-Launch Metrics (30-Day Target):**

- [ ] 35%+ soft account registration rate
- [ ] 70%+ email verification rate
- [ ] 25%+ soft → full upgrade rate
- [ ] <5% spam account rate
- [ ] <1% content moderation flag rate
- [ ] 0 critical security incidents

---

**Prepared by:** M7 AI System  
**Date:** February 10, 2026  
**Version:** 1.0  
**Status:** ✅ Ready for Implementation

*Questions? Open an issue on GitHub or ping #fonana-soft-auth on Slack*
