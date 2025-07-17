# ARCHITECTURE CONTEXT - Feed Posts Loading Failure  
## Дата: 2025-07-17
## ID: [feed_loading_2025_001]

### 🏗️ Архитектурные компоненты

#### useOptimizedPosts Hook
- **Путь**: `lib/hooks/useOptimizedPosts.ts` (585 строк)
- **Назначение**: Оптимизированная загрузка постов с кешированием, пагинацией и retry logic
- **Сложность**: HIGH - множественные оптимизации и side effects

**Ключевые features:**
- ✅ AbortController для отмены запросов
- ✅ Debounced fetch для предотвращения частых запросов  
- ✅ TTL кеширование (5 минут)
- ✅ Retry logic с useRetry hook
- ✅ Scroll position restoration
- ✅ Инкрементальная пагинация

#### FeedPageClient Component
- **Путь**: `app/feed/page.tsx` 
- **Назначение**: Consumer компонент для useOptimizedPosts
- **Интеграция**: Передает sortBy, category в hook

#### PostNormalizer Service  
- **Путь**: `services/posts/normalizer.ts`
- **Назначение**: Преобразование raw API данных в UnifiedPost
- **Status**: ✅ Работает корректно (из предыдущего анализа)

### 🚨 Корневая причина проблемы

#### Race Condition в useEffect hooks

**Проблема #1: Dual useEffect Pattern**
```typescript
// useEffect #1 (строка 204) - initial load БЕЗ debounce
useEffect(() => {
  fetchPosts(1, false)  // Мгновенный запрос
  return () => {
    debouncedFetchPosts.cancel()
    abortControllerRef.current?.abort()  // Cleanup #1
  }
}, []) // Empty deps

// useEffect #2 (строка 227) - parameter changes С debounce
useEffect(() => {
  if (posts.length === 0) return  // Skip if no posts
  debouncedFetchPosts(1, false)   // Debounced запрос (300ms)
  return () => {
    debouncedFetchPosts.cancel()  // Cleanup #2
  }
}, [options.sortBy, options.category, options.creatorId, debouncedFetchPosts])
```

**Race Condition Scenario:**
1. **T=0ms**: useEffect #1 запускает `fetchPosts()` → создает AbortController #1
2. **T=1ms**: useEffect #2 попадает в condition `if (posts.length === 0)` и пропускается
3. **T=50ms**: fetchPosts создает новый AbortController #2, абортирует #1
4. **T=51ms**: AbortError на первом запросе → "Failed after 2 attempts"

**Проблема #2: debouncedFetchPosts Recreation**
```typescript
const debouncedFetchPosts = useMemo(
  () => debounce(fetchPosts, 300),
  [fetchPosts]  // fetchPosts пересоздается на каждый render
)
```
- `fetchPosts` зависит от multiple props → пересоздается часто
- `debouncedFetchPosts` пересоздается → useEffect #2 retriggers
- Создается loop: fetchPosts → debouncedFetchPosts → useEffect #2 → fetchPosts

**Проблема #3: AbortController Overlap Logic**
```typescript
const fetchPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
  if (loadingRef.current) return  // Prevention logic
  loadingRef.current = true

  // Отменяем предыдущий запрос
  if (abortControllerRef.current) {
    abortControllerRef.current.abort()  // Абортирует ЛЮБОЙ предыдущий запрос
  }
  abortControllerRef.current = new AbortController()
  // ...
}
```
- AbortController создается новый на КАЖДЫЙ вызов fetchPosts
- Старый запрос абортируется ВСЕГДА, даже если он еще не завершился
- Это нормально для разных параметров, но проблематично для rapid sequential calls

### 🔍 Context7 Analysis: React useEffect + AbortController Best Practices

#### Паттерн из исследования:
```typescript
useEffect(() => {
  const controller = new AbortController();
  const { signal } = controller;
  
  fetch(url, { signal })
    .catch(error => {
      if (error.name === 'AbortError') {
        console.log('Request aborted');  // Expected behavior
      }
    });
    
  return () => controller.abort();  // Cleanup
}, [url]);
```

