# 📋 DISCOVERY REPORT: Real-time Post Updates для Автора

**Дата:** 22.01.2025  
**Задача:** Реализовать real-time обновление ленты для автора поста сразу после публикации  
**M7 Phase:** 0 - Discovery

## 🔍 ПРОБЛЕМА

**Текущее поведение:**
- После создания поста автор видит модальное окно с успешным сообщением
- Ленте требуется ручное обновление (`refresh()`) для отображения нового поста  
- Автор не получает мгновенного визуального подтверждения публикации в контексте ленты

**Желаемое поведение:**
- Автор сразу видит свой новый пост в ленте без перезагрузки
- Real-time обновление происходит немедленно после успешного API ответа
- Плавная анимация появления нового поста в топе ленты

## 🎯 SCOPE & REQUIREMENTS

### Functional Requirements
1. **Мгновенное обновление:** Новый пост появляется в ленте автора в течение 100-300ms после создания
2. **UI/UX консистентность:** Пост отображается с теми же данными, что возвращает API
3. **Error handling:** Graceful fallback если real-time обновление не сработало
4. **Performance:** Минимальный impact на производительность ленты

### Non-Functional Requirements
1. **Совместимость:** Работает с существующими WebSocket и real-time системами
2. **Scalability:** Поддерживает потенциальное расширение на других пользователей
3. **Maintainability:** Не нарушает существующую архитектуру постов и ленты

## 🏗️ АРХИТЕКТУРНОЕ ИССЛЕДОВАНИЕ

### Существующая WebSocket Infrastructure

**WebSocket Server (порт 3002):**
```typescript
// websocket-server/src/server.js
- JWT аутентификация ✅
- Channel-based subscriptions ✅
- События: post_created, post_liked, feed_update ✅
- Redis pub/sub для масштабирования ✅

// Events system
websocket-server/src/events/posts.js:
- notifyNewPost() ✅
- updatePostLikes() ✅
- broadcastToSubscribers() ✅
```

**Frontend WebSocket Integration:**
```typescript
// components/FeedPageClient.tsx
- useOptimizedRealtimePosts hook ✅
- handlePostCreated() event handler ✅
- loadPendingPosts() для batch updates ✅

// lib/hooks/useOptimizedRealtimePosts.tsx
- post_created event listener ✅
- Автоматическое и manual обновление ✅
- Toast notifications ✅
```

### Система создания постов

**API Endpoint:**
```typescript
// app/api/posts/route.ts (строки 207-345)
- POST /api/posts - создание поста ✅
- Возвращает normalized post data ✅
- Обновляет счетчик постов пользователя ✅
- НЕТ WebSocket события для автора ❌
```

**Frontend Modal:**
```typescript
// components/CreatePostModal.tsx (строки 504-754)
- handleSubmit() создает пост ✅
- onPostCreated() callback ✅
- Вызывает refresh() для обновления ленты ✅
- ПРОБЛЕМА: Manual refresh вместо real-time ❌
```

## 🔬 CONTEXT7 RESEARCH

### Next.js 15 Real-time Patterns (2025)

**WebSocket vs Server-Sent Events:**
- **WebSocket преимущества:** Bidirectional, real-time, existing infrastructure
- **SSE преимущества:** Simpler for one-way updates, auto-reconnect
- **Решение:** Использовать существующую WebSocket инфраструктуру

**Performance Considerations:**
- **Connection pooling:** ✅ Уже реализован в WebSocket server
- **Memory management:** ✅ Heartbeat и cleanup в websocket-server/src/server.js
- **Event batching:** ✅ Есть batch логика в useOptimizedRealtimePosts

### Best Practices для Real-time Updates

**From Context7 research:**
1. **Graceful degradation:** Real-time не должен блокировать основной flow
2. **Optimistic updates:** Локальное обновление + server confirmation
3. **Conflict resolution:** Handle race conditions между real-time и manual refresh
4. **User feedback:** Clear visual indication of real-time updates

## 🧪 ТЕКУЩАЯ РЕАЛИЗАЦИЯ АНАЛИЗ

### WebSocket Events Flow

**Существующие события (websocket-server/API_INTEGRATION_GUIDE.md):**
```typescript
// Уже интегрированы:
- NEW_POST_FROM_SUBSCRIPTION: Для подписчиков ✅
- post_liked/post_unliked: Для лайков ✅  
- notification events: Для уведомлений ✅

// ОТСУТСТВУЕТ:
- post_created для автора поста ❌
- feed_update для автора ❌
```

### Frontend Real-time Hooks

**useOptimizedRealtimePosts:**
```typescript
// lib/hooks/useOptimizedRealtimePosts.tsx (строки 148-195)
handlePostCreated() существует ✅
Но срабатывает только при 'post_created' event ✅
Автоматически добавляет пост в ленту ✅
```

