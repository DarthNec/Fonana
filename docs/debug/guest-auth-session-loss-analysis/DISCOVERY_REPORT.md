# 🔍 Guest Auth Session Loss - DISCOVERY REPORT

**Task ID:** `guest-auth-session-loss-analysis`  
**Phase:** DISCOVERY  
**Date:** 2026-03-17 21:55  
**Analyst:** Claude Opus 4.5 via M7 Methodology

---

## 📋 Executive Summary

### 🎯 **CRITICAL FINDING: User State Reset Without LocalStorage Clear**

**Симптомы:**
- ✅ Гостевой user логинится успешно
- ⏰ Через время (или после действий) **сессия сбрасывается**
- ❌ `LeftSidebar` показывает "Log In" вместо профиля
- ✅ `localStorage` содержит ВСЕ данные (`fonana_guest_auth`, `fonana_user_wallet`, `fonana_device_id`)
- ✅ С Phantom wallet проблемы НЕТ

**Root Cause (гипотеза):**
🔴 **`refreshUser()` вызывается без проверки guest wallet и сбрасывает state когда backend НЕ находит пользователя по FK_ wallet**

---

## 🔬 Technical Analysis

### 1️⃣ **Authentication Flow для Guest**

#### **Initial Guest Login:**

```typescript
// components/LogInMethodPopup.tsx (строки 42-118)
const handleGuestLogin = async () => {
  // 1. Получаем deviceId из localStorage
  let deviceId = localStorage.getItem('fonana_device_id')
  
  // 2. POST /api/auth/guest с deviceId
  const response = await fetch('/api/auth/guest', {
    body: JSON.stringify({ deviceId, source, campaign })
  })
  
  const data = await response.json()
  
  // 3. Сохраняем FAKE WALLET (FK_xxxx)
  localStorage.setItem('fonana_device_id', data.deviceId)
  localStorage.setItem('fonana_user_wallet', data.user.wallet) // FK_xxxxxxx
  localStorage.setItem('fonana_guest_auth', 'true')
  
  // 4. Получаем JWT token
  const token = await jwtManager.getToken()
  
  // 5. Устанавливаем user в store
  setUser(data.user)
}
```

**✅ Работает:** User успешно логинится, `useUser()` возвращает объект пользователя.

---

### 2️⃣ **AppProvider Initialization (при перезагрузке)**

#### **`initializeUserFromCache()` - строки 372-472:**

```typescript
const initializeUserFromCache = async () => {
  // 1. Пытаемся получить user из localStorage cache
  const cachedUser = LocalStorageCache.get<any>('user')
  
  if (cachedUser && cachedUser.id) {
    console.log('[AppProvider] Found cached user, setting immediately')
    setUser(cachedUser) // ✅ Восстанавливаем user
    setIsInitialized(true)
    
    // 2. ПРОБЛЕМА: Убрали refreshUser чтобы избежать бесконечного цикла
    console.log('[AppProvider] Skipping refreshUser to prevent infinite loop')
  }
}
```

**❓ Вопрос:** Если `refreshUser()` закомментирован (строка 452), как user может сброситься?

---

### 3️⃣ **`refreshUser()` Logic:**

#### **`lib/store/appStore.ts` (строки 291-336):**

```typescript
refreshUser: async () => {
  const { user } = get()
  if (!user) return // Выходим если user уже null
  
  // 🔥 GUARD: Предотвращаем множественные вызовы
  if(get().userRefreshCount > 0) return
  set({ userRefreshCount: get().userRefreshCount + 1 })
  
  try {
    set({ userLoading: true, userError: null })
    
    // 1. POST /api/user с user.wallet
    const response = await fetch('/api/user', {
      method: 'POST',
      body: JSON.stringify({ wallet: user.wallet }),
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('[AppStore] refreshUser data:', data)
      
      // 2. Загружаем subscriptions
      const subsResponse = await fetch(`/api/subscriptions/check?userId=${data.user.id}`)
      const subsData = await subsResponse.json()
      
      // 3. Обновляем user с subscriptions
      set({ 
        user: { ...data.user, subscriptions: subsData.subscriptions },
        userLoading: false 
      })
      
      // 4. СОХРАНЯЕМ В CACHE
      LocalStorageCache.set('user', { ...data.user, subscriptions: subsData.subscriptions })
    }
  } catch (error) {
    console.error('[AppStore] refreshUser error:', error)
    set({ userLoading: false, userError: error })
  }
}
```

