# 🏗️ ARCHITECTURE CONTEXT: Messages JWT Flow Architecture

## 📅 Дата: 23.01.2025
## 🎯 Scope: Complete JWT Token Flow Analysis  
## 🔄 Статус: Architecture Analysis Phase

---

## 🌐 SYSTEM ARCHITECTURE OVERVIEW

### **High-Level JWT Flow Architecture**
```mermaid
graph TD
    A[User Connects Wallet] --> B[WalletProvider]
    B --> C[AppProvider detects connection]
    C --> D[ensureJWTTokenForWallet ASYNC]
    D --> E[/api/auth/wallet POST]
    E --> F[JWT Token Created]
    F --> G[localStorage: fonana_jwt_token]
    G --> H[User State Updated]
    H --> I[Components Trigger useEffect]
    I --> J[jwtManager.getToken]
    J --> K{Token Available?}
    K -->|Yes| L[API Calls Succeed]
    K -->|No| M[❌ No JWT token available]
    
    style D fill:#ffcc99
    style M fill:#ff9999
```

### **Critical Timing Issue Identified**:
- **AppProvider**: Async token creation (~200-500ms)
- **MessagesPageClient**: Immediate useEffect trigger when user?.id available
- **Race Condition**: Component tries to use token before it's created

---

## 🔧 COMPONENT ARCHITECTURE ANALYSIS

### **1. AppProvider (JWT Token Creator)**
```typescript
// lib/providers/AppProvider.tsx
Location: Root level provider in ClientShell
Role: JWT token lifecycle management
Dependencies: useWallet(), useAppStore()

Flow:
connected + publicKey + isInitialized → ensureJWTTokenForWallet()
↓
Async fetch('/api/auth/wallet') → Response with token
↓  
localStorage.setItem('fonana_jwt_token', tokenData)
↓
setUser(data.user) → Triggers global state update
```

**Timing Characteristics**:
- **Token Creation**: 200-500ms (network request)
- **localStorage Write**: Synchronous  
- **State Update**: Immediate after token creation
- **Component Notification**: Through Zustand store

### **2. MessagesPageClient (JWT Token Consumer)**
```typescript
// components/MessagesPageClient.tsx
Location: /messages page component
Role: Conversations list display
Dependencies: useUser(), jwtManager

Flow:
user?.id available → useEffect triggers
↓
loadConversations() → jwtManager.getToken()
↓
localStorage.getItem('fonana_jwt_token') → null (race condition)
↓
'No JWT token available' error
```

**Dependency Chain**:
- `user?.id` → AppProvider state  
- `jwtManager.getToken()` → localStorage read
- **Problem**: user?.id available BEFORE localStorage has token

### **3. JWTManager (Token Access Layer)**
```typescript
// lib/utils/jwt.ts
Location: Utility singleton
Role: Token storage and retrieval
Dependencies: localStorage, StorageService

Token Resolution Logic:
1. Check this.token (memory) → null on first run
2. Check localStorage → null during race condition
3. Check 'fonana_user_wallet' → wallet address found
4. requestNewToken(wallet) → Creates DUPLICATE token request
```

**Race Condition Details**:
- **AppProvider**: Creates token via ensureJWTTokenForWallet()
- **JWTManager**: Creates token via requestNewToken()  
- **Result**: Duplicate API calls to /api/auth/wallet

---

## 🔄 DATA FLOW MAPPING

### **AppProvider State Management**
```typescript
// State Flow in AppProvider
Wallet Connection Event
↓
useEffect([connected, publicKey, isInitialized])
↓  
ensureJWTTokenForWallet(walletAddress)
↓
[ASYNC 200-500ms] fetch('/api/auth/wallet') 
↓
Response: { token, user }
↓
localStorage.setItem('fonana_jwt_token', ...)
↓
setUser(data.user) // Zustand store update
↓
All useUser() hooks update → Components re-render
```

### **MessagesPageClient Dependency Flow**
```typescript
// Component Effect Flow
useUser() → user object from Zustand
↓
user?.id becomes available → useEffect triggers
↓
loadConversations() called immediately
↓
jwtManager.getToken() → localStorage read
↓
Token not found → Error state
```

### **Critical Gap Identified**:
**Gap**: No synchronization between JWT creation completion and component token access

---

## 🔗 COMPONENT INTEGRATION POINTS

### **Integration Point 1: Wallet Connection → JWT Creation**
```typescript
// AppProvider.tsx:90-95
useEffect(() => {
  if (connected && publicKey && isInitialized) {
    console.log('[AppProvider] Wallet connected, ensuring JWT token exists...')
    ensureJWTTokenForWallet(publicKey.toBase58()) // ← ASYNC
  }
}, [connected, publicKey, isInitialized])
```

**Status**: ✅ Functioning correctly

### **Integration Point 2: JWT Creation → User State**
```typescript
// AppProvider.tsx:120-135
if (data.token && data.user) {
  // Save to localStorage
  localStorage.setItem('fonana_jwt_token', JSON.stringify(tokenData))
  
  // Update global state
  if (!user) {
    setUser(data.user) // ← Triggers component updates
  }
}
```

**Status**: ✅ Functioning correctly

### **Integration Point 3: User State → Component Effects**
```typescript
// MessagesPageClient.tsx:35-40
useEffect(() => {
  if (!user?.id) {
    setIsLoading(false)
    return
  }
  loadConversations() // ← Called too early
}, [user?.id])
```

**Status**: ❌ **BROKEN** - Race condition here

### **Integration Point 4: Component → JWT Access**
```typescript  
// MessagesPageClient.tsx:45-55
const loadConversations = async () => {
  const token = await jwtManager.getToken()
  
  if (!token) {
    console.error('[MessagesPageClient] No JWT token available')
    setError('Authentication required')
    return
  }
}
```

