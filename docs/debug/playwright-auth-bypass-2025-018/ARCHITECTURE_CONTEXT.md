# 🏗️ ARCHITECTURE_CONTEXT: Playwright Authentication Bypass 2025-018

## 📅 Дата: 18.01.2025  
## 🎯 Цель: Анализ архитектуры авторизации для создания контролируемого байпаса  
## 🔄 Статус: Complete Architecture Analysis

## 🔄 CURRENT AUTHENTICATION FLOW

### 1. Frontend Authentication Architecture
```mermaid
graph TD
    A[User] --> B[WalletProvider]
    B --> C[Connect Wallet]
    C --> D[Sign Message]
    D --> E[/api/auth/wallet]
    E --> F[JWT Generation]
    F --> G[StorageService Encryption]
    G --> H[localStorage]
    H --> I[AuthService]
    I --> J[AppProvider State]
    J --> K[Protected Components]
```

### 2. Component Protection Layer
```typescript
// Primary Protection: ClientShell.tsx
ClientShell
├── AppProvider (user state management)
├── AuthService (token management)
├── useUser() hook (authentication check)
└── Protected Route Logic
    ├── if (!user) → AuthenticationRequired
    ├── if (userLoading) → LoadingSpinner  
    └── if (user) → Render Children
```

### 3. Backend API Protection
```typescript
// API Route Protection Pattern
middleware.ts → NextAuth Session → API Handler
           ↓
JWT Verification → User Lookup → Route Access
           ↓
401 Unauthorized ← Invalid Token ← Missing Token
```

## 🗃️ DATA FLOW ANALYSIS

### Authentication State Management
```typescript
// AppProvider State Structure (lib/providers/AppProvider.tsx)
interface AppState {
  user: User | null              // Current authenticated user
  userLoading: boolean           // Loading state
  connected: boolean             // Wallet connection status  
  publicKey: PublicKey | null    // Solana wallet public key
  isInitialized: boolean         // App initialization complete
}

// User Object Structure (from database)
interface User {
  id: string                     // Primary key
  wallet: string                 // Solana wallet address
  nickname: string               // Display name
  fullName?: string              // Full name
  isCreator: boolean             // Creator permissions
  isVerified: boolean            // Verification status
  // ... other fields
}
```

### JWT Token Structure
```typescript
// JWT Payload (app/api/auth/wallet/route.ts)
interface JWTPayload {
  userId: string                 // User database ID
  wallet: string                 // Solana wallet address
  sub: string                    // Subject (userId duplicate)
  iat: number                    // Issued at timestamp
  exp: number                    // Expiration timestamp
}
```

### StorageService Encryption
```typescript
// Encrypted Token Storage (lib/services/StorageService.ts)
class StorageService {
  private secretKey: string      // AES encryption key
  
  encrypt(data: string): string  // AES-256-CBC encryption
  decrypt(data: string): string  // AES-256-CBC decryption
  
  getJWTToken(): JWTToken | null // Retrieve & decrypt token
  setJWTToken(token: JWTToken)   // Encrypt & store token
}
```

## 🔗 INTEGRATION POINTS

### 1. Database Layer (PostgreSQL + Prisma)
```typescript
// User Table Structure
model User {
  id            String   @id @default(cuid())
  wallet        String   @unique
  nickname      String   @unique
  fullName      String?
  isCreator     Boolean  @default(false)
  isVerified    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  posts         Post[]
  subscriptions Subscription[]
  // ... other relations
}
```

### 2. WebSocket Authentication
```typescript
// WebSocket Server (websocket-server/src/auth.js)
async function verifyToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET)
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  })
  return user
}
```

### 3. API Route Protection Pattern
```typescript
// Example: app/api/conversations/[id]/messages/route.ts
export async function POST(request: NextRequest) {
  // 1. Extract JWT from Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 })
  }

  // 2. Verify JWT token
  const token = authHeader.split(' ')[1]
  const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)

  // 3. Lookup user in database
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  })

  // 4. Proceed with authenticated request
  // ...
}
```

## 🛡️ SECURITY BOUNDARIES

### Environment Isolation
```typescript
// Current Environment Checks
process.env.NODE_ENV     // 'development' | 'production' | 'test'
process.env.NEXTAUTH_SECRET  // JWT signing secret
process.env.DATABASE_URL     // Database connection
```

### Authentication Boundaries  
```typescript
// Frontend Protection Levels
1. UI Component Level    → ClientShell, useUser() hook
2. API Route Level       → JWT verification middleware
3. Database Level        → User lookup and permissions
4. WebSocket Level       → Token verification on connect
```

### Current Protection Mechanisms
```typescript
// ClientShell Protection (components/ClientShell.tsx)
if (userLoading) {
  return <div className="loading-spinner">Loading...</div>
}

if (!user) {
  return <AuthenticationRequired />  // Blocks UI access
}

return <>{children}</>  // Allows protected content
```

