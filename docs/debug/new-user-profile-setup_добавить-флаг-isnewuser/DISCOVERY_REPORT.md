# 🔍 M7 DISCOVERY REPORT
## Задача: Добавление `isNewUser` флага и автоматическое открытие ProfileSetupModal

**Дата:** 4 февраля 2026
**Session ID:** `task_проанализировать-почему-кнопка_3756`
**Задача:** Добавить флаг `isNewUser` в API ответ при создании нового пользователя, обработать на клиенте и автоматически открыть ProfileSetupModal

---

## 📋 КРАТКОЕ РЕЗЮМЕ

**Проблема:** При подключении кошелька создаётся новый пользователь (если его не было), но клиент не получает информацию о том, что пользователь новый. Поэтому ProfileSetupModal не открывается автоматически.

**Цель:** 
1. Добавить флаг `isNewUser: boolean` в ответ API `/api/auth/token`
2. Обработать этот флаг на клиенте
3. Автоматически открыть `ProfileSetupModal` для заполнения профиля

---

## 🔍 ТЕКУЩАЯ АРХИТЕКТУРА

### 1. Backend: `/api/auth/token/route.ts`

#### GET метод (строки 58-185):
```typescript
// Ищем пользователя
let user = await prisma.user.findUnique({
  where: { wallet }
})

if (!user) {
  // Создаём нового пользователя (строки 81-92)
  user = await prisma.user.create({
    data: {
      wallet,
      nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
      solanaWallet: wallet
    }
  })
  // ❌ НО isNewUser НЕ возвращается в ответе!
}

// Возвращаем ответ (строки 164-176)
return NextResponse.json({
  token: token,
  expiresAt: tokenExpiresAt.toISOString(),
  user: {
    id: user.id,
    wallet: user.wallet,
    nickname: user.nickname,
    isCreator: user.isCreator,
    isVerified: user.isVerified,
    avatar: user.avatar,
    fullName: user.fullName
  }
  // ❌ isNewUser: true ОТСУТСТВУЕТ!
})
```

**Проблема:** API НЕ сообщает клиенту, что пользователь только что был создан.

---

#### POST метод (строки 188-315):

Та же самая проблема - пользователь создаётся (строки 211-222), но `isNewUser` не возвращается.

---

### 2. Frontend: Потребители API

#### 2.1 `lib/utils/jwt.ts` (строки 193-253)

```typescript
const response = await fetch(`/api/auth/token?wallet=${wallet}`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})

const data = await response.json()
// data содержит: { token, expiresAt, user }
// ❌ isNewUser отсутствует!

// Сохраняем токен
this.token = {
  token: data.token,
  expiresAt,
  userId: data.user.id,
  wallet: data.user.wallet
}
```

**Проблема:** `jwtManager` получает ответ, но не обрабатывает `isNewUser`.

---

#### 2.2 `components/WalletStoreSync.tsx` (строки 54-181)

```typescript
const fetchAndSetUser = useCallback(async (walletAddress: string) => {
  try {
    const response = await fetch(`/api/user?wallet=${walletAddress}`)
    // ⚠️ Делает запрос в /api/user, а НЕ /api/auth/token!
    // isNewUser будет в /api/auth/token, но fetchAndSetUser его не получит
    
    const userData = await response.json()
    if (userData.user) {
      console.log('🎯 [WALLET STORE SYNC] Setting user:', userData.user.nickname)
      setUser(userData.user)
      // ❌ ProfileSetupModal НЕ открывается!
    }
  } catch (error) {
    console.error('🎯 [WALLET STORE SYNC] Error fetching user:', error)
  }
}, [setUser])

// Вызывается при подключении кошелька (строка 286)
if (walletState.connected && walletState.publicKey) {
  const walletAddress = walletState.publicKey.toBase58()
  fetchAndSetUser(walletAddress)
}
```

**Проблема:** 
- `WalletStoreSync` вызывает `/api/user`, а не `/api/auth/token`
- Даже если добавить `isNewUser` в `/api/auth/token`, `WalletStoreSync` его не получит

