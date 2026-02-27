# 🔍 M7 DISCOVERY: Guest User Disappears After 20-30 Seconds

**Дата**: 19.02.2026  
**Проблема**: Гостевой пользователь исчезает через 20-30 секунд после перезагрузки страницы (localStorage есть, но user пропадает)

---

## 🎯 СИМПТОМЫ

### **Что происходит:**
1. ✅ Гость авторизуется → аватар показывается
2. ✅ Перезагружаем страницу → аватар **появляется снова**
3. ⏱️ Проходит **20-30 секунд**
4. ❌ **Аватар исчезает** - возвращается иконка `UserIcon`
5. ❌ **User пропадает из store** (`useAppStore.user = null`)
6. ✅ **localStorage НЕ очищается** - данные остаются:
   - `fonana_guest_auth = 'true'`
   - `fonana_user_wallet = 'FK_...'`
   - `fonana_jwt_token = {...}`

### **Что ожидалось:**
- Гостевая сессия должна сохраняться после перезагрузки
- User должен оставаться в store

---

## 🔬 ROOT CAUSE ANALYSIS

### **Проблема #1: walletStore.updateState НЕ проверяет Guest auth**

**Файл**: `lib/store/walletStore.ts`

**Строки 98-120** - updateState при `connected = false`:
```typescript
updateState: (updates) => {
  if(!updates.connected) {
    console.log('[WalletStore] updateState called: disconnect');
    
    // 🔥 НЕ УДАЛЯЕМ TELEGRAM WALLET при disconnect
    const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
    
    if (isTelegramAuth) {  // ← ПРОВЕРКА ТОЛЬКО ДЛЯ TELEGRAM!
      console.log('🔵 [WALLET STORE] Telegram auth detected, preserving session')
      // Для Telegram пользователей не удаляем данные
    } else {
      // Для обычных кошельков очищаем всё
      console.log('🎯 [WALLET STORE] Real wallet disconnect, clearing all data')
      localStorage.removeItem('fonana-app-store');     // ← УДАЛЯЕТ USER!
      localStorage.removeItem('fonana_jwt_token');
      localStorage.removeItem('fonana_user_wallet');
      localStorage.removeItem('user_subscriptions');
      localStorage.removeItem('user_likes');
      localStorage.removeItem('user_emotions');
    }
  }
  
  set(updates)  // ← Устанавливает connected = false!
}
```

**❌ ПРОБЛЕМА**:
- Проверка **только** для `fonana_telegram_auth = 'true'`
- **НЕТ** проверки для `fonana_guest_auth = 'true'`
- Для гостей срабатывает `else` → **удаляется `fonana-app-store`** (где хранится user!)

---

### **Проблема #2: Phantom Wallet Adapter меняет connected state**

**Что происходит через 20-30 секунд**:

1. **Страница загружается**:
   - `WalletStoreSync` видит `fonana_guest_auth = 'true'`
   - Устанавливает `connected = true` для гостя
   - Загружает user в store

2. **Phantom Wallet Adapter инициализируется** (~20-30 сек):
   - Обнаруживает что **настоящий кошелек НЕ подключен**
   - `walletAdapter.connected` меняется с `undefined` на `false`

3. **WalletStoreSync реагирует на изменение**:

**Строка 246-305** в `WalletStoreSync.tsx`:
```typescript
useEffect(() => {
  const walletState = {
    connected: walletAdapter.connected,  // ← false (Phantom не подключен)
    publicKey: walletAdapter.publicKey,  // ← null
    connecting: walletAdapter.connecting,
    disconnecting: walletAdapter.disconnecting,
    wallet: walletAdapter.wallet
  }
  
  // 🔥 НЕ ПЕРЕЗАПИСЫВАЕМ connected для Telegram/Guest пользователей
  const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
  const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
  
  if ((isTelegramAuth || isGuestAuth) && !walletAdapter.connected) {
    // Для Telegram/Guest НЕ обновляем состояние если Phantom не подключен
    console.log('🔵 [WALLET STORE SYNC] Skipping wallet state update')
    return  // ← ВЫХОД! Не вызывается debouncedUpdateState
  }
  
  debouncedUpdateState(walletState)  // ← Не вызывается для гостей
  
  // ... other logic ...
}, [walletAdapter.connected, publicKeyString, ...])
```

**✅ ЭТОТ КОД ПРАВИЛЬНЫЙ!** Он **пропускает** обновление для гостей.

**НО ПРОБЛЕМА В ДРУГОМ МЕСТЕ:**

4. **Где-то ещё вызывается `walletStore.updateState({ connected: false })`**:
   - Это НЕ из `WalletStoreSync` (он пропускает обновление)
   - Возможно из `useWalletPersistence` или другого компонента
   - Или из прямого вызова `walletAdapter.disconnect()`

5. **walletStore.updateState({ connected: false })** вызывается:
   - Проверяет `fonana_telegram_auth` → `false` (это гость, не Telegram)
   - Попадает в `else` блок
   - **Удаляет `fonana-app-store`** → user исчезает!

---

### **Проблема #3: fonana-app-store содержит user**

