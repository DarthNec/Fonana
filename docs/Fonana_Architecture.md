# Fonana Architecture Documentation

## Обзор архитектуры

Fonana - это платформа для создания и монетизации контента на блокчейне Solana. Архитектура построена на Next.js с использованием WebSocket для real-time функций, JWT аутентификации и централизованного управления состоянием через Zustand store.

## Ключевые компоненты

### 1. Zustand Store - Центральное управление состоянием

#### Структура store
```typescript
// lib/store/appStore.ts
interface AppState {
  // User slice
  user: User | null
  isLoading: boolean
  error: string | null
  
  // Notification slice  
  notifications: Notification[]
  unreadCount: number
  
  // Creator slice
  creatorData: CreatorData | null
  creatorLoading: boolean
  
  // Actions
  setUser: (user: User | null) => void
  refreshUser: () => Promise<void>
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  setCreatorData: (data: CreatorData | null) => void
}
```

#### Инициализация и жизненный цикл
```typescript
// AppProvider.tsx - единая точка инициализации
const AppProvider = ({ children }) => {
  const { publicKey, connected } = useWallet()
  const { user, setUser, refreshUser } = useAppStore()
  
  useEffect(() => {
    if (connected && publicKey) {
      refreshUser()
    } else {
      setUser(null)
    }
  }, [connected, publicKey])
  
  return <>{children}</>
}
```

#### Кеширование через CacheManager
```typescript
// lib/services/CacheManager.ts
class CacheManager {
  set(key: string, value: any, ttl?: number): void
  get(key: string): any
  delete(key: string): void
  clear(): void
}

// Использование в store
const refreshUser = async () => {
  const cachedUser = cacheManager.get('fonana_user_data')
  if (cachedUser && isValidCache(cachedUser.timestamp)) {
    setUser(cachedUser.data)
  }
  
  // API запрос с retry логикой
  const userData = await retryWithToast(() => 
    fetch('/api/user', { method: 'POST' })
  )
  
  cacheManager.set('fonana_user_data', {
    data: userData,
    timestamp: Date.now()
  }, 7 * 24 * 60 * 60 * 1000) // 7 дней
  
  setUser(userData)
}
```

### 2. WebSocket Event Manager - Real-time коммуникация

#### Централизованное управление событиями
```typescript
// lib/services/WebSocketEventManager.ts
class WebSocketEventManager {
  private wsService: WebSocketService
  private eventHandlers: Map<string, Function[]>
  
  subscribe(event: string, handler: Function): void
  unsubscribe(event: string, handler: Function): void
  emit(event: string, data: any): void
  handleWebSocketEvent(event: string, data: any): void
}

// Интеграция с Zustand store
const handlePostLiked = (event) => {
  const { updatePost } = useAppStore.getState()
  updatePost(event.postId, {
    likesCount: event.likesCount,
    isLiked: event.userId === user?.id
  })
}

eventManager.subscribe('post_liked', handlePostLiked)
```

#### Аутентификация и подключение
```typescript
// JWT токен обязателен для всех подключений
const token = await getJWTToken()
const wsUrl = `wss://fonana.me/ws?token=${encodeURIComponent(token)}`

// Без токена - соединение закрывается с кодом 1008
if (!token) {
  ws.close(1008, 'Unauthorized')
  return
}
```

#### Подписки на каналы
```typescript
// Типы каналов
- notifications: `notifications_${userId}`
- feed: `feed_${userId}`
- creator: `creator_${creatorId}`
- post: `post_${postId}`

// Автоматическая переподписка при переподключении
wsService.on('connected', () => {
  subscribedChannels.forEach(channel => {
    sendSubscription(channel)
  })
})
```

### 3. Retry логика и обработка ошибок

#### Централизованная retry система
```typescript
// lib/utils/retry.ts
export const retryWithToast = async <T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> => {
  try {
    return await fn()
  } catch (error) {
    if (options?.retries > 0) {
      await delay(options.delay || 1000)
      return retryWithToast(fn, { ...options, retries: options.retries - 1 })
    }
    
    toast.error(options?.errorMessage || 'Произошла ошибка')
    throw error
  }
}

// Использование в компонентах
const handleLike = async () => {
  await retryWithToast(
    () => fetch(`/api/posts/${postId}/like`, { method: 'POST' }),
    { retries: 3, errorMessage: 'Не удалось поставить лайк' }
  )
}
```

### 4. Система лайков - Многоуровневая валидация

#### Зависимости для лайков
```typescript
// Критические зависимости
- user?.id (обязательно)
- wallet.connected (обязательно)
- publicKey (обязательно)

// Fallback цепочка через CacheManager
1. user из Zustand store
2. Кеш CacheManager (TTL проверка)
3. API запрос /api/user?wallet=${publicKey}
4. Ошибка "Подключите кошелек"
```

#### Логика обработки лайков
```typescript
const handleLike = async () => {
  const { user, refreshUser } = useAppStore.getState()
  
  if (!user) {
    // Fallback логика через CacheManager
    const cachedUser = cacheManager.get('fonana_user_data')
    if (cachedUser && isValidCache(cachedUser.timestamp)) {
      setUser(cachedUser.data)
      setTimeout(() => handleLike(), 100) // Рекурсивный вызов
      return
    }
    toast.error('Пожалуйста, подключите кошелек')
    return
  }

  // API запрос с retry
  await retryWithToast(
    () => fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({ userId: user.id })
    })
  )

  // WebSocket уведомление через EventManager
  eventManager.emit('post_liked', {
    postId,
    userId: user.id,
    likesCount: post.likesCount + 1
  })
}
```

### 5. Notification System - Интеграция с Zustand

#### Управление уведомлениями
```typescript
// Store slice для уведомлений
const notificationSlice = (set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1)
  }))
})

