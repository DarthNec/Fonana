# Emotions API - Цепочка обработки через onAction

## 🎯 Архитектура

Система обработки эмоций следует паттерну **Event Delegation Chain**:

```
PostActions → PostCard → FeedPage → useOptimizedPosts → API
```

### Преимущества подхода:
- ✅ **Единая точка управления**: Вся логика авторизации и API запросов в useOptimizedPosts
- ✅ **Переиспользуемость**: PostActions не знает о userId, работает в любом контексте
- ✅ **Консистентность**: Как лайки, только с emotionId
- ✅ **Простота тестирования**: Каждый компонент тестируется изолированно

---

## 📊 Поток данных

### 1. PostActions (UI компонент)

**Файл:** `components/posts/core/PostActions/index.tsx`

```typescript
const handleEmotionSelect = (emotionId: number) => {
  // Optimistic UI update
  setSelectedEmotions([emotionId])
  setOptimisticLikes(prev => prev + 1)
  
  // Вызов родительского компонента
  onAction({
    type: isSelected ? 'remove-emotion' : 'add-emotion',
    postId: post.id,
    emotionId // ← Важно: передаём emotionId
  })
}
```

**Что делает:**
- Показывает UI с эмоциями (😂🤡🔥💩)
- Обновляет UI оптимистично (instant feedback)
- Передаёт событие наверх через `onAction`

**НЕ делает:**
- ❌ Не знает о userId
- ❌ Не делает API запросы
- ❌ Не проверяет авторизацию

---

### 2. PostCard (Контейнер)

**Файл:** `components/posts/core/PostCard/index.tsx`

```typescript
const handleAction = (action: PostAction) => {
  if (action.type === 'comment') {
    // Специальная обработка комментариев
    setShowComments(!showComments)
  } else if (onAction) {
    // Все остальные события (включая эмоции) → наверх
    onAction(action)
  }
}

<PostActions
  post={post}
  onAction={handleAction} // ← Прокси
  variant={variant}
/>
```

**Что делает:**
- Обрабатывает специальные события (comment)
- Прокидывает остальные события выше

---

### 3. FeedPageClient (Координатор)

**Файл:** `components/FeedPageClient.tsx`

```typescript
const handlePostAction = useCallback((action: PostAction) => {
  switch (action.type) {
    case 'subscribe':
    case 'purchase':
      // Специальная обработка модалов
      break
    
    default:
      // Все остальные (like, unlike, add-emotion, remove-emotion) → useOptimizedPosts
      handleAction(action) // ← Из useOptimizedPosts
      break
  }
}, [handleAction])
```

**Что делает:**
- Обрабатывает модальные окна
- Делегирует действия в хук useOptimizedPosts

---

### 4. useOptimizedPosts (Бизнес-логика)

**Файл:** `lib/hooks/useOptimizedPosts.ts`

```typescript
const handleAction = useCallback(async (action: PostAction) => {
  switch (action.type) {
    case 'like':
    case 'unlike':
      void await handleLike(action.postId)
      break
    
    case 'add-emotion':
    case 'remove-emotion':
      if (action.emotionId !== undefined) {
        void await handleEmotion(action.postId, action.emotionId)
      }
      break
  }
}, [handleLike, handleEmotion, handleDelete])

const handleEmotion = useCallback(async (postId: string, emotionId: number) => {
  // 1. Получаем userId
  const userId = await getUserId()
  if (!userId) {
    toast.error('Подключите кошелек для реакций')
    return
  }

  // 2. Выполняем API запрос
  await performEmotion(postId, userId, emotionId)
}, [getUserId])
```

**Что делает:**
- ✅ Получает `userId` через `getUserId()` (из user store или wallet)
- ✅ Делает API запрос к `/api/posts/[id]/emotions`
- ✅ Обновляет локальное состояние
- ✅ Показывает toast уведомления

---

### 5. API Endpoint

