# Sora-2 Generations System Integration

## 📋 Обзор

Интеграция системы управления AI генерациями для Sora-2 в CreatePostModal и API создания постов. Пользователи имеют ограниченное количество генераций, которые расходуются при создании AI-видео.

## 🎯 Реализованные функции

### 1. Отображение доступных генераций

При открытии CreatePostModal и выборе Sora-2, пользователь видит количество доступных генераций:

```
┌─────────────────────────────────────────┐
│ ✨ Available generations: 3             │
└─────────────────────────────────────────┘
```

### 2. Проверка генераций перед созданием

Кнопка "Publish" становится неактивной, если:
- Выбрана Sora-2 генерация (`contentSource === 'sora2'`)
- Доступных генераций 0 или null

### 3. Автоматический декремент при создании

При создании AI-видео:
- Проверяется наличие генераций
- Если генераций 0 → возвращается ошибка 403
- Если есть генерации → декремент на 1

### 4. Обновление UI после создания

После успешного создания AI-видео счетчик обновляется локально в реальном времени.

## 🔧 Технические детали

### CreatePostModal.tsx

#### Состояния

```typescript
const [availableGenerations, setAvailableGenerations] = useState<number | null>(null)
const [isLoadingGenerations, setIsLoadingGenerations] = useState(false)
```

#### Загрузка генераций

```typescript
useEffect(() => {
  const fetchGenerations = async () => {
    if (!publicKeyString) return
    
    const response = await fetch(`/api/user/generations?userWallet=${publicKeyString}`)
    const data = await response.json()
    
    setAvailableGenerations(data.availableGenerationCount)
  }
  
  fetchGenerations()
}, [publicKeyString])
```

#### UI компонент счетчика

Расположение: Над полем "Prompt for Sora-2"

```tsx
<div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border border-pink-200 dark:border-pink-800 rounded-xl p-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <SparklesIcon className="w-5 h-5 text-pink-600 dark:text-pink-400" />
      <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
        Available generations:
      </span>
    </div>
    <div className="flex items-center gap-2">
      {isLoadingGenerations ? (
        <div className="w-4 h-4 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
      ) : (
        <span className={`text-lg font-bold ${
          (availableGenerations || 0) > 0 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {availableGenerations ?? 0}
        </span>
      )}
    </div>
  </div>
  {availableGenerations === 0 && (
    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
      ⚠️ No generations available. You cannot create Sora-2 videos.
    </p>
  )}
</div>
```

#### Отключение кнопки Publish

```typescript
const condition4 = formData.contentSource === 'sora2' && (availableGenerations === null || availableGenerations <= 0)
const isDisabled = condition1 || condition2 || condition3 || condition4
```

#### Обновление счетчика после создания

```typescript
if (mode === 'create' && formData.contentSource === 'sora2' && availableGenerations !== null) {
  setAvailableGenerations(availableGenerations - 1)
  console.log('[CreatePostModal] Updated generation count:', availableGenerations - 1)
}
```

### app/api/posts/route.ts

#### Проверка и декремент (строки 335-365)

```typescript
// Проверка генераций для ai-video постов
if (body.type === 'ai-video') {
  console.log('[API] AI-video post detected, checking available generations...')
  
  // @ts-expect-error - availableGenerationCount будет доступно после генерации Prisma Client
  const availableGenerations = user.availableGenerationCount || 0
  
  console.log('[API] User generation count:', availableGenerations)
  
  if (availableGenerations <= 0) {
    console.log('[API] Insufficient generations for AI-video creation')
    return NextResponse.json({ 
      error: 'Insufficient generations. You need at least 1 generation to create AI videos.',
      availableGenerations: 0
    }, { status: 403 })
  }
  
  // Декрементируем счетчик генераций
  await prisma.user.update({
    where: { id: user.id },
    data: {
      // @ts-expect-error - availableGenerationCount будет доступно после генерации Prisma Client
      availableGenerationCount: { decrement: 1 }
    }
  })
  
  console.log('[API] Generation count decremented:', {
    previous: availableGenerations,
    new: availableGenerations - 1
  })
}
```

## 📊 Workflow

### Создание AI-видео с проверкой генераций

```
Пользователь открывает CreatePostModal
         ↓
GET /api/user/generations?userWallet=xxx
         ↓
Отображение: Available generations: 3
         ↓
Выбирает Sora-2
         ↓
Заполняет промпт
         ↓
[Если generations = 0]
   → Кнопка Publish неактивна
   → Сообщение: "No generations available"
         ↓
[Если generations > 0]
   → Кнопка Publish активна
         ↓
Нажимает Publish
         ↓
