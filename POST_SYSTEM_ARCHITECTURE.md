# 📋 Fonana Post System Architecture

## 🎯 Цель документа
Этот документ описывает текущую архитектуру системы постов и план унификации для оптимизации производительности и улучшения DX.

## 📊 Текущее состояние

### Места отображения постов

| Страница | Layout | Props | Особенности |
|----------|--------|-------|-------------|
| `/feed` | Vertical list | `showCreator={true}` | Полная ширина на мобильных |
| `/profile` | Vertical list | `showCreator={false}` | My Posts секция |
| `/creator/[id]` | Vertical list + tabs | `showCreator={false}` | Фильтры: Posts/Photos/Videos |
| `/dashboard` | Grid/List hybrid | Varies | Grid на десктопе |
| `/search` | Grid | Compact | Всегда grid |

### Система доступа к контенту

```typescript
// Текущая логика определения доступа
function determineAccess(post: Post, user: User): AccessResult {
  // 1. Автор всегда имеет доступ
  if (post.creatorId === user.id) return { hasAccess: true }
  
  // 2. Бесплатный контент
  if (!post.isLocked) return { hasAccess: true }
  
  // 3. Продаваемые посты (товары)
  if (post.isSellable) {
    // Доступ к просмотру определяется подпиской
    // Покупка касается товара, не контента
    return checkTierAccess(post.minSubscriptionTier, userSubscription)
  }
  
  // 4. Платный контент (PPV)
  if (post.price > 0) {
    return checkPurchase(post.id, user.id)
  }
  
  // 5. Контент по подписке
  if (post.minSubscriptionTier) {
    return checkTierAccess(post.minSubscriptionTier, userSubscription)
  }
  
  // 6. Legacy VIP контент
  if (post.isPremium) {
    return checkTierAccess('vip', userSubscription)
  }
  
  // 7. Обычный заблокированный контент
  return { hasAccess: hasAnySubscription(user.id, post.creatorId) }
}
```

### Типы постов

1. **Обычный пост** - бесплатный контент
2. **Tier-locked пост** - требует определенный уровень подписки
3. **PPV пост** - платный доступ (одноразовая покупка)
4. **Sellable пост** - продажа товаров/услуг
5. **Hybrid пост** - комбинация (например, tier + price)

### Проблемы текущей архитектуры

1. **PostCard перегружен** - 1210 строк кода
2. **Дублирование логики** - форматирование данных в каждом компоненте
3. **Несогласованность стилей** - разные отступы и контейнеры
4. **Отсутствие типизации** - any в критических местах
5. **Производительность** - нет оптимизаций для больших списков

## 🚀 План унификации

### Фаза 1: Типизация и интерфейсы

```typescript
// types/post.types.ts
export interface UnifiedPost {
  // Основные данные
  id: string
  creatorId: string
  
  // Контент
  content: {
    title: string
    text: string
    category?: string
    tags: string[]
  }
  
  // Медиа
  media: {
    type: 'text' | 'image' | 'video' | 'audio'
    url?: string
    thumbnail?: string
    preview?: string
    aspectRatio?: 'vertical' | 'square' | 'horizontal'
  }
  
  // Доступ
  access: {
    isLocked: boolean
    tier?: 'basic' | 'premium' | 'vip'
    price?: number
    isPurchased?: boolean
    shouldHideContent: boolean
  }
  
  // Коммерция
  commerce?: {
    isSellable: boolean
    sellType?: 'FIXED_PRICE' | 'AUCTION'
    quantity?: number
    auctionData?: AuctionData
    flashSale?: FlashSaleData
  }
  
  // Вовлеченность
  engagement: {
    likes: number
    comments: number
    views: number
    isLiked?: boolean
  }
  
  // Метаданные
  metadata: {
    createdAt: string
    updatedAt: string
  }
}
```

### Фаза 2: Компонентная архитектура