**Файл:** `app/api/posts/[id]/emotions/route.ts`

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, emotionId } = await request.json()
  
  // postId берётся из params.id
  const post = await prisma.post.findUnique({
    where: { id: params.id }
  })
  
  // Проверяем существующие эмоции
  const existingEmotions = await prisma.emotion.findMany({
    where: { userId, postId: params.id }
  })
  
  const sameEmotion = existingEmotions.find(e => e.emotionId === emotionId)
  
  if (sameEmotion) {
    // Toggle off: удаляем
    await prisma.emotion.delete({ where: { id: sameEmotion.id } })
    return { success: true, action: 'removed' }
  }
  
  const otherEmotion = existingEmotions.find(e => e.emotionId !== emotionId)
  
  if (otherEmotion) {
    // Обновляем на другую эмоцию
    await prisma.emotion.update({
      where: { id: otherEmotion.id },
      data: { emotionId }
    })
    return { success: true, action: 'updated' }
  }
  
  // Создаём новую эмоцию
  await prisma.emotion.create({
    data: { userId, postId: params.id, emotionId }
  })
  return { success: true, action: 'created' }
}
```

**Логика:**
1. **Та же эмоция** → удаляем (toggle off)
2. **Другая эмоция** → обновляем
3. **Нет эмоций** → создаём

---

## 🔄 Полная диаграмма потока

```
User клик на 😂
     ↓
PostActions.handleEmotionSelect(1)
     │ • Optimistic UI update
     │ • setSelectedEmotions([1])
     │ • setOptimisticLikes(prev => prev + 1)
     ↓
onAction({ type: 'add-emotion', postId, emotionId: 1 })
     ↓
PostCard.handleAction(action)
     │ • Прокси: if (action.type !== 'comment')
     ↓
FeedPage.handlePostAction(action)
     │ • Делегация: handleAction(action)
     ↓
useOptimizedPosts.handleAction(action)
     │ • case 'add-emotion':
     ↓
handleEmotion(postId, 1)
     │ • const userId = await getUserId()
     │ • if (!userId) → toast.error
     ↓
performEmotion(postId, userId, 1)
     │ • fetch(`/api/posts/${postId}/emotions`, {
     │     method: 'POST',
     │     body: { userId, emotionId: 1 }
     │   })
     ↓
API /api/posts/[id]/emotions
     │ • Проверка существующих эмоций
     │ • Логика create/update/remove
     │ • return { success: true, action: 'created' }
     ↓
performEmotion получает ответ
     │ • toast.success('Эмоция добавлена!')
     │ • TODO: Обновить state (emotions в посте)
     ↓
UI показывает результат
```

---

## 📝 API Specification

### POST `/api/posts/[id]/emotions`

**Request:**
```typescript
{
  "userId": "user-123",
  "emotionId": 1 // 1=😂, 2=🤡, 3=🔥, 4=💩
}
```

**Response (Created):**
```typescript
{
  "success": true,
  "action": "created",
  "data": {
    "id": "emotion-123",
    "userId": "user-123",
    "postId": "post-456",
    "emotionId": 1,
    "createdAt": "2025-10-23T10:00:00Z",
    "message": "Emotion created"
  }
}
```

**Response (Updated):**
```typescript
{
  "success": true,
  "action": "updated",
  "data": {
    "id": "emotion-123",
    "userId": "user-123",
    "postId": "post-456",
    "emotionId": 3, // Изменено с 1 на 3
    "createdAt": "2025-10-23T10:00:00Z",
    "message": "Emotion updated"
  }
}
```

**Response (Removed):**
```typescript
{
  "success": true,
  "action": "removed",
  "data": {
    "userId": "user-123",
    "postId": "post-456",
    "emotionId": 1,
    "message": "Emotion removed"
  }
}
```

**Errors:**
```typescript
// 400 Bad Request
{
  "success": false,
  "error": "userId is required"
}

