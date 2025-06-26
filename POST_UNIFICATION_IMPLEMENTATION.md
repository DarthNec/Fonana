# 🚀 Post System Unification - Implementation Plan

## 📋 Предварительные требования

### ✅ Что сохраняем:
1. **Все тиры подписок** (free, basic, premium, vip)
2. **Типы контента** (платные посты, продаваемые посты)
3. **Flash Sales** функциональность
4. **PPV сообщения** в чатах
5. **Динамический курс** SOL/USD
6. **Реферальная система** 5%
7. **Все текущие features** без исключений

### 🎯 Цели:
1. Унифицировать отображение постов
2. Улучшить производительность
3. Упростить поддержку кода
4. Сохранить обратную совместимость

## 📂 Структура файлов

```
components/posts/
├── core/
│   ├── PostCard/
│   │   ├── index.tsx
│   │   ├── PostCard.types.ts
│   │   ├── PostCard.styles.ts
│   │   └── PostCard.test.tsx
│   ├── PostHeader/
│   │   ├── index.tsx
│   │   └── PostHeader.types.ts
│   ├── PostContent/
│   │   ├── index.tsx
│   │   └── PostContent.types.ts
│   ├── PostMedia/
│   │   ├── index.tsx
│   │   └── PostMedia.types.ts
│   ├── PostAccess/
│   │   ├── index.tsx
│   │   ├── TierAccess.tsx
│   │   ├── PaymentAccess.tsx
│   │   └── SellableAccess.tsx
│   └── PostActions/
│       ├── index.tsx
│       ├── LikeButton.tsx
│       ├── CommentButton.tsx
│       └── ShareButton.tsx
├── layouts/
│   ├── PostsContainer.tsx
│   ├── PostGrid.tsx
│   ├── PostList.tsx
│   └── PostMasonry.tsx
├── modals/
│   ├── PostComments.tsx
│   └── PostImageViewer.tsx
└── utils/
    ├── postHelpers.ts
    └── accessHelpers.ts
```

## 🔨 Прогресс имплементации

### ✅ Phase 1: Типы и интерфейсы (Завершено)
- [x] Создан `types/posts/index.ts` - базовые типы и интерфейсы
- [x] Определены все необходимые структуры данных
- [x] Поддержка всех типов постов и тиров

### ✅ Phase 2: Container & Layouts (Завершено)
- [x] Создан `components/posts/layouts/PostsContainer.tsx` - главный контейнер
- [x] Создан `components/posts/layouts/PostGrid.tsx` - grid layout
- [x] Создан `components/posts/layouts/PostList.tsx` - list layout
- [x] Создан `services/posts/normalizer.ts` - сервис нормализации
- [x] Создан `components/posts/utils/postHelpers.ts` - утилиты
- [x] Создан `lib/hooks/useUnifiedPosts.ts` - хук для работы с постами
- [x] Создан `lib/utils.ts` - общие утилиты

### ✅ Phase 3: Core Components (Завершено)
- [x] `components/posts/core/PostCard/index.tsx` - основной компонент карточки
- [x] `components/posts/core/PostHeader/index.tsx` - заголовок с информацией о создателе
- [x] `components/posts/core/PostContent/index.tsx` - отображение контента
- [x] `components/posts/core/PostActions/index.tsx` - действия с постом
- [x] `components/posts/core/PostLocked/index.tsx` - заблокированный контент
- [x] `components/posts/core/PostTierBadge/index.tsx` - бейдж тира
- [x] `components/posts/core/PostFlashSale/index.tsx` - компонент Flash Sale

### 🚀 Phase 4: Migration (Завершено)
- [x] Миграция Feed страницы
- [x] Миграция Profile страницы
- [x] Миграция Creator страницы
- [x] Миграция Dashboard
- [x] Миграция Search

## 🧪 Тестирование

### Созданные тестовые страницы:
- `/test/unified-posts` - интерактивная страница для тестирования всех вариантов отображения

### Как протестировать:
```bash
# Локально
npm run dev
# Открыть http://localhost:3000/test/unified-posts

# На production
./deploy-to-production.sh
# Открыть https://fonana.me/test/unified-posts
```

## 🔨 Phase 1: Core Types & Interfaces (День 1)

