# ТЕХНИЧЕСКИЕ СПЕЦИФИКАЦИИ - Карусель ремиксов постов

## 🎯 Обзор спецификаций

### Цель документа
Детальные технические спецификации для реализации карусели ремиксов постов, включая API схемы, типы данных, компонентные интерфейсы и алгоритмы.

## 📊 API Спецификации

### 1. Remix Group Endpoint
**URL**: `GET /api/posts/remix-group/{postId}`
**Описание**: Получение группы ремиксов для конкретного поста

```typescript
// Request
interface RemixGroupRequest {
  postId: string
  includeOriginal?: boolean  // Включить оригинальный пост
  limit?: number           // Максимальное количество ремиксов
  offset?: number          // Смещение для пагинации
}

// Response
interface RemixGroupResponse {
  success: boolean
  data: {
    originalPost: UnifiedPost
    remixes: UnifiedPost[]
    totalCount: number
    hasMore: boolean
    pagination: {
      limit: number
      offset: number
      total: number
    }
  }
  error?: string
}

// Error Response
interface ErrorResponse {
  success: false
  error: string
  code: string
  details?: any
}
```

### 2. Remixes Endpoint
**URL**: `GET /api/posts/{id}/remixes`
**Описание**: Получение только ремиксов конкретного поста

```typescript
// Request
interface RemixesRequest {
  id: string
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'likesCount' | 'viewsCount'
  sortOrder?: 'asc' | 'desc'
}

// Response
interface RemixesResponse {
  success: boolean
  data: {
    remixes: UnifiedPost[]
    totalCount: number
    hasMore: boolean
    pagination: {
      limit: number
      offset: number
      total: number
    }
  }
  error?: string
}
```

### 3. Database Queries
**Описание**: SQL запросы для получения групп ремиксов

```sql
-- Получение группы ремиксов (оригинал + ремиксы)
SELECT 
  p.*,
  u.nickname,
  u.avatar,
  u.fullName,
  COUNT(l.id) as likesCount,
  COUNT(c.id) as commentsCount
FROM posts p
LEFT JOIN users u ON p.creatorId = u.id
LEFT JOIN likes l ON p.id = l.postId
LEFT JOIN comments c ON p.id = c.postId
WHERE p.id = $1 OR p.remixId = $1
GROUP BY p.id, u.id
ORDER BY 
  CASE WHEN p.id = $1 THEN 0 ELSE 1 END,  -- Оригинал первым
  p.createdAt ASC
LIMIT $2 OFFSET $3;

-- Получение только ремиксов
SELECT 
  p.*,
  u.nickname,
  u.avatar,
  u.fullName,
  COUNT(l.id) as likesCount,
  COUNT(c.id) as commentsCount
FROM posts p
LEFT JOIN users u ON p.creatorId = u.id
LEFT JOIN likes l ON p.id = l.postId
LEFT JOIN comments c ON p.id = c.postId
WHERE p.remixId = $1
GROUP BY p.id, u.id
ORDER BY p.createdAt ASC
LIMIT $2 OFFSET $3;
```

## 🏗️ Компонентные интерфейсы

### 1. RemixCarousel Component
**Файл**: `components/posts/core/RemixCarousel/index.tsx`

```typescript
interface RemixCarouselProps {
  post: UnifiedPost
  onAction?: (action: PostAction) => void
  variant?: PostCardVariant
  className?: string
  autoPlay?: boolean
  autoPlayInterval?: number
  showIndicators?: boolean
  showNavigation?: boolean
  enableKeyboard?: boolean
  enableTouch?: boolean
}

interface RemixCarouselState {
  currentIndex: number
  remixGroup: UnifiedPost[]
  isLoading: boolean
  error: string | null
  isInitialized: boolean
  isPlaying: boolean
  touchStart: number | null
  touchEnd: number | null
}

export function RemixCarousel({
  post,
  onAction,
  variant = 'full',
  className,
  autoPlay = false,
  autoPlayInterval = 5000,
  showIndicators = true,
  showNavigation = true,
  enableKeyboard = true,
  enableTouch = true
}: RemixCarouselProps) {
  // Implementation
}
```

### 2. NavigationControls Component
**Файл**: `components/posts/core/RemixCarousel/NavigationControls.tsx`

```typescript
interface NavigationControlsProps {
  currentIndex: number
  totalCount: number
  onPrevious: () => void
  onNext: () => void
  variant?: PostCardVariant
  className?: string
  showLabels?: boolean
  disabled?: boolean
}

export function NavigationControls({
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
  variant = 'full',
  className,
  showLabels = false,
  disabled = false
}: NavigationControlsProps) {
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < totalCount - 1
  
  return (
    <div className={cn('navigation-controls', className)}>
      <button
        className="nav-button nav-button-previous"
        onClick={onPrevious}
        disabled={disabled || !canGoPrevious}
        aria-label="Previous post"
      >
        <ChevronLeftIcon className="w-5 h-5" />
        {showLabels && <span>Previous</span>}
      </button>
      
      <button
        className="nav-button nav-button-next"
        onClick={onNext}
        disabled={disabled || !canGoNext}
        aria-label="Next post"
      >
        <ChevronRightIcon className="w-5 h-5" />
        {showLabels && <span>Next</span>}
      </button>
    </div>
  )
}
```