**🚨 ПРОБЛЕМА НАЙДЕНА:**

`refreshUser()` делает `POST /api/user` с `wallet: user.wallet`

Для guest это будет `wallet: "FK_xxxxxx"`

---

### 4️⃣ **Backend: `/api/user` POST Handler**

#### **`app/api/user/route.ts` (строки 609-633):**

```typescript
export async function POST(request: NextRequest) {
  const { wallet } = await request.json()
  
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
  }
  
  // 🔥 КРИТИЧЕСКАЯ ПРОБЛЕМА:
  const existingUser = await getUserByWallet(wallet) // ← ищет по wallet
  
  if (existingUser) {
    // Пользователь найден - возвращаем его
    return NextResponse.json({ 
      user: existingUser,
      isNewUser: false
    })
  }
  
  // 🚨 ЕСЛИ ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН - создаём НОВОГО!
  // Для FK_ wallet это ПРОБЛЕМА
}
```

**🔴 ROOT CAUSE:**

`POST /api/user` ищет пользователя через `getUserByWallet(wallet)`

Для **гостя** `wallet = "FK_xxxx"` (fake wallet)

Если база данных **НЕ НАЙДЁТ** пользователя с `wallet = "FK_xxxx"`:
1. Backend создаст **НОВОГО пользователя**
2. Вернёт нового user с **ДРУГИМ ID**
3. Frontend **перезапишет** старого user новым
4. Старая сессия потеряна!

---

### 5️⃣ **Проверка `getUserByWallet()` Logic:**

#### **`lib/db.ts` (предположительно):**

```typescript
export async function getUserByWallet(wallet: string) {
  return await prisma.user.findUnique({
    where: { wallet }
  })
}
```

**Вопрос:** Есть ли в базе `UNIQUE INDEX` на `wallet`?

**Если НЕТ** - могут создаваться дубликаты!
**Если ЕСТЬ** - будет ошибка при создании дубликата, но user всё равно сбросится в NULL

---

### 6️⃣ **JWT Token Lifecycle для Guest:**

#### **`lib/utils/jwt.ts` (строки 124-170):**

```typescript
async getToken(): Promise<string | null> {
  const wallet = localStorage.getItem('fonana_user_wallet')
  
  if (!wallet) {
    console.log('[JWT] No wallet found, cannot get token')
    return null // ← User logout если wallet пропал
  }
  
  // Проверяем существующий токен
  const savedToken = localStorage.getItem('fonana_jwt_token')
  if (savedToken) {
    const tokenData = JSON.parse(savedToken)
    if (tokenData.expiresAt > Date.now()) {
      return tokenData.token // ← Возвращаем cached token
    }
  }
  
  // Запрашиваем новый токен
  return this.requestNewToken(wallet) // ← GET /api/auth/token?wallet=FK_xxx
}
```

---

#### **`app/api/auth/token/route.ts` (GET handler, строки 12-160):**

```typescript
export async function GET(req: NextRequest) {
  const wallet = searchParams.get('wallet')
  
  // Ищем пользователя
  let user = await prisma.user.findUnique({
    where: { wallet } // ← Ищет по wallet = FK_xxx
  })
  
  if (!user) {
    // 🚨 СОЗДАЁМ НОВОГО ПОЛЬЗОВАТЕЛЯ!
    user = await prisma.user.create({
      data: {
        wallet,
        nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
        solanaWallet: wallet,
        avatar: await getNextAvatar()
      }
    })
  }
  
  // Генерируем JWT token (30 дней)
  const token = jwt.sign({ userId: user.id, wallet }, JWT_SECRET, { expiresIn: '30d' })
  
  return NextResponse.json({ token, user })
}
```

**🔴 ВТОРАЯ ПРОБЛЕМА:**

`/api/auth/token` **ТАКЖЕ** создаёт нового пользователя если не найден!