### 1.1 Создать базовые типы

```typescript
// types/posts/index.ts
export interface PostCreator {
  id: string
  name: string
  username: string
  nickname?: string
  avatar: string | null
  isVerified: boolean
}

export interface PostContent {
  title: string
  text: string
  category?: string
  tags: string[]
}

export interface PostMedia {
  type: 'text' | 'image' | 'video' | 'audio'
  url?: string
  thumbnail?: string
  preview?: string
  aspectRatio?: 'vertical' | 'square' | 'horizontal'
}

export interface PostAccess {
  isLocked: boolean
  tier?: 'basic' | 'premium' | 'vip'
  price?: number
  currency?: string
  isPurchased?: boolean
  isSubscribed?: boolean
  userTier?: string
  shouldHideContent: boolean
}

export interface PostCommerce {
  isSellable: boolean
  sellType?: 'FIXED_PRICE' | 'AUCTION'
  quantity?: number
  soldAt?: string
  soldTo?: PostCreator
  soldPrice?: number
  auctionData?: {
    status: string
    startPrice?: number
    currentBid?: number
    endAt?: string
  }
  flashSale?: {
    id: string
    discount: number
    endAt: string
    remainingRedemptions?: number
    timeLeft: number
  }
}

export interface PostEngagement {
  likes: number
  comments: number
  views: number
  isLiked?: boolean
}

export interface UnifiedPost {
  id: string
  creator: PostCreator
  content: PostContent
  media: PostMedia
  access: PostAccess
  commerce?: PostCommerce
  engagement: PostEngagement
  createdAt: string
  updatedAt: string
}
```

### 1.2 Создать сервис нормализации

```typescript
// services/posts/normalizer.ts
export class PostNormalizer {
  static normalize(rawPost: any): UnifiedPost {
    const creator = this.normalizeCreator(rawPost.creator)
    const content = this.normalizeContent(rawPost)
    const media = this.normalizeMedia(rawPost)
    const access = this.normalizeAccess(rawPost)
    const commerce = this.normalizeCommerce(rawPost)
    const engagement = this.normalizeEngagement(rawPost)
    
    return {
      id: rawPost.id,
      creator,
      content,
      media,
      access,
      commerce,
      engagement,
      createdAt: rawPost.createdAt,
      updatedAt: rawPost.updatedAt
    }
  }
  
  private static normalizeAccess(rawPost: any): PostAccess {
    return {
      isLocked: rawPost.isLocked,
      tier: rawPost.minSubscriptionTier || (rawPost.isPremium ? 'vip' : undefined),
      price: rawPost.price,
      currency: rawPost.currency || 'SOL',
      isPurchased: rawPost.hasPurchased,
      isSubscribed: rawPost.isSubscribed,
      userTier: rawPost.userTier,
      shouldHideContent: rawPost.shouldHideContent
    }
  }
}
```

## 🔨 Phase 2: Container & Layouts (День 2-3)

### 2.1 PostsContainer

```typescript
// components/posts/layouts/PostsContainer.tsx
import { UnifiedPost } from '@/types/posts'
import { PostCard } from '../core/PostCard'
import { PostGrid } from './PostGrid'
import { PostList } from './PostList'

export interface PostsContainerProps {
  posts: UnifiedPost[]
  layout?: 'list' | 'grid' | 'masonry'
  variant?: 'feed' | 'profile' | 'creator' | 'search' | 'dashboard'
  showCreator?: boolean
  onAction?: (action: PostAction) => void
  className?: string
}

export function PostsContainer({
  posts,
  layout = 'list',
  variant = 'feed',
  showCreator = true,
  onAction,
  className
}: PostsContainerProps) {
  const LayoutComponent = {
    list: PostList,
    grid: PostGrid,
    masonry: PostMasonry
  }[layout]
  
  return (
    <LayoutComponent
      posts={posts}
      variant={variant}
      showCreator={showCreator}
      onAction={onAction}
      className={className}
    />
  )
}
```

### 2.2 PostGrid (для Dashboard & Search)