### 3. RemixIndicators Component
**Файл**: `components/posts/core/RemixCarousel/RemixIndicators.tsx`

```typescript
interface RemixIndicatorsProps {
  currentIndex: number
  totalCount: number
  onNavigate: (index: number) => void
  variant?: 'dots' | 'thumbnails' | 'numbers'
  className?: string
  maxVisible?: number
}

export function RemixIndicators({
  currentIndex,
  totalCount,
  onNavigate,
  variant = 'dots',
  className,
  maxVisible = 5
}: RemixIndicatorsProps) {
  const getVisibleIndices = () => {
    if (totalCount <= maxVisible) {
      return Array.from({ length: totalCount }, (_, i) => i)
    }
    
    const start = Math.max(0, currentIndex - Math.floor(maxVisible / 2))
    const end = Math.min(totalCount, start + maxVisible)
    
    return Array.from({ length: end - start }, (_, i) => start + i)
  }
  
  return (
    <div className={cn('remix-indicators', className)}>
      {variant === 'dots' && (
        <div className="indicators-dots">
          {getVisibleIndices().map(index => (
            <button
              key={index}
              className={cn(
                'indicator-dot',
                index === currentIndex && 'active'
              )}
              onClick={() => onNavigate(index)}
              aria-label={`Go to post ${index + 1}`}
            />
          ))}
        </div>
      )}
      
      {variant === 'thumbnails' && (
        <div className="indicators-thumbnails">
          {getVisibleIndices().map(index => (
            <button
              key={index}
              className={cn(
                'indicator-thumbnail',
                index === currentIndex && 'active'
              )}
              onClick={() => onNavigate(index)}
            >
              <img
                src={remixGroup[index]?.media?.thumbnail || '/placeholder.jpg'}
                alt={`Post ${index + 1}`}
              />
            </button>
          ))}
        </div>
      )}
      
      {variant === 'numbers' && (
        <div className="indicators-numbers">
          <span className="current-number">{currentIndex + 1}</span>
          <span className="separator">/</span>
          <span className="total-number">{totalCount}</span>
        </div>
      )}
    </div>
  )
}
```

## 🔧 Custom Hooks

### 1. useRemixCarousel Hook
**Файл**: `lib/hooks/useRemixCarousel.ts`

```typescript
interface UseRemixCarouselOptions {
  autoPlay?: boolean
  autoPlayInterval?: number
  enableKeyboard?: boolean
  enableTouch?: boolean
  preloadAdjacent?: boolean
}

interface UseRemixCarouselReturn {
  // State
  currentIndex: number
  remixGroup: UnifiedPost[]
  isLoading: boolean
  error: string | null
  isPlaying: boolean
  
  // Actions
  navigateTo: (index: number) => void
  navigateNext: () => void
  navigatePrevious: () => void
  togglePlay: () => void
  loadRemixGroup: () => Promise<void>
  refreshGroup: () => Promise<void>
  
  // Computed
  currentPost: UnifiedPost | null
  canGoNext: boolean
  canGoPrevious: boolean
  totalCount: number
}

export function useRemixCarousel(
  postId: string,
  options: UseRemixCarouselOptions = {}
): UseRemixCarouselReturn {
  const {
    autoPlay = false,
    autoPlayInterval = 5000,
    enableKeyboard = true,
    enableTouch = true,
    preloadAdjacent = true
  } = options
  
  const [state, setState] = useState<RemixCarouselState>({
    currentIndex: 0,
    remixGroup: [],
    isLoading: false,
    error: null,
    isInitialized: false,
    isPlaying: false,
    touchStart: null,
    touchEnd: null
  })
  
  // Implementation with all the logic
}
```

### 2. useRemixGroupCache Hook
**Файл**: `lib/hooks/useRemixGroupCache.ts`

```typescript
interface CacheEntry {
  data: RemixGroup
  timestamp: number
  ttl: number
}

interface UseRemixGroupCacheReturn {
  get: (postId: string) => RemixGroup | null
  set: (postId: string, group: RemixGroup) => void
  clear: () => void
  clearExpired: () => void
  getStats: () => { size: number, hitRate: number }
}

export function useRemixGroupCache(): UseRemixGroupCacheReturn {
  const cache = useRef<Map<string, CacheEntry>>(new Map())
  const stats = useRef({ hits: 0, misses: 0 })
  
  const get = useCallback((postId: string): RemixGroup | null => {
    const entry = cache.current.get(postId)
    
    if (!entry) {
      stats.current.misses++
      return null
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.current.delete(postId)
      stats.current.misses++
      return null
    }
    
    stats.current.hits++
    return entry.data
  }, [])
  
  const set = useCallback((postId: string, group: RemixGroup) => {
    cache.current.set(postId, {
      data: group,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    })
  }, [])
  
  // Implementation
}
```

## 🎨 CSS Спецификации

