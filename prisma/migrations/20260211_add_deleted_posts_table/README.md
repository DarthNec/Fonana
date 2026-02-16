# Migration: Add DeletedPosts Table

**Created:** 2026-02-11  
**Type:** Schema Addition

## Описание

Добавлена новая таблица `deleted_posts` для хранения удалённых постов. Это позволяет:
- Восстанавливать случайно удалённые посты
- Вести историю удалений для аудита
- Анализировать причины удаления контента
- Предотвращать случайную потерю данных

## Структура таблицы

Таблица `deleted_posts` является **точной копией** таблицы `posts` с дополнительными полями:

### Новые поля:
- `originalPostId` (TEXT) - ID оригинального поста из таблицы `posts`
- `deletedAt` (TIMESTAMP) - Дата и время удаления (default: CURRENT_TIMESTAMP)
- `deletedBy` (TEXT, nullable) - ID пользователя, кто удалил пост (креатор или админ)
- `deletionReason` (TEXT, nullable) - Причина удаления (опционально)

### Скопированные поля из Post:
- Все поля из модели `Post` (id, creatorId, title, content, type, category, и т.д.)

### Индексы:
- `deleted_posts_originalPostId_idx` - для быстрого поиска по ID оригинального поста
- `deleted_posts_creatorId_idx` - для фильтрации по креатору
- `deleted_posts_deletedAt_idx` - для сортировки по дате удаления

## Применение миграции

```bash
# Применить миграцию
npx prisma migrate deploy

# Или через custom command
npm run prisma:migrate
```

## Использование в коде

### Пример: Перенос поста в deleted_posts при удалении

```typescript
import { prisma } from '@/lib/prisma'

async function deletePost(postId: string, userId: string, reason?: string) {
  // 1. Получаем пост
  const post = await prisma.post.findUnique({ where: { id: postId } })
  
  if (!post) {
    throw new Error('Post not found')
  }
  
  // 2. Копируем в deleted_posts
  await prisma.deletedPost.create({
    data: {
      originalPostId: post.id,
      creatorId: post.creatorId,
      title: post.title,
      content: post.content,
      type: post.type,
      category: post.category,
      thumbnail: post.thumbnail,
      mediaUrl: post.mediaUrl,
      blurUrl: post.blurUrl,
      previewUrl: post.previewUrl,
      isLocked: post.isLocked,
      isPremium: post.isPremium,
      price: post.price,
      currency: post.currency,
      imageAspectRatio: post.imageAspectRatio,
      isSellable: post.isSellable,
      minSubscriptionTier: post.minSubscriptionTier,
      requestId: post.requestId,
      error: post.error,
      remixId: post.remixId,
      containerId: post.containerId,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      viewsCount: post.viewsCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      deletedBy: userId,
      deletionReason: reason,
    }
  })
  
  // 3. Удаляем из posts
  await prisma.post.delete({ where: { id: postId } })
}
```

### Пример: Восстановление удалённого поста

```typescript
async function restorePost(deletedPostId: string) {
  // 1. Получаем удалённый пост
  const deletedPost = await prisma.deletedPost.findUnique({ 
    where: { id: deletedPostId } 
  })
  
  if (!deletedPost) {
    throw new Error('Deleted post not found')
  }
  
  // 2. Восстанавливаем в posts
  await prisma.post.create({
    data: {
      id: deletedPost.originalPostId, // Восстанавливаем оригинальный ID
      creatorId: deletedPost.creatorId,
      title: deletedPost.title,
      content: deletedPost.content,
      type: deletedPost.type,
      // ... остальные поля
    }
  })
  
  // 3. Удаляем из deleted_posts
  await prisma.deletedPost.delete({ where: { id: deletedPostId } })
}
```

### Пример: Получить список удалённых постов креатора

```typescript
async function getDeletedPostsByCreator(creatorId: string) {
  return await prisma.deletedPost.findMany({
    where: { creatorId },
    orderBy: { deletedAt: 'desc' },
    take: 50
  })
}
```

## Откат миграции

Если нужно откатить миграцию:

```sql
-- Drop table
DROP TABLE IF EXISTS "deleted_posts";
```

Или через Prisma:

```bash
npx prisma migrate reset
```

**⚠️ ВНИМАНИЕ:** Откат удалит все данные из таблицы `deleted_posts`!

## Проверка после применения

```sql
-- Проверить, что таблица создана
\d deleted_posts

-- Проверить индексы
\di deleted_posts*

-- Проверить структуру
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'deleted_posts';
```

## Размер и производительность

- **Estimated storage:** ~1KB на пост (зависит от размера content, title)
- **Индексы:** 3 B-tree индекса (originalPostId, creatorId, deletedAt)
- **Производительность:** O(log n) для поиска по индексам

## Планы на будущее

- [ ] Добавить автоматическую очистку старых записей (>6 месяцев)
- [ ] Создать API endpoint для восстановления постов
- [ ] Добавить панель администратора для управления удалёнными постами
- [ ] Реализовать систему уведомлений при удалении контента