**Status**: ❌ **BROKEN** - Token not ready

---

## 📊 ZUSTAND STORE INTEGRATION

### **Store Architecture**:
```typescript
// lib/store/appStore.ts
interface AppStore {
  user: User | null          // ← Set by AppProvider after JWT creation
  userLoading: boolean       // ← Managed by AppProvider
  setUser: (user) => void    // ← Triggers all useUser() updates
}

// Store Subscription Pattern:
useUser() → store.user
↓
When setUser() called → All components re-render
↓
MessagesPageClient useEffect → user?.id dependency
```

### **State Timing Analysis**:
```
T0: Wallet connects
T1: AppProvider starts JWT creation (ASYNC)
T2: setUser() called → user?.id available
T3: MessagesPageClient useEffect triggers  
T4: loadConversations() → jwtManager.getToken() → null
T5: [ERROR] 'No JWT token available'
T6: AppProvider JWT creation completes (too late)
```

**Problem**: T2-T3 happens BEFORE T6

---

## 🛠️ EXISTING SOLUTIONS IN CODEBASE

### **Circuit Breaker Pattern (ConversationPage)**
Found in `/messages/[id]/page.tsx`:
```typescript
const [circuitBreakerState, setCircuitBreakerState] = useState({
  callCount: 0,
  lastResetTime: Date.now(),
  isBlocked: false,
  blockUntil: 0
})

const checkCircuitBreaker = useCallback(() => {
  // Rate limiting: max 10 calls per minute
  if (callCount >= 10) {
    setCircuitBreakerState(prev => ({ ...prev, isBlocked: true }))
    return false
  }
  return true
}, [circuitBreakerState])
```

**Purpose**: Prevents API abuse from infinite loops
**Status**: Working, but treating symptoms not root cause

### **JWT Token Validation Pattern**
Found in API routes:
```typescript
// app/api/conversations/route.ts:10-20
const authHeader = request.headers.get('authorization')
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return NextResponse.json({ error: 'No token provided' }, { status: 401 })
}

const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
```

**Status**: ✅ Working correctly

---

## 🚨 ARCHITECTURAL WEAKNESSES IDENTIFIED

### **1. No JWT Ready State**
**Problem**: Components cannot determine when JWT token is ready
**Impact**: Race conditions in all JWT-dependent components
**Scope**: Affects any component needing API authentication

### **2. Duplicate Token Creation Logic**
**Problem**: Both AppProvider and JWTManager can create tokens independently
**Impact**: Unnecessary API calls, potential conflicts
**Risk**: Token inconsistency, performance overhead

### **3. Missing Synchronization Primitives**
**Problem**: No coordination between async JWT creation and component usage
**Impact**: Unreliable component initialization
**Pattern**: Classic async/await coordination issue

### **4. useEffect Dependency Issues**
**Problem**: Components depend on `user?.id` instead of JWT availability
**Impact**: Components trigger before authentication ready
**Anti-pattern**: State dependency instead of capability dependency

---

## 📋 COMPONENT INTERACTION MAP

### **Primary Components**:
```
AppProvider (JWT Creator)
├── useWallet() → Wallet connection state
├── useAppStore() → Global state management  
├── ensureJWTTokenForWallet() → Token creation
└── setUser() → Triggers component updates

MessagesPageClient (JWT Consumer)
├── useUser() → Depends on AppProvider state
├── useEffect([user?.id]) → Triggers on state change
├── jwtManager.getToken() → Accesses localStorage
└── loadConversations() → Requires JWT token

JWTManager (Token Access)
├── getToken() → Main access method
├── localStorage access → Token persistence
├── requestNewToken() → Backup token creation
└── Race condition with AppProvider
```

### **Data Dependencies**:
```
Wallet Connection → AppProvider.isInitialized
AppProvider.isInitialized → JWT Creation
JWT Creation → localStorage.fonana_jwt_token  
localStorage → jwtManager.getToken()
AppProvider.setUser() → useUser()
useUser() → MessagesPageClient.useEffect
```

**Critical Path**: The longest dependency chain creates the timing issue

---

## 🎯 SOLUTION ARCHITECTURE REQUIREMENTS

### **Requirements Identified**:

1. **JWT Ready Signal**: Components need to know when JWT is available
2. **Coordination Mechanism**: Sync between AppProvider and components
3. **Race Condition Prevention**: Avoid duplicate token creation
4. **Error Recovery**: Handle token creation failures gracefully

### **Architecture Constraints**:

1. **Minimal Changes**: Avoid major refactoring of existing components
2. **Performance**: No polling or frequent checks
3. **Reliability**: Must work consistently across different timing scenarios
4. **Backward Compatibility**: Don't break existing JWT-dependent components

---

## 📊 COMPARISON WITH WORKING COMPONENTS

### **Components That Work With JWT**:
- CreatorPageClient: Uses manual token checks
- PurchaseModal: Includes error handling for missing tokens  
- PostPageClient: Has retry logic for token availability

### **Success Patterns Found**:
```typescript
// Working pattern from CreatorPageClient:
const handleStartConversation = async () => {
  try {
    const token = await jwtManager.getToken()
    if (!token) {
      toast.error('No authentication token')
      return // ← Graceful failure
    }
    // Proceed with API call
  } catch (error) {
    toast.error('Authentication failed')
  }
}
```

**Key Difference**: Manual token checks with error handling vs automatic useEffect triggering

---

**Architecture Analysis Status**: ✅ **COMPLETE**
**Next Phase**: Solution Plan Design 