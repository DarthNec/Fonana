# Sora Mobile API

API endpoint для создания видео через Sora-2 для мобильных приложений.

## Endpoints

### POST /api/sora/mobile

Создает новое видео через Sora-2.

#### Request Body

```json
{
  "prompt": "string",           // Обязательно - описание видео
  "seconds": "4",               // Опционально - длительность (4, 8, 12)
  "size": "720x1280",          // Опционально - разрешение
  "referenceImage": "base64"    // Опционально - референсное изображение в base64
}
```

#### Response

```json
{
  "success": true,
  "videoId": "video_123",
  "status": "queued",
  "model": "sora-2",
  "size": "720x1280",
  "seconds": "4",
  "createdAt": 1712698600,
  "message": "Sora-2 video generation started!"
}
```

#### Error Response

```json
{
  "error": "Error message"
}
```

### GET /api/sora/mobile?videoId={videoId}

Проверяет статус создания видео.

#### Query Parameters

- `videoId` (string) - ID видео для проверки

#### Response

```json
{
  "success": true,
  "videoId": "video_123",
  "status": "completed",
  "progress": 100,
  "downloadUrl": "https://...",
  "error": null,
  "createdAt": 1712698600,
  "model": "sora-2",
  "size": "720x1280",
  "seconds": "4"
}
```

## Статусы видео

- `queued` - Видео в очереди на генерацию
- `processing` - Видео генерируется
- `completed` - Видео готово
- `failed` - Ошибка генерации

## Важные ограничения

⚠️ **Временное ограничение**: Видео доступны для скачивания только в течение 1 часа после создания. После этого они удаляются с серверов OpenAI.

## Примеры использования

### Создание видео

```javascript
const response = await fetch('/api/sora/mobile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'A cat playing with a ball of yarn',
    seconds: '8',
    size: '720x1280'
  })
});

const data = await response.json();
console.log('Video ID:', data.videoId);
```

### Проверка статуса

```javascript
const response = await fetch(`/api/sora/mobile?videoId=${videoId}`);
const data = await response.json();

if (data.status === 'completed') {
  console.log('Download URL:', data.downloadUrl);
}
```

### С референсным изображением

```javascript
const response = await fetch('/api/sora/mobile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'Transform this image into a video',
    seconds: '4',
    size: '720x1280',
    referenceImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
  })
});
```

## Обработка ошибок

API возвращает соответствующие HTTP статус коды:

- `200` - Успех
- `400` - Неверные параметры запроса
- `500` - Внутренняя ошибка сервера

Все ошибки содержат поле `error` с описанием проблемы.
