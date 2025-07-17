# 🏗️ ARCHITECTURE CONTEXT: Системная регрессия

**Задача**: Анализ архитектуры для исправления системной регрессии
**Дата**: 17.07.2025
**Scope**: WebSocket, API, Conversations, React Components

## 🗺️ СИСТЕМНАЯ АРХИТЕКТУРА

### Current Technology Stack:
```
Frontend: Next.js 14.1.0 + React + TypeScript
Database: PostgreSQL (localhost:5432)
WebSocket: Custom server (port 3002)
API: Next.js API routes (/api/*)
ORM: Prisma Client
Auth: NextAuth + Solana Wallet
```

### Component Dependencies:
```mermaid
graph TD
    A[AppProvider] --> B[WebSocket Service]
    A --> C[UnreadMessagesService]
    D[BottomNav] --> C
    E[Navbar] --> C
    F[CreatorsExplorer] --> G[/api/creators]
    B --> H[WebSocket Server :3002]
    C --> I[/api/conversations]
    G --> J[Prisma Client]
    I --> J
```

## 🔌 WEBSOCKET ARCHITECTURE

### Current Implementation:
```typescript
// lib/services/websocket.ts
class WebSocketService {
  connect() {
    // ПРОБЛЕМА: Подключается но сразу отключается
    const url = `ws://${hostname}:${port}/ws`
    // port = 3002 (правильно)
    // hostname = localhost (правильно)
  }
}
```

### WebSocket Server:
- **Location**: `websocket-server/`
- **Port**: 3002
- **Status**: Запущен и работает
- **Auth**: Требует JWT token
- **Problem**: Connection established но сразу drops

### Connection Flow:
```
Browser Client → ws://localhost:3002/ws → WebSocket Server
    ↓ (connects)
    ↓ (immediately disconnects)
    ↓ (triggers reconnect logic)
    ↓ (infinite loop)
```

## 🔄 CONVERSATIONS API ARCHITECTURE

### Current Implementation:
```typescript
// lib/services/UnreadMessagesService.ts (должен предотвращать loops)
class UnreadMessagesService {
  // Centralized service для предотвращения дублирования
}

// components/BottomNav.tsx + components/Navbar.tsx  
// ПРОБЛЕМА: Оба компонента могут дублировать API calls
```

### API Flow:
```
BottomNav/Navbar → UnreadMessagesService → /api/conversations
                                              ↓
                                        Prisma Client → PostgreSQL
```

### Backend API:
- **Endpoint**: `/api/conversations`
- **Method**: GET
- **Auth**: JWT token required
- **Current User**: `cmbymuez00004qoe1aeyoe7zf lafufu`
- **Status**: Working but infinite loop in calls

## 🗄️ DATABASE SCHEMA MISMATCH

### Actual PostgreSQL Schema:
```sql
-- users table (REAL structure)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  wallet TEXT,
  nickname TEXT,
  fullName TEXT, 
  bio TEXT,
  avatar TEXT,
  -- MISSING: name, username, backgroundImage, solanaWallet
);
```

### API Code Expectations:
```typescript
// app/api/creators/route.ts - BROKEN CODE
await prisma.user.findMany({
  select: {
    backgroundImage: true,  // ❌ Field doesn't exist
    name: true,             // ❌ Field doesn't exist  
    solanaWallet: true,     // ❌ Field doesn't exist
  }
});
```

### Schema Drift Impact:
- `/api/creators` → 500 Internal Server Error
- `/api/user` → 500 Internal Server Error (solanaWallet)
- Frontend components crash when expecting missing fields

## ⚛️ REACT COMPONENT ARCHITECTURE

### Component Mounting Issues:
```
AppProvider (mounts) → WebSocket init → UnreadMessages init
    ↓
AppProvider (unmounts due to Strict Mode)
    ↓  
AppProvider (mounts again) → Duplicate services
```

### Problem Components:
1. **AppProvider**: Double mounting creating duplicate WebSocket connections
2. **BottomNav + Navbar**: Both potentially calling Conversations API
3. **CreatorsExplorer**: Breaks when `/api/creators` returns 500

### Service Registration:
```typescript
// Pattern causing issues:
useEffect(() => {
  // Service initialization
  WebSocketService.connect();
  UnreadMessagesService.start();
  
  return () => {
    // Cleanup may not be proper
  };
}, []); // Dependency array issues?
```

## 🌐 NETWORK LAYER

### API Endpoints Status:
```
✅ /api/pricing - Working (200 OK)
✅ /api/version - Working (200 OK) 
❌ /api/creators - Broken (500 Error) - Prisma schema mismatch
❌ /api/conversations - Working but infinite calls
❌ /api/user - Broken (500 Error) - solanaWallet field
```

### Request Patterns:
- **Duplicate requests**: Multiple components calling same APIs
- **Infinite loops**: Conversations API called every 5-10 seconds
- **Failed error handling**: 500 errors not properly caught

## 🔧 DEVELOPMENT ENVIRONMENT

### Next.js Dev Server:
- **Port**: 3000
- **Hot Reload**: May be causing component re-mounting
- **Strict Mode**: May be causing double mounting
- **WebSocket Upgrade**: Failing with TypeError

### State Management:
- **Global State**: AppStore (Zustand)
- **Authentication**: JWT in localStorage
- **WebSocket State**: In-memory (lost on reload)

## 🚨 CRITICAL INTERDEPENDENCIES

### WebSocket → Conversations Loop:
```
WebSocket disconnect → App state change → Component re-render → 
Conversations API call → Backend load → Potential WebSocket issues
```

### API Errors → UI Cascade:
```
Prisma schema error → API 500 → Frontend error → Component crash → 
User state corruption → More API calls → Error amplification
```

### Service Lifecycle Issues:
```
AppProvider mount → Service init → AppProvider unmount (Strict Mode) →
Service still running → AppProvider mount again → Duplicate services
```

## 📊 PERFORMANCE IMPACT

### Resource Consumption:
- **WebSocket**: Connecting every 3-5 seconds = ~12-20 connections/minute
- **Conversations API**: Called every 5-10 seconds = ~6-12 requests/minute  
- **Failed API calls**: 500 errors consuming CPU/memory
- **React re-renders**: Double mounting multiplying everything

### Database Load:
- Conversations API query running constantly
- Failed Prisma queries from schema mismatch
- Connection pool potentially exhausted

## 🔗 COMPONENT RELATIONSHIPS

### Critical Path Dependencies:
1. **AppProvider** (core) → affects everything downstream
2. **WebSocket Service** → affects real-time features  
3. **UnreadMessagesService** → affects navigation components
4. **API Layer** → affects all data-dependent components

### Failure Cascade:
```
Schema mismatch → API failures → Frontend errors → 
Component crashes → Re-mounting → Service duplication → 
Resource exhaustion → System instability
```

## 🎯 ARCHITECTURAL WEAKNESSES

### Single Points of Failure:
1. **Prisma Schema Sync**: No validation between code and DB
2. **Service Lifecycle**: No proper cleanup on component unmount
3. **Error Boundaries**: Insufficient error isolation
4. **State Management**: Services not properly centralized

### Missing Safeguards:
- No API response validation
- No connection retry limits
- No schema migration checks
- No service deduplication

## 📋 NEXT STEPS

1. **Immediate**: Stop infinite loops (disable problem services)
2. **Short-term**: Fix schema mismatches and restore working state
3. **Long-term**: Add architectural safeguards and monitoring 