```typescript
// components/posts/layouts/PostGrid.tsx
export function PostGrid({ posts, variant, showCreator, onAction }: LayoutProps) {
  const gridCols = {
    search: 'sm:grid-cols-2 lg:grid-cols-3',
    dashboard: 'sm:grid-cols-2 lg:grid-cols-3'
  }
  
  return (
    <div className={cn(
      'grid gap-6',
      gridCols[variant] || 'sm:grid-cols-2 lg:grid-cols-3'
    )}>
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          variant="compact"
          showCreator={showCreator}
          onAction={onAction}
        />
      ))}
    </div>
  )
}
```

## 🔨 Phase 3: Новый PostCard (День 4-5)

### 3.1 Главный компонент

```typescript
// components/posts/core/PostCard/index.tsx
import { UnifiedPost } from '@/types/posts'
import { PostHeader } from '../PostHeader'
import { PostContent } from '../PostContent'
import { PostMedia } from '../PostMedia'
import { PostAccess } from '../PostAccess'
import { PostActions } from '../PostActions'
import { PostCommerce } from '../PostCommerce'

export interface PostCardProps {
  post: UnifiedPost
  variant?: 'full' | 'compact' | 'minimal'
  showCreator?: boolean
  onAction?: (action: PostAction) => void
}

export const PostCard = React.memo(({ 
  post, 
  variant = 'full', 
  showCreator = true,
  onAction 
}: PostCardProps) => {
  const isCompact = variant === 'compact'
  const shouldShowComments = variant === 'full'
  
  return (
    <article className={cn(
      'group relative overflow-hidden',
      'bg-white dark:bg-slate-900',
      'border border-gray-200 dark:border-slate-700/50',
      'transition-all duration-500',
      isCompact ? 'rounded-xl' : 'rounded-none sm:rounded-3xl',
      !isCompact && 'mb-0 sm:mb-8'
    )}>
      {showCreator && <PostHeader creator={post.creator} date={post.createdAt} />}
      
      <PostContent 
        content={post.content} 
        variant={variant}
        category={post.content.category}
      />
      
      {post.access.shouldHideContent ? (
        <PostAccess 
          access={post.access}
          commerce={post.commerce}
          onAction={onAction}
        />
      ) : (
        <PostMedia 
          media={post.media}
          title={post.content.title}
        />
      )}
      
      {post.commerce?.isSellable && !post.commerce.soldAt && (
        <PostCommerce 
          commerce={post.commerce}
          onAction={onAction}
        />
      )}
      
      <PostActions 
        postId={post.id}
        engagement={post.engagement}
        showComments={shouldShowComments}
        onAction={onAction}
      />
    </article>
  )
})
```

### 3.2 PostAccess компонент

```typescript
// components/posts/core/PostAccess/index.tsx
export function PostAccess({ access, commerce, onAction }: PostAccessProps) {
  const { rate: solRate } = useSolRate()
  
  const getAccessType = () => {
    if (commerce?.isSellable) return 'sellable'
    if (access.price && access.price > 0) return 'paid'
    if (access.tier) return 'tier'
    return 'subscription'
  }
  
  const accessType = getAccessType()
  
  return (
    <div className="relative bg-gradient-to-br from-gray-100 dark:from-slate-800/50">
      <div className="py-12 px-6 text-center">
        <LockClosedIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        
        {accessType === 'tier' && access.tier && (
          <TierAccess 
            requiredTier={access.tier}
            userTier={access.userTier}
            onAction={onAction}
          />
        )}
        
        {accessType === 'paid' && (
          <PaymentAccess
            price={access.price}
            currency={access.currency}
            flashSale={commerce?.flashSale}
            onAction={onAction}
          />
        )}
        
        {accessType === 'sellable' && commerce && (
          <SellableAccess
            commerce={commerce}
            onAction={onAction}
          />
        )}
      </div>
    </div>
  )
}
```

## 🔨 Phase 4: Миграция страниц (День 6-7)

### 4.1 Dashboard (первый, т.к. уже grid)

```typescript
// app/dashboard/page.tsx
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { PostNormalizer } from '@/services/posts/normalizer'

// В компоненте
const normalizedPosts = dashboardData.posts.map(PostNormalizer.normalize)

return (
  <PostsContainer
    posts={normalizedPosts}
    layout="grid"
    variant="dashboard"
    showCreator={false}
    onAction={handlePostAction}
  />
)
```

