# Sora-2 Prompt Optimizer API

## Описание

API endpoint для оптимизации промптов пользователя под Sora-2 видео генерацию через OpenAI Chat API.

### Основные функции:
- ✅ Оптимизация промпта для максимального качества Sora-2 видео
- ✅ Автоматическое обнаружение недопустимого контента
- ✅ Замена проблемного контента на допустимые альтернативы
- ✅ Предупреждения пользователю о модификациях
- ✅ Улучшение промпта: детали освещения, камеры, настроения

---

## Endpoint

**POST** `/api/sora/chat`

---

## Request Body

```json
{
  "prompt": "user's original prompt text"
}
```

### Параметры:
- `prompt` (string, required) - Оригинальный промпт пользователя для оптимизации

---

## Response

### Успешный ответ (200 OK)

```json
{
  "success": true,
  "optimizedPrompt": "A cinematic shot of a peaceful sunset over calm ocean waters, golden hour lighting, wide angle lens, 4K resolution, serene atmosphere",
  "originalPrompt": "sunset at the beach",
  "hasWarning": false,
  "warningMessage": null,
  "modifiedContent": [],
  "metadata": {
    "model": "gpt-4o",
    "tokensUsed": 245
  }
}
```

### Ответ с предупреждением (200 OK)

```json
{
  "success": true,
  "optimizedPrompt": "A dynamic action scene featuring a hero performing stunts, intense lighting, dramatic camera angles, high-speed cinematography",
  "originalPrompt": "violent fight scene with blood and gore",
  "hasWarning": true,
  "warningMessage": "⚠️ Ваш промпт был изменён: он содержал недопустимый контент (violence, gore). Мы автоматически адаптировали его для соответствия нашим правилам.\n\nДетали: Removed explicit violence and gore, replaced with dynamic action scene",
  "modifiedContent": [
    "violence",
    "gore"
  ],
  "metadata": {
    "model": "gpt-4o",
    "tokensUsed": 312
  }
}
```

### Параметры ответа:

- `success` (boolean) - Статус успешности операции
- `optimizedPrompt` (string) - Оптимизированный промпт для Sora-2
- `originalPrompt` (string) - Оригинальный промпт пользователя
- `hasWarning` (boolean) - Был ли промпт изменён из-за недопустимого контента
- `warningMessage` (string | null) - Сообщение для пользователя о изменениях
- `modifiedContent` (string[]) - Список изменённых элементов
- `metadata` (object) - Метаданные запроса (модель, токены)

---

## Примеры использования

### Пример 1: Простая оптимизация (без проблем)

**Request:**
```javascript
const response = await fetch('/api/sora/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'a cat playing with a ball'
  })
})

const data = await response.json()
console.log(data.optimizedPrompt)
// "A playful orange tabby cat chasing a colorful yarn ball across a sunlit wooden floor, soft natural lighting, shallow depth of field, 60fps smooth motion, warm and cozy atmosphere"
```

### Пример 2: Обнаружение недопустимого контента

**Request:**
```javascript
const response = await fetch('/api/sora/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'violent explosion with people getting hurt'
  })
})

const data = await response.json()

if (data.hasWarning) {
  console.warn(data.warningMessage)
  // ⚠️ Ваш промпт был изменён: он содержал недопустимый контент (violence, harmful content)...
}

console.log(data.optimizedPrompt)
// "A spectacular fireworks display in the night sky, colorful explosions of light, people watching in awe and celebration, cinematic wide shot, vibrant colors"
```

### Пример 3: Интеграция в компонент React

```typescript
import { useState } from 'react'
import { toast } from 'react-hot-toast'

function PromptOptimizer() {
  const [prompt, setPrompt] = useState('')
  const [optimizedPrompt, setOptimizedPrompt] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)

  const handleOptimize = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsOptimizing(true)

    try {
      const response = await fetch('/api/sora/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) {
        throw new Error('Failed to optimize prompt')
      }

      const data = await response.json()
      
      setOptimizedPrompt(data.optimizedPrompt)

      if (data.hasWarning) {
        toast.error(data.warningMessage, {
          duration: 6000,
          icon: '⚠️'
        })
      } else {
        toast.success('Prompt optimized successfully!')
      }

    } catch (error) {
      console.error('Optimization error:', error)
      toast.error('Failed to optimize prompt')
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt..."
      />
      
      <button 
        onClick={handleOptimize}
        disabled={isOptimizing}
      >
        {isOptimizing ? 'Optimizing...' : 'Optimize Prompt'}
      </button>

      {optimizedPrompt && (
        <div>
          <h3>Optimized Prompt:</h3>
          <p>{optimizedPrompt}</p>
        </div>
      )}
    </div>
  )
}
```

