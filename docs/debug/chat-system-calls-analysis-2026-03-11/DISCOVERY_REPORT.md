# 🔍 CHAT SYSTEM CALLS ANALYSIS - ПОЛНЫЙ АНАЛИЗ

**Дата:** 11 марта 2026  
**Задача:** Проанализировать систему получения чатов и непрочитанных сообщений  
**Статус:** ✅ Анализ завершён  

---

## 📋 EXECUTIVE SUMMARY

**Основные находки:**
1. ✅ **Чаты (conversations)** получаются через **ЕДИНЫЙ** API endpoint `/api/conversations` (GET)
2. ✅ **Непрочитанные сообщения** получаются **ВМЕСТЕ** с чатами в том же API response
3. ⚠️ **Много логов** потому что есть **3 независимых источника** вызовов с разными интервалами
4. ✅ Есть **rate limiting** и **кеширование** для защиты от overload
5. ⚠️ **React Query** в `MessagesPageClient` вызывает API **каждые 30 секунд**

---

## 🎯 СТРУКТУРА СИСТЕМЫ

### 1️⃣ **Backend API Endpoint**

**Файл:** `app/api/conversations/route.ts`

**Функция:** `GET /api/conversations`

**Что возвращает:**
```typescript
{
  conversations: [
    {
      id: string,
      participant: {
        id: string,
        nickname: string,
        fullName: string | null,
        avatar: string | null
      },
      lastMessage: {
        id: string,
        content: string, // "💰 Paid message" если не куплено
        senderId: string,
        senderName: string,
        createdAt: Date,
        isPaid: boolean,
        price: number | null
      } | null,
      lastMessageAt: Date | null,
      createdAt: Date,
      unreadCount: number  // ← ВОТ ЗДЕСЬ НЕПРОЧИТАННЫЕ!
    }
  ]
}
```

**Логика получения unreadCount (строки 131-148):**
```typescript
// Получаем непрочитанные сообщения для каждого чата
const unreadCounts = await prisma.message.groupBy({
  by: ['conversationId'],
  where: {
    conversationId: { in: conversations.map(c => c.id) },
    senderId: { not: user.id },  // НЕ отправленные МНОЙ
    isRead: false                 // НЕ прочитанные
  },
  _count: {
    id: true
  }
})

// Создаем map для быстрого доступа
const unreadMap = new Map(
  unreadCounts.map((item: any) => [item.conversationId, item._count.id])
)

// Добавляем unreadCount к каждому чату
unreadCount: unreadMap.get(conv.id) || 0
```

**Логирование (строки 189-193):**
```typescript
console.log('[Conversations API] Returning response with conversations:', 
  formattedConversations.map(c => ({
    id: c.id,
    participant: c.participant.nickname,
    hasLastMessage: !!c.lastMessage
  }))
)
```

**ВОТ ОТКУДА ЭТИ ЛОГИ!** ☝️

---

### 2️⃣ **Frontend - 3 Источника Вызовов**

#### **A) MessagesPageClient.tsx - React Query (ГЛАВНЫЙ ИСТОЧНИК ЛОГОВ)**

**Файл:** `components/MessagesPageClient.tsx`  
**Строки:** 235-277

**Конфигурация:**
```typescript
const { data: conversationsData } = useQuery({
  queryKey: ['conversations', user?.id || ''],
  queryFn: async () => {
    const token = await jwtManager.getToken()
    const response = await fetch('/api/conversations', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return data.conversations
  },
  enabled: !!user?.id && isJwtReady,
  staleTime: 1 * 60 * 1000,      // 1 минута
  refetchInterval: 30 * 1000,     // ← КАЖДЫЕ 30 СЕКУНД!
  retry: 3,
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
})
```

**⚠️ ПРОБЛЕМА:** `refetchInterval: 30 * 1000` = **каждые 30 секунд** новый запрос!

