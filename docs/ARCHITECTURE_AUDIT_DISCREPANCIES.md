# 🔍 Архитектурный аудит: Критические расхождения

**Дата**: 02.07.2025  
**Статус**: 🚨 КРИТИЧЕСКИЕ РАСХОЖДЕНИЯ ОБНАРУЖЕНЫ  
**Приоритет**: ВЫСОКИЙ - требует немедленного исправления  

---

## 🚨 КРИТИЧЕСКИЕ РАСХОЖДЕНИЯ

### 1. ❌ UserContext vs Zustand Store

**Документация утверждает**: 
- Zustand store полностью заменил UserContext
- Все компоненты используют `useUser()`, `useNotifications()`, `useCreator()`

**Реальность**: 
- UserContext **все еще активно используется** в 30+ компонентах
- Zustand store создан, но **не используется** в UI компонентах
- Двойная архитектура: UserContext + Zustand

**Файлы с UserContext (30+)**:
```
✅ app/analytics/page.tsx
✅ app/feed/page.tsx
✅ app/profile/page.tsx
✅ components/Navbar.tsx
✅ components/BottomNav.tsx
✅ components/posts/core/CommentsSection/index.tsx
✅ lib/hooks/useRealtimePosts.tsx
✅ lib/hooks/useOptimizedRealtimePosts.tsx
✅ components/SellablePostModal.tsx
✅ components/PurchaseModal.tsx
✅ components/CreatePostModal.tsx
✅ components/SubscriptionManager.tsx
✅ components/UserSubscriptions.tsx
✅ components/SubscriptionTiersSettings.tsx
✅ app/admin/referrals/page.tsx
✅ app/test/* (множество файлов)
```

**Файлы с Zustand (только 1)**:
```
❌ lib/providers/AppProvider.tsx (только инициализация)
```

### 2. ❌ AppProvider vs UserProvider

**Документация утверждает**: 
- AppProvider заменил UserProvider
- Единая точка инициализации

**Реальность**: 
- В `layout.tsx` используется AppProvider
- Но компоненты все еще импортируют UserContext
- UserProvider не удален

### 3. ❌ WebSocket Event Manager

**Документация утверждает**: 
- WebSocketEventManager централизован
- Все события проходят через Event Manager

**Реальность**: 
- WebSocketEventManager создан
- Но компоненты все еще используют прямые WebSocket вызовы
- Нет интеграции в UI компоненты

### 4. ❌ CacheManager интеграция

**Документация утверждает**: 
- CacheManager используется везде
- Заменяет разрозненные кеши

**Реальность**: 
- CacheManager создан
- Но **не интегрирован** в компоненты
- UserContext все еще использует localStorage напрямую

### 5. ❌ Error Boundary интеграция

**Документация утверждает**: 
- Error Boundary в AppProvider
- Retry логика подключена

**Реальность**: 
- Error Boundary в layout.tsx (правильно)
- Но retry логика не интегрирована в компоненты

---

## 🔧 ПЛАН ИСПРАВЛЕНИЯ

### Этап 1: Миграция на Zustand (КРИТИЧНО)

#### 1.1 Заменить UserContext на Zustand хуки
```typescript
// ❌ УДАЛИТЬ (30+ файлов)
import { useUserContext } from '@/lib/contexts/UserContext'
const { user, isLoading, error } = useUserContext()

// ✅ ЗАМЕНИТЬ НА
import { useUser, useUserLoading, useUserError } from '@/lib/store/appStore'
const user = useUser()
const isLoading = useUserLoading()
const error = useUserError()
```

#### 1.2 Заменить NotificationContext
```typescript
// ❌ УДАЛИТЬ
import { useNotificationContext } from '@/lib/contexts/NotificationContext'

// ✅ ЗАМЕНИТЬ НА
import { useNotifications, useUnreadCount } from '@/lib/store/appStore'
```

#### 1.3 Заменить CreatorContext
```typescript
// ❌ УДАЛИТЬ
import { useCreatorData } from '@/lib/hooks/useCreatorData'

// ✅ ЗАМЕНИТЬ НА
import { useCreator, useCreatorPosts } from '@/lib/store/appStore'
```

### Этап 2: Удаление старых контекстов

