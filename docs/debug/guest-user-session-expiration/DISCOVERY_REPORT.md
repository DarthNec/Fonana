# 🔍 M7 DISCOVERY: Guest User Session Expiration Bug

**Дата**: 19.02.2026  
**Проблема**: Гостевых пользователей "выбрасывает" через некоторое время - слетает аватар и просит авторизоваться заново

---

## 🎯 СИМПТОМЫ

### **Что происходит:**
1. ✅ Пользователь авторизуется как Guest
2. ✅ Аватар показывается, всё работает
3. ⏱️ Через какое-то время (непонятно сколько)
4. ❌ **Аватар слетает** - возвращается иконка `UserIcon`
5. ❌ **При клике на Profile** - снова показывается `LogInMethodPopup`
6. ❌ **При клике на Create** - снова показывается `LogInMethodPopup`
7. ❌ Пользователь принудительно разлогинен

### **Что ожидалось:**
- Гостевая сессия должна жить **30 дней** (как JWT token)
- Пользователь не должен разлогиниваться сам по себе

---

## 🔬 ROOT CAUSE ANALYSIS

### **Проблема #1: TTL конфликт в StorageService**

**Файл**: `lib/services/StorageService.ts`

**Строка 28** - глобальный TTL:
```typescript
private config: StorageConfig = {
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 дней по умолчанию
  prefix: 'fonana_'
}
```

**Строка 235-238** - проверка JWT token:
```typescript
// Проверяем TTL для токена (1 час)
if (!this.isCacheValid(encryptedData.timestamp)) {
  this.clearJWTToken()
  return null
}
```

**❌ ПРОБЛЕМА**:
- Комментарий говорит "1 час"
- Но `this.isCacheValid()` использует `this.config.ttl` = **7 дней**
- Это проверка **timestamp шифрования**, НЕ времени истечения JWT!

**Строка 141-143** - `isCacheValid`:
```typescript
private isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < this.config.ttl  // ← 7 дней!
}
```

**ЧТО ПРОИСХОДИТ**:
1. JWT token генерируется с `expiresIn: '30d'` (30 дней)
2. StorageService шифрует и сохраняет его с `timestamp: Date.now()`
3. **Через 7 дней**: `isCacheValid()` возвращает `false`
4. StorageService удаляет зашифрованный токен (`clearJWTToken()`)
5. Приложение пытается получить токен → токен не найден
6. Пользователь разлогинен

---

### **Проблема #2: JWT Manager fallback может не сработать**

**Файл**: `lib/utils/jwt.ts`

**Строка 43-67** - loadFromStorage:
```typescript
const stored = storageService.getJWTToken()  // ← Возвращает null после 7 дней!
if (stored) {
  // ...проверка токена
} else {
  console.log('[JWT] No token found in encrypted storage, checking localStorage fallback...')
  
  // Fallback на прямое чтение из localStorage
  const fallbackToken = localStorage.getItem('fonana_jwt_token')
  if (fallbackToken) {
    try {
      const tokenData = JSON.parse(fallbackToken)
      if (tokenData.token && tokenData.expiresAt > Date.now()) {
        console.log('[JWT] Found valid fallback token in localStorage')
        this.token = tokenData
        this.scheduleRefresh()
      }
    }
  }
}
```

**ПРОБЛЕМА**:
- Fallback может найти токен в `localStorage.fonana_jwt_token`
- Но если `connected = false` или `user = null`, UI покажет "не авторизован"

---

### **Проблема #3: WalletStoreSync не проверяет JWT при загрузке**

**Файл**: `components/WalletStoreSync.tsx`

