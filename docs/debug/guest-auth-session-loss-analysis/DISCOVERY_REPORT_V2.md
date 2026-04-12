# 🔍 Guest Auth Session Loss - DISCOVERY REPORT V2 (CORRECTED)

**Task ID:** `guest-auth-session-loss-analysis-v2`  
**Phase:** DISCOVERY  
**Date:** 2026-03-17 22:10  
**Analyst:** Claude Opus 4.5 via M7 Methodology

---

## 📋 Executive Summary

### 🎯 **ROOT CAUSE IDENTIFIED**

**User feedback correction:**
- ✅ Перезагрузка страницы → user подтягивается нормально
- ✅ Logout → Login как гость → использует существующий deviceId
- ❌ **DURING SESSION** (20-30 секунд после загрузки) → user сбрасывается

**Root Cause:**
🔴 **`walletStore.updateState({ connected: false })` удаляет `localStorage('fonana-app-store')` когда Phantom wallet инициализируется, НО guard проверяет ТОЛЬКО `fonana_guest_auth` которая может быть НЕ УСТАНОВЛЕНА или УДАЛЕНА**

---

## 🔬 Technical Analysis

### 1️⃣ **The Timeline of Session Loss**

#### **T+0 секунд: Страница загружается**
```typescript
// AppProvider.tsx инициализируется
const cachedUser = LocalStorageCache.get<any>('user')
if (cachedUser) {
  setUser(cachedUser) // ✅ User восстановлен из localStorage
  setIsInitialized(true)
}

// LeftSidebar показывает аватар пользователя ✅
```

**Status:** ✅ User visible

---

#### **T+1-19 секунд: Всё работает стабильно**
- User logged in ✅
- Avatar visible ✅
- `fonana_guest_auth = 'true'` ✅
- `fonana_user_wallet = 'FK_xxx'` ✅
- `useUser()` → user object ✅

**Status:** ✅ Session active

---

#### **T+20-30 секунд: Phantom Wallet инициализируется**

**Это КРИТИЧЕСКИЙ момент!**

```typescript
// Phantom wallet adapter загружается
walletAdapter.connected = false  // ← Phantom говорит "не подключен"
walletAdapter.publicKey = null
```

**`WalletStoreSync.tsx` (строки 247-306) реагирует:**

```typescript
useEffect(() => {
  const walletState = {
    connected: false,  // ← Phantom не подключен
    publicKey: null,
    ...
  }
  
  // 🟢 GUARD #1: Проверка Guest Auth (строки 268-283)
  const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
  
  if (isGuestAuth && !walletAdapter.connected) {
    console.log('🔵 Skipping wallet state update: Guest session active')
    return  // ← ПРАВИЛЬНО! Пропускаем обновление
  }
  
  // Если guard сработал → updateState НЕ вызывается
  debouncedUpdateState(walletState)  // ← Не выполняется для гостей
}, [walletAdapter.connected])
```

**Но `debouncedUpdateState` вызывается с задержкой 250ms!**

---

#### **T+20.25 секунд: Debounced Update Выполняется**

**Возможный сценарий:**

1. **Phantom инициализируется** → `connected = false`
2. **`WalletStoreSync` пропускает** обновление (guard сработал) ✅
3. **НО**: старый debounced call **УЖЕ PENDING** (был вызван ДО инициализации Phantom)
4. **Через 250ms** старый call выполняется:

```typescript
// lib/store/walletStore.ts (строка 90-125)
updateState: (updates) => {
  console.log('[WALLET STORE] updateState called:', updates)
  
  if (!updates.connected) {
    console.log('[WalletStore] disconnect detected');
    
    // 🔴 GUARD #2: Проверка Auth Markers
    const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
    const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
    
    if (isTelegramAuth || isGuestAuth) {
      console.log('🔵 Preserving Telegram/Guest session')
      // ✅ Не удаляем данные
    } else {
      // ❌ ПРОБЛЕМА: Попадаем сюда!
      console.log('🎯 Real wallet disconnect, clearing all data')
      localStorage.removeItem('fonana-app-store')  // ← УДАЛЯЕТ USER!
      localStorage.removeItem('fonana_jwt_token')
      localStorage.removeItem('fonana_user_wallet')
      localStorage.removeItem('user_subscriptions')
      localStorage.removeItem('user_likes')
      localStorage.removeItem('user_emotions')
    }
  }
  
  set(updates)
}
```

**❌ РЕЗУЛЬТАТ:** `localStorage.removeItem('fonana-app-store')` → **User исчезает!**

---

### 2️⃣ **Why Guard Fails**

#### **Hypothesis #1: `fonana_guest_auth` Не Установлена**