#### Проблема в нашем коде:
```typescript
// ❌ НЕПРАВИЛЬНО: AbortController создается в fetchPosts, не в useEffect
const fetchPosts = useCallback(async () => {
  abortControllerRef.current = new AbortController()  // Created here
  // ...
}, [deps])

useEffect(() => {
  fetchPosts()  // Calls function that creates controller
  return () => abortControllerRef.current?.abort()  // May not abort the right one
}, [])
```

### 🧩 Component Integration Analysis

#### Feed Page Flow:
```
FeedPageClient.tsx 
  ↓ useOptimizedPosts({ sortBy: 'latest' })
  ↓ fetchPosts() → /api/posts?sortBy=latest  
  ↓ PostNormalizer.normalizeMany()
  ↓ setPosts() → UI update
```

#### API Layer ✅:
- `/api/posts` returns 279 posts correctly
- Response structure matches expected format
- No backend issues detected

#### WebSocket Layer ⚠️:
- Постоянные попытки подключения без JWT
- НЕ блокирует posts loading, но создает noise в консоли
- Может создавать дополнительные async operations

### 🔧 Технические детали

#### retryWithToast Integration:
```typescript
const result = await retryWithToast(
  async () => {
    const response = await fetch(`${endpoint}?${params}`, {
      signal: abortControllerRef.current?.signal  // AbortSignal передается
    })
    // ...
  },
  { maxAttempts: 2, baseDelay: 1000 },
  'FetchPosts'
)
```
- retryWithToast может делать 2 попытки
- Если AbortController.abort() вызывается во время retry → AbortError
- Error message: "Failed after 2 attempts: AbortError"

#### Cache Logic ✅:
- 5-минутный TTL кеш работает корректно
- Cache key generation правильный
- Cache не должен влиять на AbortError

#### Dependency Chain:
```
options.sortBy → fetchPosts → debouncedFetchPosts → useEffect #2 → debouncedFetchPosts
```
- Circular dependency создает constant re-renders
- useCallback dependencies слишком broad

### 🎯 Critical Issues Summary

1. **Race Condition**: Dual useEffect pattern создает competing fetch requests
2. **AbortController Misuse**: Неправильное placement создания/cleanup
3. **Dependency Loop**: debouncedFetchPosts → useEffect → debouncedFetchPosts
4. **Retry + Abort Conflict**: retryWithToast + AbortController create timing issues

### 📋 Architecture Anti-Patterns Identified

- ❌ **Multiple useEffect for same purpose** (initial load vs parameter changes)
- ❌ **AbortController created outside useEffect** (не следует React patterns)
- ❌ **Debounce function in dependency array** (создает loops)
- ❌ **loadingRef.current + isLoading state** (duplicate loading protection)

### 🔗 Integration Dependencies

#### Direct Dependencies:
- `@/types/posts` - UnifiedPost interface ✅
- `@/services/posts/normalizer` - PostNormalizer ✅  
- `@solana/wallet-adapter-react` - useWallet ✅
- `@/lib/store/appStore` - useUser ✅
- `@/lib/utils/retry` - useRetry ⚠️ (may interact with AbortController)

#### API Dependencies:
- `/api/posts` endpoint ✅
- `/api/posts/following` endpoint (for subscribed) ⚠️

#### Component Consumers:
- FeedPageClient (primary) ❌ - не получает данные
- Creator profile pages ⚠️
- Dashboard pages ⚠️

### 🧪 Reproduction Conditions

**Consistent reproduction:**
1. Navigate to `/feed`
2. Hook initializes with empty posts array
3. useEffect #1 calls fetchPosts()
4. fetchPosts creates AbortController #1
5. Shortly after, something triggers second fetchPosts call
6. New AbortController #2 created, aborts #1
7. First request fails with AbortError
8. retryWithToast attempts retry, but gets aborted again
9. Error logged: "Failed after 2 attempts: AbortError"
10. UI shows "No posts yet" instead of posts

**Status**: 🔴 **CRITICAL** - Полная потеря функциональности загрузки постов 