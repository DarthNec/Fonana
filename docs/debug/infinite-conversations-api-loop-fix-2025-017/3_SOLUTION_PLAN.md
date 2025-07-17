# 📋 SOLUTION PLAN v1: Infinite Conversations API Loop Fix

## 📅 Дата: 17.01.2025
## 🏷️ ID: [infinite_loop_2025_017]
## 🚀 Версия: 1.0

---

## 🎯 Objectives

1. **Immediate**: Stop infinite API calls (0 calls after fix)
2. **Short-term**: Prevent similar crashes via error boundaries  
3. **Long-term**: Improve architecture resilience

---

## 📊 Success Metrics

- ✅ API calls to `/api/conversations`: 0 per minute (down from 600+)
- ✅ Console errors: 0 (down from 8+)
- ✅ Page stability: No re-renders after mount
- ✅ User experience: Smooth loading, no flashing

---

## 🔧 Phase 1: Emergency Fix (5 minutes)

### Step 1.1: Fix Missing Import
**File**: `app/messages/[id]/page.tsx`
**Line**: 1
```typescript
// Before
import { useState, useEffect, useRef } from 'react'

// After
import { useState, useEffect, useRef, useCallback } from 'react'
```

### Step 1.2: Fix Early publicKey Access
**File**: `app/messages/[id]/page.tsx`  
**Line**: 49
```typescript
// Move inside component or add null check
const ConversationPage = () => {
  const wallet = useWallet()
  const { publicKey, sendTransaction } = wallet || {}
  // Rest of component
}
```

### Expected Result
- Circuit breaker starts working
- useCallback errors disappear
- Component renders without crashing

---

## 🛡️ Phase 2: Add Error Boundaries (10 minutes)

### Step 2.1: Create Error Boundary Component
**File**: `components/ErrorBoundary.tsx`
```typescript
'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error }>
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback
      if (Fallback) {
        return <Fallback error={this.state.error!} />
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please refresh the page to try again</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Step 2.2: Wrap Messages Pages
**File**: `app/messages/layout.tsx` (create if not exists)
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
```

---

## 🔄 Phase 3: Verify Circuit Breaker (5 minutes)

### Step 3.1: Add Logging
```typescript
const checkCircuitBreaker = useCallback((endpoint: string) => {
  console.log(`[Circuit Breaker] Checking ${endpoint}:`, {
    callCount: circuitBreakerState.callCount,
    isBlocked: circuitBreakerState.isBlocked,
    blockUntil: new Date(circuitBreakerState.blockUntil)
  })
  // ... rest of function
}, [circuitBreakerState])
```

### Step 3.2: Test Scenarios
1. Normal load - should allow first call
2. Rapid refreshes - should block after 10 calls
3. Wait 60 seconds - should reset and allow again

---

## 💾 Phase 4: State Persistence (Optional, 10 minutes)

### Step 4.1: Persist Circuit Breaker State
```typescript
// Save to sessionStorage to survive page refreshes
useEffect(() => {
  sessionStorage.setItem(
    'circuitBreaker_conversations',
    JSON.stringify(circuitBreakerState)
  )
}, [circuitBreakerState])

// Load on mount
const [circuitBreakerState, setCircuitBreakerState] = useState(() => {
  const saved = sessionStorage.getItem('circuitBreaker_conversations')
  if (saved) {
    const parsed = JSON.parse(saved)
    return {
      ...parsed,
      lastResetTime: Date.now() // Reset time on new session
    }
  }
  return {
    callCount: 0,
    lastResetTime: Date.now(),
    isBlocked: false,
    blockUntil: 0
  }
})
```

---

## 🧪 Testing Plan

### Manual Testing via Playwright
```typescript
// Test 1: Normal flow
await page.goto('http://localhost:3000/messages/1')
await page.waitForTimeout(5000)
const requests = await browser_network_requests()
// Verify no /api/conversations calls

// Test 2: Error recovery
await page.evaluate(() => {
  throw new Error('Test error')
})
// Verify error boundary catches it

// Test 3: Circuit breaker
for (let i = 0; i < 15; i++) {
  await page.reload()
  await page.waitForTimeout(100)
}
// Verify blocking after 10 attempts
```

---

## 📋 Implementation Order

1. **Fix imports** → Immediate relief
2. **Add error boundary** → Prevent cascading  
3. **Test with Playwright** → Verify success
4. **Add persistence** → Improve UX (optional)

---

## 🚨 Rollback Plan

If issues persist:
1. Comment out circuit breaker code temporarily
2. Simplify loadConversationInfo to basic version
3. Add manual rate limiting with simple counter

---

## 🔗 Integration with Context7

### Verify React Patterns
- Check latest React 18 docs for useCallback
- Verify error boundary patterns for Next.js 14
- Review Suspense boundaries for future improvement

---

## ✅ Pre-Implementation Checklist

- [x] All changes are minimal and focused
- [x] Each phase can be tested independently
- [x] Rollback plan exists
- [x] No breaking changes to API contracts
- [x] Error handling improved, not just patched

**Next Step**: Create IMPACT_ANALYSIS.md to assess risks 