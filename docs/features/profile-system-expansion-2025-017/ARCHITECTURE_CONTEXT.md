# 🏗️ ARCHITECTURE CONTEXT: Profile System Expansion

**Дата**: 17 июля 2025  
**ID задачи**: [profile_system_expansion_2025_017]  
**Связано с**: DISCOVERY_REPORT.md

## 🎯 АНАЛИЗ ТЕКУЩЕЙ СРЕДЫ

### Архитектурная карта компонентов:

```mermaid
graph TD
    A[CreatorPageClient] --> B[API /api/creators/id]
    A --> C[useOptimizedPosts]
    A --> D[ProfileSetupModal]
    A --> E[PostCard Components]
    
    F[Edit Profile Button] --> G[isOwner Detection]
    G --> D
    
    H[Posts Feed] --> C
    C --> I[/api/posts?creatorId=]
    
    J[Custom Links] --> K[lib/utils/links.ts]
    K --> L[middleware.ts]
    
    M[Statistics] --> N[Real DB Data]
    N --> O[followersCount/postsCount]
```

### Существующие интеграционные точки:

```typescript
// 1. CreatorPageClient.tsx - базовый компонент (ГОТОВ)
interface CreatorPageClientProps {
  creatorId: string
}

// 2. API endpoints (ГОТОВЫ)
GET /api/creators/{id} -> creator data
GET /api/posts?creatorId={id} -> creator posts
PUT /api/user -> profile updates

// 3. Hooks и utilities (ГОТОВЫ)  
useOptimizedPosts({ creatorId })
useUser() 
getProfileLink()
updateUserProfile()
```

## 🔧 КЛЮЧЕВЫЕ КОМПОНЕНТЫ

### 1. CreatorPageClient (БАЗА)
**Локация**: `components/CreatorPageClient.tsx`  
**Статус**: ✅ Полностью восстановлен в предыдущей задаче  
**Функции**:
- Загрузка данных создателя через API
- Owner detection (`isOwner = user?.id === creatorId`)
- UI рендеринг (background, avatar, info, stats)
- Error handling и loading states

**Текущие кнопки**:
```typescript
{isOwner ? (
  <Link href="/profile">Edit Profile</Link>  // ❌ НУЖНО ИСПРАВИТЬ
) : (
  <button>Subscribe</button>  // ✅ РАБОТАЕТ
)}
```

### 2. Posts System Integration Points
**useOptimizedPosts готов к использованию**:
```typescript
// lib/hooks/useOptimizedPosts.ts
interface UseOptimizedPostsOptions {
  creatorId?: string     // ✅ ПОДДЕРЖИВАЕТСЯ
  category?: string      // ✅ ПОДДЕРЖИВАЕТСЯ  
  sortBy?: string        // ✅ ПОДДЕРЖИВАЕТСЯ
}

// Возвращает:
interface UseOptimizedPostsReturn {
  posts: UnifiedPost[]   // ✅ NORMALIZED DATA
  isLoading: boolean     // ✅ LOADING STATE
  error: Error | null    // ✅ ERROR HANDLING
}
```

### 3. Edit Profile System
**ProfileSetupModal компонент**:
```typescript
// components/ProfileSetupModal.tsx 
interface ProfileSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: ProfileData) => Promise<void>
  userWallet?: string
  // ДОБАВИТЬ: initialData для режима редактирования
}
```

**Store integration**:
```typescript
// lib/store/appStore.ts
updateProfile: async (profileData) => {
  // ✅ ГОТОВА К ИСПОЛЬЗОВАНИЮ
  // Поддерживает: nickname, fullName, bio, avatar, etc.
}
```

### 4. Custom Links Architecture
**Существующая система**:
```typescript
// lib/utils/links.ts - РАБОТАЕТ
getProfileLink({ id, nickname }) -> `/${nickname}` или `/creator/${id}`

// middleware.ts - РАБОТАЕТ  
/username -> UserProfileShortcutClient -> /creator/id

// app/[username]/page.tsx - РАБОТАЕТ
UserProfileShortcutClient -> API lookup -> redirect
```

**Недостающее звено**: UI для изменения nickname

## 🗄️ БАЗА ДАННЫХ И API

### Database Schema (ГОТОВА):
```sql
users table:
  id, nickname (UNIQUE), fullName, bio, avatar, backgroundImage
  followersCount, postsCount, followingCount  -- ✅ СИНХРОНИЗИРОВАНЫ
  
posts table:  
  id, creatorId, title, content, type, mediaUrl
  likesCount, commentsCount, viewsCount
```

### API Endpoints (ВСЕ РАБОТАЮТ):
```typescript
GET /api/creators/{id}:
  Response: Creator + followersCount + postsCount  ✅

GET /api/posts?creatorId={id}:
  Response: Post[] с нормализованными данными  ✅
  
PUT /api/user:
  Body: { nickname, fullName, bio, avatar }  ✅
  Включает валидацию и uniqueness check
```

## 🎨 UI/UX ПАТТЕРНЫ