**Логирование (строки 238-269):**
```typescript
console.info('[ENTERPRISE QUERY] Loading conversations for user:', user?.id)
console.info('[ENTERPRISE QUERY] JWT token:', token ? token.substring(0, 20) + '...' : 'null')
console.info('[ENTERPRISE QUERY] Making API request to /api/conversations')
console.info('[ENTERPRISE QUERY] API response status:', response.status)
console.info('[ENTERPRISE QUERY] API response data:', data)
console.info(`[ENTERPRISE QUERY] Successfully loaded ${data.conversations.length} conversations`)
```

**Используется для:**
- Отображения списка чатов
- Получения всех данных о чатах
- Автоматического обновления каждые 30 секунд

---

#### **B) UnreadMessagesService - Polling (ВТОРИЧНЫЙ ИСТОЧНИК)**

**Файл:** `lib/services/UnreadMessagesService.ts`

**Используется в:**
- `components/LeftSidebar.tsx` (строки 73-82)
- `components/MessagesPageClient.tsx` (строки 229-232)
- `app/messages/[id]/page.tsx`

**Конфигурация polling (строки 62-77):**
```typescript
private startPolling(): void {
  // Сразу делаем первый запрос
  this.fetchAndNotify()
  
  // Затем каждые 60 секунд
  this.intervalId = setInterval(() => {
    this.fetchAndNotify()
  }, 60000)  // ← КАЖДЫЕ 60 СЕКУНД!
}
```

**Что делает (строки 99-133):**
```typescript
private async fetchAndNotify(): Promise<number> {
  // Используем ConversationsService (с rate limiting)
  const count = await conversationsService.getUnreadCount()
  
  // Обновляем локальный счетчик
  if (count !== this.unreadCount) {
    this.unreadCount = count
    
    // Уведомляем всех подписчиков
    this.listeners.forEach(callback => {
      callback(count)
    })
  }
  
  return count
}
```

**Используется для:**
- Badge с количеством непрочитанных в `LeftSidebar`
- Автоматическое обновление каждые 60 секунд

---

#### **C) ConversationsService - Rate Limiting Layer**

**Файл:** `lib/services/ConversationsService.ts`

**Защита от overload (строки 25-50):**
```typescript
async getUnreadCount(): Promise<number> {
  const now = Date.now()
  
  // Rate limiting - если прошло меньше 5 секунд, возвращаем кеш
  if (now - this.lastCall < this.RATE_LIMIT) {  // 5000ms
    return this.cache?.unreadCount || 0
  }
  
  // Prevent duplicate simultaneous calls
  if (this.isLoading) {
    return this.cache?.unreadCount || 0
  }
  
  // Check cache validity
  if (this.cache && (now - this.cache.timestamp) < this.CACHE_DURATION) {  // 30000ms
    return this.cache.unreadCount
  }
  
  // Только ЗДЕСЬ делаем реальный API запрос
  return this.fetchUnreadCount()
}
```

**Логирование (строки 91-132):**
```typescript
console.log('[ConversationsService] Fetching conversations from API...')
console.log('[ConversationsService] Successfully fetched:', {
  conversationsCount: conversations.length,
  unreadCount,
  timestamp: new Date(now).toISOString()
})
```

**Используется для:**
- Централизованного доступа к `/api/conversations`
- Rate limiting (минимум 5 секунд между запросами)
- Кеширование (30 секунд)

---

### 3️⃣ **Другие места вызова API**

**POST /api/conversations** (создание чата):

1. **ExplorePageClientMobile.tsx** (строка 349)
   - Когда пользователь нажимает "Message" в explore

2. **MessagesPageClient.tsx** (строка 1227)
   - Функция `startConversation`

3. **CreatorPageClient.tsx** (строка 629)
   - Когда пользователь нажимает "Message" на профиле криэйтора

---

## 🔄 ПОТОК ДАННЫХ

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND CALLS                            │
└─────────────────────────────────────────────────────────────┘

1️⃣ MessagesPageClient (React Query)
   ├─ Интервал: 30 секунд
   ├─ Логи: [ENTERPRISE QUERY]
   └─ Цель: Полный список чатов

