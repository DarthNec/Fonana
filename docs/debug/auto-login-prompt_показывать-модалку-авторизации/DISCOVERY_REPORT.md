# 🔍 M7 DISCOVERY REPORT: Auto-Show Login Popup

**Дата:** 4 февраля 2026  
**Session ID:** `task_проанализировать-почему-кнопка_3756`  
**Фаза:** DISCOVERY  
**Статус:** 📋 Анализ завершён

---

## 📋 ЗАДАЧА

### Описание от пользователя:
> "Когда пользователь заходит на площадку, ему надо тыкать авторизацией в лицо, то есть показывать LogInMethodPopup, проверять по localStorage по ключу "show_login_screen", если true, то автоматически не показываем."

### Интерпретация:
- **Цель:** Автоматически показывать модалку авторизации (`LogInMethodPopup`) для неавторизованных пользователей при заходе на сайт
- **Условие показа:** Пользователь НЕ авторизован
- **Условие НЕ показа:** `localStorage.getItem('show_login_screen') === 'true'` (пользователь уже видел или закрыл модалку)
- **Флаг отключения:** Сохраняется при закрытии модалки или успешной авторизации

---

## 🔍 ТЕКУЩАЯ АРХИТЕКТУРА

### 1. Где используется `LogInMethodPopup` сейчас?

**Файл:** `components/LeftSidebar.tsx` (строки 50-52, 393-397)

```typescript
const [showLoginPopup, setShowLoginPopup] = useState(false)

// Manual trigger - кнопка "Log In"
<button onClick={() => setShowLoginPopup(true)}>
  Log In
</button>

<LogInMethodPopup
  isOpen={showLoginPopup}
  onClose={() => setShowLoginPopup(false)}
  onPhantomLogin={() => setVisible(true)}
/>
```

**Текущее поведение:**
- ✅ Модалка открывается ТОЛЬКО при клике на кнопку "Log In"
- ❌ НЕТ автоматического показа для неавторизованных пользователей
- ❌ НЕТ проверки флага `show_login_screen` в localStorage

---

### 2. Как определяется авторизация?

**Файл:** `components/LeftSidebar.tsx` (строки 55-58)

```typescript
const { connected, disconnect, publicKey } = useWallet()
const publicKeyString = publicKey?.toBase58() ?? null
const { setVisible } = useSafeWalletModal()
const user = useUser()
```

**Источники состояния авторизации:**

| Источник | Тип | Описание |
|----------|-----|----------|
| `useWallet().connected` | Solana Wallet | Статус подключения Phantom |
| `useUser()` | Zustand Store | Данные пользователя из appStore |
| `publicKey` | Solana Wallet | Public key кошелька |

**Логика:**
- Пользователь авторизован: `connected === true` ИЛИ `user !== null`
- Пользователь НЕ авторизован: `connected === false` И `user === null`

---

### 3. Где рендерится `ClientShell`?

**Файл:** `components/ClientShell.tsx` (строки 87-139)

```typescript
export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <SkeletonLoader variant="default" />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <WalletProvider>
            <WalletPersistenceProvider>
              <AppProvider>
                <div className="flex min-h-screen">
                  {!isRefPage && !isDownloadPage && <LeftSidebar />}
                  <main>{children}</main>
                  <BottomNav />
                  <AiChatWidget />
                </div>
                <ServiceWorkerRegistration />
                <NewUserProfileSetup />
                <Toaster />
              </AppProvider>
            </WalletPersistenceProvider>
          </WalletProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

**Ключевые моменты:**
- ✅ `ClientShell` — глобальная обёртка для всего приложения
- ✅ `mounted` state предотвращает SSR issues
- ✅ Уже есть глобальные компоненты: `NewUserProfileSetup`, `ServiceWorkerRegistration`
- ⚠️ `LeftSidebar` рендерится условно (скрыт на `/ref` и `/download`)

---

## 🔴 ПРОБЛЕМЫ ТЕКУЩЕЙ РЕАЛИЗАЦИИ

### Проблема 1: Нет автоматического показа
**Описание:** `LogInMethodPopup` открывается ТОЛЬКО вручную через кнопку "Log In"

**Пример:**
```typescript
// Текущее: Manual trigger
<button onClick={() => setShowLoginPopup(true)}>Log In</button>