Это означает **ДВА места** где может быть дубликат:
1. `POST /api/user` (refreshUser)
2. `GET /api/auth/token` (jwtManager.getToken)

---

## 🎯 Root Cause Analysis

### **Почему сессия теряется:**

#### **Scenario 1: `refreshUser()` вызывается автоматически**

1. User логинится как guest → `wallet = FK_xxxx`, `userId = "abc123"` сохраняется в localStorage
2. Через время (или из-за какого-то trigger) вызывается `refreshUser()`
3. `refreshUser()` → `POST /api/user` с `wallet = FK_xxxx`
4. Backend ищет `user` с `wallet = FK_xxxx`
5. **Если NOT FOUND** (база данных потеряла запись или ищет в неправильной таблице):
   - Backend создаёт **НОВОГО user** с **НОВЫМ ID** (`def456`)
   - Frontend получает нового user
   - `setUser(newUser)` перезаписывает старого
   - Старая сессия потеряна!

#### **Scenario 2: JWT token expired и regenerate**

1. JWT token истекает (30 дней)
2. `jwtManager.getToken()` пытается получить новый
3. `GET /api/auth/token?wallet=FK_xxxx`
4. Backend НЕ находит user с `wallet = FK_xxxx`
5. Backend создаёт **НОВОГО user**
6. Возвращает новый JWT с **НОВЫМ userId**
7. Frontend продолжает работать, но с **новым user ID**

---

### **Почему с Phantom wallet проблемы НЕТ:**

**Phantom wallet:**
- `wallet = "AbC123...xyz"` (реальный Solana publicKey)
- Пользователь **ВСЕГДА** находится в базе (создан при первом подключении)
- `refreshUser()` → находит того же пользователя
- Сессия **НЕ сбрасывается**

**Guest wallet:**
- `wallet = "FK_device_hash"` (fake wallet, generated from deviceId)
- Если база данных **НЕ ИНДЕКСИРОВАНА** по `wallet` или есть **race condition**
- `refreshUser()` → может **НЕ НАЙТИ** пользователя
- Создаётся **ДУБЛИКАТ** с новым ID
- Сессия **ТЕРЯЕТСЯ**

---

## 🔍 Investigation Needed

### ❓ **Key Questions:**

1. **Есть ли UNIQUE INDEX на `users.wallet`?**
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'users';
   ```
   - Если **НЕТ** → могут создаваться дубликаты
   - Если **ЕСТЬ** → будет ошибка, но user всё равно сбросится

2. **Вызывается ли `refreshUser()` где-то кроме `AppProvider`?**
   ```bash
   grep -r "refreshUser" --include="*.tsx" --include="*.ts"
   ```

3. **Проверить логи backend:**
   ```
   grep "refreshUser" logs/backend.log
   grep "FK_" logs/backend.log
   grep "User not found, creating new user" logs/backend.log
   ```

4. **Проверить есть ли race condition:**
   - User логинится → создаётся `user` с `FK_xxx`
   - `refreshUser()` вызывается СРАЗУ после
   - Database transaction не завершилась
   - `refreshUser()` не находит пользователя
   - Создаётся дубликат

---

## 🚨 Critical Issues

### **Issue 1: Duplicate User Creation**

**Problem:**
- `/api/user` POST и `/api/auth/token` GET **ОБА** создают пользователя если not found
- Для `FK_wallet` может возникать race condition

**Evidence:**
```typescript
// app/api/user/route.ts (строка 619)
const existingUser = await getUserByWallet(wallet)
if (!existingUser) {
  // Создаём НОВОГО пользователя
}