## 🔧 TECHNICAL DEPENDENCIES

### Core Authentication Stack
```typescript
// Package Dependencies
- next-auth: "^4.x"          // Authentication framework
- @auth/prisma-adapter       // Database adapter
- jsonwebtoken: "^9.x"       // JWT operations
- crypto-js: "^4.x"          // Token encryption
- @solana/wallet-adapter-*   // Solana wallet integration
```

### State Management
```typescript
// Zustand Store (lib/store/appStore.ts)
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppStore {
  // User slice
  user: User | null
  setUser: (user: User | null) => void
  
  // ... other slices
}
```

### Database Connection
```typescript
// Prisma Client (lib/prisma.ts)
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()
```

## 🎯 BYPASS INTEGRATION POINTS

### 1. Frontend State Override
```typescript
// Target: lib/providers/AppProvider.tsx
// Strategy: Inject test user during initialization

useEffect(() => {
  // EXISTING: Load cached user
  const initializeApp = async () => {
    // [NEW] Check for Playwright test mode
    if (isPlaywrightTestMode()) {
      const testUser = getPlaywrightTestUser()
      setUser(testUser)
      return
    }
    
    // EXISTING: Normal auth flow
    const cachedUser = getCachedUser()
    if (cachedUser) setUser(cachedUser)
  }
}, [])
```

### 2. API Authentication Bypass
```typescript
// Target: API route protection middleware
// Strategy: Accept test tokens in development

async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  // [NEW] Check for Playwright test token
  if (isPlaywrightTestToken(authHeader)) {
    return getPlaywrightTestUser(authHeader)
  }
  
  // EXISTING: Normal JWT verification
  const decoded = jwt.verify(token, JWT_SECRET)
  return await prisma.user.findUnique({ where: { id: decoded.userId } })
}
```

### 3. Database Test User Seeding
```typescript
// Target: Database initialization
// Strategy: Ensure test users exist

async function seedTestUsers() {
  const testUsers = [
    {
      wallet: 'PLAYWRIGHT_ADMIN_WALLET',
      nickname: 'playwright_admin',
      isCreator: true,
      isVerified: true
    },
    {
      wallet: 'PLAYWRIGHT_USER_WALLET', 
      nickname: 'playwright_user',
      isCreator: false,
      isVerified: false
    }
  ]

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { wallet: user.wallet },
      update: user,
      create: user
    })
  }
}
```

## 📊 COMPONENT DEPENDENCIES

### Core Authentication Components
```typescript
- AppProvider.tsx           // Global state management
- ClientShell.tsx           // Route protection wrapper
- WalletProvider.tsx        // Solana wallet integration
- AuthService.ts            // Centralized auth operations
- StorageService.ts         // Encrypted token storage
- useUser.ts               // Authentication hook (inferred)
```

### Protection Layers
```typescript
1. Route Level Protection
   ├── middleware.ts (server-side)
   └── ClientShell.tsx (client-side)

2. Component Level Protection  
   ├── useUser() hook checks
   └── Conditional rendering

3. API Level Protection
   ├── JWT verification
   └── User permission checks
```

## 🔍 IDENTIFIED INTEGRATION CHALLENGES

### Challenge 1: Encrypted Token Storage
**Issue**: StorageService uses AES encryption for tokens
**Impact**: Can't simply inject tokens into localStorage
**Solution**: Use test environment decryption key or bypass encryption

### Challenge 2: State Initialization Timing
**Issue**: AppProvider initializes before test setup
**Impact**: Race condition between test injection and app init
**Solution**: Environment-based initialization delays

### Challenge 3: Database Seed Dependencies  
**Issue**: Test users must exist before token generation
**Impact**: Requires database setup in test pipeline
**Solution**: Upsert operations for idempotent seeding

### Challenge 4: WebSocket Authentication
**Issue**: WebSocket server requires valid JWT tokens
**Impact**: Real-time features won't work without auth
**Solution**: Test token support in WebSocket auth

## 📋 CHECKLIST COMPLETION

- [x] **Все компоненты проанализированы** (AppProvider, ClientShell, AuthService)
- [x] **Поток данных картирован** (JWT → Storage → State → UI)
- [x] **Зависимости выявлены** (NextAuth, Prisma, Zustand, Solana)
- [x] **Точки интеграции определены** (Frontend state, API middleware, Database)
- [x] **Все связи учтены** (WebSocket, Database, State management)
- [x] **Скрытые зависимости найдены** (StorageService encryption, timing issues)

## 🎯 NEXT STEPS

1. **SOLUTION_PLAN v1**: Design test user authentication approach
2. **IMPACT_ANALYSIS v1**: Assess risks and integration challenges  
3. **IMPLEMENTATION_SIMULATION v1**: Model the complete bypass flow

Архитектура готова к планированию решения. 