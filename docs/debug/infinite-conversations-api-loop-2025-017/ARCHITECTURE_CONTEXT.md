# 🏗️ ARCHITECTURE CONTEXT: Infinite Conversations API Loop

**Date:** 17.07.2025  
**ID:** [infinite_conversations_api_loop_2025_017]  
**Scope:** Critical infinite loop in /api/conversations  
**Methodology:** Идеальная Методология M7  

## 📊 PROBLEM SUMMARY

### 🚨 Critical Issue
**Infinite loop** with `/api/conversations` API calls occurring **every ~100ms**, causing:
- Server overload (195+ consecutive requests observed)
- Database stress on PostgreSQL  
- Poor application performance
- User experience degradation

### 🎯 Expected vs Actual Behavior
- **Expected:** API calls only when user navigates to messages or periodic polling (10-second intervals)
- **Actual:** Continuous API calls every ~100ms regardless of user actions

## 🔍 TECHNICAL ARCHITECTURE ANALYSIS

### 🌐 Current URL State
- **Browser URL:** `http://localhost:3000/messages`
- **Active Component:** `MessagesPageClient.tsx` (simple, no API calls)
- **Expected API calls:** None from this component

### 🔧 API Architecture

#### `/api/conversations/route.ts` (Source of logs)
**Function:** Returns user's conversation list
**Current behavior:** 
```log
[Conversations API] Starting GET request
[Conversations API] Token verified: cmbymuez00004qoe1aeyoe7zf
[Conversations API] Fetching user by ID...
[Conversations API] User found: cmbymuez00004qoe1aeyoe7zf lafufu
[Conversations API] Fetching conversations...
[Conversations API] Found conversation IDs: 0
[Conversations API] No conversations found for user
```

**Response:** `{ conversations: [] }` (200 OK)
**Performance:** ~500ms per request (normal)

### 🔄 API Call Sources Identified

#### 1. `components/BottomNav.tsx` (Lines 60-90)
```typescript
useEffect(() => {
  const checkUnreadMessages = async () => {
    // ... API call to /api/conversations
  }
  
  if (user) {
    checkUnreadMessages()
    const interval = setInterval(checkUnreadMessages, 10000) // 10 seconds
    return () => clearInterval(interval)
  }
}, [user])
```
**Status:** ✅ Normal behavior (10-second intervals)

#### 2. `components/Navbar.tsx` (Lines 60-100)
```typescript
useEffect(() => {
  // ... similar pattern
  const interval = setInterval(checkUnreadMessages, 10000) // 10 seconds
}, [user])
```
**Status:** ✅ Normal behavior (10-second intervals)

#### 3. `app/messages/[id]/page.tsx` (Lines 185-220) 🔴
```typescript
const loadConversationInfo = async () => {
  const response = await fetch('/api/conversations', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  // ...
}

// Called from loadMessages() when no participant info
if (!otherParticipant) {
  loadConversationInfo() // 🚨 POTENTIAL INFINITE LOOP
}
```

**Polling Pattern:**
```typescript
useEffect(() => {
  if (user && !isUserLoading && conversationId) {
    loadMessages()
    const interval = setInterval(loadMessages, 5000) // 5 seconds
    return () => clearInterval(interval)
  }
}, [user, isUserLoading, conversationId])
```

## 🧩 COMPONENT RELATIONSHIPS

### 🌲 Component Tree (Active on /messages)
```
app/layout.tsx
├── components/Navbar.tsx ✅ (10s polling)
├── app/messages/page.tsx
│   └── components/MessagesPageClient.tsx ✅ (no API calls)
└── components/BottomNav.tsx ✅ (10s polling)
```

### 🚨 MYSTERY: Conversation Page Activity
**Expected:** No conversation page components active
**Actual:** `loadConversationInfo()` being called repeatedly

**Possible Component States:**
1. **Zombie Component:** `app/messages/[id]/page.tsx` not properly unmounted
2. **Background Prefetching:** Next.js loading conversation routes
3. **React Strict Mode:** Double mounting in development
4. **Multiple Instances:** Same component mounted multiple times

## 🔧 NEXT.JS ARCHITECTURE DETAILS

### 📂 Routing Structure
```
app/
├── messages/
│   ├── page.tsx ✅ (current page)
│   └── [id]/
│       └── page.tsx 🚨 (source of infinite loop)
```

### ⚙️ Development Environment
- **Next.js:** 14.1.0
- **React Strict Mode:** Enabled (double mounting)
- **Fast Refresh:** Active
- **Hot Reload:** Functional

## 🔄 USEEFFECT DEPENDENCY ANALYSIS

