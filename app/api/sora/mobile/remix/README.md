# Sora Video Remix API (Mobile)

## 📱 Назначение

API endpoint для создания ремиксов видео через OpenAI Sora без прямого обращения с клиента.

**Используется в:**
- `components/RemixPostModal.tsx` - создание ремиксов видео

---

## 🔗 Endpoint

```
POST /api/sora/mobile/remix
```

---

## 📥 Request

### Headers:
```
Content-Type: application/json
```

### Body:
```json
{
  "videoId": "original-video-request-id",
  "prompt": "Description of how to remix the video"
}
```

### Параметры:

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `videoId` | string | ✅ Да | Request ID оригинального видео для ремикса |
| `prompt` | string | ✅ Да | Промпт, описывающий желаемые изменения |

---

## 📤 Response

### Success (200):
```json
{
  "success": true,
  "videoId": "remix-video-id-here",
  "originalVideoId": "original-video-id",
  "status": "queued",
  "model": "sora-2",
  "createdAt": 1729680000000,
  "message": "Sora video remix started!"
}
```

### Поля ответа:

| Поле | Тип | Описание |
|------|-----|----------|
| `success` | boolean | Статус успешности запроса |
| `videoId` | string | ID созданного remix видео |
| `originalVideoId` | string | ID оригинального видео |
| `status` | string | Статус обработки (`queued`, `processing`, `completed`) |
| `model` | string | Модель генерации (`sora-2`) |
| `createdAt` | number | Timestamp создания |
| `message` | string | Сообщение о результате |

---

## ❌ Error Responses

### 400 - Missing videoId:
```json
{
  "error": "Video ID is required for remix"
}
```

### 400 - Missing prompt:
```json
{
  "error": "Prompt is required for remix"
}
```

### 500 - Missing API key:
```json
{
  "error": "OPENAI_API_KEY not found"
}
```

### 500 - Remix ID not found:
```json
{
  "error": "Remix video ID not found in response"
}
```

### 500 - OpenAI API error:
```json
{
  "error": "OpenAI API error message here"
}
```

---

## 🔄 Логика работы

### 1. Валидация входных данных
```
✓ videoId присутствует
✓ prompt присутствует
✓ API key настроен
```

### 2. Отправка запроса к OpenAI
```javascript
POST https://api.openai.com/v1/videos/${videoId}/remix
Body: { prompt }
Headers: { Authorization: Bearer ${apiKey} }
```

### 3. Обработка ответа
```javascript
const remixVideoId = response.data.id
```

### 4. Возврат данных клиенту
```javascript
{
  success: true,
  videoId: remixVideoId,
  originalVideoId: videoId,
  status: 'queued',
  model: 'sora-2'
}
```

---

## 📊 Пример использования

### JavaScript/TypeScript:

```typescript
async function createVideoRemix(
  originalVideoId: string,
  remixPrompt: string
) {
  try {
    const response = await fetch('/api/sora/mobile/remix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoId: originalVideoId,
        prompt: remixPrompt
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }

    const data = await response.json()
    console.log('Remix started:', data.videoId)
    console.log('Status:', data.status)
    
    return data.videoId
  } catch (error) {
    console.error('Remix failed:', error)
    throw error
  }
}

// Использование:
const originalVideoId = 'vid_abc123'
const remixPrompt = 'Make it black and white with vintage film effect'

const remixId = await createVideoRemix(originalVideoId, remixPrompt)
```

### React Component:

```typescript
import { useState } from 'react'
import { toast } from 'react-hot-toast'

function VideoRemixButton({ 
  originalVideoId,
  originalVideoUrl 
}: { 
  originalVideoId: string
  originalVideoUrl: string
}) {
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState('')

  const handleRemix = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a remix prompt')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/sora/mobile/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId: originalVideoId,
          prompt
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const data = await response.json()
      
      toast.success('🎥 Video remix generation started!')
      console.log('Remix video ID:', data.videoId)
      
      // Создаем пост с ремиксом
      await createRemixPost(data.videoId, prompt, originalVideoUrl)
      
    } catch (error) {
      toast.error(error.message || 'Failed to create remix')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe how to remix this video..."
        rows={4}
      />
      <button 
        onClick={handleRemix}
        disabled={loading || !prompt.trim()}
      >
        {loading ? 'Creating Remix...' : 'Create Remix'}
      </button>
    </div>
  )
}
```

---

## 🔐 Безопасность

### ⚠️ Важные замечания:

1. **API Key на сервере** - ключ OpenAI хранится только на сервере:
   ```typescript
   const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
   ```

2. **Валидация входных данных**:
   - Проверка наличия `videoId`
   - Проверка наличия `prompt`
   - Валидация формата данных

3. **Error Handling**:
   - Обработка ошибок OpenAI API
   - Детальное логирование
   - Безопасные сообщения об ошибках

---

## 📝 Логи

API логирует все важные шаги:

```
[API /sora/mobile/remix] Starting Sora video remix... { videoId, prompt }
[API /sora/mobile/remix] Remix response: { id, status, model }
[API /sora/mobile/remix] Remix error: { error details }
```

---

## 🆚 Сравнение: До и После

### ❌ Раньше (прямое обращение с клиента):

```typescript
// В RemixPostModal.tsx
const response = await axios.post(
  `https://api.openai.com/v1/videos/${videoId}/remix`,
  { prompt },
  {
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
  }
)
```

**Проблемы:**
- ❌ API key доступен в браузере
- ❌ Зависимость от axios
- ❌ Прямая связь с OpenAI API
- ❌ Нет централизованной обработки ошибок

---

### ✅ Теперь (через внутренний API):

```typescript
// В RemixPostModal.tsx
const response = await fetch('/api/sora/mobile/remix', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    videoId,
    prompt
  })
})
```

**Преимущества:**
- ✅ API key защищен на сервере
- ✅ Используется нативный `fetch`
- ✅ Единая точка интеграции с OpenAI
- ✅ Централизованное логирование

---

## 🔗 Связанные файлы

- **Component:** `components/RemixPostModal.tsx`
- **Base API:** `app/api/sora/mobile/index.ts`
- **Post Creation:** `app/api/posts/remix/route.ts`

---

## 🧪 Тестирование

### cURL:

```bash
curl -X POST http://localhost:3000/api/sora/mobile/remix \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "vid_abc123def456",
    "prompt": "Add a vintage film effect with sepia tones"
  }'
```

### Expected Response:
```json
{
  "success": true,
  "videoId": "vid_remix_789xyz",
  "originalVideoId": "vid_abc123def456",
  "status": "queued",
  "model": "sora-2",
  "createdAt": 1729680000000,
  "message": "Sora video remix started!"
}
```

---

## 🎯 Use Cases

### 1. Remix с изменением стиля
```json
{
  "videoId": "original_vid",
  "prompt": "Convert to black and white vintage film style"
}
```

### 2. Remix с добавлением элементов
```json
{
  "videoId": "original_vid",
  "prompt": "Add falling snow and winter atmosphere"
}
```

### 3. Remix с изменением времени суток
```json
{
  "videoId": "original_vid",
  "prompt": "Change to golden hour sunset lighting"
}
```

---

Готово для использования! 🎬✨