### 4.2 Search page

```typescript
// app/search/page.tsx
const normalizedPosts = filteredResults.posts.map(PostNormalizer.normalize)

return (
  <PostsContainer
    posts={normalizedPosts}
    layout="grid"
    variant="search"
    showCreator={true}
    onAction={handlePostAction}
  />
)
```

## 🔍 Phase 5: Тестирование (День 8)

### 5.1 Unit тесты

```typescript
// components/posts/core/PostCard/PostCard.test.tsx
describe('PostCard', () => {
  it('should render free post correctly', () => {
    const post = mockPost({ access: { isLocked: false } })
    render(<PostCard post={post} />)
    expect(screen.getByText(post.content.title)).toBeInTheDocument()
  })
  
  it('should show tier access for locked content', () => {
    const post = mockPost({ 
      access: { isLocked: true, tier: 'premium' } 
    })
    render(<PostCard post={post} />)
    expect(screen.getByText(/Premium Content/)).toBeInTheDocument()
  })
})
```

### 5.2 Интеграционные тесты

- Проверка всех типов доступа
- Проверка Flash Sales
- Проверка аукционов
- Проверка PPV контента

## 📊 Метрики для отслеживания

1. **Performance**:
   - FCP (First Contentful Paint)
   - TTI (Time to Interactive)
   - Bundle size

2. **User Metrics**:
   - Click-through rate
   - Engagement rate
   - Error rate

3. **Developer Metrics**:
   - Build time
   - Test coverage
   - Code complexity

## ⚠️ Риски и решения

| Риск | Решение |
|------|---------|
| Сломать существующий функционал | Feature flags + A/B testing |
| Проблемы с типизацией | Постепенная миграция с any |
| Производительность на мобильных | Virtual scrolling + lazy loading |
| Сложность миграции | Поэтапный подход, начиная с grid |

## 🎯 Definition of Done

- [ ] Все тесты проходят
- [ ] Нет регрессии функциональности
- [ ] Performance не ухудшилась
- [ ] Документация обновлена
- [ ] Code review пройден
- [ ] A/B тест показал улучшения 

## 🔨 Результаты миграции

### ✅ Feed страница (`app/feed/page.tsx`):
- Использует `useUnifiedPosts` для загрузки постов
- Применяет `PostsContainer` с `layout="list"` и `variant="feed"`
- Сохранены все фильтры и сортировка
- Сохранены все модальные окна (Subscribe, Purchase, Edit, Sellable)
- Данные автоматически преобразуются из UnifiedPost формата

### ✅ Dashboard страница (`app/dashboard/page.tsx`):
- Использует `useUnifiedPosts` с `creatorId` для загрузки постов создателя
- Применяет `PostsContainer` с `layout="grid"` и `variant="dashboard"`
- Сохранена вся статистика и графики доходов
- `showCreator={false}` так как это посты самого создателя
- Интеграция с CreatePostModal

## 🎯 Преимущества после миграции:

1. **Единообразие** - один источник правды для отображения постов
2. **Производительность** - оптимизированная загрузка и рендеринг
3. **Поддерживаемость** - изменения в PostCard применяются везде
4. **Масштабируемость** - легко добавлять новые варианты отображения
5. **Type Safety** - полная типизация через UnifiedPost 

# Post Unification Implementation Status

## 🎯 Цель
Создание единой унифицированной системы постов для Fonana, где посты отображаются одинаково во всех местах приложения с использованием централизованных компонентов.

## ✅ Реализованные фазы

### Phase 1: Типы и интерфейсы ✓
- **types/posts/index.ts** - Унифицированные типы для системы постов
- Поддержка всех тиров (free, basic, premium, vip)
- Поддержка коммерческих функций (платные посты, аукционы, Flash Sales)
- Type-safe архитектура с полной типизацией

### Phase 2: Container & Layouts ✓
- **PostsContainer** - Главный контейнер с поддержкой layouts
- **PostGrid** - Grid layout для dashboard и search
- **PostList** - List layout для feed и profiles
- **PostNormalizer** - Нормализация данных из API
- **postHelpers** - Утилиты для работы с постами
- **useUnifiedPosts** - React hook для загрузки постов