### 🎯 Problematic Dependencies Pattern
```typescript
// app/messages/[id]/page.tsx:102-120
useEffect(() => {
  if (user && !isUserLoading && conversationId) {
    loadMessages() // Can trigger loadConversationInfo()
    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  }
}, [user, isUserLoading, conversationId])
```

**Potential Issues:**
1. **user state changes** → trigger effect
2. **isUserLoading state changes** → trigger effect  
3. **conversationId changes** → trigger effect
4. **Multiple rapid state updates** → cascade effects

### 🧠 State Management Analysis
- **User Context:** Zustand store (`useUser()`)
- **Loading States:** Multiple `isUserLoading` sources
- **Route Parameters:** `conversationId` from `useParams()`

## 🌐 WEBSOCKET INTEGRATION

### 🔌 WebSocket Service Architecture
```typescript
// lib/services/websocket.ts
setTimeout(() => {
  console.log('[WebSocket] Initiating auto-connect...')
  wsService.connect()
}, 1000)
```

**Reconnection Logic:**
- **Max attempts:** 5
- **Backoff:** Exponential (1s, 2s, 4s, 8s, 16s)
- **Current status:** Connection failures (no JWT)

**Potential Impact:** WebSocket failures might trigger API polling as fallback

## 📊 PERFORMANCE METRICS

### 🕒 API Call Frequency
- **Observed:** ~100ms intervals (600 calls/minute)
- **Expected:** 10-second intervals (6 calls/minute)
- **Anomaly:** **100x higher frequency**

### 💾 Resource Impact
- **Database:** PostgreSQL overload
- **Network:** Excessive bandwidth usage
- **Client:** UI performance degradation
- **Server:** CPU/memory consumption spike

## 🔍 DEBUGGING EVIDENCE

### ✅ Confirmed Working
1. **API functionality:** Returns correct data
2. **Authentication:** JWT tokens work properly
3. **Database queries:** PostgreSQL responds normally
4. **Component rendering:** UI displays correctly

### 🚨 Confirmed Problematic
1. **Call frequency:** 100x higher than expected
2. **Source isolation:** Mystery component active
3. **User state:** No conversations, but continuous checking
4. **Cleanup:** Intervals not properly cleared

## 🎯 ROOT CAUSE HYPOTHESES

### 🔥 Primary Hypothesis: Zombie Conversation Component
**Theory:** `app/messages/[id]/page.tsx` component remains mounted despite navigation
**Evidence:** 
- `loadConversationInfo()` calls match exact log pattern
- 100ms frequency suggests rapid useEffect triggers
- No visible conversation page but component is active

### ⚡ Secondary Hypothesis: React Strict Mode Cascade
**Theory:** Development mode double mounting creates multiple instances
**Evidence:**
- Development environment behavior
- Multiple rapid state changes
- useEffect dependency issues

### 🔄 Tertiary Hypothesis: State Management Race Condition
**Theory:** Rapid user/loading state changes trigger cascade of useEffect
**Evidence:**
- Multiple state sources for user data
- Complex dependency arrays
- Zustand store updates

## 🛠️ TECHNICAL STACK INTEGRATION

### 🔧 Key Technologies
- **Frontend:** Next.js 14.1.0 + React + TypeScript
- **State:** Zustand (`useUser()`)
- **Auth:** JWT tokens via `jwtManager.getToken()`
- **Database:** PostgreSQL + Prisma ORM
- **Real-time:** WebSocket (port 3002, currently failing)

### 🔗 Integration Points
1. **Auth Flow:** JWT → API Authorization
2. **State Flow:** Zustand → Component Re-renders
3. **Routing:** Next.js → Component Mounting/Unmounting
4. **Polling:** setInterval → API Calls
5. **WebSocket:** Connection failures → API fallback polling

## 📋 CONTEXT7 REQUIREMENTS IDENTIFIED

For systematic resolution, need documentation for:
1. **React useEffect infinite loop prevention**
2. **Next.js component unmounting best practices**
3. **Zustand state management patterns**
4. **WebSocket + HTTP API coordination**
5. **Development vs Production behavior differences**

## 🚀 NEXT PHASE PREPARATION

### 📝 Architecture Context Status: ✅ COMPLETE

**Ready for:**
1. **Context7 Integration** - Research best practices
2. **Solution Planning** - Multiple approach strategies
3. **Impact Analysis** - Risk assessment and mitigation
4. **Implementation Simulation** - Testing scenarios

### 🎯 Key Questions for Solution Phase
1. How to properly identify and stop zombie components?
2. What's the best pattern for conversation component lifecycle?
3. Should we implement circuit breaker for API calls?
4. How to coordinate WebSocket + HTTP API polling?
5. What debugging tools can identify active component instances?

---

**Status:** ✅ Architecture Context Complete  
**Next Phase:** Context7 Research + Solution Planning  
**Timeline:** CRITICAL - Fix within 24 hours 