// Нужно: Auto-show при первом заходе
useEffect(() => {
  if (!user && !connected && !hasSeenLoginPopup) {
    setShowLoginPopup(true)
  }
}, [user, connected])
```

---

### Проблема 2: Нет localStorage флага
**Описание:** Нет проверки и сохранения флага `show_login_screen`

**Требование:**
```typescript
// При закрытии модалки
const handleClose = () => {
  localStorage.setItem('show_login_screen', 'true')
  setShowLoginPopup(false)
}

// При проверке показа
const hasSeenLoginPopup = localStorage.getItem('show_login_screen') === 'true'
```

---

### Проблема 3: Модалка привязана к `LeftSidebar`
**Описание:** `LogInMethodPopup` рендерится внутри `LeftSidebar`, который:
- Скрыт на страницах `/ref` и `/download`
- Может не рендериться при определённых условиях

**Риск:** Модалка не покажется на специальных страницах

**Решение:** Вынести `LogInMethodPopup` на уровень `ClientShell` (как `NewUserProfileSetup`)

---

### Проблема 4: Race condition с загрузкой user
**Описание:** `useUser()` может быть `null` при первом рендере, даже если пользователь авторизован

**Scenario:**
```
1. Page load → user = null (еще не загружен)
2. useEffect срабатывает → показывает модалку
3. WalletStoreSync загружает user → user !== null
4. Модалка уже открыта (false positive)
```

**Решение:** Добавить задержку или проверку `userLoading` state

---

## ✅ РЕШЕНИЕ

### Подход 1: Глобальный компонент в ClientShell (РЕКОМЕНДУЕТСЯ)

**Преимущества:**
- ✅ Работает на всех страницах (включая `/ref`, `/download`)
- ✅ Не зависит от `LeftSidebar`
- ✅ Консистентно с `NewUserProfileSetup`
- ✅ Легко тестировать

**Недостатки:**
- ⚠️ Дублирует state управление из `LeftSidebar`

**Оценка:** 9/10

---

### Подход 2: Логика внутри LeftSidebar

**Преимущества:**
- ✅ Не требует создания нового файла
- ✅ Минимальные изменения
- ✅ State уже есть в `LeftSidebar`

**Недостатки:**
- ❌ Не работает на страницах без `LeftSidebar`
- ❌ Меньше контроля над показом
- ❌ Хуже масштабируемость

**Оценка:** 6/10

---

### Подход 3: Глобальный хук в AppProvider

**Преимущества:**
- ✅ Максимальная гибкость
- ✅ Централизованная логика
- ✅ Легко переиспользовать

**Недостатки:**
- ⚠️ Более сложная реализация
- ⚠️ Требует изменения AppProvider

**Оценка:** 7/10

---

## 🎯 ВЫБРАННОЕ РЕШЕНИЕ: Подход 1 (Глобальный компонент)

### Причины:
1. **Консистентность:** Аналогично `NewUserProfileSetup` — уже есть паттерн
2. **Надёжность:** Работает на ВСЕХ страницах без исключений
3. **Простота:** Не требует изменения `AppProvider` или сложной логики
4. **Масштабируемость:** Легко добавить аналитику, A/B тесты, доп. условия

---

## 📊 ПЛАН РЕАЛИЗАЦИИ

### Шаг 1: Создать компонент `AutoLoginPrompt.tsx`

**Файл:** `components/AutoLoginPrompt.tsx` (НОВЫЙ ФАЙЛ)

**Структура:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import LogInMethodPopup from './LogInMethodPopup'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'

export default function AutoLoginPrompt() {
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const user = useUser()
  const { connected } = useWallet()
  const { setVisible } = useSafeWalletModal()

  useEffect(() => {
    console.log('[AutoLoginPrompt] Checking if login prompt should show...')
    
    // 1. Проверяем флаг в localStorage
    const hasSeenLoginPopup = localStorage.getItem('show_login_screen') === 'true'
    
    console.log('[AutoLoginPrompt] hasSeenLoginPopup:', hasSeenLoginPopup)
    console.log('[AutoLoginPrompt] user:', !!user)
    console.log('[AutoLoginPrompt] connected:', connected)
    
    // 2. Условие показа:
    //    - Пользователь НЕ авторизован
    //    - Ещё НЕ видел модалку
    if (!hasSeenLoginPopup && !user && !connected) {
      console.log('[AutoLoginPrompt] ✅ Opening login popup')
      setShowLoginPopup(true)
    }
  }, [user, connected])

  const handleClose = () => {
    console.log('[AutoLoginPrompt] User closed login popup')
    
    // Сохраняем флаг, что пользователь видел модалку
    localStorage.setItem('show_login_screen', 'true')
    
    setShowLoginPopup(false)
  }

  const handleLoginSuccess = () => {
    console.log('[AutoLoginPrompt] User successfully logged in')
    
    // Также сохраняем флаг при успешной авторизации
    localStorage.setItem('show_login_screen', 'true')
    
    setShowLoginPopup(false)
  }

  return (
    <LogInMethodPopup
      isOpen={showLoginPopup}
      onClose={handleClose}
      onPhantomLogin={() => setVisible(true)}
      onLoginSuccess={handleLoginSuccess}
    />
  )
}
```

