# 🔍 АНАЛИЗ: parentId в таблице comments

**Date:** 2026-03-09  
**Table:** `comments`  
**Field:** `parentId`  

---

## 📋 **ЧТО ТАКОЕ parentId:**

### **Определение в Schema:**

```prisma
model Comment {
  id          String    @id @default(cuid())
  postId      String
  userId      String
  content     String
  isAnonymous Boolean   @default(false)
  likesCount  Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  parentId    String?   // ← NULLABLE (может быть null)
  
  // Self-referencing relation (рекурсивная связь)
  parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies     Comment[] @relation("CommentReplies")
  
  // Other relations
  post        Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  likes       Like[]
  emotions    Emotion[]

  @@map("comments")
}
```

---

## 🎯 **НАЗНАЧЕНИЕ:**

### **Threaded Comments (Вложенные комментарии)**

`parentId` используется для создания **двухуровневой системы комментариев**:

```
POST
├── Comment 1 (parentId: null)        ← Top-level comment
│   ├── Reply 1.1 (parentId: Comment1.id)  ← Reply to Comment 1
│   └── Reply 1.2 (parentId: Comment1.id)  ← Reply to Comment 1
├── Comment 2 (parentId: null)        ← Top-level comment
│   └── Reply 2.1 (parentId: Comment2.id)  ← Reply to Comment 2
└── Comment 3 (parentId: null)        ← Top-level comment
```

---

## 📊 **КАК РАБОТАЕТ:**

### **1. Top-Level Comments (Комментарии верхнего уровня):**

```typescript
// Создание нового комментария к посту:
const comment = await prisma.comment.create({
  data: {
    postId: "post_id_123",
    userId: "user_id_456",
    content: "Great post!",
    parentId: null  // ← NULL = top-level comment
  }
})
```

**Результат:**
- `parentId = null` → это комментарий **к посту**, не ответ на другой комментарий

---

### **2. Replies (Ответы на комментарии):**

```typescript
// Создание ответа на комментарий:
const reply = await prisma.comment.create({
  data: {
    postId: "post_id_123",
    userId: "user_id_789",
    content: "Thanks!",
    parentId: "comment_id_abc"  // ← ID родительского комментария
  }
})
```

**Результат:**
- `parentId = "comment_id_abc"` → это ответ **на комментарий** с ID `comment_id_abc`

---

## 📊 **ИСПОЛЬЗОВАНИЕ В API:**

### **Файл: `app/api/posts/[id]/comments/route.ts`**

#### **GET - Получение комментариев:**

```typescript
// Получаем только top-level комментарии
const comments = await prisma.comment.findMany({
  where: {
    postId: params.id,
    parentId: null  // ← Только комментарии верхнего уровня
  },
  include: {
    user: { ... },
    replies: {       // ← Автоматически загружаем вложенные ответы
      include: {
        user: { ... }
      },
      orderBy: { createdAt: 'asc' }
    }
  },
  orderBy: { createdAt: 'desc' }
})
```

**Логика:**
1. Загружаем только комментарии с `parentId: null` (top-level)
2. Для каждого комментария автоматически загружаем `replies` (где `parentId = comment.id`)
3. Replies сортируются по `createdAt: 'asc'` (старые сначала)
4. Top-level comments сортируются по `createdAt: 'desc'` (новые сначала)

---

#### **POST - Создание комментария/ответа:**

```typescript
const { userId, content, parentId, isAnonymous = false } = await request.json()

// Если parentId передан, это reply
if (parentId) {
  parentComment = await prisma.comment.findUnique({
    where: { id: parentId },
    include: { user: true }
  })
}

// Создаём комментарий
const comment = await prisma.comment.create({
  data: {
    postId: params.id,
    userId,
    content,
    parentId,  // ← null (comment) или commentId (reply)
    isAnonymous
  }
})

// Отправляем уведомления
if (parentId && parentComment) {
  // Это ответ на комментарий → уведомляем автора комментария
  await notifyCommentReply(...)
} else {
  // Это новый комментарий → уведомляем автора поста
  await notifyNewComment(...)
}
```

