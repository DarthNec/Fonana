# ARCHITECTURE CONTEXT
**Task ID:** react-error-185-persistence-analysis-2025-024  
**Route:** MEDIUM  
**Date:** 2025-01-24  
**Status:** ROOT_CAUSE_IDENTIFIED  

## 🎯 ROOT CAUSE НАЙДЕН!

### КРИТИЧЕСКАЯ ПРОБЛЕМА: AppProvider useEffect Dependencies

**Файл:** `lib/providers/AppProvider.tsx`

**ПРОБЛЕМНЫЙ КОД:**
```typescript:52-58
// Debug логирование - ВЫПОЛНЯЕТСЯ ПОСТОЯННО!
useEffect(() => {
  console.log('[AppProvider][Debug] State update:', {
    user: user?.id ? `User ${user.id}` : 'No user',
    userLoading, connected, publicKey, isInitialized
  })
}, [user, userLoading, connected, publicKey, isInitialized])
      ↑↑↑ UNSTABLE DEPENDENCY: publicKey меняется каждый render!
```

**ВТОРАЯ ПРОБЛЕМА:**
```typescript:114-165
// JWT useEffect - ЗАВИСИТ ОТ НЕСТАБИЛЬНЫХ ЗНАЧЕНИЙ!
useEffect(() => {
  if (!isStable || initializationPhase !== 'stable') return
  
  if (connected && publicKey && isInitialized) {
    ensureJWTTokenForWallet(publicKey.toBase58()) // ← API CALL!
  }
}, [connected, publicKey, isInitialized, isStable, initializationPhase])
        ↑↑↑ publicKey вызывает постоянные перезапуски
```

## 🔄 INFINITE LOOP MECHANISM

### 1. **publicKey Instability**
```javascript
// Каждый render кошелька создает новый объект publicKey
const { publicKey } = useWallet() // ← НОВЫЙ ОБЪЕКТ КАЖДЫЙ РАЗ!

// AppProvider useEffect dependencies
[connected, publicKey, isInitialized, isStable, initializationPhase]
             ↑↑↑ Triggers re-run каждый раз
```

### 2. **Cascade Effect**
```
publicKey changes → AppProvider useEffect runs → ensureJWTTokenForWallet() → 
API calls → Component tree re-renders → Child components useEffect → 
/api/creators calls → WalletStoreSync triggers → publicKey changes → LOOP!
```

### 3. **API Call Chain**
```typescript
// AppProvider создает JWT → вызывает API calls
ensureJWTTokenForWallet() → fetch('/api/auth/wallet') → setUser() → 
Component re-renders → Child components react → fetchCreators() → 
[API] Simple creators API called → Server flooding
```

## 📊 AFFECTED COMPONENTS MAP

### **Primary Loop Initiator**
- ✅ **`AppProvider.tsx`** - MAIN CULPRIT
  - `useEffect([publicKey])` - unstable dependency
  - Debug logging useEffect floods console
  - JWT creation triggers cascading re-renders

### **Secondary Loop Participants**  
- **`WalletStoreSync.tsx`** - Updates wallet state
- **`CreatorsExplorer.tsx`** - Re-runs `fetchCreators()` useEffect
- **`FeedPageClient.tsx`** - `useOptimizedPosts()` triggers API calls
- **`DashboardPageClient.tsx`** - `fetchDashboardData()` runs repeatedly

### **API Endpoints Affected**
- `/api/creators` - Called infinitely ([API] Simple creators API called)
- `/api/auth/wallet` - JWT creation calls from AppProvider  
- `/api/posts` - Feed data fetching
- `/api/user/notifications` - Notification updates

## 🔧 TECHNICAL ANALYSIS

### **publicKey Object Instability**
```typescript
// @solana/wallet-adapter hook returns NEW object every render
const { publicKey } = useWallet()

// Solution: Use string representation for dependencies
const publicKeyString = publicKey?.toBase58()
```

### **useEffect Dependency Problems**
```typescript
// ❌ PROBLEMATIC: Object reference changes
}, [connected, publicKey, isInitialized])

// ✅ SOLUTION: Stable primitive values  
}, [connected, publicKey?.toBase58(), isInitialized])
```

### **Debug Logging Impact**
```typescript
// ❌ FLOODS CONSOLE and triggers re-renders
useEffect(() => {
  console.log('[AppProvider][Debug] State update:', ...)
}, [user, userLoading, connected, publicKey, isInitialized])

// ✅ SOLUTION: Remove from production or use stable deps
```

## 🚀 SOLUTION STRATEGY

### **Phase 1: Fix publicKey Dependencies**
1. Replace `publicKey` with `publicKey?.toBase58()` in ALL useEffect dependencies
2. Remove debug logging useEffect from production 
3. Add useMemo for stable publicKey string

### **Phase 2: Optimize JWT Logic**  
1. Add debounce to `ensureJWTTokenForWallet()`
2. Implement caching to prevent duplicate JWT creation calls
3. Use stable dependencies only

### **Phase 3: Component Cascade Prevention**
1. Add circuit breakers to prevent infinite API calls
2. Implement component-level API call debouncing
3. Optimize child component useEffect patterns

## 📈 EXPECTED RESULTS

### **Before Fix:**
```bash
# Server flooding
[API] Simple creators API called  
[API] Found 55 creators
[API] Simple creators API called  
[API] Found 55 creators
# ... every ~500ms
```

### **After Fix:**
```bash  
# Normal API behavior
[API] Simple creators API called
[API] Found 55 creators
# ... only when needed
```

## ⚠️ IMPLEMENTATION REQUIREMENTS

1. **Minimal change approach** - targeted fix только AppProvider dependencies
2. **Backward compatibility** - M7 infrastructure остается intact
3. **Production testing** - verify fix в production environment  
4. **Performance monitoring** - track API call frequency reduction

## 🎯 SUCCESS METRICS

- **API call reduction:** From infinite to <10 calls/minute
- **Console log reduction:** From flooding to minimal debug info
- **Component stability:** No unnecessary re-renders
- **User experience:** Maintain all functionality, improve performance 