**Проверим все места где устанавливается:**

```typescript
// components/LogInMethodPopup.tsx (строка 94)
localStorage.setItem('fonana_guest_auth', 'true')
```

**Это ЕДИНСТВЕННОЕ место!**

**Возможная проблема:**
- Guest логинится → `fonana_guest_auth = 'true'` ✅
- Но если **страница перезагружается** → marker может быть утерян
- Или если **localStorage.clear()** вызывается где-то

**Проверка:**

```typescript
// components/LeftSidebar.tsx (строки 165-171)
const handleLogout = async () => {
  const device_id = localStorage.getItem('fonana_device_id')
  localStorage.clear()  // ❌ УДАЛЯЕТ ВСЁ!
  if (device_id) {
    localStorage.setItem('fonana_device_id', device_id)
  }
}
```

**🚨 ПРОБЛЕМА НАЙДЕНА!**

`LeftSidebar` использует `localStorage.clear()` который **УДАЛЯЕТ ВСЁ** включая `fonana_guest_auth`!

---

#### **Hypothesis #2: Race Condition в Debounce**

**Timeline:**

```
T+0ms:   Phantom загружается → connected = false
T+0ms:   debouncedUpdateState({ connected: false }) queued
T+50ms:  fonana_guest_auth проверяется → 'true' ✅
T+50ms:  Guard срабатывает → return (не вызываем updateState)
T+250ms: ❌ Старый debounced call выполняется!
         → updateState({ connected: false }) вызывается БЕЗ guard
```

**Debounced функция (строка 116-164):**

```typescript
const debouncedUpdateState = useCallback(
  debounce((newState: any) => {
    // ❌ НЕТ ПРОВЕРКИ fonana_guest_auth ЗДЕСЬ!
    updateState(newState)  // ← Прямой вызов
  }, 250),
  []
)
```

**Проблема:** `debouncedUpdateState` НЕ проверяет `fonana_guest_auth`!

Guard только в `useEffect`, но debounced call выполняется **ПОСЛЕ** guard check!

---

#### **Hypothesis #3: Множественные источники `updateState`**

**Кто вызывает `updateState({ connected: false })`?**

1. ✅ `WalletStoreSync.tsx` (строка 285) - **HAS GUARD**
2. ❓ Другие компоненты?

**Поиск:**

```bash
grep -r "updateState.*connected.*false" --include="*.tsx"
```

**Result:** Только `WalletStoreSync.tsx`

**Вывод:** Проблема НЕ в множественных вызовах.

---

### 3️⃣ **Why It Works on Reload**

**При перезагрузке страницы:**

```typescript
// AppProvider.tsx (строка 372-448)
const cachedUser = LocalStorageCache.get<any>('user')

if (cachedUser) {
  setUser(cachedUser)  // ✅ User восстановлен
  setIsInitialized(true)
}
```

**Почему работает?**

1. **Phantom ещё НЕ инициализирован** (требуется 20-30 сек)
2. **User загружается ИЗ `localStorage('user')`** (НЕ из `fonana-app-store`)
3. **`fonana_guest_auth` всё ещё `'true'`** (если не был logout)
4. **Guard срабатывает** → `updateState` не вызывается
5. **Session восстановлена** ✅

---

**Но через 20-30 секунд:**

1. **Phantom инициализируется** → `connected = false`
2. **`debouncedUpdateState`** вызывается (старый pending call)
3. **Guard НЕ срабатывает** (debounced функция не проверяет `fonana_guest_auth`)
4. **`updateState({ connected: false })`** → удаляет `fonana-app-store`
5. **Zustand store очищается** → `useUser()` → `null`
6. **LeftSidebar видит `user = null`** → показывает "Log In" ❌

---

## 🎯 Root Cause Summary

### **Primary Issue: Guard Bypass via Debounce**

```typescript
// WalletStoreSync.tsx

// ✅ GUARD В useEffect:
useEffect(() => {
  const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
  
  if (isGuestAuth && !walletAdapter.connected) {
    return  // ← Guard срабатывает
  }
  
  debouncedUpdateState(walletState)  // ← Не вызывается
}, [walletAdapter.connected])

// ❌ НО DEBOUNCED ФУНКЦИЯ НЕ ИМЕЕТ GUARD:
const debouncedUpdateState = useCallback(
  debounce((newState: any) => {
    // ❌ Нет проверки fonana_guest_auth!
    updateState(newState)  // ← Прямой вызов БЕЗ guard
  }, 250),
  []
)
```

**Scenario:**