**Логика уведомлений:**
- `parentId = null` → уведомляем **автора поста**
- `parentId != null` → уведомляем **автора родительского комментария**

---

## 📊 **ИСПОЛЬЗОВАНИЕ В FRONTEND:**

### **TypeScript Interfaces:**

```typescript
// components/posts/core/CommentsSection/mobileIndex.tsx
// components/posts/core/CommentsSection/desktopIndex.tsx

interface Comment {
  id: string
  userId: string
  user: {
    id: string
    nickname: string
    fullName: string
    avatar: string
    isVerified: boolean
  }
  content: string
  createdAt: string
  likesCount: number
  isAnonymous: boolean
  parentId?: string       // ← OPTIONAL (может быть undefined)
  replies?: Comment[]     // ← Вложенные ответы
  emotions?: CommentEmotion[]
  userEmotion?: CommentEmotion
}
```

**Использование:**
- `parentId?: string` - опциональное поле
- Если `parentId` есть → это reply
- Если `parentId` нет → это top-level comment
- `replies?: Comment[]` - массив вложенных ответов (рекурсивная структура)

---

## 🔍 **АРХИТЕКТУРНЫЕ ОСОБЕННОСТИ:**

### **Self-Referencing Relation (Рекурсивная связь):**

```prisma
parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
replies     Comment[] @relation("CommentReplies")
```

**Что это значит:**
- `parent` - ссылка на **родительский комментарий** (Comment → Comment)
- `replies` - массив **дочерних комментариев** (Comment → Comment[])
- Это **самоссылающаяся (self-referencing)** связь внутри одной таблицы

**Пример:**

```typescript
// Получить комментарий со всеми ответами
const comment = await prisma.comment.findUnique({
  where: { id: "comment_123" },
  include: {
    replies: true  // Получаем все комментарии где parentId = "comment_123"
  }
})

// Получить ответ и его родительский комментарий
const reply = await prisma.comment.findUnique({
  where: { id: "reply_456" },
  include: {
    parent: true  // Получаем комментарий с id = reply.parentId
  }
})
```

---

## 📊 **УРОВНИ ВЛОЖЕННОСТИ:**

### **Текущая реализация: 2 уровня**

```
Level 0: POST
  │
  ├─ Level 1: COMMENT (parentId: null)
  │    │
  │    └─ Level 2: REPLY (parentId: comment.id)
  │
  └─ Level 1: COMMENT (parentId: null)
       │
       └─ Level 2: REPLY (parentId: comment.id)
```

**Ограничение:**
- Схема **поддерживает бесконечную вложенность** (reply на reply на reply...)
- Но **код в API** загружает только **2 уровня** (comment + replies)
- **Frontend** отображает только **2 уровня**

**Почему 2 уровня:**
- Стандарт для большинства соцсетей (Twitter, Instagram, Facebook)
- Упрощает UI/UX (не нужна бесконечная вложенность)
- Лучше производительность (меньше рекурсивных запросов)

---

## 🔍 **ПРИМЕРЫ ЗАПРОСОВ:**

### **1. Получить все top-level комментарии поста:**

```typescript
const topLevelComments = await prisma.comment.findMany({
  where: {
    postId: "post_123",
    parentId: null  // ← Только комментарии к посту
  }
})
```

---

### **2. Получить все ответы на конкретный комментарий:**

```typescript
const replies = await prisma.comment.findMany({
  where: {
    parentId: "comment_456"  // ← Все replies к этому комментарию
  },
  orderBy: {
    createdAt: 'asc'  // Старые сначала
  }
})
```

---

### **3. Получить количество ответов у комментария:**

```typescript
const comment = await prisma.comment.findUnique({
  where: { id: "comment_456" },
  include: {
    _count: {
      select: { replies: true }
    }
  }
})

console.log(comment._count.replies) // Количество ответов
```

---

### **4. Получить комментарий с полной цепочкой (comment + replies + их replies):**