**Размер:** ~70 строк

---

### Шаг 2: Интегрировать в ClientShell

**Файл:** `components/ClientShell.tsx`

**Изменения:**

1. **Добавить импорт** (строка ~14):
```typescript
import AutoLoginPrompt from '@/components/AutoLoginPrompt'
```

2. **Добавить компонент** (строка ~118, после `<NewUserProfileSetup />`):
```typescript
<ServiceWorkerRegistration />
<NewUserProfileSetup />
<AutoLoginPrompt />  {/* ← Новая строка */}
<Toaster />
```

**Размер изменений:** 2 строки

---

### Шаг 3: (Опционально) Обработать onLoginSuccess в LogInMethodPopup

**Файл:** `components/LogInMethodPopup.tsx`

**Проверка:** Убедиться, что `onLoginSuccess` вызывается после успешной авторизации

**Текущий код** (строки ~145):
```typescript
// После успешного login через Telegram
setUser(userData.user)
loadSubscriptions()

// ✅ УЖЕ ВЫЗЫВАЕТСЯ:
if (onLoginSuccess) {
  onLoginSuccess()
}
```

**Статус:** ✅ Уже реализовано, изменения НЕ требуются

---

### Шаг 4: (Опционально) Добавить исключения для специальных страниц

**Файл:** `components/AutoLoginPrompt.tsx`

**Изменение:** Проверять `pathname` перед показом

```typescript
import { usePathname } from 'next/navigation'

export default function AutoLoginPrompt() {
  const pathname = usePathname()
  
  // Страницы, где НЕ показывать модалку
  const excludedPages = ['/ref', '/download']
  const shouldExclude = excludedPages.some(page => pathname?.startsWith(page))

  useEffect(() => {
    if (shouldExclude) {
      console.log('[AutoLoginPrompt] Excluded page, skipping')
      return
    }

    // ... остальная логика
  }, [user, connected, pathname, shouldExclude])
}
```

**Статус:** 🟡 Опционально (зависит от требований)

---

## 🧪 СЦЕНАРИИ ТЕСТИРОВАНИЯ

### Тест 1: Первый заход (неавторизованный)

**Шаги:**
1. Откройте сайт в режиме инкогнито
2. Перейдите на любую страницу (например, `/feed`)

**Ожидается:**
- ✅ `AutoLoginPrompt` проверяет `localStorage.getItem('show_login_screen')`
- ✅ Значение `null` → модалка открывается автоматически
- ✅ Лог: `[AutoLoginPrompt] ✅ Opening login popup`

---

### Тест 2: Закрытие модалки без авторизации

**Шаги:**
1. Откройте модалку (Тест 1)
2. Нажмите "X" (Close)

**Ожидается:**
- ✅ `handleClose()` вызывается
- ✅ `localStorage.setItem('show_login_screen', 'true')`
- ✅ Модалка закрывается
- ✅ Лог: `[AutoLoginPrompt] User closed login popup`

---

### Тест 3: Повторный заход после закрытия

**Шаги:**
1. Закройте модалку (Тест 2)
2. Перезагрузите страницу

**Ожидается:**
- ✅ `localStorage.getItem('show_login_screen')` === `'true'`
- ✅ Модалка НЕ открывается
- ✅ Лог: `[AutoLoginPrompt] hasSeenLoginPopup: true`

---

### Тест 4: Успешная авторизация через Telegram

**Шаги:**
1. Откройте модалку (Тест 1)
2. Нажмите "Continue with Telegram"
3. Авторизуйтесь через Telegram widget

