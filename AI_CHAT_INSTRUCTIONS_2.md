# Fonana Project - AI Assistant Instructions v3 (ПОСТМИГРАЦИОННАЯ ВЕРСИЯ)

## Project Context
- **Repository**: https://github.com/DukeDeSouth/Fonana (private)
- **Production**: 69.10.59.234:43988 (SSH)
- **Deploy Script**: `./deploy-to-production.sh`
- **Server Path**: `/var/www/fonana`
- **Language**: English UI, Russian comments OK
- **Status**: ✅ АРХИТЕКТУРНАЯ МИГРАЦИЯ ЗАВЕРШЕНА (02.07.2025) - Zustand + CacheManager + WebSocketEventManager + AppProvider

## Quick Start
```
Project: Fonana (Next.js + Solana)
Private repo: DukeDeSouth/Fonana
Server has Deploy Key, use ./deploy-to-production.sh
Production DB has real users and posts
PM2 manages the app with ecosystem.config.js
АРХИТЕКТУРА: Zustand Store + CacheManager + WebSocketEventManager + AppProvider
УДАЛЕНЫ: UserContext, NotificationContext, CreatorContext - заменены на Zustand
Service Worker simplified - no auto-updates, cache-only
WebSocket server running on port 3002 with JWT auth + Event Manager
React Error #185 ПОЛНОСТЬЮ УСТРАНЕНА (03.01.2025) - SSR guards во всех Zustand хуках
```

## 🚨 КРИТИЧЕСКАЯ АРХИТЕКТУРНАЯ ИНФОРМАЦИЯ

### ✅ ТЕКУЩАЯ АРХИТЕКТУРА (После миграции):
- **Zustand Store**: `lib/store/appStore.ts` - централизованное управление состоянием
- **AppProvider**: `lib/providers/AppProvider.tsx` - единая точка инициализации
- **CacheManager**: `lib/services/CacheManager.ts` - централизованное кеширование с TTL
- **WebSocketEventManager**: `lib/services/WebSocketEventManager.ts` - управление real-time событиями
- **StorageService**: `lib/services/StorageService.ts` - шифрование JWT токенов
- **Error Boundary**: `components/ErrorBoundary.tsx` - глобальная обработка ошибок
- **Zod валидация**: `lib/utils/validators.ts` - строгая валидация всех входных данных

### ❌ УДАЛЕННЫЕ КОМПОНЕНТЫ (НЕ ИСПОЛЬЗУЮТСЯ):
- ~~`lib/contexts/UserContext.tsx`~~ → ✅ `useUser()` из Zustand
- ~~`lib/contexts/NotificationContext.tsx`~~ → ✅ `useNotifications()` из Zustand  
- ~~`lib/contexts/CreatorContext.tsx`~~ → ✅ `useCreator()` из Zustand
- ~~`lib/hooks/useCreatorData.ts`~~ → ✅ `useCreatorActions()` из Zustand
- ~~`components/UserProvider.tsx`~~ → ✅ `AppProvider`
- ~~Прямые вызовы `localStorage`~~ → ✅ `cacheManager`
- ~~Прямые вызовы `wsService.emit()`~~ → ✅ `WebSocketEventManager`

## 🚨 КРИТИЧЕСКИ ВАЖНО: Использование новой архитектуры

### ✅ DO - Новая архитектура:
```typescript
// ✅ ПРАВИЛЬНО - использование Zustand Store
import { useUser, useUserLoading, useUserError } from '@/lib/store/appStore'

function MyComponent() {
  const user = useUser()
  const isLoading = useUserLoading()
  const error = useUserError()
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!user) return <div>Not authenticated</div>
  
  return <div>Welcome, {user.nickname}!</div>
}

// ✅ ПРАВИЛЬНО - использование CacheManager
import { cacheManager } from '@/lib/services/CacheManager'

const userData = cacheManager.get('user_data')
cacheManager.set('user_data', newData, 7 * 24 * 60 * 60 * 1000) // 7 дней TTL

// ✅ ПРАВИЛЬНО - WebSocket через Event Manager
import { emitPostLiked, emitPostCommented } from '@/lib/services/WebSocketEventManager'

emitPostLiked(postId, likesCount, userId)
emitPostCommented(postId, commentId, userId)

// ✅ ПРАВИЛЬНО - Retry логика
import { retryWithToast } from '@/lib/utils/retry'

await retryWithToast(
  () => fetch('/api/posts/like', { method: 'POST' }),
  { retries: 3, errorMessage: 'Не удалось поставить лайк' }
)
```