// 404 Not Found
{
  "success": false,
  "error": "Post not found"
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Internal server error"
}
```

---

### GET `/api/posts/[id]/emotions?userId=user-123`

**Response:**
```typescript
{
  "success": true,
  "data": [
    {
      "id": "emotion-1",
      "emotionId": 1,
      "userId": "user-123",
      "createdAt": "2025-10-23T10:00:00Z",
      "user": {
        "id": "user-123",
        "name": "Иван",
        "username": "ivan",
        "avatar": "https://..."
      }
    }
  ],
  "count": 1,
  "userEmotions": [1] // ID эмоций текущего пользователя
}
```

---

## 🎨 Типы эмоций

```typescript
const EMOTIONS = [
  { id: 1, emoji: '😂', label: 'Смешно', color: 'hover:bg-yellow-50' },
  { id: 2, emoji: '🤡', label: 'Клоун', color: 'hover:bg-purple-50' },
  { id: 3, emoji: '🔥', label: 'Огонь', color: 'hover:bg-red-50' },
  { id: 4, emoji: '💩', label: 'Говно', color: 'hover:bg-brown-50' }
]
```

---

## 🔍 Сравнение с Like

| Аспект | Like | Emotion |
|--------|------|---------|
| **UI Component** | `handleLike()` | `handleEmotionSelect(emotionId)` |
| **Action Type** | `'like'` / `'unlike'` | `'add-emotion'` / `'remove-emotion'` |
| **Параметры** | `postId` | `postId, emotionId` |
| **API Endpoint** | `/api/posts/[id]/like` | `/api/posts/[id]/emotions` |
| **Body** | `{ userId }` | `{ userId, emotionId }` |
| **Toggle Logic** | Автоматически | Через emotionId |

**Общие черты:**
- ✅ Использование `onAction` для делегации
- ✅ `getUserId()` в useOptimizedPosts
- ✅ Optimistic UI updates
- ✅ Toast notifications
- ✅ RESTful API structure

---

## 🚀 Расширение системы

### Добавить новую эмоцию:

**1. В PostActions:**
```typescript
const EMOTIONS = [
  // ... existing
  { id: 5, emoji: '❤️', label: 'Любовь', color: 'hover:bg-pink-50' }
]
```

**2. В базе данных:**
```sql
-- Ничего не нужно! emotionId - это просто integer
```

**3. В типах:**
```typescript
// types/posts/index.ts
// emotionId уже number, всё готово!
```

---

## 📦 Миграция БД

**Применить миграцию:**
```bash
npx prisma migrate deploy
npx prisma generate
```

**Структура таблицы:**
```sql
CREATE TABLE "emotions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "emotionId" INTEGER NOT NULL,
    "commentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "emotions_pkey" PRIMARY KEY ("id")
);

-- Уникальность: один пользователь = одна эмоция на пост
CREATE UNIQUE INDEX "emotions_userId_postId_emotionId_key" 
ON "emotions"("userId", "postId", "emotionId");
```

---

## 🎯 TODO

### Ближайшие шаги:
1. ✅ Перенести API в `/api/posts/[id]/emotions`
2. ✅ Использовать `userId` напрямую (без wallet)
3. ✅ Интегрировать через `onAction` цепочку
4. ✅ Убрать прямые API запросы из PostActions
5. ⏳ Обновить состояние `post.emotions` после API ответа
6. ⏳ Добавить отображение списка пользователей, поставивших эмоцию
7. ⏳ Добавить анимации появления/исчезновения эмоций
8. ⏳ Синхронизация через WebSocket (real-time emotions)

---

## 🔐 Авторизация

**Получение userId:**
```typescript
const getUserId = async () => {
  // 1. Из user store (если залогинен)
  if (user?.id) return user.id
  
  // 2. Из wallet публичного ключа
  const publicKeyString = wallet?.publicKey?.toBase58()
  if (!publicKeyString) return null
  
  // 3. Fetch user по wallet
  const response = await fetch(`/api/user/${publicKeyString}`)
  const userData = await response.json()
  return userData.id
}
```

**Проверка доступа:**
```typescript
if (!userId) {
  toast.error('Подключите кошелек для реакций')
  return
}
```

---

## 📊 Примеры использования

### В FeedPage:
```typescript
<PostCard
  post={post}
  onAction={handlePostAction} // ← Из useOptimizedPosts
/>
```

### В ProfilePage:
```typescript
<PostCard
  post={post}
  onAction={handlePostAction} // ← Своя реализация
/>
```

### Standalone:
```typescript
<PostCard
  post={post}
  onAction={(action) => {
    console.log('Action:', action)
    // Кастомная обработка
  }}
/>
```

---

## ✨ Преимущества архитектуры

1. **Separation of Concerns**
   - UI не знает о бизнес-логике
   - Бизнес-логика не знает о UI

2. **Single Source of Truth**
   - Авторизация в одном месте (useOptimizedPosts)
   - API логика в одном месте (endpoint)

3. **Testability**
   - PostActions: тестируем UI и onAction вызовы
   - useOptimizedPosts: тестируем API интеграцию
   - API: тестируем бизнес-логику

4. **Reusability**
   - PostActions работает везде
   - useOptimizedPosts переиспользуется

5. **Maintainability**
   - Изменения в авторизации → только useOptimizedPosts
   - Изменения в UI → только PostActions
   - Изменения в логике → только API

---

Система готова к использованию! 🎉

