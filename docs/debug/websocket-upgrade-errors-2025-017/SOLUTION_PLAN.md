# 🎯 SOLUTION PLAN: Fix WebSocket Upgrade Errors

**Дата**: 17.07.2025  
**ID задачи**: websocket-upgrade-errors-2025-017  
**Версия плана**: v1  

## 🎯 SOLUTION OVERVIEW

### Root Cause Confirmed: Port Configuration Mismatch
- **Browser client**: Connecting to `:3000/ws` 
- **WebSocket server**: Listening on `:3002`
- **Result**: Next.js server gets upgrade requests but has no WebSocket handler

### Selected Solution: Client Configuration Fix (Fastest & Safest)
**Approach**: Update client to connect directly to port 3002 in development

## 📋 IMPLEMENTATION PLAN

### Phase 1: WebSocket Server Verification (2 minutes)
**Verify WebSocket server is ready and running:**

1. **Check WebSocket server status:**
   ```bash
   # Verify server is running
   ps aux | grep "websocket-server"
   lsof -i :3002
   ```

2. **Start WebSocket server if needed:**
   ```bash
   cd websocket-server
   npm start
   ```

3. **Verify server logs show ready state:**
   - Look for: "✅ WebSocket server started on port 3002"
   - Confirm: "📡 Waiting for connections..."

### Phase 2: Client URL Configuration Fix (3 minutes)
**Update client to connect to correct port:**

**TARGET FILE**: `lib/services/websocket.ts`
**LOCATION**: Lines 162-164 in `getWebSocketUrlWithAuth()` method

**CHANGE**:
```typescript
// BEFORE (line 162-164):
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const host = window.location.host
let url = `${protocol}//${host}/ws`

// AFTER:
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const host = window.location.hostname  // hostname without port
const wsPort = process.env.NODE_ENV === 'development' ? '3002' : '3000'
let url = `${protocol}//${host}:${wsPort}/ws`
```

**REASONING**:
- `window.location.host` includes port (localhost:3000)
- `window.location.hostname` excludes port (localhost)
- Development: Connect to `:3002` (WebSocket server)
- Production: Connect to `:3000` (Nginx proxy)

### Phase 3: Environment Variable Configuration (1 minute)
**Add WebSocket port configuration:**

**TARGET FILE**: Create or update environment variables
```bash
# .env or .env.local
NEXT_PUBLIC_WS_PORT=3002
```

**OPTIONAL IMPROVEMENT** (for future flexibility):
```typescript
// More flexible configuration
const wsPort = process.env.NEXT_PUBLIC_WS_PORT || 
              (process.env.NODE_ENV === 'development' ? '3002' : '3000')
```

### Phase 4: JWT Token Flow Verification (2 minutes)
**Ensure JWT authentication works:**

1. **Verify AuthService provides JWT token:**
   - Check browser console logs: "[WebSocket] JWT token obtained"
   - Token should be non-empty string

2. **Verify WebSocket server accepts JWT:**
   - Check server logs for: "✅ User {userId} authenticated"
   - No "❌ Invalid token" errors

### Phase 5: Validation Testing (5 minutes)
**Playwright MCP verification:**

1. **Navigate to application**
2. **Monitor console logs** for WebSocket connection
3. **Verify connection success** - no more upgrade errors
4. **Test real-time functionality** - notifications, events

## 📊 EXPECTED OUTCOMES

### Before Fix:
```
Browser → ws://localhost:3000/ws → Next.js Server ❌
                                   "Cannot read properties of undefined"

WebSocket Server (port 3002) ✅ Ready, 0 connections
```

### After Fix:
```
Browser → ws://localhost:3002/ws → WebSocket Server ✅
                                   "User authenticated, connection established"