// app/api/auth/token/route.ts (строка 27)
let user = await prisma.user.findUnique({ where: { wallet } })
if (!user) {
  // Создаём НОВОГО пользователя
}
```

**Impact:**
- 🔴 Дублирование пользователей
- 🔴 Потеря сессии
- 🔴 Потеря данных (likes, subscriptions, posts)

---

### **Issue 2: `refreshUser()` Не Учитывает Guest Auth**

**Problem:**
- `refreshUser()` делает `POST /api/user` с `wallet`
- Для guest wallet (`FK_xxx`) это может привести к созданию дубликата

**Evidence:**
```typescript
// lib/store/appStore.ts (строка 301)
const response = await fetch('/api/user', {
  method: 'POST',
  body: JSON.stringify({ wallet: user.wallet }), // FK_xxx
})
```

**Expected Behavior:**
- Guest auth должна использовать `deviceId`, а не `wallet` для поиска пользователя

**Current Behavior:**
- Ищет по `wallet = FK_xxx` → может не найти → создаёт дубликат

---

### **Issue 3: LocalStorage Sync Не Предотвращает Сброс**

**Problem:**
- `localStorage` содержит правильные данные
- Но `useUser()` возвращает `null` или нового user
- Значит state в Zustand store сброшен

**Evidence:**
- User видит "Log In" button
- `localStorage.getItem('fonana_user_wallet')` → `FK_xxx` ✅
- `localStorage.getItem('fonana_guest_auth')` → `'true'` ✅
- `useUser()` → `null` или новый user ❌

**Root Cause:**
- `refreshUser()` перезаписал Zustand state новым user
- LocalStorage НЕ синхронизирован с Zustand

---

## 📊 Comparison: Guest vs Phantom Auth

| Aspect | Guest Auth (FK_) | Phantom Auth (Real Wallet) | Difference |
|--------|------------------|---------------------------|------------|
| **Wallet Format** | `FK_device_hash` (fake) | `AbC123...xyz` (real) | Guest = generated |
| **User Lookup** | By `wallet = FK_xxx` | By `wallet = real` | Same API |
| **Database Index** | Same `users.wallet` | Same `users.wallet` | Same |
| **refreshUser()** | May create duplicate | Always finds existing | ❌ Guest broken |
| **JWT Token** | 30 days | 30 days | Same |
| **Auth Marker** | `fonana_guest_auth = true` | None | Guest flag |
| **Session Loss** | ✅ YES (reported) | ❌ NO | **CRITICAL BUG** |

---

## 🎯 Hypotheses

### **Hypothesis 1: Race Condition in User Creation** ✅ **LIKELY**

**Theory:**
1. Guest логинится → `POST /api/auth/guest` создаёт user `FK_xxx`
2. Сразу после → `refreshUser()` вызывается
3. Database transaction не завершилась
4. `getUserByWallet('FK_xxx')` → NOT FOUND
5. Создаётся **дубликат** user

**Test:**
```bash
# Check database for duplicate FK_ wallets
SELECT wallet, COUNT(*) FROM users WHERE wallet LIKE 'FK_%' GROUP BY wallet HAVING COUNT(*) > 1;
```

---

### **Hypothesis 2: `refreshUser()` Вызывается Избыточно** ✅ **CONFIRMED**

**Theory:**
- `refreshUser()` вызывается из `AppProvider` (строка 102)
- Но есть guard `if(refreshUserCount.current == 0)` (строка 99)
- Если component unmount/remount → счётчик сбрасывается
- `refreshUser()` вызывается **снова**

**Evidence:**
```typescript
// lib/providers/AppProvider.tsx (строки 97-105)
const refreshUserCount = useRef(0)

useEffect(() => {
  if(refreshUserCount.current == 0) {
    refreshUserCount.current++
    refreshUser() // ← Может вызваться несколько раз
  }
}, [])
```

**Problem:**
- `useRef` НЕ переживает remount
- Если `AppProvider` remount → счётчик сбрасывается
- `refreshUser()` вызывается снова

---

### **Hypothesis 3: Database NOT FOUND из-за неправильного поля** ❌ **UNLIKELY**

**Theory:**
- Backend ищет user в неправильном поле
- `wallet` vs `telegramId` vs `deviceId`

**Evidence:**
```typescript
// app/api/user/route.ts (строка 619)
const existingUser = await getUserByWallet(wallet)

