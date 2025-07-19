# 🔍 DISCOVERY_REPORT: Playwright Authentication Bypass 2025-018

## 📅 Дата: 18.01.2025  
## 🎯 Цель: Создание контролируемого байпаса авторизации для Playwright тестирования  
## 🔄 Статус: Complete Discovery Phase

## 🕵️ BROWSER EXPLORATION FINDINGS

### Current Authentication State
- **URL**: http://localhost:3000 
- **Status**: Пользователь НЕ авторизован
- **JWT Token**: `[JWT] No token found in localStorage`
- **Wallet Status**: `connected: false, publicKey: No publicKey`
- **UI Element**: Кнопка "Connect" для подключения Phantom кошелька

### Protected Page Behavior (/dashboard)
- **Result**: Страница загружается, но контент СКРЫТ
- **Main Element**: Полностью пустой `<main>` 
- **Error**: `[StorageService] Decryption failed: Malformed UTF-8 data`
- **Conclusion**: Есть frontend protection логика, а не server-side redirect

### Console Evidence
```javascript
[ERROR] [StorageService] Decryption failed: Error: Malformed UTF-8 data
[LOG] [JWT] No token found in localStorage
[LOG] connected: false, publicKey: No publicKey
[LOG] [WebSocket] Auto-connect disabled for emergency stabilization
```

## 🔍 CONTEXT7 ANALYSIS

### NextAuth Documentation Review
- **Current System**: NextAuth + Solana Wallet integration  
- **Session Strategy**: JWT-based (`strategy: 'jwt'`)
- **Adapter**: PrismaAdapter for database storage
- **Providers**: GitHub (for development) + Solana wallet (production)

### Playwright Best Practices
- **Testing Authentication**: Multiple approaches available
  1. **API Token Injection** - fastest, for API testing
  2. **Cookie/LocalStorage Manipulation** - frontend focused
  3. **Test User Accounts** - full flow simulation
  4. **Authentication State Mocking** - component-level

### Existing JWT Infrastructure
- **JWT Manager**: `lib/utils/jwt.ts` - token lifecycle management
- **AuthService**: `lib/services/AuthService.ts` - centralized auth operations  
- **StorageService**: Encrypted token storage with AES
- **API Route**: `/api/auth/wallet` - token generation and verification

## 📊 ALTERNATIVE APPROACHES ANALYSIS

### Approach 1: Test User Accounts ⭐ **RECOMMENDED**
**Concept**: Create dedicated test users with persistent credentials
```typescript
// Test users in database
const TEST_USERS = {
  playwright_admin: { wallet: 'TEST_WALLET_1', isCreator: true },
  playwright_user: { wallet: 'TEST_WALLET_2', isCreator: false }
}
```

**Pros**: 
- ✅ Real authentication flow
- ✅ Tests actual user permissions  
- ✅ No security compromise
- ✅ Database relationships work

**Cons**:
- ⚠️ Requires database seeding
- ⚠️ Slightly slower than mocking

### Approach 2: Development Mode Bypass
**Concept**: Environment-based authentication skip
```typescript
if (process.env.NODE_ENV === 'test' && process.env.PLAYWRIGHT_BYPASS) {
  // Skip authentication requirements
  return { authenticated: true, user: TEST_USER }
}
```

**Pros**:
- ✅ Simple implementation
- ✅ Zero security risk in production
- ✅ Fast execution

**Cons**:
- ⚠️ Doesn't test real auth flow
- ⚠️ May miss authentication bugs

### Approach 3: API Token Injection
**Concept**: Direct JWT token injection for API testing
```typescript
// Generate valid JWT for test scenarios
const testToken = generateTestJWT(TEST_USER_ID)
await page.evaluate(token => {
  localStorage.setItem('auth_token', token)
}, testToken)
```

**Pros**:
- ✅ Very fast
- ✅ Direct API testing
- ✅ No UI dependencies

**Cons**:
- ⚠️ Skips frontend validation
- ⚠️ Limited for UI testing

## 🧪 PROTOTYPES CREATED

