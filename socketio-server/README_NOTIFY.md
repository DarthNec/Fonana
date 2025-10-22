# 📡 Socket.IO Уведомления о генерации AI-постов

## 🎯 Что это?

HTTP POST эндпоинт на Socket.IO сервере для отправки real-time уведомлений пользователям о статусе генерации AI-контента.

## ⚡ Быстрый старт

### 1. Запустите Socket.IO сервер

```bash
cd socketio-server
node index.js
```

Сервер запустится на порту `3004` (по умолчанию).

### 2. Отправьте уведомление

```bash
curl -X POST http://localhost:3004/notify-ai-post/ \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","postId":"POST_ID","status":"completed"}'
```

### 3. Клиент получит событие

```javascript
socket.on('ai-post-updated', (data) => {
  console.log('Post updated:', data);
  // { postId: "...", status: "completed", timestamp: "..." }
});
```

## 📋 Основная информация

### Эндпоинт

```
POST http://localhost:3004/notify-ai-post/
Content-Type: application/json
```

### Payload

```json
{
  "userId": "cmfetoamd001spzkowc5pdygf",  // Обязательно
  "postId": "cm1234567890",                // Опционально
  "status": "completed"                    // Опционально
}
```

### Ответы

| Код | Описание |
|-----|----------|
| 200 | Уведомление отправлено |
| 400 | Отсутствует userId |
| 404 | Пользователь не подключен |
| 500 | Серверная ошибка |

## 🔍 Как это работает

1. **Пользователь подключается** к Socket.IO серверу с своим `userId`
2. Сервер сохраняет маппинг `userId → socket` в Map
3. **API делает POST** на `/notify-ai-post/` с `userId`
4. Сервер находит сокет по `userId` и отправляет `emit('ai-post-updated')`
5. **Клиент получает** событие в real-time

## 📚 Документация

- **[NOTIFY_AI_POST.md](./NOTIFY_AI_POST.md)** - Полное API описание
- **[INTEGRATION_EXAMPLE.md](./INTEGRATION_EXAMPLE.md)** - Примеры интеграции с Next.js

## 🧪 Тестирование

### Вариант 1: Тестовый скрипт

```bash
node socketio-server/test-notify-ai-post.js cmfetoamd001spzkowc5pdygf
```

### Вариант 2: cURL

```bash
curl -X POST http://localhost:3004/notify-ai-post/ \
  -H "Content-Type: application/json" \
  -d '{"userId":"cmfetoamd001spzkowc5pdygf","status":"processing"}'
```

### Вариант 3: JavaScript

```javascript
await fetch('http://localhost:3004/notify-ai-post/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'cmfetoamd001spzkowc5pdygf',
    postId: 'cm1234567890',
    status: 'completed'
  })
});
```

## 🎨 Рекомендуемые статусы

| Статус | Описание |
|--------|----------|
| `started` | Начало генерации |
| `processing` | Генерация в процессе |
| `completed` | Успешно завершено |
| `error` | Ошибка генерации |
| `cancelled` | Отменено пользователем |

## 🔌 Пример использования в API

```typescript
// В вашем API для генерации постов
async function generatePost(userId, prompt) {
  // Уведомляем о начале
  await fetch('http://localhost:3004/notify-ai-post/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, status: 'started' })
  });
  
  // Генерируем пост
  const post = await aiService.generate(prompt);
  
  // Уведомляем об успехе
  await fetch('http://localhost:3004/notify-ai-post/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, postId: post.id, status: 'completed' })
  });
}
```

## 🔒 Безопасность

⚠️ **Важно:** Этот эндпоинт не имеет аутентификации. Для production добавьте:

1. API ключи
2. IP whitelist
3. Rate limiting
4. Валидацию userId

## 🐛 Отладка

### Проверьте подключения

Логи сервера покажут:

```
🔌 User cmfetoamd001spzkowc5pdygf connected (Socket ID: dmi0B4JrDD3dt_mUAAAD)
✅ Sent ai-post-updated to user cmfetoamd001spzkowc5pdygf (Socket: dmi0B4JrDD3dt_mUAAAD)
```

### Пользователь не подключен?

```
⚠️  User cmfetoamd001spzkowc5pdygf not connected or socket closed
```

Убедитесь, что:
1. Socket.IO сервер запущен
2. Клиент подключен с правильным `userId`
3. WebSocket соединение активно

## 📦 Зависимости

Нет дополнительных зависимостей! Использует встроенный Node.js `http` модуль.

## 🚀 Production

Для production добавьте в `.env`:

```env
SOCKETIO_URL=https://socket.fonana.me
```

И используйте в коде:

```typescript
const socketUrl = process.env.SOCKETIO_URL || 'http://localhost:3004';
await fetch(`${socketUrl}/notify-ai-post/`, { ... });
```


