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
React Error #185 устранена на продакшне (race condition fix)
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

## 🚨 React Error #185 Prevention (CRITICAL FIXES APPLIED)

### ⚠️ Что такое React Error #185
React Error #185 означает, что компонент возвращает `undefined`, `false` или ничего из `return` вместо JSX или `null`. В продакшне это приводит к фатальному сбою сайта.

### 🔍 Исправленные критические проблемы:

#### 1. ✅ PostMenu - добавлена критическая защита
```typescript
export function PostMenu({ post, onAction }: PostMenuProps) {
  const user = useUser()
  
  // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: предотвращаем React Error #185
  if (!user) {
    return null
  }
  
  // ... остальной код
}
```

#### 2. ✅ MobileWalletConnect - исправлены return false
```typescript
// ❌ БЫЛО (НЕПРАВИЛЬНО):
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false // Вызывает React Error #185
}

// ✅ СТАЛО (ПРАВИЛЬНО):
const isMobileDevice = () => {
  if (typeof window === 'undefined') return null // Безопасно
}

// Безопасное использование:
useEffect(() => {
  setIsMobile(isMobileDevice() || false) // Безопасное преобразование null в false
}, [])
```

### 🛡️ ОБЯЗАТЕЛЬНЫЕ АРХИТЕКТУРНЫЕ ПРИНЦИПЫ

#### ✅ ПРАВИЛЬНЫЕ ПАТТЕРНЫ:
```typescript
// ✅ Обязательная защита для ВСЕХ компонентов с useUser()
function MyComponent() {
  const user = useUser()
  
  // КРИТИЧЕСКИ ВАЖНО: ВСЕГДА проверяйте user перед рендером
  if (!user) {
    return null // НЕ undefined, НЕ false - только null!
  }
  
  return <div>Контент для авторизованных</div>
}

// ✅ Безопасные SSR проверки
if (typeof window === 'undefined') {
  return null // НЕ false, НЕ undefined!
}

// ✅ Безопасные условные рендеры
{user && <Component />} // Проверка существования перед рендером
```

#### ❌ ЗАПРЕЩЕННЫЕ ПАТТЕРНЫ (вызывают React Error #185):
```typescript
// ❌ Возврат undefined
function Component() {
  const user = useUser()
  if (!user) return // ЗАПРЕЩЕНО! Вызывает React Error #185
}

// ❌ Возврат false в компонентах  
function Component() {
  if (typeof window === 'undefined') return false // ЗАПРЕЩЕНО!
}

// ❌ Отсутствие защиты с useUser()
function Component() {
  const user = useUser()
  return <div>{user.id}</div> // Может упасть на user = null
}

// ❌ Пустой return без значения
function Component() {
  const user = useUser()
  if (!user) return // ЗАПРЕЩЕНО! Должно быть return null
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

### 🚨 Проверка после развертывания
```bash
# 1. Пересборка продакшна
ssh -p 43988 root@69.10.59.234
cd /var/www/fonana
pm2 stop fonana
rm -rf .next .turbo .cache
npm run build
pm2 start fonana

# 2. Критическая проверка
curl -I https://fonana.me # Должно быть 200 OK
# 3. Тест без авторизации (React Error #185 не должен появляться)

# 3. Проверка логов
pm2 logs fonana --lines 50 | grep -i error
```

### Debug Logging
```typescript
// Debug состояния для продакшн отладки
useEffect(() => {
  console.log('[Component][Debug] State:', {
    user: user?.id ? `User ${user.id}` : 'No user',
    userLoading,
    isInitialized,
    window: typeof window !== 'undefined' ? 'Client' : 'SSR'
  })
}, [user, userLoading, isInitialized])
```

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