2️⃣ LeftSidebar (UnreadMessagesService)
   ├─ Интервал: 60 секунд
   ├─ Логи: [UnreadMessagesService]
   └─ Цель: Badge с количеством

         ↓ (оба вызывают)

3️⃣ ConversationsService (Rate Limiting)
   ├─ Rate limit: 5 секунд
   ├─ Cache: 30 секунд
   ├─ Логи: [ConversationsService]
   └─ Защита от overload

         ↓

4️⃣ GET /api/conversations
   ├─ Query: SELECT conversations + messages
   ├─ GroupBy: unreadCount per conversation
   ├─ Логи: [Conversations API]
   └─ Возвращает: { conversations: [...] }

         ↓

5️⃣ PostgreSQL Database
   └─ Таблицы: Conversation, Message, users
```

---

## 📊 ЧАСТОТА ВЫЗОВОВ API

### **Теоретически (без rate limiting):**

- **MessagesPageClient**: каждые **30 секунд**
- **UnreadMessagesService**: каждые **60 секунд**
- **Итого**: ~3-4 запроса в минуту

### **Реально (с rate limiting):**

**ConversationsService** защищает:
- ❌ Блокирует вызовы чаще чем **каждые 5 секунд**
- ✅ Кеширует результат на **30 секунд**

**Результат:**
- Если `MessagesPageClient` (30s) и `UnreadMessagesService` (60s) вызывают одновременно:
  - Первый вызов идёт в API ✅
  - Второй берёт из кеша ✅
- **Реальная частота:** ~1 запрос в 30 секунд (минимум)

---

## 🔥 ПОЧЕМУ МНОГО ЛОГОВ?

### **Источники логов:**

1. **[Conversations API]** - backend endpoint (строки 10-201)
   - Логирует КАЖДЫЙ запрос
   - 6-8 строк логов на запрос

2. **[ENTERPRISE QUERY]** - React Query в MessagesPageClient (строки 238-269)
   - Логирует КАЖДЫЙ refetch
   - 6 строк логов на запрос
   - **Запускается каждые 30 секунд!**

3. **[ConversationsService]** - rate limiting layer (строки 28-132)
   - Логирует попытки запросов
   - Логирует кеш hits/misses
   - 3-5 строк логов на попытку

4. **[UnreadMessagesService]** - polling service (строки 22-133)
   - Логирует подписки
   - Логирует обновления
   - 2-3 строки логов на событие

### **Итого логов в минуту:**

**Scenario 1: Пользователь на странице MessagesPageClient**
- React Query: каждые 30s = 2 запроса/мин × 6 строк = **12 строк/мин**
- Backend API: 2 запроса/мин × 8 строк = **16 строк/мин**
- ConversationsService: 2 запроса/мин × 4 строки = **8 строк/мин**
- **ИТОГО: ~36 строк логов в минуту** ⚠️

**Scenario 2: Пользователь на другой странице + LeftSidebar открыт**
- UnreadMessagesService: каждые 60s = 1 запрос/мин × 3 строки = **3 строки/мин**
- Backend API: 1 запрос/мин × 8 строк = **8 строк/мин**
- ConversationsService: 1 запрос/мин × 4 строки = **4 строки/мин**
- **ИТОГО: ~15 строк логов в минуту**

---

## 🎯 СВЯЗЬ ЧАТОВ И НЕПРОЧИТАННЫХ СООБЩЕНИЙ

### **Вопрос:** Это отдельно или связано?

**Ответ:** ✅ **СВЯЗАНО!** Непрочитанные сообщения получаются **ВМЕСТЕ** с чатами.

### **Единый источник данных:**

```typescript
// app/api/conversations/route.ts (строки 131-148)

// 1️⃣ Получаем ВСЕ чаты пользователя
const conversations = await prisma.$queryRaw`...`

// 2️⃣ Для КАЖДОГО чата считаем непрочитанные
const unreadCounts = await prisma.message.groupBy({
  by: ['conversationId'],
  where: {
    conversationId: { in: conversations.map(c => c.id) },
    senderId: { not: user.id },
    isRead: false
  },
  _count: { id: true }
})

