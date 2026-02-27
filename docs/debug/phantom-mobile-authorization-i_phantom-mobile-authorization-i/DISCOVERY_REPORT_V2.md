# 🔍 DISCOVERY REPORT v2: Phantom Mobile Connected State Lost After Reload

**Дата:** 23 февраля 2026  
**M7 Session ID:** `task_phantom-mobile-authorization-i_2769`  
**Статус:** 🟡 NEW ROOT CAUSE FOUND

---

## 📋 UPDATED PROBLEM

### New Symptom After Fix #1:
1. ✅ User connects Phantom on mobile
2. ✅ `PhantomCallbackHandler` processes callback
3. ✅ User data saved to Zustand store
4. ✅ `window.location.href = '/feed'` reloads page
5. ✅ Zustand hydrates `user` from localStorage
6. ❌ **Avatar STILL doesn't appear!**
7. ❌ **"Create" button still asks to login!**

**WHY?** Because `connected = false` after reload!

---

## 🔬 ROOT CAUSE ANALYSIS v2

### The Flow:

#### Before Reload (in PhantomCallbackHandler):

```typescript
// Line 55: Save wallet to localStorage
localStorage.setItem('fonana_user_wallet', publicKey)  // ✅ SAVED

// Line 58-64: Set walletStore connected=true
useWalletStore.getState().updateState({
  connected: true,  // ✅ SET
  publicKey: null,
  // ...
})

// Line 98: Save user to appStore
setUser(userData.user)  // ✅ SAVED TO ZUSTAND

// Line 122: RELOAD
window.location.href = '/feed'  // ← ПРОБЛЕМА: Все stores сбрасываются!
```

#### After Reload (in WalletStoreSync):

```typescript
// components/WalletStoreSync.tsx line 184-244
useEffect(() => {
  const savedWallet = localStorage.getItem('fonana_user_wallet')
  // ✅ Найден: настоящий Solana адрес
  
  // Line 202-208: Проверка маркеров
  const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
  const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
  
  if (!isTelegramAuth && !isGuestAuth) {
    console.log('Not a Telegram or Guest user')
    return  // ← ВЫХОДИТ! НЕ ЭМУЛИРУЕТ connected=true
  }
  
  // ❌ НИКОГДА НЕ ДОХОДИТ до строки 227 где устанавливается connected=true
}, [])
```

```typescript
// BottomNav.tsx line 77
if (!connected || !user) {  // connected = false ❌
  setShowLoginPopup(true)  // ← Показывает "login again"
  return
}
```

---

## 🎯 THE REAL PROBLEM

### Missing Auth Marker for Mobile Phantom Users

**PhantomCallbackHandler saves:**
- ✅ `fonana_user_wallet` = Solana public key
- ✅ `fonana_jwt_token` = JWT token (via jwtManager)
- ✅ `fonana-app-store` = Zustand user data

**PhantomCallbackHandler DOESN'T save:**
- ❌ **ANY marker that this is a mobile Phantom user**

**WalletStoreSync expects:**
- `fonana_telegram_auth = 'true'` OR
- `fonana_guest_auth = 'true'` OR
- `walletAdapter.connected = true` (Phantom extension)

**On mobile after reload:**
- ❌ `fonana_telegram_auth` = не установлен
- ❌ `fonana_guest_auth` = не установлен
- ❌ `walletAdapter.connected` = false (extension не подключен)

**Result:**
- ❌ `WalletStoreSync` skips emulation (`return`)
- ❌ `connected` remains `false`
- ❌ UI shows "login again"

---

## 📊 COMPARISON: Telegram/Guest vs Phantom Mobile

### Telegram/Guest Flow (WORKS):

```
1. User authorizes via Telegram/Guest
   ↓
2. Backend creates user with TG_xxx or FK_xxx wallet
   ↓
3. Frontend saves:
   - fonana_user_wallet = TG_xxx / FK_xxx
   - fonana_telegram_auth = 'true' / fonana_guest_auth = 'true'  ← KEY!
   ↓
4. Page reload
   ↓
5. WalletStoreSync checks:
   - isTelegramAuth? YES → Emulate connected=true ✅
   - isGuestAuth? YES → Emulate connected=true ✅
   ↓
6. UI works ✅
```