**⚠️ В ТЕКУЩЕЙ РЕАЛИЗАЦИИ НЕ ИСПОЛЬЗУЕТСЯ** (только 2 уровня)

```typescript
// Если бы нужна была бесконечная вложенность:
const commentWithAllReplies = await prisma.comment.findUnique({
  where: { id: "comment_123" },
  include: {
    replies: {
      include: {
        replies: {  // ← Level 3
          include: {
            replies: true  // ← Level 4, etc.
          }
        }
      }
    }
  }
})
```

---

## 📊 **БАЗА ДАННЫХ - СТРУКТУРА:**

### **Примеры записей:**

| id | postId | userId | content | parentId | createdAt |
|----|--------|--------|---------|----------|-----------|
| c1 | p1 | u1 | "Great post!" | **NULL** | 2026-03-09 10:00 |
| c2 | p1 | u2 | "Thanks!" | **c1** | 2026-03-09 10:05 |
| c3 | p1 | u3 | "Awesome!" | **NULL** | 2026-03-09 10:10 |
| c4 | p1 | u4 | "Agree!" | **c1** | 2026-03-09 10:15 |
| c5 | p1 | u5 | "Nice!" | **c3** | 2026-03-09 10:20 |

**Интерпретация:**
- `c1` - комментарий к посту `p1` (parentId = NULL)
- `c2` - ответ на комментарий `c1` (parentId = c1)
- `c3` - комментарий к посту `p1` (parentId = NULL)
- `c4` - ответ на комментарий `c1` (parentId = c1)
- `c5` - ответ на комментарий `c3` (parentId = c3)

---

## 📊 **ИЕРАРХИЯ В FRONTEND:**

```
POST p1
  │
  ├── COMMENT c1: "Great post!"
  │     ├── REPLY c2: "Thanks!"
  │     └── REPLY c4: "Agree!"
  │
  └── COMMENT c3: "Awesome!"
        └── REPLY c5: "Nice!"
```

---

## 🔍 **CASCADE DELETE:**

### **Что происходит при удалении:**

```prisma
parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
```

**⚠️ ВАЖНО:**
- **НЕТ `onDelete: Cascade`** в связи `parent`!
- Если удалить родительский комментарий, `parentId` у replies **НЕ удалится автоматически**
- Нужна **explicit логика удаления** или добавить `onDelete: Cascade`

**Текущее поведение:**

```typescript
// Если удалить комментарий c1:
await prisma.comment.delete({ where: { id: "c1" } })

// Что произойдёт:
// - c1 удалён ✅
// - c2 и c4 (replies) остаются в БД ❌
// - c2.parentId и c4.parentId = "c1" (несуществующий ID) ❌
// → ORPHANED REPLIES (осиротевшие ответы)
```

**Решение:**
1. Добавить `onDelete: Cascade` в schema
2. Или явно удалять replies перед удалением parent

---

## ✅ **ПРЕИМУЩЕСТВА ТЕКУЩЕЙ АРХИТЕКТУРЫ:**

1. **Простота:** Один уровень вложенности (comment + replies)
2. **Производительность:** Не нужны рекурсивные запросы
3. **UI/UX:** Стандартный паттерн для соцсетей
4. **Масштабируемость:** Легко расширить до N уровней если нужно
5. **Flexibility:** `parentId` nullable - можно иметь и comments и replies в одной таблице

---

## ⚠️ **ПОТЕНЦИАЛЬНЫЕ ПРОБЛЕМЫ:**

### **1. Orphaned Replies (Осиротевшие ответы):**

**Проблема:** Если удалить parent comment, replies остаются с несуществующим `parentId`

**Решение:**

```prisma
parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
```

Или в коде:

```typescript
// Перед удалением комментария:
await prisma.comment.deleteMany({
  where: { parentId: commentId }
})
await prisma.comment.delete({
  where: { id: commentId }
})
```

---

### **2. Performance на больших объёмах:**

**Проблема:** Если у комментария 1000+ replies, загрузка может быть медленной

**Решение:**
- Pagination для replies
- Lazy loading (загружать replies по клику "Show more replies")
- Limit в запросе