// 3️⃣ Добавляем unreadCount к КАЖДОМУ чату
formattedConversations.map((conv: any) => ({
  ...conv,
  unreadCount: unreadMap.get(conv.id) || 0  // ← ЗДЕСЬ!
}))
```

### **Как используется на фронтенде:**

**A) Полный список чатов (MessagesPageClient):**
```typescript
conversationsData.map(conv => (
  <ConversationItem 
    key={conv.id}
    conversation={conv}
    unreadCount={conv.unreadCount}  // ← Badge в списке чатов
  />
))
```

**B) Общее количество (LeftSidebar badge):**
```typescript
// lib/services/ConversationsService.ts (строки 116-119)
const unreadCount = conversations.reduce(
  (count: number, conv: any) => count + (conv.unreadCount || 0), 
  0
)
```

**C) Обновление при прочтении:**
- Когда пользователь открывает чат → API `/api/conversations/[id]/messages` помечает `isRead: true`
- Следующий вызов `/api/conversations` вернёт обновлённый `unreadCount`

---

## 📝 ВСЕ МЕСТА ПОЛУЧЕНИЯ ЧАТОВ

### **GET Requests (чтение чатов):**

1. ✅ **components/MessagesPageClient.tsx** (строка 248)
   - React Query с автообновлением
   - **Интервал:** 30 секунд
   - **Цель:** Полный список чатов

2. ✅ **lib/services/ConversationsService.ts** (строка 100)
   - Централизованный сервис
   - **Rate limit:** 5 секунд
   - **Cache:** 30 секунд

3. ✅ **lib/services/UnreadMessagesService.ts** (строка 104)
   - Через ConversationsService
   - **Интервал:** 60 секунд
   - **Цель:** Только счётчик непрочитанных

### **POST Requests (создание чатов):**

4. ✅ **components/ExplorePageClientMobile.tsx** (строка 349)
   - При нажатии "Message" в explore

5. ✅ **components/MessagesPageClient.tsx** (строка 1227)
   - Функция `startConversation`

6. ✅ **components/CreatorPageClient.tsx** (строка 629)
   - При нажатии "Message" на профиле

### **DELETE Requests (удаление чатов):**

7. ✅ **components/MessagesPageClient.tsx** (строка 309)
   - Функция `deleteConversation`
   - **Endpoint:** `/api/conversations/mobile?conversationId=...`

---

## 🛡️ ЗАЩИТА ОТ OVERLOAD

### **1️⃣ Rate Limiting (ConversationsService)**

```typescript
// Минимум 5 секунд между запросами
if (now - this.lastCall < this.RATE_LIMIT) {  // 5000ms
  return this.cache?.unreadCount || 0
}
```

### **2️⃣ Deduplication (ConversationsService)**

```typescript
// Блокирует одновременные запросы
if (this.isLoading) {
  return this.cache?.unreadCount || 0
}
```

### **3️⃣ Caching (ConversationsService)**

```typescript
// Кеш на 30 секунд
if (this.cache && (now - this.cache.timestamp) < this.CACHE_DURATION) {
  return this.cache.unreadCount
}
```

### **4️⃣ React Query Configuration**

```typescript
staleTime: 1 * 60 * 1000,      // Данные "свежие" 1 минуту
refetchInterval: 30 * 1000,     // Обновление каждые 30 секунд
retry: 3,                       // Максимум 3 retry
```

---

## ⚠️ ПОТЕНЦИАЛЬНЫЕ ПРОБЛЕМЫ

### **1. Избыточное логирование**

**Проблема:**
- 36 строк логов в минуту на странице `/messages`
- Засоряет консоль
- Усложняет дебаг

**Решение:**
- Убрать `console.log` из production
- Оставить только `console.error` для ошибок
- Использовать feature flag для debug логов

### **2. React Query refetchInterval = 30s**

**Проблема:**
- Слишком частое обновление
- Конфликт с UnreadMessagesService (60s)
- Лишняя нагрузка

**Решение:**
- Увеличить `refetchInterval` до 60s
- Или использовать WebSocket для real-time обновлений

### **3. Дублирование данных**

**Проблема:**
- React Query кеширует conversations
- ConversationsService тоже кеширует
- Двойное хранение одних и тех же данных

**Решение:**
- Выбрать ОДНО решение:
  - Либо React Query (рекомендуется)
  - Либо ConversationsService

### **4. Нет WebSocket для real-time**

**Проблема:**
- Используется polling (каждые 30-60s)
- Задержка в получении новых сообщений
- Лишняя нагрузка на сервер

**Решение:**
- Добавить WebSocket для push notifications
- Оставить polling как fallback

---

## 💡 РЕКОМЕНДАЦИИ

### **🔴 КРИТИЧНО: Уменьшить логирование**

```typescript
// БЫЛО:
console.log('[Conversations API] Returning response...')