### Tab Navigation System:
```typescript
// Существующие паттерны в проекте
const tabs = [
  { id: 'all', label: 'All Posts' },
  { id: 'media', label: 'Media' },
  { id: 'text', label: 'Text' },
]

// Filter logic
const filteredPosts = posts.filter(post => {
  if (activeTab === 'media') {
    return ['image', 'video', 'audio'].includes(post.type)
  }
  return true
})
```

### Modal Integration Patterns:
```typescript
// Существующий паттерн в проекте
const [showModal, setShowModal] = useState(false)
const handleEditProfile = () => setShowModal(true)

// Modal с предзаполненными данными
<ProfileSetupModal 
  isOpen={showModal}
  initialData={{
    nickname: creator.nickname,
    fullName: creator.fullName,
    bio: creator.bio,
    avatar: creator.avatar
  }}
/>
```

## 🔄 СОСТОЯНИЕ И ОБНОВЛЕНИЯ

### Data Flow для Posts:
```typescript
// 1. Загрузка (useOptimizedPosts)
creatorId -> API call -> normalization -> setState

// 2. Фильтрация (в компоненте)
selectedTab -> filter logic -> display

// 3. Обновление (при изменениях)
WebSocket updates -> real-time sync
```

### Edit Profile Flow:
```typescript
// 1. Owner detection
isOwner -> show Edit button

// 2. Modal открытие  
onClick -> setShowModal(true) -> ProfileSetupModal

// 3. Сохранение
onComplete -> API call -> store update -> UI refresh
```

## 🔗 ЗАВИСИМОСТИ И СВЯЗИ

### External Dependencies:
- **Next.js router**: Для навигации и URL handling
- **Zustand store**: Для state management
- **Prisma ORM**: Для database operations  
- **Solana Wallet**: Для user authentication

### Internal Dependencies:
- **useUser hook**: Для текущего пользователя
- **useWallet hook**: Для wallet состояния
- **PostNormalizer**: Для унификации данных постов
- **Avatar component**: Для отображения аватаров
- **PostCard**: Для рендеринга постов

### Component Hierarchy:
```
CreatorPageClient
├── Header (background, avatar, info)
├── Actions (Edit/Subscribe buttons)  
├── Statistics (followers, posts, following)
└── PostsSection 
    ├── TabNavigation
    └── PostGrid
        └── PostCard[]
```

## ⚠️ ПОТЕНЦИАЛЬНЫЕ КОНФЛИКТЫ

### 1. Edit Profile Route Conflict:
**Проблема**: Edit Profile кнопка ссылается на `/profile`
**Текущее**: ProfilePageClient отключен (maintenance mode)
**Решение**: Использовать modal вместо отдельной страницы

### 2. Posts Loading Performance:
**Проблема**: Может быть много постов (у octanedreams 33 поста)
**Решение**: Pagination в useOptimizedPosts

### 3. Real-time Updates:
**Проблема**: WebSocket система частично отключена  
**Решение**: Polling или manual refresh для статистики

### 4. Mobile Responsiveness:
**Проблема**: Табки и modal должны работать на мобильных
**Решение**: Existing responsive patterns в проекте

## 🔒 БЕЗОПАСНОСТЬ

### Owner Validation:
```typescript
// Frontend validation
const isOwner = user?.id === creatorId

// Backend validation (PUT /api/user)
const token = await verifyJWT(request)
const currentUser = await getUserByToken(token)
if (currentUser.id !== targetUserId) throw Error('Unauthorized')
```

### Nickname Uniqueness:
```typescript
// Существующая валидация в lib/db.ts
const existingUser = await prisma.user.findFirst({
  where: { 
    nickname: { equals: newNickname, mode: 'insensitive' }
  }
})
if (existingUser) throw Error('Nickname already taken')
```

## 📱 RESPONSIVE DESIGN

### Breakpoints (из существующих паттернов):
- Mobile: `< 768px` - Stacked layout, bottom tabs
- Tablet: `768px - 1024px` - Compact grid  
- Desktop: `> 1024px` - Full layout

### Existing CSS Patterns:
```css
/* Используется в проекте */
.responsive-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3;
}

.mobile-stack {
  @apply flex flex-col md:flex-row;
}
```

## 🚀 ПРОИЗВОДИТЕЛЬНОСТЬ

### Оптимизации (уже реализованы):
- **Image lazy loading**: В PostCard компонентах
- **API pagination**: В useOptimizedPosts  
- **Component memoization**: React.memo используется
- **Bundle splitting**: Next.js automatic

### Метрики (текущие):
- **Profile load time**: ~300ms (отлично)
- **Posts load time**: Нужно измерить после реализации
- **Edit modal open**: Должно быть <100ms

## 📈 МОНИТОРИНГ И АНАЛИТИКА

### Существующие логи:
```typescript
// В useOptimizedPosts
console.log('[useOptimizedPosts] Loading posts with options:', options)

// В API endpoints  
console.log('[API] Posts API called with creatorId:', creatorId)
```

### Метрики для отслеживания:
- Posts load performance
- Edit profile success rate
- Custom link update frequency
- Tab switching analytics

Архитектура готова к реализации всех 5 требований с минимальными изменениями существующих компонентов. 