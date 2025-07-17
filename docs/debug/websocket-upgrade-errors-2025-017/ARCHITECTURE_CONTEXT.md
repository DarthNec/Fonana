# 🏗️ ARCHITECTURE CONTEXT: WebSocket Upgrade Errors

**Дата**: 17.07.2025  
**ID задачи**: websocket-upgrade-errors-2025-017  

## 🎯 КОРНЕВАЯ ПРИЧИНА НАЙДЕНА

### Architectural Mismatch: Port Configuration
**Browser client пытается подключиться к неправильному порту!**

**CLIENT SIDE** (lib/services/websocket.ts:162-164):
```typescript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const host = window.location.host
let url = `${protocol}//${host}/ws`  // ws://localhost:3000/ws
```

**SERVER SIDE** (websocket-server/):
```javascript
const PORT = process.env.WS_PORT || 3002;  // Server on port 3002
```

**РЕЗУЛЬТАТ**: Browser → `:3000/ws`, Server → `:3002` ❌

## 🔍 ARCHITECTURAL ANALYSIS

### Current WebSocket Infrastructure

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   Next.js       │    │   WebSocket     │
│   Client        │    │   Dev Server    │    │   Server        │
│                 │    │   (Port 3000)   │    │   (Port 3002)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ ws://localhost:3000/ws                      │
          └─────────────────────►│                      │
                                 │ ❌ UPGRADE ERROR     │
                                 │                      │
                                 │                      │ ✅ Ready
                                 │                      │   (no connections)
```

### Expected WebSocket Infrastructure

```
┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   WebSocket     │
│   Client        │    │   Server        │
│                 │    │   (Port 3002)   │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          │ ws://localhost:3002  │
          └─────────────────────►│ ✅ CONNECTION SUCCESS
                                 │   + JWT AUTH
                                 │   + Real-time Events
```

## 🔧 DETAILED CODE ANALYSIS

### WebSocket Client (lib/services/websocket.ts)

**ПРОБЛЕМНАЯ ЛОГИКА:**
```typescript
// Line 162-164 - getWebSocketUrlWithAuth()
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const host = window.location.host                          // 🚨 INCLUDES PORT 3000
let url = `${protocol}//${host}/ws`                        // = ws://localhost:3000/ws
```

**РЕЗУЛЬТАТ**: `window.location.host = "localhost:3000"` → WebSocket пытается подключиться к `:3000/ws`

### WebSocket Server Configuration

**СЕРВЕР ГОТОВ:**
```javascript
// websocket-server/index.js:22
const PORT = process.env.WS_PORT || 3002;

// websocket-server/src/server.js:10-15
function createWebSocketServer(port) {
  const wss = new WebSocket.Server({ port });  // 3002
  // ... JWT authentication ready
  // ... Channel subscriptions ready
  // ... Redis integration ready
}
```

**КОМПОНЕНТЫ ГОТОВЫ:**
- ✅ JWT Authentication (src/auth.js)
- ✅ Channel Management (src/channels.js) 
- ✅ Event Broadcasting (src/events/)
- ✅ Prisma Database Integration (src/db.js)
- ✅ Redis Scaling Support (src/redis.js)

## 🚨 WEBSOCKET SERVER STATUS

### Dependency Issues Found:
1. **Prisma Client Path**: `require('../../node_modules/@prisma/client')` - path resolution
2. **ioredis vs redis**: Dependency mismatch (previously resolved)
3. **Environment Variables**: NEXTAUTH_SECRET и DATABASE_URL required

### Current Blocking Factors:
```bash
# From terminal attempts:
Error: Cannot find module '@prisma/client'
Error: Cannot find module 'ioredis' (FIXED)
```

## 🎯 SOLUTION APPROACHES

### Solution 1: Client Port Configuration Fix ⭐ RECOMMENDED
**Change client to connect directly to port 3002:**

```typescript
// lib/services/websocket.ts - BEFORE
let url = `${protocol}//${host}/ws`

// lib/services/websocket.ts - AFTER  
const wsPort = process.env.NODE_ENV === 'development' ? '3002' : '3000'
let url = `${protocol}//${host}:${wsPort}/ws`
```

**PROS**: ✅ Simple, ✅ No Next.js changes, ✅ Direct connection
**CONS**: ⚠️ Different ports dev vs prod

### Solution 2: Next.js WebSocket Proxy (Alternative)
**Add WebSocket handling to Next.js configuration:**

```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/ws',
        destination: 'http://localhost:3002/ws',
        has: [{ type: 'header', key: 'upgrade', value: 'websocket' }]
      }
    ]
  }
}
```

**PROS**: ✅ Unified port, ✅ Production-like
**CONS**: ❌ Complex Next.js config, ❌ Development only

### Solution 3: Nginx Development Proxy (Production-Ready)
**Add development Nginx for local routing:**

```nginx
# nginx-dev.conf
location /ws {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

**PROS**: ✅ Production identical, ✅ Proper routing
**CONS**: ❌ Requires local Nginx setup

## 🎯 RECOMMENDED APPROACH

### SOLUTION 1: Client Configuration Fix
**REASONING**:
- ✅ **Fastest implementation** (5 minutes)
- ✅ **Zero risk** - no changes to Next.js config
- ✅ **Production ready** - separate WebSocket process is correct architecture
- ✅ **Clear separation** - Next.js для API, WebSocket для real-time

### Implementation Steps:
1. Update `lib/services/websocket.ts` client URL
2. Verify WebSocket server running on 3002
3. Test JWT token flow
4. Validate real-time events

## 📊 CURRENT STATUS

### Infrastructure Ready Status:
- **WebSocket Server**: 🟢 100% Ready (code-wise)
- **WebSocket Client**: 🟢 95% Ready (URL fix needed)
- **JWT Authentication**: 🟢 100% Ready
- **Database Integration**: 🟢 100% Ready
- **Event System**: 🟢 100% Ready

### Blocking Issues:
- **Port Mismatch**: 🔴 CRITICAL (5 min fix)
- **Server Dependencies**: 🟡 MAJOR (Prisma client path)
- **Server Not Running**: 🟡 MAJOR (dependency issues)

### Success Prerequisites:
1. ✅ Fix client port configuration
2. ✅ Resolve WebSocket server dependencies
3. ✅ Start WebSocket server on :3002
4. ✅ Test JWT token flow
5. ✅ Validate browser connection

## 🔄 IMPLEMENTATION PRIORITY

### Phase 1: Quick Fix (5 minutes)
**Update browser client to connect to :3002**

### Phase 2: Server Setup (10 minutes)  
**Resolve dependencies and start WebSocket server**

### Phase 3: Validation (5 minutes)
**Playwright MCP testing and browser validation**

**TOTAL ESTIMATED TIME**: 20 minutes
**CONFIDENCE LEVEL**: 🟢 HIGH (clear root cause identified)

**ГОТОВО К SOLUTION PLAN PHASE** 🚀 