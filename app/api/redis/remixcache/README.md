# Remix Cache API

API для кеширования цепочек ремиксов в Redis с использованием MessagePack для сжатия данных.

## 🚀 Оптимизация производительности

**MessagePack Compression:**
- Используется для эффективного хранения больших массивов (100-200MB)
- Данные кодируются перед сохранением в Redis (уменьшение размера на 30-50%)
- Данные декодируются при получении из Redis
- Значительно снижает использование RAM на сервере
- Бинарный формат для максимальной эффективности

## 📦 Установка зависимостей

Для работы требуется установить MessagePack:

```bash
npm install @msgpack/msgpack
```

---

## Endpoints

### POST `/api/redis/remixcache`

Добавляет пост в кеш контейнера ремиксов.

**Request Body:**
```json
{
  "containerId": "container-uuid-123",
  "post": {
    "id": "post-id",
    "title": "Post title",
    "content": "Post content",
    // ... other post fields
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "containerId": "container-uuid-123",
    "postsCount": 5,
    "cached": true
  }
}
```

**Логика:**
- Если `containerId` не существует в Redis → создаёт новый массив с постом
- Если `containerId` существует → добавляет пост в существующий массив
- Проверяет дубликаты по `post.id` (не добавляет повторно)
- TTL кеша: 1 час (3600 секунд)

---

### GET `/api/redis/remixcache?containerId=xxx`

Получает кешированные ремиксы для контейнера.

**Query Parameters:**
- `containerId` (required) - ID контейнера

**Response:**
```json
{
  "success": true,
  "data": {
    "containerId": "container-uuid-123",
    "posts": [
      { "id": "post1", "title": "..." },
      { "id": "post2", "title": "..." }
    ],
    "cached": true,
    "postsCount": 2
  }
}
```

**Если кеш не найден:**
```json
{
  "success": true,
  "data": {
    "containerId": "container-uuid-123",
    "posts": [],
    "cached": false
  }
}
```

---

### DELETE `/api/redis/remixcache?containerId=xxx`

Удаляет кеш для контейнера.

**Query Parameters:**
- `containerId` (required) - ID контейнера

**Response:**
```json
{
  "success": true,
  "data": {
    "containerId": "container-uuid-123",
    "deleted": true
  }
}
```

---

## Использование

### Добавление поста в кеш

```typescript
const response = await fetch('/api/redis/remixcache', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    containerId: 'my-container-id',
    post: {
      id: 'post-123',
      title: 'My Remix',
      content: 'Content here',
      // ... other fields
    }
  })
})

const data = await response.json()
console.log('Posts in cache:', data.data.postsCount)
```

### Получение кешированных постов

```typescript
const response = await fetch('/api/redis/remixcache?containerId=my-container-id')
const data = await response.json()

if (data.data.cached) {
  console.log('Found cached posts:', data.data.posts)
} else {
  console.log('No cache found, need to fetch from DB')
}
```

### Очистка кеша

```typescript
const response = await fetch('/api/redis/remixcache?containerId=my-container-id', {
  method: 'DELETE'
})

const data = await response.json()
console.log('Cache deleted:', data.data.deleted)
```

---

## Redis Key Format

Ключи в Redis имеют формат: `remix:{containerId}`

Пример:
- `remix:abc123` → массив постов для контейнера `abc123`
- `remix:def456` → массив постов для контейнера `def456`

---

## TTL (Time To Live)

Кеш автоматически удаляется через **1 час** (3600 секунд) после последнего обновления.

---

## Error Handling

Все ошибки возвращают статус 400/500 с форматом:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Возможные ошибки:**
- `400 Bad Request` - отсутствует `containerId` или `post`
- `500 Internal Server Error` - ошибка Redis или парсинга JSON