### Prototype 1: Test User Authentication
```typescript
// Located: scripts/create-test-users.js
async function createTestUsers() {
  const users = [
    {
      wallet: 'PLAYWRIGHT_TEST_WALLET_1',
      nickname: 'playwright_admin',
      isCreator: true,
      isVerified: true
    },
    {
      wallet: 'PLAYWRIGHT_TEST_WALLET_2', 
      nickname: 'playwright_user',
      isCreator: false,
      isVerified: false
    }
  ]
  
  for (const user of users) {
    await prisma.user.upsert({
      where: { wallet: user.wallet },
      update: user,
      create: user
    })
  }
}
```

### Prototype 2: Bypass Environment Check
```typescript
// Located: lib/auth/playwright-bypass.ts
export function checkPlaywrightBypass(): boolean {
  if (typeof window === 'undefined') return false
  
  return process.env.NODE_ENV === 'development' && 
         window.location.search.includes('playwright_bypass=true')
}

export function getTestUser(): User | null {
  if (!checkPlaywrightBypass()) return null
  
  return {
    id: 'playwright_user_id',
    wallet: 'PLAYWRIGHT_TEST_WALLET',
    nickname: 'playwright_test',
    isCreator: true,
    isVerified: true
  }
}
```

### Prototype 3: JWT Test Helper
```typescript
// Located: lib/test/jwt-helpers.ts  
export async function generateTestJWT(userId: string): Promise<string> {
  const payload = {
    userId,
    wallet: `TEST_WALLET_${userId}`,
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }
  
  return jwt.sign(payload, process.env.NEXTAUTH_SECRET)
}

export async function injectTestAuth(page: Page, userType: 'admin' | 'user') {
  const userId = userType === 'admin' ? 'test_admin' : 'test_user'
  const token = await generateTestJWT(userId)
  
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token)
    window.dispatchEvent(new Event('auth-changed'))
  }, token)
}
```

## 🎯 EXISTING PATTERNS DISCOVERY

### Authentication Protection Logic
```typescript
// Found in: components/ClientShell.tsx
const { user, userLoading } = useUser()

if (userLoading) return <LoadingSpinner />
if (!user) return <AuthenticationRequired />

return <>{children}</>
```

### User Hook Implementation
```typescript
// Found in: lib/hooks/useUser.ts (inferred)
const useUser = () => {
  const { user, userLoading } = useAppStore()
  return { user, userLoading, isAuthenticated: !!user }
}
```

### JWT Validation Pattern
```typescript
// Found in: app/api/auth/wallet/route.ts
const authHeader = req.headers.get('authorization')
if (!authHeader?.startsWith('Bearer ')) {
  return NextResponse.json({ error: 'No token provided' }, { status: 401 })
}

const decoded = jwt.verify(token, JWT_SECRET)
```

## 💡 BEST PRACTICES IDENTIFIED

### Security Considerations
- ✅ **Environment Isolation**: Bypass only in development/test modes
- ✅ **Clear Naming**: Obvious test-only functionality
- ✅ **Cleanup**: Automatic test data cleanup
- ✅ **Audit Trail**: Log all bypass usage

### Testing Strategy  
- ✅ **User Role Testing**: Admin vs regular user scenarios
- ✅ **Permission Boundaries**: Test access control
- ✅ **API Integration**: Backend + frontend validation
- ✅ **State Management**: Authenticated state consistency

### Implementation Principles
- ✅ **Non-Intrusive**: Minimal impact on production code
- ✅ **Maintainable**: Easy to understand and modify
- ✅ **Reliable**: Consistent test results
- ✅ **Fast**: Quick setup and teardown

## 📋 CHECKLIST COMPLETION

- [x] **Context7 executed** для NextAuth, Playwright, JWT
- [x] **3+ альтернативы исследованы** (Test Users, Bypass, Token Injection)  
- [x] **Прототипы созданы** и протестированы в изолированной среде
- [x] **Best practices documented** из официальных источников
- [x] **Precedents analyzed** в существующем коде
- [x] **Playwright MCP exploration completed** ✅
- [x] **Browser screenshots/snapshots collected** ✅  
- [x] **Network/console logs analyzed** ✅

## 🎯 RECOMMENDATION

**Выбран Approach 1: Test User Accounts** как наиболее enterprise-ready решение:

1. **Безопасность**: Полная изоляция от production
2. **Реализм**: Тестирует реальный authentication flow  
3. **Гибкость**: Поддержка различных user roles
4. **Надежность**: Стабильные и предсказуемые тесты

Следующий шаг: создание ARCHITECTURE_CONTEXT для детального планирования. 