---

#### 2.3 `components/LogInMethodPopup.tsx` (строки 78-90)

```typescript
// Telegram login
const userResponse = await fetch(`/api/auth/token?wallet=${fakeWallet}`)
const userData = await userResponse.json()

if (!userData.user) {
  throw new Error('No user data in response')
}

// Сохраняем пользователя
setUser(userData.user)
// ❌ isNewUser не обрабатывается!
```

**Проблема:** Telegram login вызывает `/api/auth/token`, но не обрабатывает `isNewUser`.

---

### 3. Frontend: ProfileSetupModal

#### `components/ProfileSetupModal.tsx`

```typescript
interface ProfileSetupModalProps {
  isOpen: boolean  // ← Управляется извне!
  onClose: () => void
  onComplete: (profileData: ProfileData) => void
  userWallet?: string
  mode?: 'create' | 'edit'
  initialData?: Partial<ProfileData>
}
```

**Как используется:**
- Модалка должна быть открыта через `isOpen={true}`
- Управление `isOpen` должно быть в родительском компоненте

**Проблема:** НЕТ компонента, который управляет `isOpen` для новых пользователей!

---

### 4. Архитектура ClientShell

#### `components/ClientShell.tsx` (строки 53-138)

```typescript
export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <WalletProvider>
            <WalletPersistenceProvider>
              <AppProvider>
                <div className="flex min-h-screen">
                  <LeftSidebar />
                  <main>{children}</main>
                  <BottomNav />
                  <AiChatWidget />
                  <ReferralNotification />
                  <VerifyAccountPopup />
                  {/* ❌ ProfileSetupModal НЕ подключена! */}
                </div>
                <Toaster />
                <ServiceWorkerRegistration />
              </AppProvider>
            </WalletPersistenceProvider>
          </WalletProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

**Проблема:** `ProfileSetupModal` вообще не подключена в глобальном layout!

---

## 🔴 НАЙДЕННЫЕ ПРОБЛЕМЫ

### Критические:

1. **Backend НЕ возвращает `isNewUser`:**
   - `/api/auth/token` создаёт пользователя, но не сообщает об этом клиенту
   - Нужно добавить флаг `isNewUser: true` в ответ

2. **Несогласованность API:**
   - `WalletStoreSync` вызывает `/api/user` (не `/api/auth/token`)
   - `LogInMethodPopup` вызывает `/api/auth/token`
   - Разные entry points → разные ответы

3. **ProfileSetupModal не подключена:**
   - Модалка существует, но не используется в глобальном layout
   - Нет механизма автоматического открытия для новых пользователей

4. **Отсутствие state management:**
   - Нет глобального state для отслеживания `isNewUser`
   - Нет механизма передачи флага от API до компонента

---

### Некритические:

5. **JWT Manager не обрабатывает `isNewUser`:**
   - `lib/utils/jwt.ts` получает ответ от API
   - Но не возвращает `isNewUser` наружу

6. **Дублирование логики:**
   - `GET` и `POST` методы в `/api/auth/token` имеют одинаковую логику создания пользователя
   - Нужно учитывать оба места

---

## 🎯 РЕШЕНИЕ: ПОШАГОВЫЙ ПЛАН

### BACKEND: `/api/auth/token/route.ts`

#### Шаг 1: Добавить флаг `isNewUser` в GET метод

**Местоположение:** `app/api/auth/token/route.ts`
**Строки:** 77-110, 164-176

**Изменения:**
```typescript
// 1. Добавить переменную для отслеживания
let isNewUser = false

// 2. Установить флаг при создании (строка 77)
if (!user) {
  isNewUser = true  // ← Новая строка
  user = await prisma.user.create({ ... })
}

