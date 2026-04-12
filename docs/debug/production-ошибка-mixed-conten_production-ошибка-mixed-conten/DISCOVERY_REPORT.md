# 🔍 Mixed Content WebSocket Error Analysis - Full Report
**Task ID:** task_production-ошибка-mixed-conten_5483  
**Date:** 2026-03-09  
**Phase:** DISCOVERY  
**Status:** ✅ ROOT CAUSE IDENTIFIED

---

## 📋 Executive Summary

### **🎯 Problem Statement**
Production ошибка Mixed Content на `https://fonana.me/creators`:
```
Mixed Content: The page at 'https://fonana.me/creators' was loaded over HTTPS, 
but attempted to connect to the insecure WebSocket endpoint 
'ws://64.20.37.222:3004/socket.io/?EIO=4&transport=websocket'. 
This request has been blocked; this endpoint must be available over WSS.
```

### **🔍 Root Cause Analysis**
После глубокого анализа найдена **1 критическая проблема**:

**❌ Fallback URL использует HTTP вместо HTTPS**

---

## 🚨 Критическая проблема: HTTP Fallback на Production

### **Где:** `lib/services/socketio.ts`, строки 136-148

### **Текущий код:**
```typescript
this.socket.on('connect_error', (error) => {
  console.error('❌ [Socket.IO] Connect error:', error.message)
  
  // Если это production и ошибка связана с доменом, пробуем IP
  if (window.location.hostname === 'fonana.me' || window.location.hostname.endsWith('.fonana.me')) {
    if (url.includes('fonana.me') && !url.includes('64.20.37.222')) {
      console.log('🔄 [Socket.IO] Domain failed, trying IP fallback...')
      this.socket?.disconnect()
      
      // 🚨 ПРОБЛЕМА: HTTP вместо HTTPS!
      const fallbackUrl = 'http://64.20.37.222:3004'  // ← ❌ HTTP!
      console.log('🔄 [Socket.IO] Fallback URL:', fallbackUrl)
      
      this.socket = io(fallbackUrl, socketOptions)
      this.setupEventHandlers()
    }
  }
})
```

### **❌ Проблема:**
1. Страница загружена через **HTTPS** (`https://fonana.me/creators`)
2. При ошибке подключения к домену, код пытается fallback на IP
3. **Fallback URL использует HTTP**: `http://64.20.37.222:3004`
4. Браузер **блокирует** Mixed Content (HTTPS → HTTP downgrade)
5. WebSocket соединение **не устанавливается**

### **Почему это происходит:**

#### **Основное подключение (строки 279-292):**
```typescript
private async getConnectionConfig(customUrl?: string, user?: any): Promise<{ url: string; user: any | null }> {
  let url: string
  
  if (window.location.hostname === 'fonana.me' || window.location.hostname.endsWith('.fonana.me')) {
    // Production: пробуем домен, если не работает - используем IP
    url = 'https://fonana.me'  // ← ✅ HTTPS для основного подключения
    console.log('[Socket.IO] Production mode - connecting to:', url)
  } else {
    // Development: прямое подключение
    url = 'https://fonana.me'
    console.log('[Socket.IO] Development mode - connecting to:', url)
  }
  
  return { url, user: user || null }
}
```

**Основное подключение:**
- URL: `https://fonana.me` ✅
- Socket.IO автоматически добавляет `/socket.io/` path
- Фактический URL: `wss://fonana.me/socket.io/?EIO=4&transport=websocket` ✅

**Но если основное подключение фейлится:**
- Срабатывает `connect_error` handler
- Fallback URL: `http://64.20.37.222:3004` ❌
- Socket.IO пытается: `ws://64.20.37.222:3004/socket.io/?EIO=4&transport=websocket` ❌
- Браузер блокирует: Mixed Content Error!

---

## 🔬 Детальный анализ архитектуры

### **1. Socket.IO Client Configuration**

**File:** `lib/services/socketio.ts`

#### **Connection Flow:**
```
1. User opens page (HTTPS)
2. AppProvider → socketIOService.connect()
3. getConnectionConfig() → url = 'https://fonana.me'
4. io(url, options) → Socket.IO client создаёт WebSocket
5. Browser attempts: wss://fonana.me/socket.io/...
```

#### **Socket.IO Options (строки 112-119):**
```typescript
const socketOptions: any = {
  transports: ['websocket', 'polling'],  // WebSocket first, then polling
  reconnection: true,
  reconnectionAttempts: this.maxReconnectAttempts,  // 5
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000
}
```

**Good:**
- ✅ WebSocket первый транспорт (предпочитается)
- ✅ Fallback на polling если WebSocket не работает
- ✅ Reconnection включен

