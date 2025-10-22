# Уведомления об AI-генерации постов

## POST /notify-ai-post/

Этот эндпоинт позволяет отправлять уведомления пользователю в реальном времени через WebSocket о статусе генерации AI-постов.

### Использование

**URL:** `http://localhost:3004/notify-ai-post/`

**Метод:** `POST`

**Content-Type:** `application/json`

### Параметры запроса

```json
{
  "userId": "cmfetoamd001spzkowc5pdygf",  // Обязательный - ID пользователя
  "postId": "cm1234567890",                 // Опциональный - ID поста
  "status": "completed"                     // Опциональный - статус генерации
}
```

### Ответы

#### Успешная отправка (200 OK)

```json
{
  "success": true,
  "message": "Event sent to user cmfetoamd001spzkowc5pdygf",
  "socketId": "dmi0B4JrDD3dt_mUAAAD"
}
```

#### Пользователь не подключен (404 Not Found)

```json
{
  "success": false,
  "error": "User cmfetoamd001spzkowc5pdygf not connected"
}
```

#### Ошибка валидации (400 Bad Request)

```json
{
  "success": false,
  "error": "userId is required"
}
```

#### Серверная ошибка (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Error message here"
}
```

## События на клиенте

Клиент должен слушать событие `ai-post-updated`:

```typescript
socket.on('ai-post-updated', (data) => {
  console.log('AI Post update:', data);
  // data = {
  //   postId: "cm1234567890",
  //   status: "completed",
  //   timestamp: "2025-10-16T12:00:00.000Z"
  // }
});
```

## Примеры использования

### cURL

```bash
curl -X POST http://localhost:3004/notify-ai-post/ \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "cmfetoamd001spzkowc5pdygf",
    "postId": "cm1234567890",
    "status": "completed"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:3004/notify-ai-post/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'cmfetoamd001spzkowc5pdygf',
    postId: 'cm1234567890',
    status: 'completed'
  })
});

const result = await response.json();
console.log(result);
```

### Node.js (axios)

```javascript
const axios = require('axios');

try {
  const response = await axios.post('http://localhost:3004/notify-ai-post/', {
    userId: 'cmfetoamd001spzkowc5pdygf',
    postId: 'cm1234567890',
    status: 'processing'
  });
  
  console.log('✅', response.data);
} catch (error) {
  console.error('❌', error.response?.data || error.message);
}
```

## Интеграция с API генерации постов

Пример использования в вашем API для генерации AI-постов:

```typescript
// app/api/generate-ai-post/route.ts

export async function POST(req: Request) {
  const { userId } = await req.json();
  
  // Начало генерации
  await notifyAIPostStatus(userId, null, 'started');
  
  try {
    // Генерация поста
    const post = await generatePost();
    
    // Уведомление об успехе
    await notifyAIPostStatus(userId, post.id, 'completed');
    
    return Response.json({ success: true, post });
  } catch (error) {
    // Уведомление об ошибке
    await notifyAIPostStatus(userId, null, 'error');
    
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function notifyAIPostStatus(userId: string, postId: string | null, status: string) {
  try {
    await fetch('http://localhost:3004/notify-ai-post/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, postId, status })
    });
  } catch (error) {
    console.error('Failed to notify user:', error);
    // Не прерываем основной процесс, если уведомление не удалось
  }
}
```

## Логирование

Сервер логирует:

```
✅ Sent ai-post-updated to user cmfetoamd001spzkowc5pdygf (Socket: dmi0B4JrDD3dt_mUAAAD)
```

или

```
⚠️  User cmfetoamd001spzkowc5pdygf not connected or socket closed
```