### ❌ DON'T - Устаревшая архитектура:
```typescript
// ❌ НЕПРАВИЛЬНО - старые контексты УДАЛЕНЫ
import { useUserContext } from '@/lib/contexts/UserContext' // ФАЙЛ НЕ СУЩЕСТВУЕТ!
import { useNotificationContext } from '@/lib/contexts/NotificationContext' // УДАЛЕН!
import { useCreatorData } from '@/lib/hooks/useCreatorData' // УДАЛЕН!

// ❌ НЕПРАВИЛЬНО - прямые вызовы localStorage
const userData = localStorage.getItem('fonana_user_data') // ЗАПРЕЩЕНО!

// ❌ НЕПРАВИЛЬНО - прямые WebSocket вызовы
wsService.emit('post_liked', data) // УСТАРЕЛО!
```

## 🧩 Zustand Store Architecture

### Store Structure
```typescript
// lib/store/appStore.ts
interface AppStore {
  // User Slice
  user: User | null
  userLoading: boolean
  userError: Error | null
  setUser: (user: User | null) => void
  refreshUser: () => Promise<void>
  
  // Notification Slice  
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Notification) => void
  setNotifications: (notifications: Notification[]) => void
  
  // Creator Slice
  creator: Creator | null
  creatorLoading: boolean
  creatorPosts: UnifiedPost[]
  loadCreator: (creatorId: string) => Promise<void>
}
```

### Zustand Hooks Usage
```typescript
// Оптимизированные селекторы
import { 
  useUser, 
  useUserLoading, 
  useUserError,
  useUserActions,
  useNotifications,
  useUnreadCount,
  useNotificationActions,
  useCreator,
  useCreatorLoading,
  useCreatorActions
} from '@/lib/store/appStore'

// В компонентах
const user = useUser()
const { refreshUser, updateProfile } = useUserActions()
const notifications = useNotifications()
const { addNotification, markAsRead } = useNotificationActions()
```

## 🗄️ CacheManager Usage

### CacheManager Features
- **TTL логика**: Автоматическое истечение кеша
- **LRU эвикшен**: Удаление старых записей при переполнении
- **LocalStorageCache**: Persist кеш в localStorage с TTL
- **Безопасность**: Обработка ошибок приватного режима

### Usage Examples
```typescript
import { cacheManager, LocalStorageCache } from '@/lib/services/CacheManager'

// In-memory кеш
cacheManager.set('user_data', userData, 7 * 24 * 60 * 60 * 1000) // 7 дней
const user = cacheManager.get('user_data')

// LocalStorage кеш с TTL
LocalStorageCache.set('user', userData, 7 * 24 * 60 * 60 * 1000)
const cachedUser = LocalStorageCache.get('user')

// Проверка наличия
if (cacheManager.has('user_data')) {
  // кеш существует и не истек
}
```

## 🔄 WebSocket Event Manager

### WebSocket Architecture
- **Централизованное управление**: Все события через EventManager
- **Throttling**: 100ms между одинаковыми событиями
- **Deduplication**: 5 секунд окно дедупликации
- **Предустановленные обработчики**: Автоматическая настройка

### Usage Examples
```typescript
import { 
  emitPostLiked,
  emitPostCommented,
  emitNotification,
  setupDefaultHandlers
} from '@/lib/services/WebSocketEventManager'

// В AppProvider
setupDefaultHandlers() // Настройка обработчиков для Zustand

// В компонентах
emitPostLiked(postId, likesCount, userId)
emitPostCommented(postId, commentId, userId)
emitNotification(userId, notification)
```

## 🛡️ Security & Validation

### JWT Token Security
- **Шифрование**: AES-256-CBC через StorageService
- **TTL**: 1 час автоматическое истечение
- **Безопасные ключи**: Из env переменных

```typescript
import { storageService } from '@/lib/services/StorageService'

// Автоматическое шифрование при сохранении
storageService.setJWTToken(token)

// Автоматическая расшифровка при получении
const token = storageService.getJWTToken()
```

### Zod Validation
```typescript
import { validateApiRequest, sanitizeString } from '@/lib/utils/validators'

// В API роутах
const validatedData = validateApiRequest(likePostSchema, {
  postId: params.id,
  userId: body.userId
})

// Санитизация контента
const cleanContent = sanitizeString(userInput)
```

## 🔧 AppProvider Integration

### AppProvider Architecture
- **Единая инициализация**: Заменяет все старые провайдеры
- **Error Boundary**: Глобальная обработка ошибок
- **Retry логика**: Встроенная устойчивость к сбоям
- **SSR guards**: Безопасность серверного рендеринга