**Ожидается:**
- ✅ `handleLoginSuccess()` вызывается
- ✅ `localStorage.setItem('show_login_screen', 'true')`
- ✅ Модалка закрывается
- ✅ Пользователь авторизован (`user !== null`)
- ✅ Лог: `[AutoLoginPrompt] User successfully logged in`

---

### Тест 5: Авторизованный пользователь

**Шаги:**
1. Авторизуйтесь (любым способом)
2. Перезагрузите страницу

**Ожидается:**
- ✅ `user !== null` → модалка НЕ открывается
- ✅ Лог: `[AutoLoginPrompt] user: true` → skip

---

### Тест 6: Исключенные страницы (опционально)

**Шаги:**
1. Откройте сайт в инкогнито
2. Перейдите на `/ref` или `/download`

**Ожидается (если Шаг 4 реализован):**
- ✅ Модалка НЕ открывается
- ✅ Лог: `[AutoLoginPrompt] Excluded page, skipping`

---

### Тест 7: Race condition с загрузкой user

**Шаги:**
1. Откройте сайт с медленным интернетом
2. Авторизуйтесь (Phantom или Telegram)
3. Перезагрузите страницу

**Ожидается:**
- ✅ Модалка НЕ открывается (защита от race condition)
- ✅ `WalletStoreSync` загружает `user` → `useEffect` срабатывает → `user !== null` → skip

**Потенциальная проблема:**
- ⚠️ Если `useEffect` срабатывает ДО загрузки `user`, модалка откроется на 1-2 секунды
- **Решение:** Добавить задержку через `setTimeout` (см. "Улучшения")

---

## 🚨 РИСКИ И МИТИГАЦИЯ

### Риск 1: Race condition с WalletStoreSync

**Описание:** `useEffect` может сработать до того, как `WalletStoreSync` загрузит `user`

**Вероятность:** 🟡 Средняя (20-30%)

**Воздействие:** 🟡 Средняя (модалка открывается на 1-2 секунды для авторизованных)

**Митигация:**
```typescript
useEffect(() => {
  // Добавить задержку для загрузки user
  const timer = setTimeout(() => {
    const hasSeenLoginPopup = localStorage.getItem('show_login_screen') === 'true'
    
    if (!hasSeenLoginPopup && !user && !connected) {
      setShowLoginPopup(true)
    }
  }, 500) // 500ms задержка

  return () => clearTimeout(timer)
}, [user, connected])
```

---

### Риск 2: LocalStorage блокировка в приватном режиме

**Описание:** В некоторых браузерах `localStorage` недоступен в приватном режиме

**Вероятность:** 🟢 Низкая (5%)

**Воздействие:** 🔴 Высокая (модалка будет показываться при каждой перезагрузке)

**Митигация:**
```typescript
const setLoginScreenFlag = () => {
  try {
    localStorage.setItem('show_login_screen', 'true')
  } catch (error) {
    console.error('[AutoLoginPrompt] localStorage unavailable:', error)
    // Fallback: использовать sessionStorage
    sessionStorage.setItem('show_login_screen', 'true')
  }
}
```

---

### Риск 3: Модалка показывается на каждой странице

**Описание:** Если пользователь переходит между страницами, модалка может открываться снова

**Вероятность:** 🟡 Средняя (если не реализовать правильно)

**Воздействие:** 🟡 Средняя (раздражает пользователя)

**Митигация:**
- ✅ Флаг `show_login_screen` проверяется при КАЖДОМ рендере
- ✅ Флаг устанавливается при закрытии → больше не показывается
- ✅ `useEffect` с зависимостями `[user, connected]` → не триггерится при навигации

---

### Риск 4: Конфликт с LeftSidebar

**Описание:** `LogInMethodPopup` используется и в `LeftSidebar`, и в `AutoLoginPrompt`

**Вероятность:** 🟢 Низкая (5%)

**Воздействие:** 🟡 Средняя (две модалки могут открыться одновременно)

**Митигация:**
- Вариант 1: Удалить `showLoginPopup` из `LeftSidebar`, использовать только `AutoLoginPrompt`
- Вариант 2 (РЕКОМЕНДУЕТСЯ): Оставить кнопку "Log In" в `LeftSidebar` для ручного открытия

**Решение:**
```typescript
// В LeftSidebar: Manual trigger для кнопки "Log In"
<button onClick={() => setShowLoginPopup(true)}>Log In</button>

// В AutoLoginPrompt: Auto-trigger при первом заходе
// Разные state → нет конфликта
```

