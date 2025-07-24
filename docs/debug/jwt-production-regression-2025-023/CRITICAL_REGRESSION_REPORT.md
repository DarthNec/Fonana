# CRITICAL REGRESSION: JWT Timing Race Condition Returns
**Date**: 2025-01-23  
**Regression ID**: jwt-production-regression-2025-023  
**Severity**: CRITICAL  
**Status**: ACTIVE  

## INCIDENT SUMMARY
После успешного deployment в production mode возникла критическая регрессия в messages system. JWT timing race condition вернулась и вызывает React Error #185.

## REGRESSION SYMPTOMS  
- ✅ **Previous State**: JWT timing решена в development (Memory ID: 4167122)
- ❌ **Current State**: Messages dialog crash в production
- ❌ **React Error**: Minified React error #185 (unmounted component state update)
- ❌ **User Impact**: "Something went wrong, Please refresh the page"

## ERROR ANALYSIS

### React Error #185 Details
```javascript
// React Error #185 = Cannot update state on unmounted component
// URL: https://reactjs.org/docs/error-decoder.html?invariant=185
```

### Console Evidence
```javascript
[AppStore] setJwtReady: false                    // ✅ JWT Ready system working
[AppProvider] Creating JWT token for wallet...   // ✅ JWT creation starts
// ❌ THEN: React Error #185 during state update
[AppProvider] Cleaning up...                     // ❌ Component unmounting
[Navbar] Unsubscribing from unread messages...   // ❌ Cleanup happening
```

### Call Stack Pattern  
```javascript
Error at:
- ni (fd9d1056-b9e697450728d1d0.js:1:25782)     // Minified React setState
- na (fd9d1056-b9e697450728d1d0.js:1:25370)     // Component updater
- r$ → rA → aI → a3 → a5 → a8                   // React reconciliation
```

## ROOT CAUSE HYPOTHESIS

### Production vs Development Differences
```bash
# Development Mode (WORKING):
- Non-minified code с clear error messages
- Different React timing behavior  
- Hot Module Replacement может маскировать race conditions
- Webpack dev server timing

# Production Mode (BROKEN):
- Minified code - error messages скрыты
- Optimized React reconciliation  
- Static builds may change timing
- Different component lifecycle timing
```

### JWT Race Condition Pattern
1. **User navigates** to `/messages/[id]`
2. **MessagesPageClient** mounts, зависит от `[user?.id, isJwtReady]`
3. **AppProvider** starts JWT creation асинхронно  
4. **Component unmounts** быстрее чем JWT ready в production
5. **setState attempted** на unmounted component → React Error #185

## M7 IDEAL METHODOLOGY APPROACH

### 1. DISCOVER 
**Objective**: Понять почему JWT timing работает в dev но не в production

### 2. INVESTIGATE
**Comparison Areas**:
- Next.js build optimizations влияющие на component timing
- React StrictMode behavior в production vs development
- JWT token creation speed differences
- Component mount/unmount lifecycle changes

### 3. EXTRACT EVIDENCE  
**Methods**:
- Playwright MCP для воспроизведения exact user flow
- Console timing analysis
- Component lifecycle debugging
- Memory Bank review предыдущего решения

### 4. ANALYZE PATTERNS
**Focus**: Production build влияние на асинхронный component lifecycle

### 5. LEARN FROM MEMORY
**Previous Solution**: useJwtReady() hook решил timing в development [[memory:4167122]]

### 6. STRATEGIC SOLUTION
**Goal**: Адаптировать JWT Ready system для production environment

### 7. METHODICAL IMPLEMENTATION
**Validation**: Playwright MCP testing в production mode

## IMMEDIATE PRIORITIES
1. 🔥 Воспроизвести regression с Playwright MCP
2. 🔥 Проанализировать production vs dev timing differences  
3. 🔥 Исправить JWT Ready system для production compatibility
4. 🔥 Deploy hotfix и validate в production

## CONTEXT FROM MEMORY BANK
- **Previous Success**: JWT timing race condition решена за 25 минут [[memory:4167122]]
- **Solution Applied**: useJwtReady() hook с centralized state management
- **Pattern**: [user?.id, isJwtReady] dependencies в useEffect
- **Production Change**: npm run dev → npm start may have affected timing

## HIGH-LEVEL THEORY
Production build оптимизации изменили component lifecycle timing, breaking асинхронный JWT Ready pattern который работал в development mode.

## NEXT ACTIONS
Немедленно применить M7 systematic approach для быстрого hotfix deployment. 