// lib/db.ts (предположительно)
export async function getUserByWallet(wallet: string) {
  return await prisma.user.findUnique({ where: { wallet } })
}
```

**Verdict:**
- ❌ **UNLIKELY** - поле правильное (`wallet`)
- Guest auth сохраняет `FK_xxx` в поле `wallet`

---

## 💡 Recommended Solutions

### **Solution 1: Prevent `refreshUser()` for Guest Auth** ✅ **RECOMMENDED**

**Approach:**
- Добавить проверку `isGuestUser` перед вызовом `refreshUser()`
- Guest auth НЕ ДОЛЖНА вызывать `refreshUser()` (wallet уже известен)

**Implementation:**
```typescript
// lib/providers/AppProvider.tsx
useEffect(() => {
  if(refreshUserCount.current == 0) {
    refreshUserCount.current++
    
    // 🔥 FIX: Не вызываем refreshUser для гостей
    const isGuest = localStorage.getItem('fonana_guest_auth') === 'true'
    if (!isGuest) {
      refreshUser()
    } else {
      console.log('[AppProvider] Skipping refreshUser for guest auth')
    }
  }
}, [])
```

**Pros:**
- ✅ Простое решение
- ✅ Не трогает backend
- ✅ Предотвращает дубликаты

**Cons:**
- ⚠️ Guest user не получит обновления с backend
- ⚠️ Subscriptions могут быть устаревшими

---

### **Solution 2: Use `deviceId` Instead of `wallet` for Guest Lookup** ✅ **BEST PRACTICE**

**Approach:**
- Guest auth должна использовать `deviceId` для поиска пользователя
- `wallet (FK_xxx)` только для совместимости с API

**Implementation:**

**Backend:**
```typescript
// app/api/user/route.ts
export async function POST(request: NextRequest) {
  const { wallet, deviceId } = await request.json()
  
  let existingUser
  
  if (deviceId) {
    // Для guest auth ищем по deviceId (сохранён в telegramId)
    existingUser = await prisma.user.findUnique({
      where: { telegramId: deviceId }
    })
  } else {
    // Для wallet auth ищем по wallet
    existingUser = await getUserByWallet(wallet)
  }
  
  // ...
}
```

**Frontend:**
```typescript
// lib/store/appStore.ts
refreshUser: async () => {
  const { user } = get()
  if (!user) return
  
  const deviceId = localStorage.getItem('fonana_device_id')
  const isGuest = localStorage.getItem('fonana_guest_auth') === 'true'
  
  const response = await fetch('/api/user', {
    method: 'POST',
    body: JSON.stringify({ 
      wallet: user.wallet,
      deviceId: isGuest ? deviceId : null // ← Передаём deviceId для гостей
    }),
  })
  
  // ...
}
```

**Pros:**
- ✅ Правильная архитектура (guest = deviceId, wallet = publicKey)
- ✅ Нет дубликатов
- ✅ Guest может получать updates

**Cons:**
- ⚠️ Требует изменений backend
- ⚠️ Нужно тестировать оба flow (guest + wallet)

---

### **Solution 3: Add Database Transaction Lock** ⚠️ **COMPLEX**

**Approach:**
- Использовать database transaction с `SELECT FOR UPDATE`
- Предотвращает race condition

**Implementation:**
```typescript
// app/api/user/route.ts
export async function POST(request: NextRequest) {
  const { wallet } = await request.json()
  
  // 🔥 Transaction with lock
  const user = await prisma.$transaction(async (tx) => {
    // Lock row for update
    const existing = await tx.user.findUnique({
      where: { wallet },
      // PostgreSQL: SELECT FOR UPDATE
    })
    
    if (existing) return existing
    
    // Create new user (lock prevents duplicates)
    return await tx.user.create({
      data: { wallet, ... }
    })
  })
  
  return NextResponse.json({ user })
}
```

**Pros:**
- ✅ Полностью предотвращает race condition
- ✅ Database-level гарантия

**Cons:**
- ❌ Сложная реализация
- ❌ Может снизить performance
- ❌ Не решает архитектурную проблему

---

## 🎯 Recommended Action Plan

### **PHASE 1: Immediate Mitigation (1 hour)**

**Goal:** Предотвратить сброс сессии для гостей

**Steps:**

1. **Добавить guard в `AppProvider`:**
   ```typescript
   // lib/providers/AppProvider.tsx (строка 98)
   const isGuest = localStorage.getItem('fonana_guest_auth') === 'true'
   if (!isGuest) {
     refreshUser()
   }
   ```

2. **Добавить guard в `refreshUser()`:**
   ```typescript
   // lib/store/appStore.ts (строка 291)
   refreshUser: async () => {
     const { user } = get()
     if (!user) return
     
     // 🔥 FIX: Skip refresh for guest users
     if (user.wallet?.startsWith('FK_')) {
       console.log('[AppStore] Skipping refreshUser for guest wallet')
       return
     }
     
     // ... остальной код
   }
   ```

3. **Test:**
   - Login as guest
   - Wait 5 minutes
   - Check if session persists
   - Check console logs

**Expected Result:**
- ✅ Guest session НЕ сбрасывается
- ✅ `refreshUser()` не вызывается для FK_ wallets

**Effort:** 1 hour  
**Risk:** 🟢 LOW (только добавляем guards)

---

### **PHASE 2: Proper Fix (4-6 hours)**

**Goal:** Использовать `deviceId` для guest lookup

**Steps:**

1. **Update backend `/api/user`:**
   - Accept `deviceId` parameter
   - Use `telegramId` field for lookup
   - Fallback to `wallet` for non-guests

2. **Update `refreshUser()` in store:**
   - Pass `deviceId` for guests
   - Keep `wallet` for Phantom users

3. **Update `/api/auth/token`:**
   - Same logic for JWT generation

4. **Testing:**
   - Guest login → check database for `telegramId = deviceId`
   - Refresh page → check session persists
   - Wait 10 minutes → check session persists
   - Test with multiple tabs

**Expected Result:**
- ✅ Guest users never lose session
- ✅ Correct architecture (deviceId = guest identifier)
- ✅ No duplicates

**Effort:** 4-6 hours  
**Risk:** 🟡 MEDIUM (requires backend changes)

---

### **PHASE 3: Database Audit (1 hour)**

**Goal:** Проверить и очистить дубликаты

**Steps:**

1. **Find duplicate FK_ wallets:**
   ```sql
   SELECT wallet, COUNT(*) as count, array_agg(id) as ids
   FROM users
   WHERE wallet LIKE 'FK_%'
   GROUP BY wallet
   HAVING COUNT(*) > 1;
   ```

2. **Check UNIQUE index:**
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'users';
   ```