**Строка 184-244** - проверка saved user:
```typescript
useEffect(() => {
  const checkSavedUser = async () => {
    // Если кошелек подключен, ничего не делаем
    if (walletAdapter.connected) {
      return
    }
    
    // Проверяем наличие saved wallet от Telegram/Guest
    const savedWallet = localStorage.getItem('fonana_user_wallet')
    if (!savedWallet) {
      return
    }
    
    // Проверяем маркеры авторизации
    const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
    const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'
    
    if (!isTelegramAuth && !isGuestAuth) {
      return
    }
    
    // Загружаем пользователя
    await fetchAndSetUser(savedWallet)  // ← НЕ проверяет JWT!
    
    // Устанавливаем connected=true
    useWalletStore.getState().updateState({
      connected: true,
      publicKey: null,  // null для гостей
      ...
    })
  }
  
  checkSavedUser()
}, [])  // Запускается только при монтировании
```

**ПРОБЛЕМА**:
- `checkSavedUser()` запускается **1 раз** при загрузке
- Проверяет наличие `fonana_guest_auth = 'true'`
- Устанавливает `connected = true`
- **НЕ проверяет** валидность JWT token!

**ЧТО ПРОИСХОДИТ ЧЕРЕЗ 7 ДНЕЙ**:
1. Пользователь открывает сайт
2. `WalletStoreSync` видит `fonana_guest_auth = 'true'`
3. Пытается загрузить пользователя через `fetchAndSetUser()`
4. `fetchAndSetUser()` вызывает `jwtManager.getToken()`
5. `jwtManager.getToken()` → `StorageService.getJWTToken()` → **null** (TTL истёк)
6. Fallback проверяет `localStorage.fonana_jwt_token` → токен найден
7. Но если токен истёк (`expiresAt < Date.now()`), fallback его **не использует**
8. `jwtManager.getToken()` запрашивает новый токен через `/api/auth/token`
9. **API возвращает новый токен**, но...
10. `useWalletStore` уже установил `connected = true`
11. **НО**: `useAppStore.user` может быть **null** если API фейлится или есть задержка
12. **Результат**: `connected = true`, но `user = null` → UI показывает "не авторизован"

---

### **Проблема #4: Условие в BottomNav требует user AND connected**

**Файл**: `components/BottomNav.tsx`

**Строка 144** (уже исправлено):
```typescript
if (connected && user) {
  return <Avatar />
}
```

**Строка 88** (уже исправлено):
```typescript
onClick: () => {
  if (!connected || !user) {
    setShowLoginPopup(true)
    return
  }
  setShowProfilePanel(true)
}
```

**ПРОБЛЕМА**:
- Если `connected = true`, но `user = null` → аватар не показывается
- Это может случиться если:
  - JWT токен запрашивается, но API медленный
  - Или API фейлится
  - Или пользователь удалён из БД

---

## 🎯 АРХИТЕКТУРНАЯ ПРОБЛЕМА

### **Ошибочное предположение:**

Код предполагает:
- "StorageService TTL = JWT token TTL"

**Но это неправильно!**

Реальность:
- **StorageService TTL**: 7 дней (время жизни **зашифрованного кеша**)
- **JWT Token TTL**: 30 дней (время жизни **самого токена**)

**КОНФЛИКТ**:
```
День 0:   JWT создан (expires: день 30), зашифрован (timestamp: день 0)
День 7:   StorageService TTL истёк → удаляет зашифрованный JWT
День 7+:  JWT Manager ищет токен → не найден (удалён)
          Fallback: проверяет localStorage → токен есть!
          Но если токен валиден, почему UI показывает "не авторизован"?
```

---

## 🔍 ВРЕМЕННАЯ ЛИНИЯ БАГА

### **День 0 (авторизация)**:
1. Гость логинится → создаётся JWT (expires: день 30)
2. JWT сохраняется:
   - `StorageService` (зашифрован, timestamp: день 0)
   - `localStorage.fonana_jwt_token` (открытый текст)
3. `WalletStoreSync` устанавливает `connected = true`
4. `user` загружен в `appStore`
5. ✅ UI показывает аватар

### **День 7 (TTL истекает)**:
1. Пользователь открывает сайт
2. `StorageService.getJWTToken()`:
   - Проверяет `isCacheValid(timestamp: день 0)` → `Date.now() - день0 < 7 дней?` → **false**
   - Вызывает `clearJWTToken()` → удаляет зашифрованный токен
   - Возвращает `null`