**Problem:**
- ❌ HTTP fallback в `connect_error` handler (строка 142)

---

### **2. Server-Side Configuration**

**Где находится Socket.IO server:**
- Server file: `socketio-server/server.js`
- Port: `3004`
- URL: должен быть `https://fonana.me` (через nginx reverse proxy)

**Ожидаемая nginx конфигурация:**
```nginx
location /socket.io/ {
  proxy_pass http://localhost:3004;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Если nginx неправильно настроен:**
- Socket.IO server на `localhost:3004` недоступен через домен
- Срабатывает `connect_error`
- Code пытается fallback на IP с HTTP
- Mixed Content Error!

---

### **3. Mixed Content Policy**

**Browser Security Policy:**
- ✅ HTTPS page → HTTPS WebSocket (WSS) → Allowed
- ✅ HTTPS page → HTTPS XHR/Fetch → Allowed
- ❌ HTTPS page → HTTP WebSocket (WS) → **BLOCKED**
- ❌ HTTPS page → HTTP XHR/Fetch → **BLOCKED**

**Error Message:**
```
Mixed Content: The page at 'https://fonana.me/creators' was loaded over HTTPS, 
but attempted to connect to the insecure WebSocket endpoint 
'ws://64.20.37.222:3004/socket.io/?EIO=4&transport=websocket'. 
This request has been blocked; this endpoint must be available over WSS.
```

**Why браузер блокирует:**
1. Страница загружена через HTTPS (secure context)
2. Попытка подключиться к WS (не-secure WebSocket)
3. **Downgrade attack prevention** - браузер предотвращает понижение безопасности
4. Соединение **блокируется**, error в console

---

## 🎯 Решение: 3 опции

### **Option 1: Fix Fallback URL (Recommended)**
**Effort:** 2 минуты  
**Risk:** 🟢 LOW  
**Impact:** ✅ Fixes Mixed Content Error

#### **Change (Line 142):**
```typescript
// ❌ БЫЛО:
const fallbackUrl = 'http://64.20.37.222:3004'

// ✅ ДОЛЖНО БЫТЬ:
const fallbackUrl = 'https://64.20.37.222:3004'
// or better:
const fallbackUrl = 'wss://64.20.37.222:3004'
```

**Но есть проблема:**
- IP адрес `64.20.37.222` может не иметь SSL сертификата
- `https://64.20.37.222:3004` может не работать (certificate error)

**Better Fix:**
```typescript
// Если домен не работает, пробуем другой домен или subdomain
const fallbackUrl = 'https://socket.fonana.me'
// or keep same domain:
const fallbackUrl = 'https://fonana.me'
```

---

### **Option 2: Remove Fallback (Best Practice)**
**Effort:** 1 минута  
**Risk:** 🟢 LOW  
**Impact:** ✅ Eliminates Mixed Content, simplifies code

#### **Remove entire fallback block (Lines 132-149):**
```typescript
// 🔥 ПРОСТО УДАЛИТЬ весь fallback блок
// Socket.IO уже имеет reconnection logic
// Не нужен manual IP fallback
```

**Why это лучше:**
- ✅ Socket.IO имеет встроенный reconnection logic (options.reconnection: true)
- ✅ Если домен не работает, Socket.IO попробует polling transport
- ✅ Нет риска Mixed Content
- ✅ Проще код, меньше логики

**Socket.IO automatic fallback:**
```
1. Try WebSocket (wss://fonana.me/socket.io/)
2. If fails → Try Polling (https://fonana.me/socket.io/)
3. Reconnect attempts: 5 (maxReconnectAttempts)
4. Reconnection delay: 1s → 5s (exponential backoff)
```

---

### **Option 3: Use Environment Variable**
**Effort:** 5 минут  
**Risk:** 🟢 LOW  
**Impact:** ✅ Flexible, production-ready

#### **Add environment variable:**
```bash
# .env or ecosystem.config.js
NEXT_PUBLIC_SOCKETIO_URL=https://fonana.me
NEXT_PUBLIC_SOCKETIO_FALLBACK_URL=https://socket.fonana.me  # or null to disable
```

#### **Update code (Line 269-293):**
```typescript
private async getConnectionConfig(customUrl?: string, user?: any): Promise<{ url: string; user: any | null }> {
  if (customUrl) {
    return { url: customUrl, user: user || null }
  }
  
  // Use environment variable
  const url = process.env.NEXT_PUBLIC_SOCKETIO_URL || 'https://fonana.me'
  console.log('[Socket.IO] Connection URL from env:', url)
  
  return { url, user: user || null }
}
```