// СТАЛО:
if (process.env.NODE_ENV === 'development') {
  console.log('[Conversations API] Returning response...')
}
```

**Файлы для изменения:**
1. `app/api/conversations/route.ts` - убрать все `console.log`
2. `components/MessagesPageClient.tsx` - убрать `[ENTERPRISE QUERY]` логи
3. `lib/services/ConversationsService.ts` - conditional logging
4. `lib/services/UnreadMessagesService.ts` - conditional logging

### **🟡 ВАЖНО: Оптимизировать частоту запросов**

**Изменить в `MessagesPageClient.tsx`:**
```typescript
// БЫЛО:
refetchInterval: 30 * 1000,  // 30 секунд

// СТАЛО:
refetchInterval: 60 * 1000,  // 60 секунд (как UnreadMessagesService)
```

### **🟢 ЖЕЛАТЕЛЬНО: Устранить дублирование**

**Вариант 1: Использовать ТОЛЬКО React Query**
- Убрать `ConversationsService`
- Убрать `UnreadMessagesService`
- Все компоненты получают данные через `useQuery`

**Вариант 2: WebSocket для real-time**
- Подключить Socket.IO для чатов
- Убрать polling
- События: `new_message`, `conversation_updated`

---

## 📈 МЕТРИКИ СИСТЕМЫ

### **Текущее состояние:**

| Метрика | Значение |
|---------|----------|
| API Calls (MessagesPageClient) | 2/мин |
| API Calls (LeftSidebar) | 1/мин |
| Реальные запросы к DB | ~1/30s |
| Rate limit protection | ✅ 5s |
| Cache duration | ✅ 30s |
| Логов в минуту | 🔴 36 |

### **После оптимизации:**

| Метрика | Значение |
|---------|----------|
| API Calls | 1/мин |
| Реальные запросы к DB | ~1/60s |
| Логов в минуту | ✅ 0 (prod) |

---

## 🎓 ВЫВОДЫ

### **Что работает хорошо:**

1. ✅ **Единый API endpoint** - `/api/conversations` возвращает всё
2. ✅ **Rate limiting** - защита от overload работает
3. ✅ **Кеширование** - снижает нагрузку на DB
4. ✅ **Централизация** - `ConversationsService` как single source

### **Что нужно улучшить:**

1. 🔴 **Логирование** - слишком много в production
2. 🟡 **Частота запросов** - 30s → 60s
3. 🟢 **Архитектура** - выбрать между React Query и Services
4. 🔵 **Real-time** - рассмотреть WebSocket

### **Ответы на вопросы:**

**Q: Где мы получаем чаты?**
- A: Единый endpoint `/api/conversations` (GET)
- Вызывается из `MessagesPageClient` (React Query) и `ConversationsService`

**Q: Почему постоянно их получаем (много логов)?**
- A: React Query refetch каждые 30s + подробное логирование

**Q: Непрочитанные сообщения - это связано с чатами или отдельно?**
- A: ✅ **СВЯЗАНО!** Приходят вместе в `unreadCount` для каждого чата

---

**Дата анализа:** 11 марта 2026  
**Время:** 15:20  
**M7 Session:** task_критическая-проблема-с-подключ_1545  
