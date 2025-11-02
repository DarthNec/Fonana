# Update Cache API

API для обновления постов в Redis кеше.

## Endpoint

### POST `/api/redis/updatecache`

Обновляет тип поста в кеше при изменении статуса.

**Request Body:**
```json
{
  "containerId": "post-123",
  "postId": "post-456",
  "status": "completed",
  "mediaUrl": "https://cdn.example.com/video.mp4"  // опционально
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "containerId": "post-123",
    "postId": "post-456",
    "status": "completed",
    "postsCount": 5,
    "updated": true
  }
}
```

---

## Логика работы

### Если `status === 'completed'`:

1. Получает массив постов из Redis по `containerId`
2. Декодирует MessagePack данные
3. Находит пост с `id === postId`
4. Меняет `type` с `'ai-video'` на `'video'`
5. Обновляет `mediaUrl` если передан в запросе
6. Обновляет `media.type` если есть
7. Обновляет `media.url` если mediaUrl передан
8. Кодирует обратно в MessagePack
9. Сохраняет в Redis

### Если `status === 'failed'`:

1. Получает массив постов из Redis по `containerId`
2. Декодирует MessagePack данные
3. Находит пост с `id === postId`
4. **Удаляет пост из массива** (используя `splice`)
5. Кодирует обратно в MessagePack
6. Сохраняет обновлённый массив в Redis

---

## Использование

### Обновление типа поста после успешной генерации:

```typescript
// После завершения генерации AI-видео
await fetch('/api/redis/updatecache', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    containerId: 'post-123',  // ID контейнера
    postId: 'post-456',       // ID конкретного поста
    status: 'completed',      // Статус генерации
    mediaUrl: 'https://cdn.bunny.net/video.mp4'  // URL готового видео
  })
})
```

### Удаление поста при ошибке генерации:

```typescript
// При ошибке генерации AI-видео
await fetch('/api/redis/updatecache', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    containerId: 'post-123',  // ID контейнера
    postId: 'post-456',       // ID поста с ошибкой
    status: 'failed'          // Пост будет удалён из кеша
  })
})
```

---

## Пример трансформации

**До (status = 'completed' с mediaUrl):**
```json
{
  "id": "post-456",
  "type": "ai-video",
  "mediaUrl": null,
  "media": {
    "type": "ai-video",
    "url": null,
    "requestId": "req-123"
  }
}
```

**После:**
```json
{
  "id": "post-456",
  "type": "video",
  "mediaUrl": "https://cdn.bunny.net/video.mp4",
  "media": {
    "type": "video",
    "url": "https://cdn.bunny.net/video.mp4",
    "requestId": "req-123"
  }
}
```

---

## Валидация

**Обязательные поля:**
- `containerId` - ID контейнера в Redis
- `postId` - ID поста для обновления
- `status` - Статус (например, 'completed')

**Ошибки:**
- `400` - Отсутствуют обязательные поля
- `404` - Контейнер или пост не найдены
- `500` - Ошибка декодирования или сохранения

---

## MessagePack сжатие

Данные автоматически сжимаются и декодируются:

```
[UpdateCache] 📦 MessagePack compression: {
  originalSize: '125.34 KB',
  compressedSize: '73.21 KB',
  ratio: '41.52% reduction'
}
```

---

## Логирование

```
[UpdateCache] Processing update: {
  containerId: 'post-123',
  postId: 'post-456',
  status: 'completed'
}
[UpdateCache] Status is completed, updating post type
[UpdateCache] ✅ Post type updated: {
  postId: 'post-456',
  oldType: 'ai-video',
  newType: 'video'
}
[UpdateCache] ✅ Cache updated successfully
```

---

## TTL

Обновлённый кеш сохраняется с TTL **1 час** (3600 секунд).

---

## Интеграция с SoraChecker

### Успешная генерация:
```javascript
// sorachecker.js
if (videoStatus.status === 'completed') {
  // 1. Обновляем пост в БД
  await prisma.post.update({
    where: { id: post.id },
    data: { type: 'video', mediaUrl: bunnyUrl }
  })
  
  // 2. Обновляем в Redis кеше (type: ai-video → video + mediaUrl)
  const containerId = post.containerId || post.id
  await axios.post('http://localhost:3000/api/redis/updatecache', {
    containerId,
    postId: post.id,
    status: 'completed',
    mediaUrl: bunnyUrl  // ← Обновляет mediaUrl и media.url
  })
}
```

### Ошибка генерации:
```javascript
// sorachecker.js
if (videoStatus.error) {
  // 1. Обновляем пост в БД с ошибкой
  await prisma.post.update({
    where: { id: post.id },
    data: { error: videoStatus.error.message, mediaUrl: '/' }
  })
  
  // 2. Удаляем пост из Redis кеша
  const containerId = post.containerId || post.id
  await axios.post('http://localhost:3000/api/redis/updatecache', {
    containerId,
    postId: post.id,
    status: 'failed'  // ← Пост будет удалён из массива
  })
  
  // 3. Удаляем видео из OpenAI
  await deleteSoraVideo(post.requestId)
}
```

### Логи SoraChecker:
```
[SoraChecker] ✅ Post post-456 processed successfully!
[SoraChecker] Updating Redis cache for post post-456 with status completed...
[SoraChecker] Including mediaUrl: https://cdn.bunny.net/video.mp4
[UpdateCache] Status is completed, updating post type
[UpdateCache] ✅ mediaUrl updated: https://cdn.bunny.net/video.mp4
[UpdateCache] ✅ media.url updated: https://cdn.bunny.net/video.mp4
[UpdateCache] ✅ Post type updated: { 
  postId: 'post-456', 
  oldType: 'ai-video', 
  newType: 'video',
  mediaUrlUpdated: true
}
[SoraChecker] ✅ Redis cache updated successfully for post post-456
```

```
[SoraChecker] Video req-789 has error: { code: 'content_policy_violation', message: '...' }
[SoraChecker] Deleting post post-789 from Redis cache...
[UpdateCache] Status is failed, removing post from cache
[UpdateCache] ✅ Post removed from cache: { postId: 'post-789', remainingPosts: 2 }
[SoraChecker] ✅ Post post-789 deleted from Redis cache
```