#### **Update fallback (Line 142):**
```typescript
const fallbackUrl = process.env.NEXT_PUBLIC_SOCKETIO_FALLBACK_URL
if (fallbackUrl) {
  console.log('🔄 [Socket.IO] Using fallback URL from env:', fallbackUrl)
  this.socket = io(fallbackUrl, socketOptions)
  this.setupEventHandlers()
} else {
  console.log('⚠️ [Socket.IO] No fallback URL configured, relying on Socket.IO reconnection')
}
```

**Benefits:**
- ✅ Configuration через environment variables
- ✅ Можно отключить fallback установив `NEXT_PUBLIC_SOCKETIO_FALLBACK_URL=` (empty)
- ✅ Easy to change without code modification
- ✅ Different URLs for dev/prod

---

## 📊 Comparison Matrix

| Solution | Effort | Risk | Pros | Cons | Score |
|----------|--------|------|------|------|-------|
| **Option 1: Fix Fallback URL** | 2 min | 🟢 LOW | Quick fix | IP may not have SSL cert | 6/10 |
| **Option 2: Remove Fallback** | 1 min | 🟢 LOW | Simplest, relies on Socket.IO built-in logic | Less control over fallback | **9/10** ⭐ |
| **Option 3: Use Env Var** | 5 min | 🟢 LOW | Most flexible, production-ready | More configuration | 8/10 |

**Recommendation:** **Option 2** (Remove Fallback) - simplest and relies on Socket.IO's proven reconnection logic.

---

## 🧪 Testing Strategy

### **Test Case 1: Normal Connection**
1. Open `https://fonana.me/creators` in browser
2. Check DevTools Console for: `✅ [Socket.IO] Connected successfully`
3. Check Network tab: WebSocket connection to `wss://fonana.me/socket.io/...`
4. Should NOT see Mixed Content error

### **Test Case 2: Connection Failure**
1. Block `fonana.me` domain (hosts file or firewall)
2. Open `https://fonana.me/creators`
3. Socket.IO should try reconnection (5 attempts)
4. Should NOT see Mixed Content error (no HTTP fallback)
5. Console: `❌ [Socket.IO] Reconnection failed after X attempts`

### **Test Case 3: Polling Fallback**
1. Block WebSocket protocol in browser
2. Open `https://fonana.me/creators`
3. Socket.IO should fallback to polling (HTTPS)
4. Check Network tab: XHR requests to `https://fonana.me/socket.io/?EIO=4&transport=polling`
5. Should NOT see Mixed Content error

### **Test Case 4: Reconnection**
1. Connect normally
2. Stop Socket.IO server (`pm2 stop socketio-server`)
3. Socket.IO should try reconnection
4. Restart server (`pm2 start socketio-server`)
5. Connection should restore automatically

---

## 🔐 Security Implications

### **Current Issue:**
- ❌ Попытка downgrade с HTTPS → HTTP
- ❌ Браузер блокирует (good!)
- ❌ WebSocket не работает (bad!)

### **After Fix:**
- ✅ Всегда HTTPS/WSS на production
- ✅ No Mixed Content warnings
- ✅ Secure WebSocket connections

---

## 🛠️ Implementation Checklist

### **Quick Fix (Option 2 - Recommended):**

**Step 1: Remove Fallback Block**
- [ ] Open `lib/services/socketio.ts`
- [ ] Navigate to lines 132-149
- [ ] Delete entire `connect_error` handler with IP fallback
- [ ] Keep only default Socket.IO reconnection logic

**Step 2: Test Locally**
- [ ] Run `npm run dev`
- [ ] Open `http://localhost:3000/creators`
- [ ] Check Console: No Mixed Content errors
- [ ] Verify Socket.IO connects

**Step 3: Deploy**
- [ ] Commit changes
- [ ] Deploy to production
- [ ] Monitor logs for Socket.IO connections

**Step 4: Verify on Production**
- [ ] Open `https://fonana.me/creators`
- [ ] Check Console: `✅ [Socket.IO] Connected successfully`
- [ ] No Mixed Content errors
- [ ] WebSocket connection established

---

## 📈 Expected Results

### **Before Fix:**
- ❌ Mixed Content Error in console
- ❌ WebSocket connection blocked
- ❌ IP fallback attempts HTTP connection
- ❌ Socket.IO not working on production

### **After Fix:**
- ✅ No Mixed Content errors
- ✅ WebSocket connection to `wss://fonana.me/socket.io/`
- ✅ Socket.IO reconnection logic works properly
- ✅ Cleaner, simpler code

---

## 🚨 Alternative Root Causes (Eliminated)

### **❌ NOT the problem:**

#### **1. nginx не настроен для WebSocket?**
**Evidence:** Если бы nginx не был настроен, основное подключение к `https://fonana.me` тоже не работало бы. Но error message показывает что попытка идёт к `ws://64.20.37.222:3004`, что означает fallback сработал.