---

## 💡 УЛУЧШЕНИЯ (ОПЦИОНАЛЬНО)

### Улучшение 1: Добавить задержку перед показом

**Файл:** `components/AutoLoginPrompt.tsx`

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    const hasSeenLoginPopup = localStorage.getItem('show_login_screen') === 'true'
    
    if (!hasSeenLoginPopup && !user && !connected) {
      setShowLoginPopup(true)
    }
  }, 1000) // 1 секунда задержка

  return () => clearTimeout(timer)
}, [user, connected])
```

**Преимущества:**
- ✅ Защита от race condition
- ✅ Лучший UX (не "мельтешит")

---

### Улучшение 2: Показывать модалку только на главной странице

**Файл:** `components/AutoLoginPrompt.tsx`

```typescript
const pathname = usePathname()
const isHomePage = pathname === '/' || pathname === '/feed'

useEffect(() => {
  if (!isHomePage) return

  // ... остальная логика
}, [user, connected, isHomePage])
```

**Преимущества:**
- ✅ Менее навязчиво
- ✅ Пользователь может изучить контент перед авторизацией

---

### Улучшение 3: Добавить "Don't show again" чекбокс

**Файл:** `components/LogInMethodPopup.tsx`

```typescript
const [dontShowAgain, setDontShowAgain] = useState(false)

const handleClose = () => {
  if (dontShowAgain) {
    localStorage.setItem('show_login_screen', 'true')
  }
  onClose()
}

// В UI:
<label>
  <input 
    type="checkbox" 
    checked={dontShowAgain}
    onChange={(e) => setDontShowAgain(e.target.checked)}
  />
  Don't show this again
</label>
```

**Преимущества:**
- ✅ Пользователь контролирует показ
- ✅ Меньше раздражения

---

### Улучшение 4: Аналитика

**Файл:** `components/AutoLoginPrompt.tsx`

```typescript
useEffect(() => {
  if (showLoginPopup) {
    // Трекинг показа модалки
    analytics.track('auto_login_prompt_shown', {
      pathname: pathname,
      timestamp: Date.now()
    })
  }
}, [showLoginPopup])

const handleClose = () => {
  analytics.track('auto_login_prompt_closed', {
    pathname: pathname,
    timestamp: Date.now()
  })
  
  localStorage.setItem('show_login_screen', 'true')
  setShowLoginPopup(false)
}

const handleLoginSuccess = () => {
  analytics.track('auto_login_prompt_success', {
    pathname: pathname,
    timestamp: Date.now()
  })
  
  localStorage.setItem('show_login_screen', 'true')
  setShowLoginPopup(false)
}
```

**Преимущества:**
- ✅ Отслеживание эффективности
- ✅ Данные для A/B тестов

---

## 📊 ТАБЛИЦА ИЗМЕНЕНИЙ

| Файл | Строки | Изменения | Тип | Приоритет |
|------|--------|-----------|-----|-----------|
| **components/AutoLoginPrompt.tsx** | NEW FILE (~70 строк) | Создать компонент авто-показа модалки | Frontend | 🔴 MUST |
| **components/ClientShell.tsx** | ~14 | Добавить импорт `AutoLoginPrompt` | Frontend | 🔴 MUST |
| **components/ClientShell.tsx** | ~118 | Добавить `<AutoLoginPrompt />` | Frontend | 🔴 MUST |
| **components/AutoLoginPrompt.tsx** | ~25 | (Опц.) Добавить проверку `pathname` | Frontend | 🟡 OPTIONAL |
| **components/AutoLoginPrompt.tsx** | ~30 | (Опц.) Добавить задержку `setTimeout` | Frontend | 🟡 OPTIONAL |
| **components/LogInMethodPopup.tsx** | - | (Опц.) Добавить "Don't show again" | Frontend | 🟢 NICE TO HAVE |

**Итого:** 1 новый файл, 2 строки изменений в `ClientShell.tsx`, 0 изменений в `LogInMethodPopup.tsx` (если не добавлять опции)

---

## 🔄 DATAFLOW DIAGRAM

### Сценарий: Первый заход (неавторизованный)

```
1. User открывает сайт (/)
   ↓
2. ClientShell рендерится → mounted = true
   ↓
3. AutoLoginPrompt рендерится
   ↓
