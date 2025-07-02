## 🔍 [Продовая отладка ошибки #185: Hydration Race & Zustand Init]

### Контекст
После продакшн-деплоя наблюдаются нестабильные ошибки `React Error #185`:
- Иногда появляются на главной
- Постоянно появляются в `Messages`, `Dashboard`, `Profile`
- Появляются модалки "Connect your wallet" и "Вы не являетесь создателем"
- После нажатия "Try again" всё работает

**Вывод**: это не ошибка архитектуры, а **race condition** между:
- Zustand store и `refreshUser()`
- WalletAdapter и `publicKey`
- CacheManager и `localStorage`
- SSR и client-only хуками

---

### Цель
Выявить и устранить race condition в проде **без перехода на dev-сборку**.

---

### ✅ РЕАЛИЗОВАННЫЕ РЕШЕНИЯ

#### 1. Debug логирование добавлено
- [x] **AppProvider.tsx**: Добавлено детальное логирование состояния Zustand, Wallet, инициализации
- [x] **Messages/page.tsx**: Логирование состояния пользователя и загрузки
- [x] **Dashboard/page.tsx**: Логирование состояния пользователя и creator статуса
- [x] **Profile/page.tsx**: Логирование состояния пользователя и wallet подключения
- [x] **API endpoint**: `/api/log` для централизованного логирования debug информации

#### 2. Soft guards добавлены в проблемные страницы
- [x] **AppProvider.tsx**: Добавлен `isInitialized` state и loading screen до полной инициализации
- [x] **Messages/page.tsx**: `typeof window === 'undefined'` guard + loading до готовности пользователя
- [x] **Dashboard/page.tsx**: SSR guard + loading до загрузки пользователя
- [x] **Profile/page.tsx**: SSR guard + loading до готовности пользователя

#### 3. Унифицированный SkeletonLoader
- [x] **components/ui/SkeletonLoader.tsx**: Создан универсальный компонент с вариантами для разных страниц
- [x] **Интеграция**: Все страницы используют SkeletonLoader вместо inline loading

#### 4. Улучшенная инициализация AppProvider
- [x] **SSR detection**: Проверка `typeof window !== 'undefined'` перед инициализацией
- [x] **State tracking**: Добавлен `isInitialized` для отслеживания готовности
- [x] **Loading screen**: Показывается до полной инициализации Zustand store

---

### 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

#### AppProvider улучшения:
```tsx
// Debug логирование
useEffect(() => {
  console.log('[AppProvider][Debug] State update:', {
    user: user?.id ? `User ${user.id}` : 'No user',
    userLoading,
    connected,
    publicKey: publicKey?.toBase58() ? 'Has publicKey' : 'No publicKey',
    isInitialized,
    window: typeof window !== 'undefined' ? 'Client' : 'SSR'
  })
}, [user, userLoading, connected, publicKey, isInitialized])

// SSR guard
if (typeof window === 'undefined') {
  console.log('[AppProvider] SSR detected, skipping initialization')
  return
}

// Soft guard с loading
if (!isInitialized && typeof window !== 'undefined') {
  return <LoadingScreen />
}
```

#### Soft guards в страницах:
```tsx
// SSR guard
if (typeof window === 'undefined') {
  return null
}

// Loading до готовности
if (isUserLoading || !user) {
  return <SkeletonLoader variant="messages" />
}
```

#### API endpoint для логирования:
```tsx
// app/api/log/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  console.log('[API][Debug] Race condition debug:', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    ...body
  })
}
```

---

### 🎯 КРИТЕРИИ УСПЕХА

✅ **Ошибка #185 не воспроизводится** при первом открытии страницы  
✅ **Все компоненты получают** `user`, `wallet`, `creatorData` после загрузки  
✅ **SSR не вызывает лишние рендеры** до инициализации Zustand  
✅ **UI больше не показывает модалки** без оснований  
✅ **Поведение стабильно** при рефреше и в холодном старте

---

### 📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ

#### Локальное тестирование:
- [x] SSR рендеринг работает корректно
- [x] Soft guards предотвращают рендер до готовности
- [x] Debug логирование показывает правильную последовательность инициализации
- [x] SkeletonLoader отображается корректно на всех страницах

#### Продакшн тестирование:
- [ ] **Требуется деплой** для проверки устранения race conditions
- [ ] **Мониторинг логов** через `/api/log` endpoint
- [ ] **Проверка стабильности** в Messages/Dashboard/Profile

---

### 🚀 СЛЕДУЮЩИЕ ШАГИ

1. **Деплой на продакшн**:
   ```bash
   git add -A
   git commit -m "fix: add race condition guards and debug logging for React Error #185"
   git push origin main
   ./deploy-to-production.sh
   ```

2. **Мониторинг после деплоя**:
   ```bash
   # Проверка логов
   ssh -p 43988 root@69.10.59.234 "pm2 logs fonana --lines 100 --nostream > /tmp/logs.txt && cat /tmp/logs.txt"
   
   # Проверка статуса
   ssh -p 43988 root@69.10.59.234 "pm2 status"
   ```

3. **Тестирование на проде**:
   - Открыть Messages, Dashboard, Profile
   - Проверить отсутствие React Error #185
   - Убедиться в корректном отображении loading состояний
   - Проверить стабильность при рефреше

---

### 📝 АРТЕФАКТЫ

- [x] **Патчи с guards и debug логами** - реализованы во всех проблемных страницах
- [x] **SkeletonLoader компонент** - универсальный loading для всех страниц
- [x] **API endpoint для логирования** - `/api/log` для централизованного debug
- [ ] **Подтверждение**: ошибка #185 не возникает в Messages/Dashboard/Profile после чистого старта (требуется деплой)

---

### 🔍 ДИАГНОСТИКА

Если ошибка #185 все еще появляется после деплоя:

1. **Проверить логи**:
   ```bash
   ssh -p 43988 root@69.10.59.234 "pm2 logs fonana --lines 200 --nostream | grep -E '(Debug|Error|185)'"
   ```

2. **Отправить debug данные**:
   ```javascript
   // В консоли браузера
   fetch('/api/log', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       page: window.location.pathname,
       user: user?.id,
       wallet: connected,
       timestamp: new Date().toISOString()
     })
   })
   ```

3. **Проверить порядок провайдеров** в `app/layout.tsx` (уже проверен - корректный)

---

### 📋 СТАТУС ВЫПОЛНЕНИЯ

- [x] **Этап 1**: Временное логирование - ✅ ЗАВЕРШЕНО
- [x] **Этап 2**: Добавить soft guards в страницы - ✅ ЗАВЕРШЕНО  
- [x] **Этап 3**: Проверить провайдеры - ✅ ЗАВЕРШЕНО
- [ ] **Этап 4**: Деплой и тестирование на проде - 🔄 В ОЖИДАНИИ
- [ ] **Этап 5**: Подтверждение устранения ошибки - 🔄 В ОЖИДАНИИ