#### 2.1 Удалить файлы
```
❌ lib/contexts/UserContext.tsx
❌ lib/contexts/NotificationContext.tsx
❌ lib/contexts/CreatorContext.tsx
❌ components/UserProvider.tsx
❌ lib/hooks/useCreatorData.ts
```

#### 2.2 Обновить импорты
- Найти все импорты старых контекстов
- Заменить на Zustand хуки
- Обновить типы

### Этап 3: Интеграция CacheManager

#### 3.1 В AppProvider
```typescript
import { cacheManager } from '@/lib/services/CacheManager'

// Инициализация пользователя из кеша
const cachedUser = cacheManager.get('user_data')
if (cachedUser) {
  setUser(cachedUser)
}
```

#### 3.2 В компонентах
```typescript
import { useCache } from '@/lib/providers/AppProvider'

const { get, set } = useCache()
const cachedData = get('user_data')
```

### Этап 4: Интеграция WebSocket Event Manager

#### 4.1 Заменить прямые вызовы
```typescript
// ❌ УДАЛИТЬ
import { wsService } from '@/lib/services/websocket'
wsService.emit('post_liked', data)

// ✅ ЗАМЕНИТЬ НА
import { emitPostLiked } from '@/lib/services/WebSocketEventManager'
emitPostLiked(postId, likesCount, userId)
```

#### 4.2 Подключить обработчики
```typescript
// В AppProvider
import { setupDefaultHandlers } from '@/lib/services/WebSocketEventManager'
setupDefaultHandlers()
```

### Этап 5: Интеграция retry логики

#### 5.1 В API вызовах
```typescript
import { retry, RETRY_CONFIGS } from '@/lib/utils/retry'

const result = await retry(fetchUserData, RETRY_CONFIGS.normal)
```

#### 5.2 В компонентах
```typescript
import { useRetry } from '@/lib/utils/retry'

const { retryWithToast } = useRetry()
const data = await retryWithToast(fetchData, RETRY_CONFIGS.fast, 'UserData')
```

---

## 📊 СТАТИСТИКА РАСХОЖДЕНИЙ

### Файлы для миграции
- **UserContext → Zustand**: 30+ файлов
- **NotificationContext → Zustand**: 5+ файлов  
- **CreatorContext → Zustand**: 3+ файлов
- **Прямые WebSocket → Event Manager**: 10+ файлов
- **localStorage → CacheManager**: 15+ файлов

### Приоритеты
1. **КРИТИЧНО**: UserContext → Zustand (30+ файлов)
2. **ВЫСОКО**: WebSocket Event Manager интеграция
3. **СРЕДНЕ**: CacheManager интеграция
4. **НИЗКО**: Retry логика интеграция

---

## 🎯 КРИТЕРИИ УСПЕХА

### ✅ После исправления
- [ ] UserContext полностью удален
- [ ] Все компоненты используют Zustand хуки
- [ ] WebSocket Event Manager интегрирован
- [ ] CacheManager используется везде
- [ ] Retry логика подключена
- [ ] Документация соответствует коду

### ✅ Тестирование
- [ ] Все страницы загружаются без ошибок
- [ ] User state работает корректно
- [ ] WebSocket события обрабатываются
- [ ] Кеширование функционирует
- [ ] Error handling работает

---

## 🚨 РИСКИ

### Высокие риски
- **Breaking changes**: Удаление UserContext может сломать приложение
- **State loss**: Миграция может привести к потере состояния
- **WebSocket disconnection**: Изменения могут нарушить real-time функции

### Меры предосторожности
1. **Поэтапная миграция**: Файл за файлом
2. **Тестирование**: После каждого этапа
3. **Rollback plan**: Возможность отката
4. **Backup**: Сохранение рабочей версии

---

---

## 🏗️ РЕАЛЬНАЯ АРХИТЕКТУРА (ТЕКУЩЕЕ СОСТОЯНИЕ)