#### **2. SSL Certificate проблема?**
**Evidence:** Страница `https://fonana.me/creators` загружается (HTTPS работает). Значит SSL cert валиден для домена.

#### **3. Socket.IO server не запущен?**
**Evidence:** Если бы server был не запущен, основное подключение фейлилось бы сразу, но error показывает попытку подключиться через fallback (значит первая попытка была).

#### **4. Firewall блокирует WebSocket?**
**Evidence:** Error - Mixed Content (browser security policy), а не network error или timeout.

#### **5. Неправильный порт?**
**Evidence:** Порт `3004` правильный (видно в fallback URL). Проблема не в порте, а в протоколе (HTTP vs HTTPS).

---

## 📝 Configuration Check

### **Server-Side (Should be configured):**

#### **1. nginx `/etc/nginx/sites-available/fonana`:**
```nginx
server {
    listen 443 ssl http2;
    server_name fonana.me www.fonana.me;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/fonana.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fonana.me/privkey.pem;
    
    # Socket.IO WebSocket proxy
    location /socket.io/ {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout
        proxy_read_timeout 86400;
    }
    
    # Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        # ... other headers
    }
}
```

#### **2. PM2 ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'fonana-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/root/FonanaCopy',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'socketio-server',  // ← Should exist!
      script: 'socketio-server/server.js',
      cwd: '/root/FonanaCopy',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
    },
  ],
}
```

#### **3. Socket.IO Server Running:**
```bash
pm2 list
# Should show:
# socketio-server | online | 3004 | ...
```

---

## 🔍 Monitoring & Debugging

### **Check Socket.IO Server Status:**
```bash
pm2 list | grep socketio
pm2 logs socketio-server --lines 50
```

### **Check nginx Status:**
```bash
sudo nginx -t  # Test config
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### **Check WebSocket Connection:**
```bash
# On server:
netstat -tulpn | grep 3004
# Should show: tcp 0.0.0.0:3004 ... node

# Test WebSocket endpoint:
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://fonana.me/socket.io/
# Should get HTTP 101 Switching Protocols
```

### **Browser DevTools:**
1. Open DevTools (F12)
2. Network tab → Filter: WS (WebSocket)
3. Look for: `wss://fonana.me/socket.io/?EIO=4&transport=websocket`
4. Status: Should be `101 Switching Protocols`
5. Console: Should see `✅ [Socket.IO] Connected successfully`

---

## ✅ Success Criteria

### **Must Have:**
- ✅ No Mixed Content errors in console
- ✅ WebSocket connection to `wss://fonana.me/socket.io/`
- ✅ Socket.IO `connected` event fires
- ✅ Real-time updates work (notifications, feed, etc.)

### **Should Have:**
- ✅ Reconnection works after temporary disconnect
- ✅ Fallback to polling if WebSocket unavailable
- ✅ Clean console logs (no errors)

### **Nice to Have:**
- ✅ Connection established < 1 second
- ✅ Reconnection < 5 seconds after disconnect
- ✅ Environment variable configuration

---

## 📁 Related Files

### **Critical:**
- `lib/services/socketio.ts` - Socket.IO client service (FIX HERE)
- `socketio-server/server.js` - Socket.IO server
- `/etc/nginx/sites-available/fonana` - nginx config (на сервере)
- `ecosystem.config.js` - PM2 configuration

### **Supporting:**
- `lib/providers/AppProvider.tsx` - Initializes Socket.IO connection
- `next.config.js` - Next.js configuration (no Socket.IO env vars here)

---

## 🎓 Lessons Learned

### **1. Mixed Content Policy Strict**
Браузеры блокируют HTTPS → HTTP downgrade для security. Всегда используй HTTPS/WSS на production.

### **2. IP Fallback Problematic**
IP адреса обычно не имеют SSL сертификатов. Используй domain/subdomain вместо IP для fallback.

### **3. Socket.IO Has Built-in Fallback**
Socket.IO уже имеет reconnection logic и transport fallback (WebSocket → Polling). Manual fallback часто не нужен.

### **4. Environment Variables Important**
Hardcoded URLs в коде (особенно с разными протоколами для dev/prod) - антипаттерн. Используй env vars.

---

**Status:** ✅ Analysis Complete | 🟡 Awaiting User Approval for Fix

**Next Steps:**
1. Review this analysis
2. Choose solution (Recommend: Option 2)
3. I can apply fix immediately (1 minute)
4. Test locally → Deploy to production
5. Monitor logs for Socket.IO connections

---

*Generated by M7 System v4.0 | Full Cycle Analysis | 2026-03-09*