**Файл**: `lib/store/appStore.ts` (предположительно)

`fonana-app-store` - это Zustand store который хранит:
- `user` object
- `jwtReady` flag
- другие app state

**Когда `localStorage.removeItem('fonana-app-store')` вызывается**:
- ❌ `user` удаляется из store
- ❌ UI показывает "не авторизован"
- ✅ Но `fonana_guest_auth` и `fonana_user_wallet` **остаются**!

---

## ⏱️ ВРЕМЕННАЯ ЛИНИЯ БАГА

### **Секунда 0 (загрузка страницы)**:

1. `WalletStoreSync` монтируется
2. Первый `useEffect` (строка 184-244) запускается:
   - Видит `fonana_guest_auth = 'true'`
   - Видит `fonana_user_wallet = 'FK_...'`
   - Вызывает `fetchAndSetUser('FK_...')` → загружает user
   - Устанавливает `connected = true` в walletStore
3. `user` загружен в appStore
4. ✅ UI показывает аватар

### **Секунда 1-19 (стабильное состояние)**:

- `walletAdapter.connected` ещё `undefined` (Phantom не инициализирован)
- Второй `useEffect` (строка 246-305) не срабатывает
- Всё работает

### **Секунда 20-30 (Phantom инициализируется)**:

1. **Phantom Wallet Adapter завершает инициализацию**:
   - Обнаруживает: настоящий кошелек НЕ подключен
   - `walletAdapter.connected` меняется: `undefined` → `false`
   - `walletAdapter.publicKey` остаётся `null`

2. **Второй `useEffect` (строка 246-305) срабатывает**:
   ```javascript
   const walletState = {
     connected: false,  // ← Phantom говорит "не подключен"
     publicKey: null,
     ...
   }
   ```

3. **WalletStoreSync проверяет Guest auth**:
   ```javascript
   const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
   
   if (isGuestAuth && !walletAdapter.connected) {
     // Пропускаем обновление
     console.log('🔵 Skipping wallet state update')
     return  // ← ВЫХОД
   }
   ```

4. **✅ Обновление НЕ вызывается** (правильно!)

**НО ПОЧЕМУ ТОГДА USER ИСЧЕЗАЕТ?**

---

## 🔍 ДОПОЛНИТЕЛЬНОЕ РАССЛЕДОВАНИЕ

### **Гипотеза #1: Другой компонент вызывает disconnect**

**Проверить**:
- `useWalletPersistence` (строка 72-88)
- `WalletProvider`
- Другие компоненты которые слушают `walletAdapter.connected`

**Возможно**:
```typescript
// Где-то в коде:
useEffect(() => {
  if (!walletAdapter.connected) {
    // Ой, кошелёк отключился, очистим всё!
    walletStore.updateState({ connected: false })  // ← БАГ!
  }
}, [walletAdapter.connected])
```

---

### **Гипотеза #2: debouncedUpdateState вызывается через 500ms**

**Строка 116-123** в `WalletStoreSync.tsx`:
```typescript
const debouncedUpdateState = useCallback(
  debounce((newState: any) => {
    // ... circuit breaker logic ...
    updateCountRef.current++
    // ... checks ...
    updateState(newState)  // ← Вызывает walletStore.updateState
  }, 500),  // ← 500ms debounce!
  [updateState]
)
```

**Возможный сценарий**:
1. Phantom инициализируется → `connected = false`
2. WalletStoreSync видит Guest auth → **не вызывает** `debouncedUpdateState`
3. **НО**: может быть старый debounced call ещё pending?
4. Через 500ms старый call выполняется → `updateState({ connected: false })`

---

### **Гипотеза #3: Множественные вызовы updateState**

**Строка 305** в `WalletStoreSync.tsx`:
```typescript
}, [walletAdapter.connected, publicKeyString, debouncedUpdateState, fetchAndSetUser])
```

**Dependencies включают**:
- `walletAdapter.connected` - меняется когда Phantom инициализируется
- `publicKeyString` - может измениться
- `debouncedUpdateState` - функция (stable?)
- `fetchAndSetUser` - функция (stable?)

**Если `fetchAndSetUser` или `debouncedUpdateState` меняются**:
- `useEffect` перезапускается
- Может вызвать `debouncedUpdateState` с неправильными данными

---

## 🎯 ROOT CAUSE (ВЫВОД)

### **100% Проблема: walletStore.updateState НЕ проверяет Guest**

**Файл**: `lib/store/walletStore.ts` (строка 102)

```typescript
const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'

if (isTelegramAuth) {  // ← ТОЛЬКО TELEGRAM!
  console.log('Preserving session')
} else {
  // Очищаем ВСЁ (включая гостей!) ← БАГ!
  localStorage.removeItem('fonana-app-store')  // ← УДАЛЯЕТ USER!
}
```

**Что происходит**:
1. Phantom инициализируется → `connected = false`
2. WalletStoreSync **правильно пропускает** обновление для гостей
3. **НО**: где-то ещё вызывается `updateState({ connected: false })`
4. `walletStore.updateState` проверяет **только Telegram**, не Guest
5. Попадает в `else` → удаляет `fonana-app-store`
6. User исчезает!