### 📊 Обзор текущей архитектуры

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WalletProvider│    │  UserContext    │    │NotificationContext│
│                 │    │                 │    │                 │
│ • publicKey     │───▶│ • user          │───▶│ • notifications │
│ • connected     │    │ • isLoading     │    │ • unreadCount   │
│ • wallet        │    │ • error         │    │ • refresh       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  WebSocketService│    │  CreatorContext │    │  Zustand Store  │
│                 │    │                 │    │                 │
│ • connection    │    │ • creator       │    │ • user (не используется)│
│ • subscriptions │    │ • posts         │    │ • notifications (не используется)│
│ • events        │    │ • analytics     │    │ • creator (не используется)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   API Routes    │    │  UI Components  │
│                 │    │                 │
│ • /api/user     │    │ • PostCard      │
│ • /api/posts    │    │ • LikeButton    │
│ • /api/notifications│ │ • CommentSection│
└─────────────────┘    └─────────────────┘
```

### 🔧 Реальные компоненты и их зависимости

#### 1. UserContext (АКТИВНО ИСПОЛЬЗУЕТСЯ)
**Файл**: `lib/contexts/UserContext.tsx`
**Статус**: ✅ РАБОТАЕТ в 30+ компонентах

**Зависимости**:
- `useWallet()` - Solana Wallet Adapter
- `localStorage` - прямое использование
- `StorageService` - частично используется

**Предоставляет**:
```typescript
interface UserContextValue {
  user: User | null
  isLoading: boolean
  error: Error | null
  isNewUser: boolean
  createOrGetUser: (wallet: string) => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (data: ProfileData) => Promise<void>
  deleteAccount: () => Promise<void>
}
```

**Используется в**:
- `app/feed/page.tsx` - основная страница фида
- `app/profile/page.tsx` - профиль пользователя
- `components/Navbar.tsx` - навигация
- `components/BottomNav.tsx` - мобильная навигация
- `components/posts/core/CommentsSection/index.tsx` - комментарии
- `lib/hooks/useRealtimePosts.tsx` - real-time посты
- `lib/hooks/useOptimizedRealtimePosts.tsx` - оптимизированные посты
- И еще 20+ файлов

#### 2. Zustand Store (СОЗДАН, НО НЕ ИСПОЛЬЗУЕТСЯ)
**Файл**: `lib/store/appStore.ts`
**Статус**: ❌ НЕ ИСПОЛЬЗУЕТСЯ в UI

**Структура**:
```typescript
interface AppStore {
  // User Slice
  user: User | null
  userLoading: boolean
  userError: Error | null
  
  // Notification Slice
  notifications: Notification[]
  unreadCount: number
  
  // Creator Slice
  creator: Creator | null
  posts: UnifiedPost[]
  
  // Actions
  setUser: (user: User | null) => void
  refreshUser: () => Promise<void>
  // ... другие действия
}
```

**Используется только в**:
- `lib/providers/AppProvider.tsx` - инициализация

#### 3. WebSocket Service (ПРЯМОЕ ИСПОЛЬЗОВАНИЕ)
**Файл**: `lib/services/websocket.ts`
**Статус**: ✅ РАБОТАЕТ напрямую

**Используется напрямую в**:
- `lib/hooks/useRealtimePosts.tsx`
- `lib/hooks/useOptimizedRealtimePosts.tsx`
- `components/posts/core/CommentsSection/index.tsx`

**WebSocket Event Manager** (создан, но не используется):
- `lib/services/WebSocketEventManager.ts` - ❌ НЕ ИНТЕГРИРОВАН

#### 4. CacheManager (СОЗДАН, НО НЕ ИСПОЛЬЗУЕТСЯ)
**Файл**: `lib/services/CacheManager.ts`
**Статус**: ❌ НЕ ИНТЕГРИРОВАН

**Структура**:
```typescript
class CacheManager {
  private cache = new Map<string, CacheEntry>()
  
  get<T>(key: string): T | null
  set<T>(key: string, data: T, ttl?: number): void
  has(key: string): boolean
  delete(key: string): boolean
  clear(): void
}