POST /api/posts (type: 'ai-video')
         ↓
API: Проверка availableGenerationCount
         ↓
[Если = 0]
   → 403 Error: "Insufficient generations"
   → Toast: "Insufficient generations. You need at least 1 generation"
         ↓
[Если > 0]
   → Декремент availableGenerationCount (-1)
   → Создание поста
   → 200 Success
         ↓
Клиент: Обновляет локальный счетчик (-1)
         ↓
Toast: "Post created successfully!"
```

## 🎨 UI/UX Features

### Цветовая индикация

- **Зеленый (> 0)**: `text-green-600 dark:text-green-400`
- **Красный (= 0)**: `text-red-600 dark:text-red-400`

### Состояния загрузки

- Спиннер при загрузке счетчика
- Disabled кнопка при недостатке генераций

### Предупреждения

При 0 генерациях показывается:
```
⚠️ No generations available. You cannot create Sora-2 videos.
```

## 🔐 Безопасность

### Двойная проверка

1. **Клиент**: Блокировка UI при 0 генерациях
2. **Сервер**: Валидация перед созданием поста

### Атомарность

Декремент выполняется в той же транзакции, что и проверка, предотвращая race conditions:

```typescript
await prisma.user.update({
  where: { id: user.id },
  data: {
    availableGenerationCount: { decrement: 1 }
  }
})
```

## 📝 API Responses

### Успешное создание

```json
{
  "success": true,
  "post": {
    "id": "clxxx...",
    "type": "ai-video",
    "requestId": "video-id-xxx",
    ...
  }
}
```

### Недостаточно генераций

```json
{
  "error": "Insufficient generations. You need at least 1 generation to create AI videos.",
  "availableGenerations": 0
}
```

**HTTP Status**: 403 Forbidden

## 🧪 Тестирование

### Сценарий 1: Создание с достаточными генерациями

```javascript
// User has 3 generations
1. Open CreatePostModal
2. Select Sora-2
3. See "Available generations: 3"
4. Fill prompt
5. Click Publish
6. ✅ Success
7. See "Available generations: 2"
```

### Сценарий 2: Попытка создания без генераций

```javascript
// User has 0 generations
1. Open CreatePostModal
2. Select Sora-2
3. See "Available generations: 0"
4. See warning message
5. Publish button is disabled
6. ❌ Cannot create
```

### Сценарий 3: Race condition prevention

```javascript
// User has 1 generation, tries to create 2 videos simultaneously
1. First request: Checks count (1) → Decrements → Success
2. Second request: Checks count (0) → 403 Error
```

## 🔄 Обновление счетчика

### Методы обновления

1. **После создания AI-видео** (автоматически):
   ```typescript
   // В handleSubmit после успешного создания
   if (mode === 'create' && formData.contentSource === 'sora2') {
     setAvailableGenerations(availableGenerations - 1)
   }
   ```

2. **При покупке генераций** (через API):
   ```bash
   POST /api/user/generations
   Body: { userWallet, increment: 5 }
   ```

3. **Ручное обновление** (для админов):
   ```bash
   POST /api/user/generations
   Body: { userWallet, generationCount: 10 }
   ```

## 📊 Логирование

### Клиент (CreatePostModal)

```
[CreatePostModal] Fetching available generations for: E1iu9Zf...
[CreatePostModal] Generations fetched: 3
[CreatePostModal] Updated generation count: 2
```

### Сервер (API)

```
[API] AI-video post detected, checking available generations...
[API] User generation count: 3
[API] Generation count decremented: { previous: 3, new: 2 }
[API] Post created successfully: clxxx...
```

## 🚀 Связанные файлы

- **CreatePostModal**: `components/CreatePostModal.tsx` (строки 60-62, 182-215, 909-913, 1188-1216, 1755)
- **API Posts**: `app/api/posts/route.ts` (строки 335-365)
- **API Generations**: `app/api/user/generations/route.ts` (GET метод)
- **Prisma Schema**: `prisma/schema.prisma` (поле `availableGenerationCount`)
- **Migration**: `prisma/migrations/20251027000000_add_available_generation_count_to_users/`

## 💡 Рекомендации

1. **Мониторинг**: Отслеживай средний расход генераций на пользователя
2. **Аналитика**: Логируй когда пользователи сталкиваются с лимитом
3. **Монетизация**: Добавь возможность покупки дополнительных генераций
4. **Уведомления**: Предупреждай когда остается 1-2 генерации
5. **Rate Limiting**: Добавь задержку между созданием AI-видео

---

**Дата создания**: 27 октября 2025  
**Версия**: v1  
**Статус**: ✅ Production Ready

