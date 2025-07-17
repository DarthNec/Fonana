# 🛠️ SOLUTION PLAN v1: Системная регрессия

**Задача**: Исправление полной системной регрессии
**Дата**: 17.07.2025
**Методология**: Ideal Methodology M7
**Приоритет**: 🔴 КРИТИЧЕСКИЙ
**Estimated Time**: 35-45 минут

## 🎯 СТРАТЕГИЯ РЕШЕНИЯ

### Подход: **Emergency System Restore**
Систематическое восстановление работающего состояния системы через последовательное исправление критических проблем в порядке их взаимозависимости.

### Принципы:
1. **Stop the bleeding first** - остановить infinite loops
2. **Fix foundation** - исправить API schema mismatches
3. **Restore functionality** - вернуть working state
4. **Add safeguards** - предотвратить future regressions

## 📋 EXECUTION PLAN

### **PHASE 1: Emergency Stabilization (5-8 минут)**
**Цель**: Остановить resource exhaustion

#### Step 1.1: Disable WebSocket Auto-Connect
```typescript
// lib/services/websocket.ts
// ВРЕМЕННО отключить auto-connect до исправления connection logic
```
**Files**: `lib/services/websocket.ts`
**Expected**: WebSocket infinite reconnect loop STOPPED

#### Step 1.2: Disable Conversations API Polling  
```typescript
// lib/services/UnreadMessagesService.ts
// ВРЕМЕННО отключить auto-polling до исправления
```
**Files**: `lib/services/UnreadMessagesService.ts`
**Expected**: Backend conversations infinite loop STOPPED

**Phase 1 Success Criteria**:
- ✅ No WebSocket reconnection logs in browser console
- ✅ No "[Conversations API] Starting GET request" in terminal
- ✅ System resource usage normalized

---

### **PHASE 2: API Schema Fix (8-12 минут)**
**Цель**: Исправить 500 errors от Prisma schema mismatch

#### Step 2.1: Fix /api/creators Schema Mismatch
```typescript
// app/api/creators/route.ts
await prisma.user.findMany({
  where: { isCreator: true },
  select: {
    id: true,
    wallet: true,
    nickname: true,        // ✅ EXISTS
    fullName: true,        // ✅ EXISTS  
    bio: true,            // ✅ EXISTS
    avatar: true,         // ✅ EXISTS
    // REMOVE: backgroundImage, name, solanaWallet
    postsCount: true,     // ✅ EXISTS
    followersCount: true, // ✅ EXISTS
    createdAt: true,      // ✅ EXISTS
    isVerified: true,     // ✅ EXISTS
  }
});
```

#### Step 2.2: Fix /api/user Schema Mismatch
```typescript
// app/api/user/route.ts
// Remove solanaWallet from query, use only wallet
OR: [
  { wallet: walletAddress },
  // REMOVE: { solanaWallet: walletAddress }
]
```

#### Step 2.3: Update CreatorsExplorer Data Mapping
```typescript
// components/CreatorsExplorer.tsx
// Update to handle missing fields gracefully
const displayName = creator.fullName || creator.nickname || 'Unknown';
const username = creator.nickname || 'user';
const subscribers = creator.followersCount || 0;
```

**Phase 2 Success Criteria**:
- ✅ `/api/creators` returns 200 with creator data
- ✅ `/api/user` returns 200 with user data  
- ✅ CreatorsExplorer shows creator list without crashes

---

### **PHASE 3: WebSocket Restoration (10-12 минут)**
**Цель**: Восстановить stable WebSocket connection

#### Step 3.1: Investigate WebSocket Disconnect Cause
```bash
# Check WebSocket server logs
cd websocket-server
npm run logs
```

#### Step 3.2: Fix WebSocket Connection Logic
```typescript
// lib/services/websocket.ts
// Add connection stability checks
// Add proper error handling
// Add JWT token validation before connect
```

#### Step 3.3: Add Connection Retry Limits
```typescript
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds
```

#### Step 3.4: Re-enable WebSocket (carefully)
```typescript
// lib/services/websocket.ts  
// Re-enable auto-connect with safeguards
```

**Phase 3 Success Criteria**:
- ✅ WebSocket connects once and stays connected
- ✅ No infinite reconnection loops
- ✅ Real-time features working (if applicable)

---

### **PHASE 4: Conversations API Restoration (8-10 минут)**
**Цель**: Восстановить Conversations без infinite loops

#### Step 4.1: Verify UnreadMessagesService Logic
```typescript
// lib/services/UnreadMessagesService.ts
// Ensure proper subscription/unsubscription
// Add request deduplication  
// Add proper cleanup
```

#### Step 4.2: Fix Component Integration
```typescript
// components/BottomNav.tsx & components/Navbar.tsx
// Ensure only ONE component calls UnreadMessagesService
// Remove duplicate service initializations
```

#### Step 4.3: Add Rate Limiting
```typescript
const API_CALL_INTERVAL = 30000; // 30 seconds minimum
const lastApiCall = useRef(0);
```

