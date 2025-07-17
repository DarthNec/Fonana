# 🎯 SOLUTION PLAN: Fix Critical Regression - Infinite Conversations API Loop

**Дата**: 17.07.2025  
**ID задачи**: critical-regression-infinite-loop-2025-017  
**Версия плана**: v1  

## 🔍 КОРНЕВАЯ ПРИЧИНА УСТАНОВЛЕНА

### Architectural Problem: Code Duplication
**НАЙДЕНА ТОЧНАЯ ПРИЧИНА** infinite loop:

1. **`BottomNav.tsx`** содержит useEffect с conversationsService.getUnreadCount()
2. **`Navbar.tsx`** содержит ИДЕНТИЧНЫЙ useEffect с той же логикой  
3. **Дублирование интервалов** - каждый компонент создает setInterval(30 секунд)
4. **Component re-mounting** при изменении user?.id пересоздает ОБА интервала
5. **Overlapping calls** - интервалы не синхронизированы, API calls каждые 1-2 секунды

### Evidence from Code Analysis
```javascript
// BottomNav.tsx:57-84
useEffect(() => {
  const unreadCount = await conversationsService.getUnreadCount()
  intervalId = setInterval(checkUnreadMessages, 30000)
}, [user?.id])

// Navbar.tsx:51-78  
useEffect(() => {
  const unreadCount = await conversationsService.getUnreadCount() // ДУБЛИРОВАНИЕ!
  intervalId = setInterval(checkUnreadMessages, 30000)           // ДУБЛИРОВАНИЕ!
}, [user?.id])
```

## 🏗️ SOLUTION ARCHITECTURE

### Solution Strategy: Centralized Unread Messages Service
**Принцип**: ЕДИНЫЙ сервис для unread messages вместо дублирования в компонентах

### Phase 1: Create Centralized Service ✅
**Создать `lib/services/UnreadMessagesService.ts`:**
- Singleton pattern для глобального состояния
- Rate limiting (5 секунд между calls) 
- Circuit breaker pattern против spam
- Caching (30 секунд validity)
- Event-driven updates для компонентов
- Debug statistics и monitoring

### Phase 2: Update Components ✅
**`components/BottomNav.tsx`:**
- УДАЛИТЬ дублированный useEffect 
- Использовать UnreadMessagesService.subscribe()
- Cleanup при unmount

**`components/Navbar.tsx`:**
- УДАЛИТЬ дублированный useEffect
- Использовать UnreadMessagesService.subscribe()  
- Cleanup при unmount

### Phase 3: Architecture Improvements ✅
- Предотвратить future code duplication
- Добавить component state synchronization
- Улучшить error handling patterns

## 📋 IMPLEMENTATION STEPS

### Step 1: Create UnreadMessagesService
```typescript
// lib/services/UnreadMessagesService.ts
class UnreadMessagesService {
  private listeners = new Set<(count: number) => void>()
  private lastCall = 0
  private isLoading = false
  private cache: { count: number, timestamp: number } | null = null
  private intervalId: NodeJS.Timeout | null = null
  
  // Singleton pattern
  subscribe(callback: (count: number) => void): () => void
  unsubscribe(callback: (count: number) => void): void
  getUnreadCount(): Promise<number>  // Использует conversationsService
  
  // Rate limiting + circuit breaker
  private async fetchCount(): Promise<number>
  
  // Auto-polling только когда есть подписчики
  private startPolling(): void
  private stopPolling(): void
}
```

### Step 2: Update BottomNav.tsx
```typescript
// УДАЛИТЬ строки 57-84 (весь useEffect)
// ЗАМЕНИТЬ на:
useEffect(() => {
  if (!user?.id) return
  
  const unsubscribe = unreadMessagesService.subscribe(setUnreadMessages)
  return unsubscribe
}, [user?.id])
```

### Step 3: Update Navbar.tsx  
```typescript
// УДАЛИТЬ строки 51-78 (весь useEffect)
// ЗАМЕНИТЬ на:
useEffect(() => {
  if (!user?.id) return
  
  const unsubscribe = unreadMessagesService.subscribe(setUnreadMessages)
  return unsubscribe
}, [user?.id])
```

### Step 4: Integration Testing
- Playwright MCP validation
- 30+ секунд browser observation
- Проверка terminal logs (должны быть чистыми)

## 🎯 EXPECTED RESULTS

### Performance Improvements
- **API calls reduction**: 100% elimination of duplicate calls
- **Single polling interval**: Только ОДИН setInterval вместо двух
- **Synchronized updates**: Все компоненты получают updates одновременно
- **Resource optimization**: Снижение CPU и network usage

### Architecture Benefits
- **DRY principle**: Устранение code duplication
- **Centralized state**: Единое место управления unread count
- **Better testability**: Isolated service для unit tests
- **Future-proof**: Предотвращение similar regressions

### Success Metrics
- **0 API calls** к /api/conversations в браузере (кроме legitimate requests)
- **Terminal logs clean** - отсутствие spam сообщений  
- **Component synchronization** - BottomNav и Navbar показывают одинаковые counts
- **Performance baseline** - CPU usage снижение на 30-50%

## 🔧 RISK MITIGATION

### Potential Risks
1. **New service bugs** - Может сломать existing functionality
2. **Component sync issues** - React state management complexity  
3. **Memory leaks** - Event listeners или intervals не cleaned up
4. **Edge cases** - Component mount/unmount race conditions

### Mitigation Strategies
1. **Extensive testing** - Playwright MCP validation на каждом шаге
2. **Fallback patterns** - Graceful degradation если сервис недоступен
3. **Memory management** - Explicit cleanup в useEffect return functions
4. **Error boundaries** - Catch service errors без crash компонентов

## 📊 VALIDATION PLAN

### Testing Strategy
1. **Unit tests** для UnreadMessagesService
2. **Integration tests** для component subscriptions
3. **Playwright MCP** browser automation testing
4. **Performance monitoring** - API call frequency analysis
5. **Memory leak testing** - Component mount/unmount cycles

### Acceptance Criteria
- ✅ 0 duplicate API calls
- ✅ Single polling interval active
- ✅ Components sync unread counts
- ✅ Clean terminal logs  
- ✅ No memory leaks
- ✅ Error handling works
- ✅ Component cleanup works

## 🚀 IMPLEMENTATION TIMELINE

**Estimated time**: 45-60 minutes

1. **Create service** (15 min) - UnreadMessagesService implementation
2. **Update components** (10 min) - Remove duplicate useEffect hooks  
3. **Integration testing** (15 min) - Component behavior validation
4. **Playwright validation** (10 min) - Browser automation testing
5. **Documentation** (10 min) - Update implementation report

## 📝 NOTES

- **Критически важно**: Этот fix устраняет architectural debt
- **Future prevention**: Establish patterns для avoiding duplication
- **Code review**: Require approval для changes в unread message logic  
- **Monitoring**: Consider adding metrics для tracking API call frequency

**READY TO IMPLEMENT** - All dependencies identified, solution architected, risks mitigated. 