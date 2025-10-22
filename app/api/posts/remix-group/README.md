# Remix Carousel API Documentation

## Overview

API endpoints для работы с каруселью ремиксов постов. Позволяет получать группы ремиксов и навигировать между оригинальными постами и их ремиксами.

## Endpoints

### 1. GET /api/posts/remix-group/{postId}

Получает полную группу ремиксов для конкретного поста, включая оригинальный пост и все его ремиксы.

#### Parameters

- `postId` (string, required) - ID поста
- `includeOriginal` (boolean, optional) - Включать ли оригинальный пост в ответ (default: true)
- `limit` (number, optional) - Максимальное количество ремиксов (default: 10)
- `offset` (number, optional) - Смещение для пагинации (default: 0)

#### Example Request

```bash
GET /api/posts/remix-group/post123?includeOriginal=true&limit=5&offset=0
```

#### Response

```json
{
  "success": true,
  "data": {
    "originalPost": {
      "id": "post123",
      "title": "Original Video",
      "content": "Original content...",
      "type": "ai-video",
      "category": "Art",
      "thumbnail": "https://example.com/thumb.jpg",
      "mediaUrl": "https://example.com/video.mp4",
      "requestId": "video_123",
      "isLocked": false,
      "minSubscriptionTier": null,
      "remixId": null,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z",
      "creator": {
        "id": "user123",
        "nickname": "artist",
        "avatar": "https://example.com/avatar.jpg",
        "fullName": "John Doe"
      },
      "likesCount": 42,
      "commentsCount": 8
    },
    "remixes": [
      {
        "id": "post124",
        "title": "Remix: Original Video",
        "content": "Remix content...",
        "type": "ai-video",
        "category": "Art",
        "thumbnail": "https://example.com/thumb2.jpg",
        "mediaUrl": "https://example.com/video2.mp4",
        "requestId": "video_124",
        "isLocked": false,
        "minSubscriptionTier": null,
        "remixId": "post123",
        "createdAt": "2025-01-01T01:00:00Z",
        "updatedAt": "2025-01-01T01:00:00Z",
        "creator": {
          "id": "user124",
          "nickname": "remixer",
          "avatar": "https://example.com/avatar2.jpg",
          "fullName": "Jane Smith"
        },
        "likesCount": 15,
        "commentsCount": 3
      }
    ],
    "totalCount": 1,
    "hasMore": false,
    "pagination": {
      "limit": 5,
      "offset": 0,
      "total": 1
    }
  }
}
```

### 2. GET /api/posts/{id}/remixes

Получает только ремиксы конкретного поста без оригинального поста.

#### Parameters

- `id` (string, required) - ID оригинального поста
- `limit` (number, optional) - Максимальное количество ремиксов (default: 10)
- `offset` (number, optional) - Смещение для пагинации (default: 0)
- `sortBy` (string, optional) - Поле для сортировки: `createdAt`, `likesCount`, `viewsCount` (default: createdAt)
- `sortOrder` (string, optional) - Порядок сортировки: `asc`, `desc` (default: asc)

#### Example Request

```bash
GET /api/posts/post123/remixes?limit=10&sortBy=likesCount&sortOrder=desc
```

#### Response

```json
{
  "success": true,
  "data": {
    "remixes": [
      {
        "id": "post124",
        "title": "Remix: Original Video",
        "content": "Remix content...",
        "type": "ai-video",
        "category": "Art",
        "thumbnail": "https://example.com/thumb2.jpg",
        "mediaUrl": "https://example.com/video2.mp4",
        "requestId": "video_124",
        "isLocked": false,
        "minSubscriptionTier": null,
        "remixId": "post123",
        "createdAt": "2025-01-01T01:00:00Z",
        "updatedAt": "2025-01-01T01:00:00Z",
        "creator": {
          "id": "user124",
          "nickname": "remixer",
          "avatar": "https://example.com/avatar2.jpg",
          "fullName": "Jane Smith"
        },
        "likesCount": 15,
        "commentsCount": 3
      }
    ],
    "totalCount": 1,
    "hasMore": false,
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 1
    }
  }
}
```

## Error Responses

### 404 Not Found

```json
{
  "success": false,
  "error": "Original post not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Features

### Caching

- Все ответы кэшируются в памяти на 5 минут
- Автоматическая очистка истекших записей
- Максимальный размер кэша: 100 записей
- LRU eviction при превышении лимита

### Performance

- Оптимизированные запросы к базе данных
- Пагинация для больших наборов данных
- Индексы на поле `remixId` для быстрого поиска

### Security

- Валидация входных параметров
- Защита от SQL injection через Prisma ORM
- Ограничение размера ответов

## Usage Examples

### Frontend Integration

```typescript
// Загрузка группы ремиксов
const loadRemixGroup = async (postId: string) => {
  const response = await fetch(`/api/posts/remix-group/${postId}?includeOriginal=true&limit=20`)
  const data = await response.json()
  
  if (data.success) {
    return data.data
  } else {
    throw new Error(data.error)
  }
}

// Загрузка только ремиксов
const loadRemixes = async (postId: string) => {
  const response = await fetch(`/api/posts/${postId}/remixes?sortBy=likesCount&sortOrder=desc`)
  const data = await response.json()
  
  if (data.success) {
    return data.data.remixes
  } else {
    throw new Error(data.error)
  }
}
```

### React Hook Usage

```typescript
import { useRemixCarousel } from '@/lib/hooks/useRemixCarousel'

function PostCard({ post }) {
  const {
    currentPost,
    navigateNext,
    navigatePrevious,
    isLoading,
    error
  } = useRemixCarousel(post.id, {
    autoPlay: false,
    enableKeyboard: true,
    enableTouch: true
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <PostContent post={currentPost} />
      <button onClick={navigatePrevious}>Previous</button>
      <button onClick={navigateNext}>Next</button>
    </div>
  )
}
```

## Database Schema

### Posts Table

```sql
CREATE TABLE posts (
  id VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  content TEXT,
  type VARCHAR NOT NULL,
  category VARCHAR,
  thumbnail VARCHAR,
  media_url VARCHAR,
  request_id VARCHAR,
  is_locked BOOLEAN DEFAULT FALSE,
  min_subscription_tier VARCHAR,
  remix_id VARCHAR REFERENCES posts(id), -- Ссылка на оригинальный пост
  creator_id VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индекс для быстрого поиска ремиксов
CREATE INDEX idx_posts_remix_id ON posts(remix_id);
```

## Rate Limiting

- 100 запросов в минуту на IP
- 1000 запросов в час на пользователя
- Burst limit: 20 запросов в секунду

## Monitoring

- Логирование всех запросов
- Метрики производительности
- Алерты при высокой нагрузке
- Мониторинг использования кэша