#### Step 4.4: Re-enable Conversations API (carefully)
```typescript
// lib/services/UnreadMessagesService.ts
// Re-enable with safeguards
```

**Phase 4 Success Criteria**:
- ✅ Conversations API called max once per 30 seconds
- ✅ No infinite backend loops
- ✅ Unread message count working properly

---

### **PHASE 5: Component Lifecycle Fix (5-8 минут)**
**Цель**: Исправить React double mounting

#### Step 5.1: Fix AppProvider Double Mounting
```typescript
// lib/providers/AppProvider.tsx
// Add mounting guards
// Improve cleanup logic
// Add service deduplication
```

#### Step 5.2: Add Service Singletons
```typescript
// lib/services/ServiceManager.ts
// Create singleton pattern for services
// Prevent duplicate initialization
```

#### Step 5.3: Test Component Stability
```javascript
// Browser console should show:
// - Single AppProvider initialization
// - Single WebSocket connection  
// - Single UnreadMessagesService
```

**Phase 5 Success Criteria**:
- ✅ No duplicate component mounting logs
- ✅ Single service initialization per session
- ✅ Clean component lifecycle

---

### **PHASE 6: Validation & Monitoring (3-5 минут)**
**Цель**: Проверить полное восстановление системы

#### Step 6.1: Full System Test
```bash
# Browser navigation test
http://localhost:3000 → Should load creators
http://localhost:3000/creators → Should show 52 creators  
http://localhost:3000/feed → Should load posts
http://localhost:3000/messages → Should show wallet connect
```

#### Step 6.2: API Health Check
```bash
curl http://localhost:3000/api/creators | jq '.creators | length'
# Expected: 52

curl http://localhost:3000/api/posts | jq '.posts | length'  
# Expected: 20
```

#### Step 6.3: Performance Validation
- **Browser console**: No infinite loops
- **Terminal logs**: No repeating API calls
- **Network tab**: Normal request patterns

**Phase 6 Success Criteria**:
- ✅ All pages load without errors
- ✅ APIs return expected data
- ✅ No infinite loops or excessive resource usage
- ✅ System ready for production

## 🔧 TECHNICAL IMPLEMENTATION

### File Modifications Required:
1. `lib/services/websocket.ts` - Fix connection logic
2. `lib/services/UnreadMessagesService.ts` - Add safeguards  
3. `app/api/creators/route.ts` - Fix schema fields
4. `app/api/user/route.ts` - Remove solanaWallet
5. `components/CreatorsExplorer.tsx` - Handle missing fields
6. `components/BottomNav.tsx` - Fix service integration
7. `components/Navbar.tsx` - Remove duplicates
8. `lib/providers/AppProvider.tsx` - Fix mounting

### Backup Strategy:
```bash
# Create backup before changes
git add -A
git commit -m "Backup before system regression fix [critical_regression_2025_017]"
```

### Rollback Plan:
```bash
# If anything goes wrong
git reset --hard HEAD~1
npm run dev
```

## ⚡ RISK MITIGATION

### High Risk Items:
1. **WebSocket changes** - Test thoroughly before re-enabling
2. **API schema changes** - Validate with DB structure  
3. **Service lifecycle** - Ensure proper cleanup

### Safety Measures:
- Incremental re-enabling of services
- Continuous monitoring during changes
- Quick rollback capability
- Backup before each phase

## 📊 SUCCESS METRICS

### Quantifiable Improvements:
- **WebSocket connections**: From 12-20/min → 1 stable connection
- **API calls**: From 6-12/min → Normal pattern (user-initiated)  
- **Error rate**: From 500 errors → 0 errors
- **Page load**: Functional creator/post lists
- **Resource usage**: Normalized CPU/memory consumption

### Functional Validation:
- ✅ Home page shows creator list
- ✅ /creators page shows 52 creators
- ✅ /feed page loads posts  
- ✅ /messages page shows wallet connect
- ✅ WebSocket maintains single stable connection
- ✅ No infinite loops in any component

## 🎯 POST-IMPLEMENTATION

### Immediate Actions:
1. **Update todo list** - Mark critical issues as resolved
2. **Update Memory Bank** - Document regression cause and fix
3. **Add monitoring** - Prevent future regressions

### Long-term Improvements:
1. **Add API response validation**
2. **Implement schema migration checks**  
3. **Add service health monitoring**
4. **Improve error boundaries**

## 📋 EXECUTION CHECKLIST

- [ ] **PHASE 1**: Emergency stabilization (disable loops)
- [ ] **PHASE 2**: API schema fixes  
- [ ] **PHASE 3**: WebSocket restoration
- [ ] **PHASE 4**: Conversations API restoration
- [ ] **PHASE 5**: Component lifecycle fixes
- [ ] **PHASE 6**: Full system validation
- [ ] **POST**: Documentation and monitoring

**Ready for execution approval? 🚀** 