---

## Обнаружение недопустимого контента

API автоматически обнаруживает и модифицирует следующие типы контента:

### 🚫 Категории недопустимого контента:
- **Насилие и жестокость** (violence, gore, harmful content)
- **Расовая/этническая дискриминация** (racial, ethnic discrimination)
- **Сексуальный контент** (sexually explicit content)
- **Язык вражды** (hate speech, offensive material)
- **Опасная деятельность** (dangerous or illegal activities)
- **Авторские права** (copyrighted characters or brands without permission)

### ✅ Стратегия модификации:
1. **Удаление проблемных элементов**
2. **Замена на допустимые альтернативы**
3. **Сохранение творческого намерения**
4. **Прозрачное информирование пользователя**

---

## Оптимизация промпта

API улучшает промпт, добавляя:

- 🎥 **Кинематографические детали** (camera angles, movements)
- 💡 **Освещение** (golden hour, soft lighting, dramatic lighting)
- 🎨 **Цвета и настроение** (warm, vibrant, moody)
- 📹 **Технические параметры** (4K, 60fps, resolution)
- 🎬 **Визуальный стиль** (cinematic, artistic, realistic)

---

## Ошибки

### 400 Bad Request
```json
{
  "error": "Prompt is required and must be a string"
}
```

### 500 Internal Server Error
```json
{
  "error": "OpenAI API Error: Rate limit exceeded",
  "details": "rate_limit_exceeded"
}
```

### 500 Internal Server Error (Fallback)
```json
{
  "error": "Failed to optimize prompt",
  "fallback": "Using original prompt without optimization"
}
```

---

## Переменные окружения

Убедитесь, что в `.env` файле установлен:

```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-...
```

---

## Лимиты

- **Максимальная длина промпта**: нет жёсткого лимита, но рекомендуется до 1000 символов
- **Оптимизированный промпт**: до 500 символов
- **Rate limit**: зависит от вашего OpenAI API плана
- **Модель**: GPT-4o (можно изменить на GPT-4 или GPT-3.5-turbo)

---

## Логирование

API логирует:
- ✅ Длину оригинального промпта
- ✅ Наличие предупреждений
- ✅ Количество использованных токенов
- ✅ Список модифицированных элементов
- ❌ Ошибки OpenAI API

Пример логов:
```
[API /sora/chat] Optimizing prompt for Sora-2: {
  originalLength: 25,
  preview: 'a cat playing with a ball...'
}
[API /sora/chat] OpenAI response received: {
  finishReason: 'stop',
  usage: { prompt_tokens: 512, completion_tokens: 145, total_tokens: 657 }
}
[API /sora/chat] Prompt optimization complete: {
  hasWarning: false,
  originalLength: 25,
  optimizedLength: 187,
  modifiedElements: 0
}
```

---

## Best Practices

1. **Всегда проверяйте `hasWarning`** перед использованием оптимизированного промпта
2. **Показывайте `warningMessage` пользователю**, если есть изменения
3. **Используйте оптимизированный промпт** для Sora-2 генерации
4. **Обрабатывайте ошибки gracefully** с fallback на оригинальный промпт
5. **Логируйте использование токенов** для мониторинга расходов

---

## Performance

- ⚡ Средний response time: **2-4 секунды** (зависит от OpenAI API)
- 🔥 Используется **GPT-4o** для лучшего качества оптимизации
- 💰 Примерная стоимость: **$0.01-0.02 за запрос** (зависит от длины промпта)

---

## Roadmap

- [ ] Кэширование часто используемых промптов
- [ ] Поддержка нескольких языков
- [ ] A/B тестирование разных моделей (GPT-4 vs GPT-4o)
- [ ] Статистика по типам модификаций
- [ ] Batch optimization для множественных промптов