### Phantom Mobile Flow (BROKEN):

```
1. User authorizes via Phantom mobile
   ↓
2. PhantomCallbackHandler processes callback
   ↓
3. Frontend saves:
   - fonana_user_wallet = AbCdEf123... (real Solana address)
   - NO AUTH MARKER!  ← PROBLEM!
   ↓
4. Page reload
   ↓
5. WalletStoreSync checks:
   - isTelegramAuth? NO
   - isGuestAuth? NO
   - walletAdapter.connected? NO (extension не подключен на мобильном)
   ↓
6. WalletStoreSync SKIPS emulation (return) ❌
   ↓
7. connected = false ❌
   ↓
8. UI shows "login again" ❌
```

---

## 🔍 CODE EVIDENCE

### PhantomCallbackHandler (MISSING MARKER):

```typescript
// components/PhantomCallbackHandler.tsx line 55
localStorage.setItem('fonana_user_wallet', publicKey)  // ✅ Saved

// ❌ ОТСУТСТВУЕТ:
// localStorage.setItem('fonana_phantom_mobile_auth', 'true')
// ИЛИ
// localStorage.setItem('fonana_mobile_wallet_auth', 'true')
```

### WalletStoreSync (NEEDS MARKER):

```typescript
// components/WalletStoreSync.tsx line 202-208
const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
// ❌ ОТСУТСТВУЕТ:
// const isMobilePhantom = localStorage.getItem('fonana_phantom_mobile_auth') === 'true'

if (!isTelegramAuth && !isGuestAuth) {  // ← Нужно добавить !isMobilePhantom
  console.log('Not a Telegram or Guest user')
  return  // ← EXITS, doesn't emulate connected=true
}
```

---

## 💡 SOLUTION OPTIONS

### Option 1: Add Mobile Phantom Auth Marker ✅ (RECOMMENDED)

**PhantomCallbackHandler:**
```typescript
// After line 55
localStorage.setItem('fonana_user_wallet', publicKey)
localStorage.setItem('fonana_phantom_mobile_auth', 'true')  // ← ADD THIS
```

**WalletStoreSync:**
```typescript
// Line 202-205
const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
const isMobilePhantom = localStorage.getItem('fonana_phantom_mobile_auth') === 'true'  // ← ADD

if (!isTelegramAuth && !isGuestAuth && !isMobilePhantom) {  // ← UPDATE
  return
}
```

**Pros:**
- ✅ Простое решение (2 строки в каждом файле)
- ✅ Consistent с существующей логикой (Telegram/Guest pattern)
- ✅ Явно показывает тип авторизации

**Cons:**
- ⚠️ Нужно обновить 2 файла

---

### Option 2: Check for Valid Solana Address ⚠️

**WalletStoreSync:**
```typescript
// После line 195
const savedWallet = localStorage.getItem('fonana_user_wallet')
if (!savedWallet) return

// Check if it's a valid Solana address (не TG_ или FK_)
const isRealSolanaWallet = !savedWallet.startsWith('TG_') && 
                           !savedWallet.startsWith('FK_') &&
                           savedWallet.length === 44  // Solana адрес всегда 44 символа

if (isRealSolanaWallet) {
  // Это мобильный Phantom пользователь, эмулируем connected=true
}
```

**Pros:**
- ✅ Не нужен дополнительный маркер
- ✅ Автоматически работает для всех Solana кошельков

**Cons:**
- ⚠️ Менее явно (harder to debug)
- ⚠️ Может эмулировать connected=true для десктопа (если extension отключен)

---

### Option 3: Detect Mobile Device ⚠️

```typescript
const isMobile = /android|iphone|ipad/i.test(navigator.userAgent)
const hasRealSolanaWallet = savedWallet && !savedWallet.startsWith('TG_') && !savedWallet.startsWith('FK_')

if (isMobile && hasRealSolanaWallet) {
  // Mobile Phantom user, emulate connected=true
}
```

**Pros:**
- ✅ Автоматически определяет мобильных пользователей

**Cons:**
- ⚠️ User agent detection unreliable
- ⚠️ Что если пользователь переключился с мобильного на десктоп?

---