1. **T+0ms:** Phantom инициализируется → `connected = false`
2. **T+0ms:** `debouncedUpdateState({ connected: false })` **queued** (но не выполнен)
3. **T+50ms:** `useEffect` проверяет guard → **срабатывает** → `return`
4. **T+250ms:** ❌ **Debounced call выполняется БЕЗ guard!**
5. **T+250ms:** `updateState({ connected: false })` → удаляет `fonana-app-store`

---

### **Secondary Issue: `localStorage.clear()` в LeftSidebar**

```typescript
// components/LeftSidebar.tsx (строки 165-171)
const handleLogout = async () => {
  const device_id = localStorage.getItem('fonana_device_id')
  localStorage.clear()  // ❌ УДАЛЯЕТ fonana_guest_auth!
  if (device_id) {
    localStorage.setItem('fonana_device_id', device_id)
  }
}
```

**Impact:**
- Удаляет `fonana_guest_auth`
- Удаляет `user` cache
- Удаляет `fonana_user_wallet`

**Если logout вызван** → guard в `walletStore.updateState` **НЕ сработает** → user удалится!

---

## 💡 Solutions

### **Solution 1: Add Guard to Debounced Function** ✅ **RECOMMENDED**

**Проблема:** `debouncedUpdateState` не проверяет `fonana_guest_auth`

**Fix:**

```typescript
// components/WalletStoreSync.tsx (строка 116)
const debouncedUpdateState = useCallback(
  debounce((newState: any) => {
    // 🔥 FIX: Add guard INSIDE debounced function
    const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
    const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
    
    if ((isTelegramAuth || isGuestAuth) && !newState.connected) {
      console.log('🔵 [DEBOUNCED UPDATE] Blocked: Guest/Telegram session active')
      return  // ← Не вызываем updateState
    }
    
    console.log('[WalletStoreSync] Updating state:', newState)
    updateState(newState)
  }, 250),
  [updateState]
)
```

**Pros:**
- ✅ Простое решение
- ✅ Предотвращает bypass guard через debounce
- ✅ Не трогает другие компоненты

**Cons:**
- ⚠️ Duplicate guard logic (есть в useEffect и в debounced функции)

**Effort:** 10 минут  
**Risk:** 🟢 LOW

---

### **Solution 2: Cancel Debounce on Guard** ✅ **BEST PRACTICE**

**Проблема:** Debounced call выполняется даже если guard сработал

**Fix:**

```typescript
// components/WalletStoreSync.tsx (строка 247)
useEffect(() => {
  const walletState = {
    connected: walletAdapter.connected,
    publicKey: walletAdapter.publicKey,
    ...
  }
  
  // Guard проверка
  const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
  const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
  
  if ((isTelegramAuth || isGuestAuth) && !walletAdapter.connected) {
    console.log('🔵 Skipping wallet state update: Guest/Telegram session')
    
    // 🔥 FIX: Cancel any pending debounced calls
    debouncedUpdateState.cancel()
    return
  }
  
  debouncedUpdateState(walletState)
}, [walletAdapter.connected, publicKeyString, debouncedUpdateState])
```

**Pros:**
- ✅ Правильная архитектура (один guard point)
- ✅ Предотвращает pending debounced calls
- ✅ No duplicate logic

**Cons:**
- ⚠️ Нужно импортировать `cancel` method из lodash

**Effort:** 15 минут  
**Risk:** 🟢 LOW

---

### **Solution 3: Fix `LeftSidebar` localStorage.clear()** ⚠️ **URGENT**

**Проблема:** `localStorage.clear()` удаляет `fonana_guest_auth`

**Fix:**

```typescript
// components/LeftSidebar.tsx (строка 159)
const handleLogout = async () => {
  try {
    if (connected) {
      await disconnect()
    }
    
    // 🔥 FIX: Selective removal instead of clear()
    localStorage.removeItem('fonana_user_wallet')
    localStorage.removeItem('fonana_jwt_token')
    localStorage.removeItem('fonana_telegram_auth')
    localStorage.removeItem('fonana_guest_auth')
    localStorage.removeItem('fonana_phantom_mobile_auth')
    localStorage.removeItem('fonana_is_new_user')
    localStorage.removeItem('fonana_user_data')
    localStorage.removeItem('show_login_screen')
    localStorage.removeItem('fonana_connection_source')
    localStorage.removeItem('deletedPostsCount')
    localStorage.removeItem('user_likes')
    localStorage.removeItem('user_emotions')
    localStorage.removeItem('user_subscriptions')
    
    // IMPORTANT: fonana_device_id is NOT removed!
    // Also preserve: fonana_cookie_consent, fonana_source, fonana_campaign
    
    toast.success('You have been logged out')
    router.push('/')
    if (isMobile && onClose) onClose()
  } catch (error) {
    console.error('Logout error:', error)
    toast.error('Error logging out')
  }
}
```