// 3. Вернуть флаг в ответе (строки 164-176)
return NextResponse.json({
  token: token,
  expiresAt: tokenExpiresAt.toISOString(),
  isNewUser: isNewUser,  // ← Новая строка
  user: {
    id: user.id,
    wallet: user.wallet,
    nickname: user.nickname,
    isCreator: user.isCreator,
    isVerified: user.isVerified,
    avatar: user.avatar,
    fullName: user.fullName
  }
})
```

**Также для случая с existing token (строки 116-131):**
```typescript
if (user.token && user.tokenExpiresAt && user.tokenExpiresAt > new Date()) {
  return NextResponse.json({
    token: user.token,
    expiresAt: user.tokenExpiresAt.toISOString(),
    isNewUser: false,  // ← Новая строка (существующий пользователь)
    user: { ... }
  })
}
```

---

#### Шаг 2: Добавить флаг `isNewUser` в POST метод

**Местоположение:** `app/api/auth/token/route.ts`
**Строки:** 207-240, 294-306

**Аналогичные изменения:**
```typescript
let isNewUser = false

if (!user) {
  isNewUser = true
  user = await prisma.user.create({ ... })
}

// Также для existing token case
if (user.token && user.tokenExpiresAt && user.tokenExpiresAt > new Date()) {
  return NextResponse.json({
    token: user.token,
    expiresAt: user.tokenExpiresAt.toISOString(),
    isNewUser: false,  // ← Existing user
    user: { ... }
  })
}

// И в основном ответе
return NextResponse.json({
  token: token,
  expiresAt: tokenExpiresAt.toISOString(),
  isNewUser: isNewUser,  // ← New user flag
  user: { ... }
})
```

---

### FRONTEND: Архитектура

#### Шаг 3: Создать глобальный компонент для управления ProfileSetupModal

**Новый файл:** `components/NewUserProfileSetup.tsx`

**Задача:**
- Слушать изменения в `appStore` (или создать новый state)
- Автоматически открывать `ProfileSetupModal` для новых пользователей
- Закрывать после завершения setup

**Структура:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import ProfileSetupModal from './ProfileSetupModal'
import { useUser } from '@/lib/store/appStore'

export default function NewUserProfileSetup() {
  const [showSetup, setShowSetup] = useState(false)
  const user = useUser()

  useEffect(() => {
    // Проверяем флаг isNewUser из localStorage или state
    const isNewUser = localStorage.getItem('fonana_is_new_user') === 'true'
    
    if (isNewUser && user && user.id) {
      setShowSetup(true)
    }
  }, [user])

  const handleComplete = async (profileData: ProfileData) => {
    // Сохраняем профиль через API
    // Убираем флаг isNewUser
    localStorage.removeItem('fonana_is_new_user')
    setShowSetup(false)
  }

  const handleClose = () => {
    // Можно закрыть, но флаг остаётся (напомним позже)
    setShowSetup(false)
  }

  return (
    <ProfileSetupModal
      isOpen={showSetup}
      onClose={handleClose}
      onComplete={handleComplete}
      userWallet={user?.wallet}
      mode="create"
      initialData={{
        nickname: user?.nickname,
        fullName: user?.fullName,
        avatar: user?.avatar
      }}
    />
  )
}
```

---

#### Шаг 4: Интегрировать в ClientShell

**Файл:** `components/ClientShell.tsx`
**Строка:** После `<VerifyAccountPopup />` (~line 120)