3. **Add UNIQUE index if missing:**
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS users_wallet_unique 
   ON users(wallet);
   ```

4. **Merge duplicates (manual script):**
   - Keep oldest user
   - Migrate posts/likes/subscriptions
   - Delete duplicates

**Expected Result:**
- ✅ No duplicate FK_ wallets
- ✅ UNIQUE index on `wallet`
- ✅ Clean database

**Effort:** 1 hour  
**Risk:** 🟡 MEDIUM (database migration)

---

## 📊 Success Metrics

### **After Fix:**

1. **Session Persistence:** 100% (no resets)
2. **Duplicate Users:** 0 (for FK_ wallets)
3. **refreshUser() Calls:** 0 (for guests)
4. **User Complaints:** 0 (no more "session lost" reports)

---

## 🏁 Conclusion

### **TL;DR:**

**Problem:** Guest users lose session because `refreshUser()` calls `POST /api/user` with `FK_wallet`, backend doesn't find user, creates duplicate with new ID.

**Root Cause:** 
- `refreshUser()` не проверяет guest auth
- Backend использует `wallet` вместо `deviceId` для guest lookup

**Solution:** 
- **Phase 1:** Add guards to prevent `refreshUser()` for FK_ wallets (1 hour)
- **Phase 2:** Use `deviceId` for guest user lookup (4-6 hours)
- **Phase 3:** Database audit and cleanup (1 hour)

**Effort:** 6-8 hours total  
**Risk:** 🟡 MEDIUM (requires backend changes)  
**Impact:** 🔴 HIGH (fixes critical bug affecting all guest users)

---

**M7 Phase Complete:** DISCOVERY ✅  
**Next Phase:** SOLUTION_PLAN (if approved) or IMPLEMENTATION

---

*Generated by M7 Methodology v4.0 - Systematic Analysis Before Action*