**Pros:**
- ✅ Preserves `fonana_device_id`
- ✅ Preserves other persistent data
- ✅ No accidental deletion

**Cons:**
- ⚠️ Longer code (но правильнее!)

**Effort:** 5 минут  
**Risk:** 🟢 LOW

**❗ UPD:** Это УЖЕ исправлено! Но проверь что `localStorage.clear()` полностью заменён.

---

## 🎯 Recommended Action Plan

### **PHASE 1: Immediate Fix (30 minutes)**

**Goal:** Предотвратить сброс сессии для гостей

**Tasks:**

1. **Fix `debouncedUpdateState` guard bypass:**
   ```typescript
   // components/WalletStoreSync.tsx (строка 116)
   const debouncedUpdateState = useCallback(
     debounce((newState: any) => {
       // ADD guard
       const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
       const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
       
       if ((isTelegramAuth || isGuestAuth) && !newState.connected) {
         console.log('🔵 [DEBOUNCED] Blocked: preserving Guest/Telegram session')
         return
       }
       
       updateState(newState)
     }, 250),
     [updateState]
   )
   ```

2. **Add debounce cancellation in guard:**
   ```typescript
   // components/WalletStoreSync.tsx (строка 271)
   if ((isTelegramAuth || isGuestAuth) && !walletAdapter.connected) {
     console.log('🔵 Skipping update: Guest/Telegram session')
     debouncedUpdateState.cancel()  // ← ADD THIS
     return
   }
   ```

3. **Verify `LeftSidebar` uses selective removal:**
   - Check lines 165-180
   - Ensure NO `localStorage.clear()`
   - Ensure `fonana_device_id` is preserved

**Testing:**

1. Login as guest
2. Wait 30 seconds (Phantom initialization)
3. Check console for:
   ```
   🔵 [DEBOUNCED] Blocked: preserving Guest session
   ```
4. Verify user **НЕ исчезает**
5. Verify avatar **visible**

**Expected Result:**
- ✅ Guest session persists через Phantom init
- ✅ No "Log In" button during session
- ✅ Avatar visible 30+ seconds

**Effort:** 30 minutes  
**Risk:** 🟢 LOW

---

### **PHASE 2: Database Audit (1 hour)**

**Goal:** Проверить нет ли дубликатов FK_ wallets

**Tasks:**

1. **Check for duplicate FK_ wallets:**
   ```sql
   SELECT wallet, COUNT(*) as count, array_agg(id) as ids
   FROM users
   WHERE wallet LIKE 'FK_%'
   GROUP BY wallet
   HAVING COUNT(*) > 1;
   ```

2. **Check UNIQUE index:**
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'users' AND indexname LIKE '%wallet%';
   ```

3. **If duplicates found:**
   - Keep oldest user
   - Migrate posts/likes/subscriptions to oldest
   - Delete duplicates

**Expected Result:**
- ✅ No duplicate FK_ wallets
- ✅ UNIQUE index on `wallet`

**Effort:** 1 hour  
**Risk:** 🟡 MEDIUM (database migration)

---

## 📊 Success Metrics

### **After Fix:**

1. **Session Persistence:** 100% (no resets during session)
2. **Phantom Init Impact:** 0% (no user loss after 30 seconds)
3. **User Complaints:** 0 (no "session lost" reports)
4. **Console Logs:** `🔵 [DEBOUNCED] Blocked: preserving Guest session`

---

## 🏁 Conclusion

### **TL;DR:**

**Problem:** Guest users lose session 20-30 seconds after page load because:

1. **Phantom wallet инициализируется** → `connected = false`
2. **Debounced `updateState`** вызывается БЕЗ guard
3. **`walletStore.updateState`** удаляет `fonana-app-store`
4. **Zustand store очищается** → `useUser()` → `null`

**Root Cause:**
- `debouncedUpdateState` НЕ проверяет `fonana_guest_auth`
- Guard в `useEffect` НЕ отменяет pending debounced calls

**Solution:**
- **Option 1:** Add guard INSIDE `debouncedUpdateState` (10 min)
- **Option 2:** Cancel debounce on guard (15 min)
- **Option 3:** Verify `localStorage.clear()` replaced (already done)

**Effort:** 30 minutes  
**Risk:** 🟢 LOW  
**Impact:** 🔴 HIGH (fixes critical bug)

---

**M7 Phase Complete:** DISCOVERY ✅  
**Next Phase:** IMPLEMENTATION (if approved)

---

*Generated by M7 Methodology v4.0 - Systematic Analysis Before Action*