3. JWT Manager fallback:
   - Проверяет `localStorage.fonana_jwt_token` → токен найден!
   - Проверяет `tokenData.expiresAt > Date.now()` → **true** (токен ещё валиден 23 дня)
   - Использует токен из fallback
4. **ИЛИ** (если fallback не сработал):
   - JWT Manager запрашивает новый токен через API
   - API возвращает новый токен
5. `WalletStoreSync.checkSavedUser()`:
   - Видит `fonana_guest_auth = 'true'`
   - Вызывает `fetchAndSetUser()`
   - `jwtManager.getToken()` → токен получен (из fallback или API)
   - Загружает user через `/api/user?wallet=FK_...`
6. **ВОЗМОЖНАЯ ПРОБЛЕМА**:
   - Если API `/api/user` фейлится или медленный
   - `user` остаётся `null`
   - Но `connected = true`
   - ❌ UI показывает "не авторизован" (`connected && user` → `true && null` → false)

---

## 📊 ВОЗМОЖНЫЕ СЦЕНАРИИ БАГА

### **Сценарий 1: API /api/user фейлится**

**Причина**:
- JWT токен валиден
- Но запрос `/api/user?wallet=FK_...` возвращает 404 или 500
- `user` не загружается

**Симптомы**:
- `connected = true`
- `user = null`
- ❌ Аватар не показывается
- ❌ Profile button не работает

**Проверка**:
```javascript
// В консоли браузера
localStorage.getItem('fonana_guest_auth')  // 'true'
localStorage.getItem('fonana_user_wallet') // 'FK_...'
localStorage.getItem('fonana_jwt_token')   // { token, expiresAt, ... }
// Но: useAppStore.getState().user → null
```

---

### **Сценарий 2: JWT токен действительно истёк (после 30 дней)**

**Причина**:
- Прошло 30 дней с момента создания JWT
- JWT токен истёк (`expiresAt < Date.now()`)
- Fallback не использует истёкший токен
- JWT Manager пытается запросить новый через `/api/auth/token`
- **НО**: `/api/auth/token` требует wallet из БД
- Если пользователь удалён или БД недоступна → фейл

**Симптомы**:
- JWT Manager не может получить токен
- `connected` может быть `true` (установлен WalletStoreSync)
- `user = null` (не загружен)
- ❌ UI показывает "не авторизован"

---

### **Сценарий 3: Race condition при загрузке**

**Причина**:
- `WalletStoreSync.checkSavedUser()` запускается **асинхронно**
- Устанавливает `connected = true` **до** загрузки user
- UI рендерится с `connected = true`, `user = null`
- Пока user загружается, UI показывает "не авторизован"

**Симптомы**:
- Кратковременное "мигание" состояния "не авторизован"
- Через 1-2 секунды user загружается и аватар появляется
- **НО**: если загрузка фейлится, user остаётся `null`

---

## 🎯 РЕШЕНИЯ

### **Solution 1: Исправить TTL для JWT в StorageService**

**Проблема**: StorageService использует глобальный TTL (7 дней) для JWT cache

**Решение**: Добавить отдельный TTL для JWT (30+ дней)

**Код**:
```typescript
// StorageService.ts
private config: StorageConfig = {
  ttl: 7 * 24 * 60 * 60 * 1000,        // 7 дней для обычного кеша
  jwtTtl: 30 * 24 * 60 * 60 * 1000,   // 30 дней для JWT
  prefix: 'fonana_'
}

// Изменить проверку JWT
getJWTToken(): string | null {
  try {
    const savedData = this.getItem('jwt_token')
    if (!savedData) return null

    const encryptedData: EncryptedJWT = JSON.parse(savedData)
    
    // Используем отдельный TTL для JWT
    const jwtCacheValid = Date.now() - encryptedData.timestamp < this.config.jwtTtl
    if (!jwtCacheValid) {
      this.clearJWTToken()
      return null
    }

    return this.decrypt(encryptedData)
  } catch (error) {
    console.error('[StorageService] Error loading JWT token:', error)
    this.clearJWTToken()
    return null
  }
}
```