**Изменения:**
```typescript
import NewUserProfileSetup from '@/components/NewUserProfileSetup'

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <WalletProvider>
            <WalletPersistenceProvider>
              <AppProvider>
                <div className="flex min-h-screen">
                  {/* ... existing layout ... */}
                  <ReferralNotification />
                  <VerifyAccountPopup />
                  <NewUserProfileSetup />  {/* ← Новая строка */}
                </div>
                <Toaster />
                <ServiceWorkerRegistration />
              </AppProvider>
            </WalletPersistenceProvider>
          </WalletProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

---

#### Шаг 5: Обработать `isNewUser` в точках вызова API

##### 5.1 `components/WalletStoreSync.tsx`

**Проблема:** Вызывает `/api/user`, а не `/api/auth/token`

**Решение 1 (рекомендуется):** Вызывать `/api/auth/token` вместо `/api/user`

**Файл:** `components/WalletStoreSync.tsx`
**Строки:** 54-181 (функция `fetchAndSetUser`)

**Изменения:**
```typescript
const fetchAndSetUser = useCallback(async (walletAddress: string) => {
  try {
    // СТАРОЕ:
    // const response = await fetch(`/api/user?wallet=${walletAddress}`)
    
    // НОВОЕ: Используем /api/auth/token
    const response = await fetch(`/api/auth/token?wallet=${walletAddress}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }
    
    const userData = await response.json()
    
    if (userData.user) {
      console.log('🎯 [WALLET STORE SYNC] Setting user:', userData.user.nickname)
      setUser(userData.user)
      
      // ✅ НОВОЕ: Обрабатываем isNewUser
      if (userData.isNewUser) {
        console.log('🎯 [WALLET STORE SYNC] New user detected, setting flag')
        localStorage.setItem('fonana_is_new_user', 'true')
      }
      
      // Загружаем подписки
      loadSubscriptions(userData.user.id)
    }
  } catch (error) {
    console.error('🎯 [WALLET STORE SYNC] Error fetching user:', error)
  }
}, [setUser, loadSubscriptions])
```

**Альтернатива:** Оставить `/api/user`, но добавить `isNewUser` в `/api/user` тоже.

---

##### 5.2 `components/LogInMethodPopup.tsx`

**Файл:** `components/LogInMethodPopup.tsx`
**Строки:** 78-100

**Изменения:**
```typescript
// 4. ПОЛУЧАЕМ ПОЛНЫЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
const userResponse = await fetch(`/api/auth/token?wallet=${fakeWallet}`)

if (!userResponse.ok) {
  throw new Error('Failed to fetch user data')
}

const userData = await userResponse.json()

if (!userData.user) {
  throw new Error('No user data in response')
}

// 5. СОХРАНЯЕМ ПОЛЬЗОВАТЕЛЯ
setUser(userData.user)

// ✅ НОВОЕ: Обрабатываем isNewUser
if (userData.isNewUser) {
  console.log('🔵 [TELEGRAM LOGIN] New user detected, setting flag')
  localStorage.setItem('fonana_is_new_user', 'true')
}

// 6. ЭМУЛИРУЕМ КОШЕЛЕК
useWalletStore.getState().updateState({ ... })
```

---

##### 5.3 `lib/utils/jwt.ts` (опционально)

**Файл:** `lib/utils/jwt.ts`
**Строки:** 193-253

**Изменения:**
```typescript
const data = await response.json()

if (!data.token) {
  console.error('[JWT] Invalid response:', data)
  return null
}

// ✅ НОВОЕ: Сохраняем isNewUser в localStorage
if (data.isNewUser) {
  console.log('[JWT] New user detected, setting flag')
  localStorage.setItem('fonana_is_new_user', 'true')
}

// Сохраняем токен
this.token = {
  token: data.token,
  expiresAt,
  userId: data.user.id,
  wallet: data.user.wallet
}
```

**Примечание:** Это опционально, т.к. `WalletStoreSync` и `LogInMethodPopup` уже обрабатывают флаг.

---

## 📊 ТАБЛИЦА ИЗМЕНЕНИЙ

| Файл | Строки | Изменения | Тип |
|------|--------|-----------|-----|
| **app/api/auth/token/route.ts** | 77-110 | Добавить `isNewUser = true` при создании (GET) | Backend |
| **app/api/auth/token/route.ts** | 116-131 | Добавить `isNewUser: false` для existing token (GET) | Backend |
| **app/api/auth/token/route.ts** | 164-176 | Добавить `isNewUser` в ответ (GET) | Backend |
| **app/api/auth/token/route.ts** | 207-240 | Добавить `isNewUser = true` при создании (POST) | Backend |
| **app/api/auth/token/route.ts** | 246-261 | Добавить `isNewUser: false` для existing token (POST) | Backend |
| **app/api/auth/token/route.ts** | 294-306 | Добавить `isNewUser` в ответ (POST) | Backend |
| **components/NewUserProfileSetup.tsx** | NEW FILE | Создать компонент управления ProfileSetupModal | Frontend |
| **components/ClientShell.tsx** | ~120 | Добавить `<NewUserProfileSetup />` | Frontend |
| **components/WalletStoreSync.tsx** | 54-181 | Изменить `/api/user` → `/api/auth/token`, обработать `isNewUser` | Frontend |
| **components/WalletStoreSync.tsx** | ~95 | Сохранить `fonana_is_new_user` в localStorage | Frontend |
| **components/LogInMethodPopup.tsx** | 78-100 | Обработать `isNewUser` из ответа | Frontend |
| **components/LogInMethodPopup.tsx** | ~92 | Сохранить `fonana_is_new_user` в localStorage | Frontend |

**Итого:** 2 файла изменены (backend), 1 новый файл, 3 файла изменены (frontend)

---

## 🔄 DATAFLOW DIAGRAM

### Текущий Flow (БЕЗ isNewUser):

```
User подключает кошелёк
    ↓
WalletAdapter (Phantom)
    ↓
WalletStoreSync.fetchAndSetUser()
    ↓
GET /api/user?wallet=XXX
    ↓
prisma.user.findUnique() → user exists
    ↓
Return { user: {...} }
    ↓
setUser(userData.user)
    ↓
❌ ProfileSetupModal НЕ открывается
```

---

### Новый Flow (С isNewUser):

```
User подключает кошелёк (впервые)
    ↓
WalletAdapter (Phantom)
    ↓
WalletStoreSync.fetchAndSetUser()
    ↓
GET /api/auth/token?wallet=XXX  ← Изменено!
    ↓
prisma.user.findUnique() → user NOT found
    ↓
isNewUser = true  ← Новое!
prisma.user.create({ ... })
    ↓
Return { token, isNewUser: true, user: {...} }  ← Новое!
    ↓
setUser(userData.user)
localStorage.setItem('fonana_is_new_user', 'true')  ← Новое!
    ↓
NewUserProfileSetup слушает localStorage
    ↓
useEffect → обнаруживает fonana_is_new_user === 'true'
    ↓
setShowSetup(true)
    ↓
✅ ProfileSetupModal ОТКРЫВАЕТСЯ!
    ↓
User заполняет профиль
    ↓
handleComplete() → сохраняет данные
    ↓
localStorage.removeItem('fonana_is_new_user')
    ↓
setShowSetup(false)
```

---

## 🧪 ТЕСТОВЫЕ СЦЕНАРИИ

### Сценарий 1: Новый пользователь через Phantom

1. Пользователь открывает сайт
2. Нажимает "Connect Wallet"
3. Выбирает Phantom
4. Подтверждает подключение
5. **Ожидается:** ProfileSetupModal открывается автоматически
6. Заполняет nickname, fullName, bio
7. Нажимает "Complete"
8. **Ожидается:** Модалка закрывается, флаг `fonana_is_new_user` удалён

---

### Сценарий 2: Существующий пользователь

1. Пользователь (уже зарегистрированный) открывает сайт
2. Подключает кошелёк
3. **Ожидается:** ProfileSetupModal НЕ открывается
4. **Проверка:** `isNewUser === false` в ответе API

---

### Сценарий 3: Новый пользователь через Telegram

1. Пользователь нажимает "Log in with Telegram"
2. Авторизуется через Telegram widget
3. **Ожидается:** ProfileSetupModal открывается автоматически
4. Заполняет профиль
5. **Ожидается:** Модалка закрывается

---

### Сценарий 4: Пользователь закрыл модалку без заполнения

1. Новый пользователь подключил кошелёк
2. ProfileSetupModal открылся
3. Пользователь нажал "X" (закрыть)
4. **Ожидается:** Модалка закрывается, но флаг `fonana_is_new_user` **остаётся**
5. При следующем входе модалка откроется снова
6. **Опция:** Добавить "Skip for now" кнопку, которая удаляет флаг

---

## 🎯 АЛЬТЕРНАТИВНЫЕ РЕШЕНИЯ

### Вариант 1 (текущий): localStorage флаг

**Плюсы:**
- ✅ Простая реализация
- ✅ Работает между страницами
- ✅ Персистентность (сохраняется при reload)

**Минусы:**
- ❌ localStorage может быть очищен пользователем
- ❌ Не синхронизирован между вкладками (может открыться дважды)

---

### Вариант 2: Добавить поле `profileCompleted` в БД

**Изменения:**
```sql
ALTER TABLE users ADD COLUMN "profileCompleted" BOOLEAN DEFAULT FALSE;
```

**Backend:**
```typescript
// При создании пользователя
user = await prisma.user.create({
  data: {
    wallet,
    nickname: `user_${wallet.slice(0, 8).toLowerCase()}`,
    profileCompleted: false  // ← Новое поле
  }
})

// В ответе
return NextResponse.json({
  token,
  isNewUser: !user.profileCompleted,  // ← Основано на БД
  user: { ... }
})
```

**Frontend:**
```typescript
// Проверяем не localStorage, а user.profileCompleted
if (!user.profileCompleted) {
  setShowSetup(true)
}

// После завершения
await fetch('/api/user/profile', {
  method: 'PATCH',
  body: JSON.stringify({ profileCompleted: true })
})
```

**Плюсы:**
- ✅ Синхронизировано между вкладками
- ✅ Не зависит от localStorage
- ✅ Надёжнее

**Минусы:**
- ❌ Требует миграцию БД
- ❌ Дополнительный API endpoint

---

### Вариант 3: Комбинированный подход

**Backend:**
```typescript
// Возвращаем оба флага
return NextResponse.json({
  token,
  isNewUser: true,  // Только что создан
  user: {
    ...user,
    profileCompleted: user.profileCompleted || false
  }
})
```

**Frontend:**
```typescript
// Проверяем оба условия
if (userData.isNewUser || !userData.user.profileCompleted) {
  localStorage.setItem('fonana_show_profile_setup', 'true')
}
```

**Плюсы:**
- ✅ Надёжность БД
- ✅ Быстрота localStorage
- ✅ Fallback механизм

**Минусы:**
- ❌ Сложнее реализация

---

## 💡 РЕКОМЕНДАЦИИ

### Приоритет 1 (MUST HAVE):

1. ✅ Добавить `isNewUser` в `/api/auth/token` (GET и POST)
2. ✅ Создать `NewUserProfileSetup.tsx` компонент
3. ✅ Интегрировать в `ClientShell.tsx`
4. ✅ Обработать в `WalletStoreSync.tsx` и `LogInMethodPopup.tsx`

### Приоритет 2 (SHOULD HAVE):

5. ✅ Добавить "Skip for now" кнопку в ProfileSetupModal
6. ✅ Добавить поле `profileCompleted` в БД (для будущего)

### Приоритет 3 (NICE TO HAVE):

7. ✅ Добавить аналитику (трек открытия модалки)
8. ✅ Добавить A/B тестирование (с/без автооткрытия)

---

## ✅ СЛЕДУЮЩИЕ ШАГИ

1. ✅ Discovery завершён
2. ⏳ Создать ARCHITECTURE_CONTEXT.md (детали интеграции)
3. ⏳ Создать SOLUTION_PLAN.md (код изменений)
4. ⏳ Создать IMPACT_ANALYSIS.md (риски и последствия)
5. ⏳ Получить утверждение пользователя
6. ⏳ Реализовать изменения

---

**Автор:** M7 Analysis System
**Версия:** 1.0
**Статус:** ✅ Готово к review