export class LocalStorageCache {
  static set<T>(key: string, data: T, ttl: number): void
  static get<T>(key: string): T | null
  static has(key: string): boolean
  static delete(key: string): void
  static clear(): void
}
```

**UserContext все еще использует**:
- `localStorage` напрямую
- `StorageService` частично

#### 5. Error Boundary (ЧАСТИЧНО ИНТЕГРИРОВАН)
**Файл**: `components/ErrorBoundary.tsx`
**Статус**: ✅ ИНТЕГРИРОВАН в layout.tsx

**Retry логика** (создана, но не используется):
- `lib/utils/retry.ts` - ❌ НЕ ИНТЕГРИРОВАНА в компоненты

#### 6. AppProvider (ЧАСТИЧНО РАБОТАЕТ)
**Файл**: `lib/providers/AppProvider.tsx`
**Статус**: ✅ ИНТЕГРИРОВАН в layout.tsx

**Что делает**:
- Инициализирует Zustand store
- Настраивает WebSocket Event Manager
- Инициализирует пользователя из кеша
- Предоставляет хуки для кеша

**Что НЕ делает**:
- Не заменяет UserContext
- Не интегрирует retry логику
- Не использует CacheManager

### 🔄 Реальные потоки данных

#### 1. Инициализация пользователя
```
WalletProvider.connected = true
    ↓
UserContext.useEffect([connected, publicKey])
    ↓
createOrGetUser(publicKey.toString())
    ↓
API POST /api/user
    ↓
localStorage.setItem('fonana_user_data', JSON.stringify(userData))
    ↓
setUser(data.user)
    ↓
NotificationContext.useEffect([user?.id])
    ↓
wsService.subscribeToNotifications(user.id)
```

#### 2. Обработка лайков
```
User clicks like
    ↓
handleLike() in PostCard
    ↓
if (!user) { check localStorage cache }
    ↓
API POST /api/posts/[id]/like
    ↓
wsService.emit('post_liked', data) // ПРЯМОЙ ВЫЗОВ
    ↓
useRealtimePosts.on('post_liked') // ПРЯМОЙ СЛУШАТЕЛЬ
    ↓
Update UI optimistically
```

#### 3. WebSocket события
```
Server sends event
    ↓
WebSocket receives
    ↓
wsService.emit(event) // ПРЯМОЙ ВЫЗОВ
    ↓
useRealtimePosts.on(event) // ПРЯМОЙ СЛУШАТЕЛЬ
    ↓
Update component state
```

### 📈 Статистика использования

#### UserContext (АКТИВНО)
- **30+ файлов** используют `useUserContext()`
- **Основные страницы**: feed, profile, analytics
- **Компоненты**: Navbar, BottomNav, PostCard, CommentsSection
- **Хуки**: useRealtimePosts, useOptimizedRealtimePosts

#### Zustand Store (НЕ ИСПОЛЬЗУЕТСЯ)
- **1 файл** использует `useAppStore()`
- **Только инициализация** в AppProvider
- **UI компоненты**: 0

#### WebSocket (ПРЯМОЕ ИСПОЛЬЗОВАНИЕ)
- **10+ файлов** используют `wsService` напрямую
- **Event Manager**: создан, но не используется
- **Централизация**: отсутствует

#### CacheManager (НЕ ИСПОЛЬЗУЕТСЯ)
- **Создан**: да
- **Интегрирован**: нет
- **UserContext**: использует localStorage напрямую

### 🎯 Текущие проблемы архитектуры

#### 1. Двойная архитектура
- UserContext + Zustand Store = конфликт
- Два источника истины для user state
- Потенциальные race conditions

#### 2. Разрозненные WebSocket вызовы
- Прямые вызовы `wsService.emit()`
- Нет централизованной обработки
- Сложно отслеживать события

#### 3. Неиспользуемые компоненты
- Zustand Store создан, но не используется
- WebSocket Event Manager создан, но не интегрирован
- CacheManager создан, но не подключен
- Retry логика создана, но не применяется

#### 4. Прямое использование localStorage
- UserContext использует localStorage напрямую
- Нет централизованного кеширования
- Сложно управлять TTL

---

## 📝 ЗАКЛЮЧЕНИЕ

**Статус**: 🚨 КРИТИЧЕСКИЕ РАСХОЖДЕНИЯ

Архитектурная документация **НЕ соответствует** реальной реализации. Необходима **немедленная миграция** для приведения кода в соответствие с документацией.

**Реальная архитектура**: Гибридная система с UserContext (активно используется) + Zustand (создан, но не используется)

**Рекомендация**: Начать с миграции UserContext → Zustand как наиболее критичного расхождения.

**Время на исправление**: 4-6 часов
**Приоритет**: ВЫСОКИЙ 