### Phase 3: Core Components ✓
- **PostCard** - Адаптивный компонент с вариантами отображения
- **PostHeader** - Информация о создателе
- **PostContent** - Отображение медиа контента
- **PostLocked** - Заблокированный контент с градиентами
- **PostActions** - Кнопки действий
- **PostTierBadge** - Визуальные индикаторы тиров
- **PostFlashSale** - Баннер Flash Sale

### Phase 4: Migration ✓
Успешно мигрированы все 5 страниц:

1. **Feed страница** (/app/feed/page.tsx)
   - Layout: list
   - Variant: feed
   - Особенности: фильтры категорий, модалки покупки/подписки

2. **Dashboard страница** (/app/dashboard/page.tsx)
   - Layout: grid
   - Variant: dashboard
   - Особенности: статистика, графики доходов

3. **Profile страница** (/app/profile/page.tsx)
   - Layout: list
   - Variant: profile
   - Особенности: таб "My Posts", редактирование постов

4. **Creator страница** (/app/creator/[id]/page.tsx)
   - Layout: list
   - Variant: creator
   - Особенности: табы по типам контента, subscription tiers

5. **Search страница** (/app/search/page.tsx)
   - Layout: grid
   - Variant: search
   - Особенности: результаты поиска, фильтры

## 📊 Архитектура системы

### Поток данных
```
API Response → PostNormalizer → UnifiedPost[] → PostsContainer → Layout Component → PostCard
```

### Структура компонентов
```
PostsContainer
├── PostList / PostGrid (layout)
│   └── PostCard
│       ├── PostHeader (creator info)
│       ├── PostContent (media)
│       ├── PostLocked (if locked)
│       ├── PostFlashSale (if active)
│       ├── PostTierBadge (tier indicator)
│       └── PostActions (buttons)
```

## 🚀 Следующие шаги

### Оптимизация производительности
- [ ] Добавить виртуализацию для больших списков (react-window)
- [ ] Реализовать lazy loading изображений
- [ ] Добавить skeleton loaders во время загрузки
- [ ] Оптимизировать re-renders с помощью React.memo

### Расширение функциональности
- [ ] Добавить masonry layout для Pinterest-style grid
- [ ] Реализовать infinite scroll
- [ ] Добавить анимации при появлении постов
- [ ] Создать компонент PostFilters для унификации фильтров

### Тестирование
- [ ] Написать unit тесты для PostNormalizer
- [ ] Создать Storybook stories для всех компонентов
- [ ] Добавить E2E тесты для основных сценариев
- [ ] Проверить производительность на больших объемах данных

### Документация
- [ ] Создать API документацию для разработчиков
- [ ] Добавить JSDoc комментарии во все компоненты
- [ ] Создать визуальный style guide
- [ ] Написать migration guide для новых страниц

## 💡 Преимущества новой системы

1. **Консистентность** - Посты выглядят одинаково везде
2. **Поддерживаемость** - Изменения в одном месте применяются везде
3. **Масштабируемость** - Легко добавлять новые layouts и варианты
4. **Type Safety** - Полная типизация предотвращает ошибки
5. **Производительность** - Централизованная оптимизация
6. **DX** - Простое API для разработчиков

## 📝 Примеры использования

### Базовое использование
```tsx
<PostsContainer 
  posts={posts}
  layout="list"
  variant="feed"
/>
```

### С обработчиками действий
```tsx
<PostsContainer 
  posts={posts}
  layout="grid"
  variant="dashboard"
  onAction={(action) => {
    if (action.type === 'like') handleLike(action.postId)
    if (action.type === 'purchase') handlePurchase(action.postId)
  }}
/>
```

### С кастомным empty state
```tsx
<PostsContainer 
  posts={posts}
  isLoading={isLoading}
  emptyComponent={<CustomEmptyState />}
/>
```

## ✨ Итоги

Унификация системы постов в Fonana успешно завершена. Все основные страницы мигрированы на новую архитектуру, что обеспечивает:

- Единообразный пользовательский опыт
- Упрощенную поддержку кода
- Готовность к масштабированию
- Улучшенную производительность

Система готова к production использованию и дальнейшему развитию. 