### Layout Integration
```typescript
// app/layout.tsx
import { AppProvider } from '@/lib/providers/AppProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WalletProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </WalletProvider>
      </body>
    </html>
  )
}
```

## 🚨 React Error #185 - КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ (ПОЛНОСТЬЮ УСТРАНЕНА 03.01.2025)

### ⚠️ Реальная причина React Error #185
**НЕ возврат undefined/false из компонентов**, а **TypeError: Cannot read properties of null (reading 'useContext') во время SSR**.

### 🔍 Корень проблемы (ИСПРАВЛЕН):
1. **Zustand хуки вызывались во время Server-Side Rendering**
2. **React Context не инициализирован на сервере (null)**
3. **Вызов useContext() на null объекте → фатальный crash**
4. **AppProvider возвращал undefined вместо корректного SSR fallback**

### ✅ РЕШЕНИЕ - SSR Guards Architecture

#### 1. ✅ SSR Guards во всех Zustand хуках (КРИТИЧНО)
```typescript
// ✅ ПРАВИЛЬНАЯ АРХИТЕКТУРА с SSR guards
export const useUser = () => {
  // КРИТИЧНО: SSR guard предотвращает React Error #185
  if (typeof window === 'undefined') {
    return null // Безопасное значение для сервера
  }
  return useAppStore(state => state.user)
}

export const useUserLoading = () => {
  if (typeof window === 'undefined') {
    return false // Безопасное значение для сервера
  }
  return useAppStore(state => state.userLoading)
}

export const useUserActions = () => {
  if (typeof window === 'undefined') {
    // Безопасные заглушки для сервера
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

#### 2. ✅ Исправленный AppProvider с SSR fallback
```typescript
export function AppProvider({ children }: { children: React.ReactNode }) {
  // КРИТИЧНО: SSR guard с корректным fallback
  if (typeof window === 'undefined') {
    return (
      <ErrorBoundary>
        <div className="app-provider">{children}</div>
      </ErrorBoundary>
    )
  }
  
  // Остальная логика инициализации только на клиенте...
}
```

#### 3. ✅ Все защищенные хуки:
- ✅ `useUser()`, `useUserLoading()`, `useUserError()`, `useUserActions()`
- ✅ `useNotifications()`, `useNotificationsLoading()`, `useNotificationActions()`
- ✅ `useCreator()`, `useCreatorLoading()`, `useCreatorError()`, `useCreatorActions()`

### 📊 Результат исправления
- **Коммиты**: d035815, 812f5c2, dad3277
- **Статус**: ✅ https://fonana.me работает стабильно на продакшне
- **Сборка**: 69/69 страниц без фатальных ошибок
- **API версия**: "20250703-001730-react-error-185-fixed"
- **DNS**: fonana.me → 69.10.59.234 (подтвержденный продакшн сервер)

### ⚠️ Устаревшие исправления (НЕ БЫЛИ ПРИЧИНОЙ):

#### PostMenu - проверка на user (НЕ решала корень проблемы)
```typescript
export function PostMenu({ post, onAction }: PostMenuProps) {
  const user = useUser()
  
  // Эта проверка НЕ решала React Error #185, 
  // но полезна для UX
  if (!user) {
    return null
  }
  
  // ... остальной код
}
```

#### MobileWalletConnect - return false исправлен (НЕ решал корень проблемы)
```typescript
// Это исправление не решало React Error #185,
// но улучшало качество кода
const isMobileDevice = () => {
  if (typeof window === 'undefined') return null // НЕ false
}
```

### 🛡️ ОБЯЗАТЕЛЬНЫЕ SSR GUARDS (КРИТИЧНО ДЛЯ ПРЕДОТВРАЩЕНИЯ React Error #185)

#### ✅ ПРАВИЛЬНАЯ АРХИТЕКТУРА - SSR Guards в хуках:
```typescript
// ✅ КРИТИЧЕСКИ ВАЖНО: ВСЕ Zustand хуки ДОЛЖНЫ иметь SSR guards
export const useUser = () => {
  // ОБЯЗАТЕЛЬНЫЙ SSR guard - предотвращает React Error #185
  if (typeof window === 'undefined') {
    return null // Безопасное значение для сервера
  }
  return useAppStore(state => state.user)
}