```typescript
include: {
  replies: {
    take: 10,  // Первые 10 replies
    orderBy: { createdAt: 'asc' }
  },
  _count: {
    select: { replies: true }  // Общее количество
  }
}
```

---

### **3. N+1 Query Problem:**

**Проблема:** Если загружать replies отдельными запросами

**Решение:**
- ✅ Текущая реализация уже использует `include` (eager loading)
- Все replies загружаются за 1 запрос

---

## 📊 **NOTIFICATION LOGIC:**

### **Как работают уведомления:**

```typescript
// В app/api/posts/[id]/comments/route.ts (строка 206+)

if (parentId && parentComment) {
  // Это reply → уведомляем автора parent comment
  await notifyCommentReply(
    parentComment.userId,  // Кому
    userId,                // От кого
    params.id,             // PostId
    comment.id             // CommentId
  )
} else {
  // Это new comment → уведомляем автора поста
  await notifyNewComment(
    post.creatorId,  // Кому (автор поста)
    userId,          // От кого
    params.id        // PostId
  )
}
```

**Логика:**
- Comment (parentId = null) → уведомление автору поста
- Reply (parentId != null) → уведомление автору родительского комментария

---

## 📊 **EMOTION SUPPORT:**

```prisma
model Emotion {
  id        String   @id @default(cuid())
  userId    String
  postId    String?
  emotionId Int
  commentId String?  // ← Можно ставить эмоции на комментарии
  // ...
  comment   Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
}
```

**Поддержка:**
- ✅ Эмоции на top-level комментарии (parentId = null)
- ✅ Эмоции на replies (parentId != null)
- ✅ API возвращает эмоции для обоих уровней

---

## 🎯 **SUMMARY:**

| Аспект | Значение |
|--------|----------|
| **Назначение** | Двухуровневая система комментариев (comment + replies) |
| **Type** | `String?` (nullable) |
| **Levels** | 2 уровня (comment → reply) |
| **Architecture** | Self-referencing relation (рекурсивная связь) |
| **Notifications** | parent=null → notify post author, parent!=null → notify comment author |
| **Cascade Delete** | ⚠️ **NOT CONFIGURED** (может создать orphaned replies) |
| **Frontend Support** | ✅ Mobile + Desktop (CommentsSection) |
| **API Support** | ✅ GET (load) + POST (create) |
| **Emotion Support** | ✅ Supported для обоих уровней |

---

## 🔍 **РЕКОМЕНДАЦИИ:**

### **Критичные:**

1. ✅ **Добавить `onDelete: Cascade`** для предотвращения orphaned replies
   ```prisma
   parent Comment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
   ```

2. ✅ **Добавить pagination для replies** если ожидается > 50 replies на комментарий

3. ✅ **Добавить index на `parentId`** для быстрых queries
   ```prisma
   @@index([parentId])
   ```

### **Опциональные:**

4. ⚠️ **Добавить limit для replies** в API (сейчас загружаются все)
   
5. ⚠️ **Добавить "Load more replies" UI** если replies > 10

6. ⚠️ **Добавить reply count** в response для top-level comments

---

## 📁 **ФАЙЛЫ С ИСПОЛЬЗОВАНИЕМ:**

### **Backend:**
- ✅ `prisma/schema.prisma` - определение схемы
- ✅ `app/api/posts/[id]/comments/route.ts` - API endpoints (GET/POST)
- ✅ `lib/notifications.ts` - уведомления о replies

### **Frontend:**
- ✅ `components/posts/core/CommentsSection/mobileIndex.tsx` - мобильный UI
- ✅ `components/posts/core/CommentsSection/desktopIndex.tsx` - десктопный UI

### **Documentation:**
- ✅ `docs/DATABASE_FIELD_MAP.md` - маппинг полей БД
- ✅ `docs/TECHNICAL_ARCHITECTURE_MAP.md` - архитектура

---

*Analysis completed by AI Assistant | 2026-03-09*
*All code patterns verified from actual codebase*