## 🎯 RECOMMENDED SOLUTION

**Option 1: Mobile Phantom Auth Marker**

**Why:**
- ✅ Explicit and clear
- ✅ Consistent with existing patterns (Telegram/Guest)
- ✅ Easy to debug (can check localStorage)
- ✅ Reliable (no heuristics)

**Implementation:**

### File 1: `components/PhantomCallbackHandler.tsx`

```typescript
// After line 55
localStorage.setItem('fonana_user_wallet', publicKey)
localStorage.setItem('fonana_phantom_mobile_auth', 'true')  // ← ADD
```

### File 2: `components/WalletStoreSync.tsx`

```typescript
// Line 202-205 UPDATE to:
const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
const isMobilePhantom = localStorage.getItem('fonana_phantom_mobile_auth') === 'true'  // ← ADD

if (!isTelegramAuth && !isGuestAuth && !isMobilePhantom) {  // ← UPDATE
  console.log('🔵 [SAVED USER] Not an authenticated user type')
  return
}

// Line 210 UPDATE to:
const userType = isTelegramAuth ? 'Telegram' : (isGuestAuth ? 'Guest' : 'Mobile Phantom')  // ← UPDATE
```

### File 3: `components/BottomNav.tsx` (Logout)

```typescript
// Line 138-142 ADD:
localStorage.removeItem('fonana_user_wallet')
localStorage.removeItem('fonana_jwt_token')
localStorage.removeItem('fonana_telegram_auth')
localStorage.removeItem('fonana_guest_auth')
localStorage.removeItem('fonana_device_id')
localStorage.removeItem('fonana_phantom_mobile_auth')  // ← ADD
```

---

## ⚠️ CRITICAL INSIGHT

### Why This Wasn't Caught Earlier:

**Desktop Phantom DOESN'T need markers because:**
- Desktop has `walletAdapter.connected = true` (extension подключен)
- `WalletStoreSync` handles desktop naturally via `walletAdapter` state

**Mobile Phantom NEEDS marker because:**
- Mobile has `walletAdapter.connected = false` (extension не существует)
- `WalletStoreSync` must EMULATE connection state
- Without marker, doesn't know to emulate

**Pattern in codebase:**
- Telegram → `fonana_telegram_auth = 'true'`
- Guest → `fonana_guest_auth = 'true'`
- Mobile Phantom → **MISSING MARKER** ← This is the bug!

---

## 📋 FILES TO MODIFY

1. **`components/PhantomCallbackHandler.tsx`**
   - Add `localStorage.setItem('fonana_phantom_mobile_auth', 'true')`

2. **`components/WalletStoreSync.tsx`**
   - Add `isMobilePhantom` check
   - Update condition to include `!isMobilePhantom`
   - Update `userType` string

3. **`components/BottomNav.tsx`**
   - Add `localStorage.removeItem('fonana_phantom_mobile_auth')` in logout

---

## ✅ EXPECTED RESULT

**After fix:**

```
1. User connects Phantom mobile
   ↓
2. PhantomCallbackHandler saves marker
   localStorage.setItem('fonana_phantom_mobile_auth', 'true')
   ↓
3. Page reloads
   ↓
4. WalletStoreSync checks:
   - isMobilePhantom? YES ✅
   ↓
5. WalletStoreSync emulates connected=true ✅
   ↓
6. BottomNav sees: connected=true, user exists ✅
   ↓
7. Avatar appears ✅
   ↓
8. "Create" works ✅
```

---

## 🧪 TESTING PLAN

1. **Mobile Phantom login:**
   - Connect → Should show avatar ✅
   - Reload page → Avatar persists ✅
   - "Create" button → Works immediately ✅

2. **Desktop Phantom (regression):**
   - Connect → Works as before ✅
   - No reload needed ✅

3. **Logout:**
   - Logout → Clears marker ✅
   - Re-login → Works again ✅

---

## 🎯 CONFIDENCE

**Root Cause:** 100% identified  
**Solution:** 95% confidence  
**Risk:** Low (follows existing patterns)

**Ready for:** IMPLEMENTATION

---

**Автор:** AI Assistant  
**Дата:** 23 февраля 2026  
**Discovery v2 Time:** 15 минут