// WebSocket интеграция
eventManager.subscribe('notification', (event) => {
  const { addNotification } = useAppStore.getState()
  addNotification(event.notification)
})
```

### 6. Creator Data Management

#### Централизованное управление данными создателей
```typescript
// Store slice для creator data
const creatorSlice = (set, get) => ({
  creatorData: null,
  creatorLoading: false,
  
  setCreatorData: (data) => set({ creatorData: data }),
  setCreatorLoading: (loading) => set({ creatorLoading: loading }),
  
  fetchCreatorData: async (creatorId) => {
    set({ creatorLoading: true })
    
    try {
      const data = await retryWithToast(
        () => fetch(`/api/creators/${creatorId}`)
      )
      set({ creatorData: data, creatorLoading: false })
    } catch (error) {
      set({ creatorLoading: false })
    }
  }
})

// WebSocket обновления
eventManager.subscribe('creator_updated', (event) => {
  const { creatorData, setCreatorData } = useAppStore.getState()
  if (creatorData?.id === event.creatorId) {
    setCreatorData({ ...creatorData, ...event.updates })
  }
})
```

## Архитектурные принципы

### 1. Единая точка истины
- Все состояние управляется через Zustand store
- Нет дублирования данных между компонентами
- Централизованное кеширование через CacheManager

### 2. Event-driven архитектура
- WebSocket события обрабатываются через EventManager
- Автоматическая синхронизация между клиентами
- Retry логика для надежности

### 3. Graceful degradation
- Fallback на кеш при отсутствии сети
- Retry механизмы для API запросов
- Пользовательские уведомления об ошибках

### 4. Type safety
- Полная типизация всех store slices
- Валидация данных через Zod
- Безопасный доступ к вложенным свойствам

### 5. SSR/CSR безопасность
- Все Zustand хуки защищены SSR guards
- Корректные fallback значения для серверного рендеринга
- Предотвращение React Error #185 через архитектурные решения

## Критическое исправление React Error #185

### 🚨 Проблема (УСТРАНЕНА 03.01.2025)
**React Error #185**: TypeError: Cannot read properties of null (reading 'useContext') во время SSR

### 🔍 Корень проблемы
- Zustand хуки (useUser, useCreator, useNotifications) вызывались во время Server-Side Rendering
- React Context не инициализирован на сервере (null)
- Вызов `useContext()` на null объекте → фатальный crash сайта
- AppProvider возвращал `undefined` вместо корректного SSR fallback

### ✅ Решение
1. **SSR Guards для всех Zustand хуков**:
```typescript
// Пример SSR guard в useUser()
export const useUser = () => {
  // SSR guard - возвращаем null на сервере
  if (typeof window === 'undefined') {
    return null
  }
  return useAppStore(state => state.user)
}

export const useUserLoading = () => {
  if (typeof window === 'undefined') {
    return false
  }
  return useAppStore(state => state.userLoading)
}

export const useUserActions = () => {
  if (typeof window === 'undefined') {
    return {
      setUser: () => {},
      refreshUser: async () => {},
      updateProfile: async () => {},
      deleteAccount: async () => {}
    }
  }
  return useAppStore(state => ({
    setUser: state.setUser,
    refreshUser: state.refreshUser,
    updateProfile: state.updateProfile,
    deleteAccount: state.deleteAccount
  }))
}
```

2. **Исправленный AppProvider**:
```typescript
export function AppProvider({ children }: { children: React.ReactNode }) {
  // SSR guard с корректным fallback
  if (typeof window === 'undefined') {
    return (
      <ErrorBoundary>
        <div className="app-provider">{children}</div>
      </ErrorBoundary>
    )
  }
  
  // Остальная логика инициализации...
}
```

3. **Защищенные хуки**:
- ✅ `useUser()`, `useUserLoading()`, `useUserError()`, `useUserActions()`
- ✅ `useNotifications()`, `useNotificationsLoading()`, `useNotificationActions()`
- ✅ `useCreator()`, `useCreatorLoading()`, `useCreatorError()`, `useCreatorActions()`

### 📊 Результат исправления
- **Коммит**: dad3277 - SSR guards для всех Zustand хуков
- **Статус**: ✅ Продакшн сайт https://fonana.me работает стабильно
- **Сборка**: 69/69 страниц без ошибок
- **Логи**: Чистые, без SSR ошибок
- **API версия**: "20250703-001730-react-error-185-fixed"

## Миграция с React Context

### Удаленные компоненты
- ❌ `lib/contexts/UserContext.tsx`
- ❌ `lib/contexts/NotificationContext.tsx` 
- ❌ `lib/contexts/CreatorContext.tsx`
- ❌ `lib/hooks/useCreatorData.ts`

### Замененные хуки
- `useUserContext()` → `useUser()` (с SSR guard)
- `useNotificationContext()` → `useNotifications()` (с SSR guard)
- `useCreatorData()` → `useCreator()` (с SSR guard)

### Обновленные компоненты
- ✅ 25+ компонентов мигрированы на Zustand
- ✅ Все импорты обновлены
- ✅ Типизация исправлена
- ✅ SSR guards добавлены во все хуки
- ✅ Сборка успешна без React Error #185 