Next.js Server (port 3000) ✅ No more upgrade requests
```

## 🔧 IMPLEMENTATION DETAILS

### Code Change Specifics:

**FILE**: `lib/services/websocket.ts`
**METHOD**: `getWebSocketUrlWithAuth()` 
**LINES**: 162-164

**EXACT REPLACEMENT**:
```typescript
// Replace these 3 lines:
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const host = window.location.host
let url = `${protocol}//${host}/ws`

// With these lines:
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const host = window.location.hostname
const wsPort = process.env.NODE_ENV === 'development' ? '3002' : '3000'
let url = `${protocol}//${host}:${wsPort}/ws`
```

### Alternative Environment-Based Approach:
```typescript
// Even more flexible:
const wsPort = process.env.NEXT_PUBLIC_WS_PORT || 
              (process.env.NODE_ENV === 'development' ? '3002' : '3000')
```

## 🚨 DEPENDENCIES & PREREQUISITES

### Required for Phase 1 (WebSocket Server):
1. **Install dependencies:**
   ```bash
   cd websocket-server
   npm install
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate --schema=../prisma/schema.prisma
   ```

3. **Environment variables in `websocket-server/.env`:**
   ```bash
   DATABASE_URL="postgresql://fonana_user:fonana_pass@localhost:5432/fonana"
   NEXTAUTH_SECRET="your-secret-key"
   ```

### Troubleshooting Common Issues:

**Issue**: `Cannot find module '@prisma/client'`
**Solution**: 
```bash
cd websocket-server
npm install @prisma/client
npx prisma generate --schema=../prisma/schema.prisma
```

**Issue**: `Cannot find module 'ioredis'`
**Solution**: 
```bash
cd websocket-server
npm install ioredis
```

**Issue**: `EADDRINUSE: address already in use :::3002`
**Solution**: 
```bash
lsof -i :3002
kill -9 <PID>
```

## ⏱️ ESTIMATED TIMELINE

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Server verification/startup | 2 min | 🔄 Pending |
| 2 | Client URL fix | 3 min | 🔄 Pending |
| 3 | Environment config | 1 min | 🔄 Pending |
| 4 | JWT verification | 2 min | 🔄 Pending |
| 5 | Validation testing | 5 min | 🔄 Pending |
| **TOTAL** | **Complete solution** | **13 min** | 🔄 **Ready** |

## 🎯 SUCCESS CRITERIA

### Definition of Done:
- ✅ WebSocket server running stable on port 3002
- ✅ Browser connects to correct port (no more :3000/ws attempts)
- ✅ JWT authentication works (no "No token provided" errors)
- ✅ WebSocket connection established (console shows "WebSocket connected")
- ✅ Real-time events working (subscribe/unsubscribe)
- ✅ No more "upgrade request" errors in Next.js
- ✅ Zero regressions in existing functionality

### Key Metrics:
- **Connection Success Rate**: 100%
- **Authentication Success**: 100%
- **Error Rate**: 0% (upgrade request errors)
- **Time to Connect**: <2 seconds

## 🔄 ROLLBACK PLAN

**If fix causes issues:**

1. **Immediate rollback:**
   ```typescript
   // Revert to original code:
   const host = window.location.host
   let url = `${protocol}//${host}/ws`
   ```

2. **Alternative fallback:**
   ```typescript
   // Try both ports:
   const wsPort = '3002'  // Try 3002 first
   let url = `${protocol}//${host}:${wsPort}/ws`
   // Add fallback to 3000 if connection fails
   ```

3. **Zero-risk approach:**
   - Keep original code in comments
   - Test in incognito window first
   - Monitor browser console carefully

## 📋 POST-IMPLEMENTATION CHECKLIST

- [ ] WebSocket server starts without errors
- [ ] Browser console shows correct connection URL
- [ ] JWT token flow works end-to-end
- [ ] No more "upgrade request" errors
- [ ] Real-time features functional
- [ ] Playwright MCP validation passed
- [ ] Performance impact assessed
- [ ] Documentation updated

**ГОТОВО К IMPLEMENTATION PHASE** 🚀 