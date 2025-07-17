# SOLUTION PLAN v1 - Feed Posts Loading Failure
## Дата: 2025-07-17  
## ID: [feed_loading_2025_001]

### 🎯 Проблема
useOptimizedPosts hook страдает от race condition между dual useEffect patterns, приводящего к AbortError и потере загрузки 279 постов.

### 🧪 Варианты решения

## Вариант 1: Fix AbortController Pattern (РЕКОМЕНДУЕМЫЙ) 🔥

### Подход
Исправить AbortController usage следуя React best practices: создавать controller в useEffect, не в callback functions.

### Ключевые изменения
```typescript
// ❌ ТЕКУЩИЙ (неправильный) паттерн:
const fetchPosts = useCallback(async () => {
  abortControllerRef.current = new AbortController()  // Wrong place
}, [deps])

useEffect(() => {
  fetchPosts()
  return () => abortControllerRef.current?.abort()
}, [])

// ✅ ИСПРАВЛЕННЫЙ паттерн:
useEffect(() => {
  const controller = new AbortController()  // Right place
  
  const fetchData = async () => {
    const response = await fetch(url, { signal: controller.signal })
    // ... process response
  }
  
  fetchData()
  return () => controller.abort()  // Cleanup
}, [url, params])
```

### Имплементация

#### Шаг 1: Упростить useEffect structure
```typescript
// Объединить dual useEffect в single effect с proper dependencies
useEffect(() => {
  const controller = new AbortController()
  
  const loadPosts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Build params
      const params = new URLSearchParams()
      if (options.category) params.append('category', options.category)
      params.append('sortBy', options.sortBy || 'latest')
      // ... other params
      
      const response = await fetch(`/api/posts?${params}`, {
        signal: controller.signal
      })
      
      if (!response.ok) throw new Error('Failed to fetch posts')
      
      const data = await response.json()
      const normalizedPosts = PostNormalizer.normalizeMany(data.posts || [])
      setPosts(normalizedPosts)
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err)
        console.error('Fetch error:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  loadPosts()
  return () => controller.abort()
}, [options.sortBy, options.category, options.creatorId])  // Clear dependencies
```

#### Шаг 2: Отдельный effect для loadMore
```typescript
const loadMore = useCallback(() => {
  if (!hasMore || isLoadingMore) return
  
  const controller = new AbortController()
  // ... separate pagination logic with own AbortController
}, [hasMore, isLoadingMore, page])
```

#### Шаг 3: Remove debouncing для initial loads
- Debounce только для user-triggered filtering
- Initial load должен быть мгновенным

### Преимущества
- ✅ Следует React best practices
- ✅ Eliminates race conditions  
- ✅ Простая и предсказуемая логика
- ✅ Правильный cleanup
- ✅ Maintain existing features (cache, pagination)

### Недостатки  
- ⚠️ Требует тестирование всех existing consumers
- ⚠️ Possible temporary loss of optimizations

---

## Вариант 2: Simple Fetch Hook Replacement

### Подход
Заменить useOptimizedPosts на простой hook без сложных оптимизаций, temporary solution пока не исправим основной hook.

### Имплементация
```typescript
// lib/hooks/useSimplePosts.ts
export function useSimplePosts(options: { sortBy?: string; category?: string }) {
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    const controller = new AbortController()
    
    const fetchPosts = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          sortBy: options.sortBy || 'latest',
          page: '1',
          limit: '20'
        })
        
        const response = await fetch(`/api/posts?${params}`, {
          signal: controller.signal
        })
        
        if (!response.ok) throw new Error('Failed to fetch')
        
        const data = await response.json()
        const normalized = PostNormalizer.normalizeMany(data.posts || [])
        setPosts(normalized)
        
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err)
        }
      } finally {
        setLoading(false)
      }
    }
    
    fetchPosts()
    return () => controller.abort()
  }, [options.sortBy, options.category])
  
  return { posts, loading, error }
}
```

### Использование в FeedPageClient
```typescript
// import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'  // Old
import { useSimplePosts } from '@/lib/hooks/useSimplePosts'  // New

const { posts, loading, error } = useSimplePosts({ sortBy, category })
```

### Преимущества
- ✅ Быстрое решение для восстановления функциональности
- ✅ Простая, понятная логика
- ✅ Правильный AbortController usage
- ✅ Minimal risk

### Недостатки
- ❌ Потеря оптимизаций (cache, pagination, retry)
- ❌ Temporary solution только
- ❌ Need to maintain two hooks

---

## Вариант 3: Fundamental Hook Redesign

### Подход
Полное переписывание useOptimizedPosts с modern React patterns: React Query-style architecture.

### Ключевые изменения
```typescript
// Разделить на специализированные hooks
export function usePosts(params: PostsParams) {
  // Basic fetch logic только
}

export function usePostsCache(key: string) {
  // Cache management отдельно
}

export function usePostsPagination(fetcher: Function) {
  // Pagination logic отдельно  
}

export function useOptimizedPosts(options: Options) {
  const { data, error, loading } = usePosts(options)
  const cache = usePostsCache(cacheKey)
  const pagination = usePostsPagination(fetchMore)
  
  return {
    posts: data,
    isLoading: loading,
    error,
    ...pagination
  }
}
```

### Modern Patterns
- Single Responsibility Principle для каждого hook
- Composition over inheritance
- Clear separation of concerns
- Easier testing and maintenance

### Преимущества
- ✅ Modern, maintainable architecture
- ✅ Better testability
- ✅ Clear separation of concerns
- ✅ Reusable sub-hooks
- ✅ Future-proof

### Недостатки
- ❌ Большой объем работы
- ❌ Higher risk из-за major changes
- ❌ Need extensive testing
- ❌ Может сломать existing consumers

---

## 📊 Сравнение вариантов

| Критерий | Вариант 1 | Вариант 2 | Вариант 3 |
|----------|-----------|-----------|-----------|
| **Сложность** | Medium | Low | High |
| **Время имплементации** | 2-3 часа | 30 минут | 1-2 дня |
| **Риск** | Medium | Low | High |
| **Качество решения** | High | Medium | Very High |
| **Backward compatibility** | High | Medium | Low |
| **Future maintenance** | Good | Poor | Excellent |

## 🎯 Рекомендация: Вариант 1

**Обоснование:**
1. **Исправляет корневую причину** race condition
2. **Сохраняет existing features** (cache, pagination, retry)  
3. **Следует best practices** React + AbortController
4. **Reasonable effort** для качественного результата
5. **Low risk** для production

**План execution:**
1. **Phase 1**: Исправить AbortController pattern (1-2 часа)
2. **Phase 2**: Упростить useEffect structure (1 час)
3. **Phase 3**: Тестирование с Playwright (30 минут)
4. **Phase 4**: Verification на всех страницах (30 минут)

**Fallback plan**: Если Вариант 1 создает новые проблемы → быстро switch на Вариант 2 как temporary solution.

## 🚀 Next Steps
1. Создать IMPACT_ANALYSIS.md для Варианта 1
2. Создать IMPLEMENTATION_SIMULATION.md с детальными code changes
3. Identify все risks и mitigation strategies
4. Get approval для начала имплементации

**Status**: 🟢 Solution Plan ЗАВЕРШЕН - готов к Impact Analysis 