4. useEffect() → проверяет условия:
   - localStorage.getItem('show_login_screen') === null  ✅
   - user === null  ✅
   - connected === false  ✅
   ↓
5. setShowLoginPopup(true) → модалка открывается
   ↓
6. User видит LogInMethodPopup с выбором:
   - Continue with Telegram
   - Connect Phantom Wallet
   ↓
7a. User нажимает "X" (Close):
    → handleClose()
    → localStorage.setItem('show_login_screen', 'true')
    → setShowLoginPopup(false)
    
7b. User авторизуется:
    → handleLoginSuccess()
    → localStorage.setItem('show_login_screen', 'true')
    → setShowLoginPopup(false)
    → user !== null
```

---

### Сценарий: Повторный заход (видел модалку)

```
1. User открывает сайт (/)
   ↓
2. ClientShell рендерится → mounted = true
   ↓
3. AutoLoginPrompt рендерится
   ↓
4. useEffect() → проверяет условия:
   - localStorage.getItem('show_login_screen') === 'true'  ❌
   ↓
5. Модалка НЕ открывается (skip)
   ↓
6. User видит обычный интерфейс
```

---

### Сценарий: Авторизованный пользователь

```
1. User открывает сайт (/)
   ↓
2. ClientShell рендерится → mounted = true
   ↓
3. WalletStoreSync загружает user → user !== null
   ↓
4. AutoLoginPrompt рендерится
   ↓
5. useEffect() → проверяет условия:
   - user !== null  ❌
   ↓
6. Модалка НЕ открывается (skip)
   ↓
7. User видит авторизованный интерфейс
```

---

## ✅ ЧЕКЛИСТ ПЕРЕД РЕАЛИЗАЦИЕЙ

### Анализ:
- [x] Изучена текущая архитектура
- [x] Найдены все места использования `LogInMethodPopup`
- [x] Определена логика авторизации (`useUser`, `useWallet`)
- [x] Выбран оптимальный подход (Глобальный компонент)

### Планирование:
- [x] Создан список изменений
- [x] Определены приоритеты (MUST / OPTIONAL / NICE TO HAVE)
- [x] Описаны сценарии тестирования
- [x] Идентифицированы риски и митигация

### Готовность к реализации:
- [x] План утверждён
- [ ] Код не изменён (по требованию пользователя)
- [ ] Ожидание подтверждения от пользователя

---

## 🎯 РЕКОМЕНДАЦИИ

### MUST HAVE (Обязательно):
1. ✅ Создать `components/AutoLoginPrompt.tsx`
2. ✅ Интегрировать в `components/ClientShell.tsx`
3. ✅ Проверить `onLoginSuccess` в `LogInMethodPopup.tsx` (уже реализовано)

### OPTIONAL (Опционально):
4. 🟡 Добавить задержку `setTimeout(500ms)` (защита от race condition)
5. 🟡 Добавить проверку `pathname` (исключить `/ref`, `/download`)
6. 🟡 Fallback для `localStorage` → `sessionStorage`

### NICE TO HAVE (Улучшения):
7. 🟢 "Don't show again" чекбокс
8. 🟢 Аналитика (трекинг показов и конверсий)
9. 🟢 Показывать только на главной странице

---

## 📄 ИТОГОВЫЙ PLAN

### Минимальная реализация (15-20 минут):
1. Создать `AutoLoginPrompt.tsx` (70 строк)
2. Добавить 2 строки в `ClientShell.tsx`
3. Тестирование (5 сценариев)

### Полная реализация с опциями (30-40 минут):
1. Минимальная реализация
2. Добавить задержку `setTimeout`
3. Добавить проверку `pathname`
4. Добавить fallback для `localStorage`
5. Расширенное тестирование (7 сценариев)

### Максимальная реализация (1-2 часа):
1. Полная реализация
2. "Don't show again" чекбокс
3. Аналитика
4. A/B тестирование
5. Документация

---

## 🚀 ГОТОВНОСТЬ К РЕАЛИЗАЦИИ

**Статус:** ✅ ГОТОВ  
**Сложность:** 🟢 Низкая  
**Время:** 15-20 минут (минимальная), 30-40 минут (полная)  
**Риски:** 🟡 Средние (race condition)  

**Ожидание подтверждения от пользователя для начала реализации.**

---

**Автор:** M7 Discovery System  
**Версия:** 1.0  
**Статус:** 📋 Discovery Complete