**Плюсы**:
- ✅ Простое решение
- ✅ JWT cache живёт 30 дней (как сам токен)
- ✅ Нет конфликта TTL

**Минусы**:
- ⚠️ Не решает проблему если API `/api/user` фейлится

---

### **Solution 2: Проверять user перед установкой connected**

**Проблема**: `WalletStoreSync` устанавливает `connected = true` до загрузки user

**Решение**: Устанавливать `connected = true` **только после** успешной загрузки user

**Код**:
```typescript
// WalletStoreSync.tsx
const checkSavedUser = async () => {
  // ... existing checks ...
  
  // Загружаем пользователя
  const userLoaded = await fetchAndSetUser(savedWallet)
  
  // Устанавливаем connected ТОЛЬКО если user загружен
  if (userLoaded) {
    useWalletStore.getState().updateState({
      connected: true,
      publicKey: null,
      ...
    })
  } else {
    console.error('[WALLET STORE SYNC] Failed to load user, not setting connected')
    // Очищаем маркеры авторизации
    localStorage.removeItem('fonana_guest_auth')
    localStorage.removeItem('fonana_user_wallet')
  }
}

// Изменить fetchAndSetUser для возврата boolean
const fetchAndSetUser = useCallback(
  debounce(async (wallet: string): Promise<boolean> => {
    try {
      // ... existing logic ...
      const response = await fetch(`/api/user?wallet=${wallet}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setUser(data.user)
          return true  // ← Успех
        }
      }
      return false  // ← Фейл
    } catch (error) {
      console.error('[WALLET STORE SYNC] Error:', error)
      return false  // ← Фейл
    }
  }, 500),
  [setUser, loadSubscriptions]
)
```

**Плюсы**:
- ✅ Гарантирует что `connected = true` только если `user` загружен
- ✅ Решает проблему race condition

**Минусы**:
- ⚠️ Больше изменений в коде
- ⚠️ Может потребовать изменения типов

---

### **Solution 3: Добавить автоматическую перезагрузку при ошибке**

**Проблема**: Если user не загрузился, пользователь "застревает" в неавторизованном состоянии

**Решение**: Добавить retry логику в `WalletStoreSync`

**Код**:
```typescript
// WalletStoreSync.tsx
const checkSavedUser = async (retryCount = 0) => {
  // ... existing checks ...
  
  const userLoaded = await fetchAndSetUser(savedWallet)
  
  if (!userLoaded && retryCount < 3) {
    console.log(`[WALLET STORE SYNC] Failed to load user, retrying... (${retryCount + 1}/3)`)
    setTimeout(() => checkSavedUser(retryCount + 1), 1000 * (retryCount + 1))
    return
  }
  
  if (!userLoaded) {
    console.error('[WALLET STORE SYNC] Failed to load user after 3 retries, clearing session')
    localStorage.removeItem('fonana_guest_auth')
    localStorage.removeItem('fonana_user_wallet')
    localStorage.removeItem('fonana_jwt_token')
    return
  }
  
  // Успех, устанавливаем connected
  useWalletStore.getState().updateState({
    connected: true,
    publicKey: null,
    ...
  })
}
```

**Плюсы**:
- ✅ Автоматическая перезагрузка при временных ошибках
- ✅ Очистка сессии если ошибка постоянная

**Минусы**:
- ⚠️ Добавляет сложность
- ⚠️ Задержка при загрузке (до 6 секунд при ошибке)

---

## 📋 РЕКОМЕНДОВАННОЕ РЕШЕНИЕ

### **🎯 Комбинированный подход (Solution 1 + Solution 2)**

**Что делать**:

1. **Исправить StorageService TTL для JWT** (Solution 1)
   - Добавить `jwtTtl: 30 дней`
   - Использовать отдельный TTL для JWT cache

2. **Добавить проверку user перед connected** (Solution 2)
   - `fetchAndSetUser()` возвращает `boolean`
   - `connected = true` только если user загружен

3. **Опционально**: Добавить retry логику (Solution 3)

**Время реализации**: 30-40 минут  
**Риск**: Средний  
**Тестирование**: Нужно тестировать edge cases

---

## 🔍 ЧТО ПРОВЕРИТЬ ПРИ DEBUGGING

### **В консоли браузера**:

```javascript
// 1. Проверить маркеры авторизации
localStorage.getItem('fonana_guest_auth')        // 'true' or null
localStorage.getItem('fonana_telegram_auth')     // 'true' or null
localStorage.getItem('fonana_user_wallet')       // 'FK_...' or null