export const useUserActions = () => {
  if (typeof window === 'undefined') {
    // Безопасные заглушки для сервера
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

// ✅ Компоненты теперь безопасны для SSR
function MyComponent() {
  const user = useUser() // Автоматически безопасно благодаря SSR guard
  
  // Дополнительная проверка для UX (не для предотвращения React Error #185)
  if (!user) {
    return <div>Войдите в аккаунт</div>
  }
  
  return <div>Добро пожаловать, {user.nickname}!</div>
}

// ✅ AppProvider с SSR fallback
export function AppProvider({ children }: { children: React.ReactNode }) {
  if (typeof window === 'undefined') {
    return (
      <ErrorBoundary>
        <div className="app-provider">{children}</div>
      </ErrorBoundary>
    )
  }
  // Логика инициализации только на клиенте...
}
```

#### ❌ УСТАРЕВШИЕ ПАТТЕРНЫ (НЕ НУЖНЫ ПОСЛЕ SSR GUARDS):
```typescript
// ❌ УСТАРЕЛО: компонентные SSR проверки НЕ НУЖНЫ
function Component() {
  // После внедрения SSR guards в хуки, это НЕ НУЖНО
  if (typeof window === 'undefined') return null
  
  const user = useUser() // Теперь автоматически безопасно
}

// ❌ УСТАРЕЛО: проверки на undefined в компонентах
function Component() {
  const user = useUser()
  // useUser() теперь никогда не вернет undefined на сервере,
  // благодаря SSR guard внутри хука
  if (!user) return // Это для UX, не для предотвращения ошибок
}
```

#### 🚨 КРИТИЧНЫЕ ТРЕБОВАНИЯ к новым Zustand хукам:
```typescript
// ✅ ОБЯЗАТЕЛЬНЫЙ ШАБЛОН для ВСЕХ новых Zustand хуков
export const useNewFeature = () => {
  // КРИТИЧНО: ВСЕГДА добавляйте SSR guard
  if (typeof window === 'undefined') {
    return null // или другое безопасное значение
  }
  return useAppStore(state => state.newFeature)
}

export const useNewFeatureActions = () => {
  if (typeof window === 'undefined') {
    // КРИТИЧНО: ВСЕГДА возвращайте безопасные заглушки
    return {
      someAction: () => {},
      anotherAction: async () => {}
    }
  }
  return useAppStore(state => ({
    someAction: state.someAction,
    anotherAction: state.anotherAction
  }))
}
```

### 🔒 Компоненты требующие защиты

#### ✅ ЗАЩИЩЕННЫЕ компоненты (if (!user) return null):
- `SellablePostModal` - защищен на строке 63
- `PostMenu` - исправлен (критическая проблема была здесь)
- `CreatePostModal` - защищен на строке 47
- `UserSubscriptions` - защищен на строке 56
- `SubscriptionManager` - защищен на строке 66
- `MobileWalletConnect` - исправлен (return false → return null)

#### 🔍 Проверенные компоненты (НЕ требуют защиты):
- `CommentsSection` - комментарии доступны всем пользователям
- `BottomNav` - частично использует user, имеет условные рендеры

### 🔄 Race Condition Guards
```typescript
// SSR Guard - ВСЕГДА return null
if (typeof window === 'undefined') {
  return null // НЕ false!
}

// Loading state до готовности store
if (isUserLoading || !user) {
  return <SkeletonLoader variant="page" />
}

// В AppProvider - улучшенная инициализация
const [isInitialized, setIsInitialized] = useState(false)

useEffect(() => {
  if (typeof window !== 'undefined') {
    // инициализация только на клиенте
    setIsInitialized(true)
  }
}, [])
```

### 📊 Статистика исправлений
- **Критических проблем исправлено**: 3
- **Компонентов с обязательной защитой**: 8+
- **SSR функций исправлено**: 2
- **Проверенных компонентов**: 25+

### ✅ ПРОВЕРКА УСПЕШНОГО РАЗВЕРТЫВАНИЯ (03.01.2025)
```bash
# ✅ ВЫПОЛНЕНО: Пересборка продакшна с SSR guards
ssh -p 43988 root@69.10.59.234
cd /var/www/fonana
pm2 stop fonana
rm -rf .next .turbo .cache
npm run build # ✅ 69/69 страниц без ошибок
pm2 start fonana

# ✅ ПРОВЕРЕНО: Критическая проверка
curl -I https://fonana.me # ✅ 200 OK
# ✅ ПРОВЕРЕНО: Тест без авторизации - React Error #185 НЕ появляется

# ✅ ПРОВЕРЕНО: Логи чистые
pm2 logs fonana --lines 50 | grep -i error # ✅ Нет SSR ошибок

# ✅ ПРОВЕРЕНО: API версия
curl https://fonana.me/api/version
# ✅ "20250703-001730-react-error-185-fixed"

# ✅ ПРОВЕРЕНО: DNS и сервер
nslookup fonana.me # ✅ 69.10.59.234 (подтвержденный продакшн)
```

### 🔍 Debug Logging для SSR Guards
```typescript
// Debug состояния SSR guards (только для отладки)
export const useUser = () => {
  if (typeof window === 'undefined') {
    console.debug('[SSR Guard] useUser() called on server, returning null')
    return null
  }
  return useAppStore(state => state.user)
}

// Debug компонентов для SSR проверки
useEffect(() => {
  console.log('[Component][SSR Debug] State:', {
    user: user?.id ? `User ${user.id}` : 'No user',
    userLoading,
    window: typeof window !== 'undefined' ? 'Client' : 'SSR',
    timestamp: new Date().toISOString()
  })
}, [user, userLoading])
```

### 📋 Чеклист для новых хуков (ОБЯЗАТЕЛЬНО):
- [ ] ✅ SSR guard добавлен (`if (typeof window === 'undefined')`)
- [ ] ✅ Безопасное значение для сервера возвращается
- [ ] ✅ Actions возвращают пустые функции на сервере
- [ ] ✅ Хук протестирован в SSR окружении
- [ ] ✅ Компоненты используют хук безопасно

## 🚨 КРИТИЧЕСКИ ВАЖНО: НЕ ИСПОЛЬЗУЙТЕ СТАРЫЕ ПАТТЕРНЫ

### ❌ ЗАПРЕЩЕННЫЕ ИМПОРТЫ (файлы удалены):
```typescript
// ❌ ЭТИ ИМПОРТЫ ВЫЗОВУТ ОШИБКИ СБОРКИ
import { useUserContext } from '@/lib/contexts/UserContext'
import { useNotificationContext } from '@/lib/contexts/NotificationContext' 
import { useCreatorData } from '@/lib/hooks/useCreatorData'
import { UserProvider } from '@/components/UserProvider'
```

### ❌ ЗАПРЕЩЕННЫЕ ПАТТЕРНЫ:
```typescript
// ❌ Прямой доступ к localStorage
localStorage.getItem('fonana_user_data')
localStorage.setItem('fonana_jwt_token', token)

// ❌ Прямые WebSocket вызовы
wsService.emit('post_liked', data)
wsService.on('notification', handler)

// ❌ API вызовы без retry логики
fetch('/api/posts/like') // нет обработки ошибок
```

### ✅ ПРАВИЛЬНЫЕ ПАТТЕРНЫ:
```typescript
// ✅ Zustand хуки
const user = useUser()
const { refreshUser } = useUserActions()

// ✅ CacheManager
const data = cacheManager.get('key')
cacheManager.set('key', data, ttl)

// ✅ WebSocket Event Manager
emitPostLiked(postId, likesCount, userId)

// ✅ Retry логика
await retryWithToast(() => apiCall())
```

## 📊 Migration Status

### ✅ ЗАВЕРШЕННЫЕ МИГРАЦИИ:
- **25+ компонентов** мигрированы с UserContext на Zustand
- **WebSocket события** централизованы через Event Manager
- **Кеширование** унифицировано через CacheManager
- **JWT токены** зашифрованы через StorageService
- **Error handling** через Error Boundary + retry логика
- **Валидация** через Zod schemas

### ✅ АРХИТЕКТУРНЫЕ УЛУЧШЕНИЯ:
- **Единая точка истины**: Zustand store
- **Централизованное кеширование**: TTL + LRU
- **Real-time события**: Throttling + deduplication
- **Безопасность**: Шифрование + валидация
- **Устойчивость**: Retry логика + Error Boundary

## 🔧 Development Guidelines

### Before Making Changes
```bash
# 1. Проверить архитектуру
npm run build # Убедиться что новая архитектура работает

# 2. Проверить логи
ssh -p 43988 root@69.10.59.234 "pm2 logs fonana --lines 50 --nostream"

# 3. Проверить статус
ssh -p 43988 root@69.10.59.234 "pm2 status"
```

### Adding Features
1. **Использовать только Zustand** для состояния
2. **Использовать CacheManager** для кеширования
3. **Использовать WebSocketEventManager** для real-time
4. **Добавлять retry логику** для критических операций
5. **Валидировать через Zod** все входные данные

### ❌ DON'T DO:
- **НЕ создавать новые контексты** - используйте Zustand slices
- **НЕ использовать localStorage напрямую** - используйте CacheManager
- **НЕ использовать wsService.emit()** - используйте Event Manager
- **НЕ создавать API вызовы без retry** - используйте retryWithToast
- **НЕ забывать про валидацию** - используйте Zod schemas