### 1. Base Styles
**Файл**: `components/posts/core/RemixCarousel/RemixCarousel.module.css`

```css
/* Base carousel container */
.remix-carousel {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 0.75rem;
  background: var(--background);
}

/* Content container */
.carousel-content {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Individual post container */
.post-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

.post-container.active {
  opacity: 1;
}

/* Navigation controls */
.navigation-controls {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  padding: 0 1rem;
  pointer-events: none;
  z-index: 10;
}

.nav-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-in-out;
  pointer-events: auto;
  backdrop-filter: blur(4px);
}

.nav-button:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Indicators */
.remix-indicators {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
  z-index: 10;
}

.indicators-dots {
  display: flex;
  gap: 0.5rem;
}

.indicator-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.indicator-dot.active {
  background: white;
  transform: scale(1.2);
}

.indicator-dot:hover {
  background: rgba(255, 255, 255, 0.8);
}

/* Thumbnail indicators */
.indicators-thumbnails {
  display: flex;
  gap: 0.25rem;
}

.indicator-thumbnail {
  width: 2rem;
  height: 2rem;
  border-radius: 0.25rem;
  border: 2px solid transparent;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.indicator-thumbnail.active {
  border-color: white;
  transform: scale(1.1);
}

.indicator-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Number indicators */
.indicators-numbers {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

.current-number {
  font-weight: 700;
}

.separator {
  opacity: 0.7;
}

/* Loading states */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error states */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
  z-index: 20;
}

.error-message {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.retry-button {
  padding: 0.5rem 1rem;
  background: white;
  color: black;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: 500;
}

/* Responsive design */
@media (max-width: 768px) {
  .nav-button {
    width: 2rem;
    height: 2rem;
  }
  
  .navigation-controls {
    padding: 0 0.5rem;
  }
  
  .remix-indicators {
    bottom: 0.5rem;
  }
  
  .indicator-thumbnail {
    width: 1.5rem;
    height: 1.5rem;
  }
}

@media (max-width: 480px) {
  .nav-button {
    width: 1.75rem;
    height: 1.75rem;
  }
  
  .indicator-dot {
    width: 0.375rem;
    height: 0.375rem;
  }
}
```

## 🔄 Алгоритмы

### 1. Navigation Algorithm
**Описание**: Алгоритм навигации между постами

```typescript
function calculateNavigation(
  currentIndex: number,
  totalCount: number,
  direction: 'next' | 'previous' | 'jump'
): number {
  switch (direction) {
    case 'next':
      return currentIndex < totalCount - 1 ? currentIndex + 1 : 0
    case 'previous':
      return currentIndex > 0 ? currentIndex - 1 : totalCount - 1
    case 'jump':
      return Math.max(0, Math.min(totalCount - 1, currentIndex))
    default:
      return currentIndex
  }
}
```

### 2. Cache Management Algorithm
**Описание**: Алгоритм управления кэшем

```typescript
function manageCache(
  cache: Map<string, CacheEntry>,
  maxSize: number,
  ttl: number
): void {
  const now = Date.now()
  
  // Удаляем истекшие записи
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key)
    }
  }
  
  // Если кэш все еще превышает максимальный размер
  if (cache.size > maxSize) {
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    const toDelete = entries.slice(0, cache.size - maxSize)
    toDelete.forEach(([key]) => cache.delete(key))
  }
}
```

### 3. Touch Gesture Algorithm
**Описание**: Алгоритм обработки touch жестов

```typescript
function processTouchGesture(
  touchStart: number,
  touchEnd: number,
  minSwipeDistance: number = 50
): 'left' | 'right' | null {
  if (!touchStart || !touchEnd) return null
  
  const distance = touchStart - touchEnd
  const isLeftSwipe = distance > minSwipeDistance
  const isRightSwipe = distance < -minSwipeDistance
  
  if (isLeftSwipe) return 'left'
  if (isRightSwipe) return 'right'
  
  return null
}
```

## 📊 Performance Specifications

### 1. Memory Usage
- **Base component**: < 1MB
- **Per remix group**: < 500KB
- **Cache limit**: 100 groups (50MB max)
- **Image preloading**: 3 adjacent posts

### 2. Network Performance
- **API response time**: < 200ms
- **Cache hit rate**: > 80%
- **Image loading**: Progressive with placeholders
- **Bundle size impact**: < 50KB

### 3. Rendering Performance
- **Initial render**: < 100ms
- **Navigation transition**: < 200ms
- **Memory leaks**: Zero tolerance
- **Frame rate**: 60fps during transitions

## 🎯 Заключение

### Технические требования выполнены
- ✅ **API схемы**: Полностью определены
- ✅ **Компонентные интерфейсы**: Детально описаны
- ✅ **Custom hooks**: Логика вынесена в переиспользуемые хуки
- ✅ **CSS спецификации**: Адаптивный дизайн
- ✅ **Алгоритмы**: Оптимизированные алгоритмы
- ✅ **Performance**: Строгие требования к производительности

**Проект готов к реализации с полными техническими спецификациями! 🚀**