**FeedPageClient integration:**
```typescript
// components/FeedPageClient.tsx (строки 47-290)
useOptimizedRealtimePosts подключен ✅
onPostCreated callback в CreatePostModal ✅
Но вызывает refresh() вместо real-time ❌
```

## 🎮 PLAYWRIGHT MCP ИССЛЕДОВАНИЕ

### Current User Journey Testing

**Планируемые сценарии для валидации:**
1. **Baseline scenario:** Создание поста → проверка refresh behavior
2. **Real-time scenario:** Создание поста → проверка автоматического появления
3. **Error scenario:** WebSocket disconnected → fallback к refresh
4. **Performance scenario:** Измерение времени появления поста

**Browser automation scripts:**
```javascript
// Тест текущего behavior
await page.goto('http://localhost:3000/feed');
await page.click('[data-testid="create-post-button"]');
await page.fill('[data-testid="post-content"]', 'Test post content');
await page.click('[data-testid="submit-post"]');
// Проверить нужен ли manual refresh для появления поста
```

## 📊 АЛЬТЕРНАТИВНЫЕ ПОДХОДЫ

### Подход 1: WebSocket Event Extension (РЕКОМЕНДУЕМЫЙ)
**Pros:**
- Использует существующую инфраструктуру
- Консистентен с другими real-time features  
- Minimal code changes

**Cons:**
- Зависимость от WebSocket connectivity
- Требует coordinated changes (backend + frontend)

### Подход 2: Optimistic Updates
**Pros:**
- Instant feedback независимо от WebSocket
- Простая реализация

**Cons:**
- Potential inconsistencies если API response отличается
- Дублирование логики нормализации

### Подход 3: Server Actions + Revalidation
**Pros:**  
- Native Next.js approach
- Automatic revalidation

**Cons:**
- Нарушает существующую API architecture
- Требует major refactoring

## 🚨 ИДЕНТИФИЦИРОВАННЫЕ РИСКИ

### 🔴 Critical Risks
**NONE** - Изменения не затрагивают critical system paths

### 🟡 Major Risks  
1. **WebSocket dependency:** Если WebSocket не работает, автор не увидит обновление
   - **Mitigation:** Fallback к существующему refresh() behavior
   
2. **Race conditions:** Real-time event может прийти раньше API response
   - **Mitigation:** Deduplication logic в useOptimizedRealtimePosts

### 🟢 Minor Risks
1. **Performance impact:** Дополнительный WebSocket event
   - **Mitigation:** Event уже exists для subscribers, minimal overhead
   
2. **Code complexity:** Дополнительная логика в post creation flow
   - **Mitigation:** Clean separation между API и WebSocket logic

## 🎯 РЕШЕНИЕ НАПРАВЛЕНИЕ

### Рекомендуемый подход: WebSocket Event Extension

**Core changes needed:**
1. **Backend:** Добавить `post_created` event для автора в `/api/posts` route
2. **Frontend:** Обновить CreatePostModal для использования real-time вместо refresh
3. **Integration:** Ensure proper event routing через WebSocket channels

**Implementation complexity:** 🟢 Low
**Risk level:** 🟢 Minor risks only
**Performance impact:** 🟢 Minimal

## 📝 SUCCESS CRITERIA

### Functional Tests
- [ ] Новый пост появляется в ленте автора в течение 500ms
- [ ] Пост корректно отформатирован и содержит все данные
- [ ] Работает graceful fallback если WebSocket недоступен
- [ ] Не нарушает существующий flow для других пользователей

### Performance Tests  
- [ ] WebSocket event processing < 100ms
- [ ] No memory leaks при multiple post creations
- [ ] Feed rendering performance не ухудшается

### User Experience Tests
- [ ] Visual feedback мгновенный и smooth
- [ ] Нет дублирования постов в ленте
- [ ] Error states properly handled

## 🔗 DEPENDENCIES

**Internal:**
- WebSocket server (websocket-server/) ✅ Ready
- useOptimizedRealtimePosts hook ✅ Ready  
- PostNormalizer service ✅ Ready
- CreatePostModal component ✅ Ready

**External:**
- WebSocket library (ws) ✅ Installed
- JWT token system ✅ Working
- Redis pub/sub ✅ Optional но available

## 📋 NEXT STEPS

1. **Architecture Context:** Detailed mapping of WebSocket event flow
2. **Solution Plan:** Step-by-step implementation strategy  
3. **Impact Analysis:** Risk assessment и performance implications
4. **Implementation Simulation:** Code examples и edge cases
5. **Risk Mitigation:** Fallback strategies и error handling
6. **Implementation:** Actual code changes
7. **Implementation Report:** Results и lessons learned

**Discovery phase завершен ✅** 