// 2. Проверить JWT token
const jwtData = JSON.parse(localStorage.getItem('fonana_jwt_token'))
console.log({
  hasToken: !!jwtData?.token,
  expiresAt: new Date(jwtData?.expiresAt),
  isExpired: jwtData?.expiresAt < Date.now()
})

// 3. Проверить user в store
const user = useAppStore.getState().user
console.log('User in store:', user)

// 4. Проверить connected
const connected = useWalletStore.getState().connected
console.log('Connected:', connected)

// 5. Проверить зашифрованный JWT
const encryptedJwt = localStorage.getItem('fonana_jwt_token')
console.log('Encrypted JWT:', encryptedJwt ? 'exists' : 'missing')
```

---

## ✅ TESTING CHECKLIST

### **После фикса проверить**:

1. **День 0 (свежая авторизация)**:
   - [ ] Гость логинится
   - [ ] Аватар показывается
   - [ ] JWT token сохранён
   - [ ] `connected = true`, `user` есть

2. **День 7 (TTL StorageService истекает)**:
   - [ ] Пользователь открывает сайт
   - [ ] Аватар **всё ещё показывается** ✅
   - [ ] JWT token загружен из fallback или API
   - [ ] User загружен
   - [ ] `connected = true`, `user` есть

3. **День 30 (JWT token истекает)**:
   - [ ] Пользователь открывает сайт
   - [ ] Новый JWT token запрашивается через API
   - [ ] User загружен
   - [ ] `connected = true`, `user` есть

4. **API фейл (сеть недоступна)**:
   - [ ] Пользователь открывает сайт
   - [ ] Retry логика пытается загрузить user
   - [ ] Если фейл → сессия очищается
   - [ ] Показывается `LoginPopup`

---

## 🎯 SUMMARY

### **Root Cause:**
1. **StorageService TTL = 7 дней** (удаляет зашифрованный JWT)
2. **JWT Token TTL = 30 дней** (сам токен ещё валиден)
3. **Конфликт**: После 7 дней StorageService удаляет JWT cache
4. **Race condition**: `connected = true` устанавливается до загрузки user

### **Impact:**
- ❌ Гости разлогиниваются через ~7 дней
- ❌ UX ужасный (пользователь не понимает почему выкинуло)
- ❌ Потеря пользователей (нужно заново логиниться)

### **Recommended Fix:**
1. Исправить StorageService TTL для JWT (30 дней)
2. Проверять user перед установкой `connected = true`
3. Добавить retry логику для устойчивости

### **Files to Change:**
- `lib/services/StorageService.ts` (TTL fix)
- `components/WalletStoreSync.tsx` (user check before connected)

### **Time Estimate:**
- **Анализ**: 30 минут ✅
- **Реализация**: 30-40 минут
- **Тестирование**: 20 минут
- **Total**: ~1.5 часа

---

**Status**: ✅ **ANALYSIS COMPLETE**  
**Priority**: 🔴 **CRITICAL** (пользователи теряют сессии)  
**Risk**: 🟡 **MEDIUM** (затрагивает core auth logic)