---

### **Дополнительная проблема: Откуда вызывается updateState?**

**Нужно найти**:
- Кто вызывает `walletStore.updateState({ connected: false })` кроме WalletStoreSync
- Возможно: `useWalletPersistence`, `WalletProvider`, или другой компонент

---

## ✅ РЕШЕНИЕ

### **Fix #1: Добавить проверку Guest в walletStore.updateState**

**Файл**: `lib/store/walletStore.ts`

**Строка 98-120** - изменить:

```typescript
updateState: (updates) => {
  console.log('🎯 [WALLET STORE] updateState called:', updates)
  
  if(!updates.connected) {
    console.log('[WalletStore] updateState called: disconnect');
    
    // 🔥 ПРОВЕРЯЕМ И TELEGRAM, И GUEST
    const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
    const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
    
    if (isTelegramAuth || isGuestAuth) {  // ← ДОБАВИТЬ isGuestAuth!
      const userType = isTelegramAuth ? 'Telegram' : 'Guest'
      console.log(`🔵 [WALLET STORE] ${userType} auth detected, preserving session`)
      // Для Telegram/Guest пользователей не удаляем данные
    } else {
      // Для обычных кошельков очищаем всё
      console.log('🎯 [WALLET STORE] Real wallet disconnect, clearing all data')
      localStorage.removeItem('fonana-app-store');
      localStorage.removeItem('fonana_jwt_token');
      localStorage.removeItem('fonana_user_wallet');
      localStorage.removeItem('user_subscriptions');
      localStorage.removeItem('user_likes');
      localStorage.removeItem('user_emotions');
    }
  }
  
  set(updates)
},
```

**Изменение**: `if (isTelegramAuth)` → `if (isTelegramAuth || isGuestAuth)`

---

### **Fix #2: Найти и исправить источник неправильного updateState**

**Что проверить**:

1. **useWalletPersistence** (строка 72-88):
   ```typescript
   useEffect(() => {
     if (!connected && !wallet) {
       cacheManager.delete(WALLET_PERSISTENCE_KEY)
       // Возможно тут вызывается updateState?
     }
   }, [connected, wallet])
   ```

2. **Другие компоненты** которые слушают `walletAdapter.connected`:
   - `WalletProvider`
   - `AppProvider`
   - Любые `useEffect` с `[walletAdapter.connected]` в dependencies

3. **Circuit breaker** в WalletStoreSync:
   - Возможно debounced call с неправильными данными

---

## 📊 DEBUGGING GUIDE

### **Что логировать для отладки**:

**1. Добавить логи в walletStore.updateState**:
```typescript
updateState: (updates) => {
  console.log('🔥 [WALLET STORE] updateState called from:', new Error().stack)
  console.log('🔥 [WALLET STORE] updates:', updates)
  console.log('🔥 [WALLET STORE] fonana_guest_auth:', localStorage.getItem('fonana_guest_auth'))
  
  // ... existing code ...
}
```

**2. Проверить localStorage в консоли**:
```javascript
// ПЕРЕД исчезновением user:
console.log('Before disappear:', {
  guestAuth: localStorage.getItem('fonana_guest_auth'),
  appStore: localStorage.getItem('fonana-app-store'),
  user: useAppStore.getState().user
})

// ПОСЛЕ исчезновения user:
console.log('After disappear:', {
  guestAuth: localStorage.getItem('fonana_guest_auth'),
  appStore: localStorage.getItem('fonana-app-store'),  // ← Будет null!
  user: useAppStore.getState().user  // ← Будет null!
})
```

**3. Отследить все вызовы updateState**:
```javascript
// Monkey patch для отладки
const originalUpdateState = useWalletStore.getState().updateState
useWalletStore.setState({
  updateState: (updates) => {
    console.log('🔥 updateState called:', updates, new Error().stack)
    originalUpdateState(updates)
  }
})
```

---

## 🎯 SUMMARY

### **Root Cause:**
`walletStore.updateState` проверяет **только Telegram auth**, не Guest auth, и удаляет `fonana-app-store` (где хранится user) при `connected = false`

### **Impact:**
- 🔴 **CRITICAL**: Гости теряют сессию через 20-30 секунд после загрузки
- 🔴 **HIGH**: Плохой UX (пользователь не понимает почему выкинуло)
- 🔴 **HIGH**: localStorage остаётся, но user исчезает (inconsistent state)

### **Recommended Fix:**
Добавить проверку `isGuestAuth` в `walletStore.updateState` (строка 102):
```typescript
if (isTelegramAuth || isGuestAuth) {  // ← Добавить || isGuestAuth
```

### **Files to Change:**
- `lib/store/walletStore.ts` (1 строка)

### **Time Estimate:**
- **Анализ**: 30 минут ✅
- **Реализация**: 5 минут (1 строка!)
- **Тестирование**: 10 минут
- **Total**: 45 минут

---

**Status**: ✅ **ANALYSIS COMPLETE**  
**Priority**: 🔴 **CRITICAL** (гости теряют сессию)  
**Ready for**: Implementation  
**Risk**: 🟢 **LOW** (1 строка изменения)