```
components/
└── posts/
    ├── PostsContainer/
    │   ├── index.tsx              # Главный контейнер
    │   ├── PostsContainer.types.ts
    │   └── PostsContainer.styles.ts
    ├── PostCard/
    │   ├── index.tsx              # Композитный компонент
    │   ├── PostCard.types.ts
    │   ├── PostHeader.tsx         # Автор, дата, меню
    │   ├── PostContent.tsx        # Заголовок, текст
    │   ├── PostMedia.tsx          # Изображения, видео
    │   ├── PostAccess.tsx         # Блокировка, покупка
    │   ├── PostActions.tsx        # Лайки, комменты, шаринг
    │   ├── PostCommerce.tsx       # Продажа товаров
    │   └── PostComments.tsx       # Секция комментариев
    ├── PostGrid/
    │   └── index.tsx              # Grid layout
    ├── PostList/
    │   └── index.tsx              # List layout
    └── PostMasonry/
        └── index.tsx              # Masonry layout
```

### Фаза 3: Сервисный слой

```typescript
// services/posts/posts.service.ts
export class PostsService {
  // Загрузка постов
  static async fetchPosts(options: FetchOptions): Promise<UnifiedPost[]>
  
  // Нормализация данных
  static normalizePost(raw: any): UnifiedPost
  
  // Действия
  static async likePost(postId: string): Promise<EngagementData>
  static async purchasePost(postId: string): Promise<PurchaseResult>
  static async subscribeToTier(creatorId: string, tier: string): Promise<SubscriptionResult>
}
```

### Фаза 4: Контекст и хуки

```typescript
// contexts/PostsContext.tsx
export const PostsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [layout, setLayout] = useState<LayoutType>('list')
  
  // Централизованные действия
  const actions = {
    like: (postId: string) => handleLike(postId),
    purchase: (postId: string) => handlePurchase(postId),
    updatePost: (postId: string, updates: Partial<UnifiedPost>) => handleUpdate(postId, updates)
  }
  
  return (
    <PostsContext.Provider value={{ posts, layout, actions }}>
      {children}
    </PostsContext.Provider>
  )
}

// hooks/usePosts.ts
export const usePosts = () => {
  const context = useContext(PostsContext)
  if (!context) throw new Error('usePosts must be used within PostsProvider')
  return context
}
```

## 🎨 Варианты отображения

### Layout Types
- **list** - Вертикальный список (feed, profile)
- **grid** - Сетка (dashboard, search)
- **masonry** - Pinterest-style (будущее)

### Card Variants
- **full** - Полная карточка с комментариями
- **compact** - Компактная для grid
- **minimal** - Минималистичная
- **preview** - Превью для поиска

## 📈 Оптимизации

1. **React.memo** для PostCard
2. **Virtual scrolling** для больших списков
3. **Lazy loading** для изображений
4. **Debounced** действия (лайки, просмотры)
5. **Optimistic updates** для лучшего UX
6. **Progressive enhancement** для медиа

## 🔄 Миграция

### Приоритеты
1. Dashboard и Search (уже используют grid)
2. Feed (самый посещаемый)
3. Creator page
4. Profile page

### Обратная совместимость
- Старый PostCard остается как PostCardLegacy
- Постепенная миграция по страницам
- Feature flags для A/B тестирования

## 📊 Метрики успеха

- Уменьшение размера PostCard с 1210 до <300 строк
- Улучшение FCP на 20%
- Уменьшение re-renders на 50%
- Улучшение DX (по опросам команды)

## 🚦 Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Регрессия функциональности | Средняя | E2E тесты, поэтапный rollout |
| Проблемы производительности | Низкая | Профилирование, мониторинг |
| Сложность миграции | Средняя | Feature flags, обратная совместимость |

## 📝 Заметки

- Сохраняем все текущие функции
- Фокус на производительности мобильных устройств
- Приоритет type safety
- Документация на каждом этапе 