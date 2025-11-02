# User Emotions API

## 📋 Описание

API для получения всех эмоций конкретного пользователя с полной информацией о постах и комментариях, к которым они относятся.

---

## 🔗 Endpoint

```
GET /api/emotions/user?userId={userId}
```

---

## 📥 Request

### Query Parameters

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `userId` | string | ✅ Да | ID пользователя |

### Примеры запросов

```typescript
// В React компоненте
const response = await fetch(`/api/emotions/user?userId=${user.id}`)
const data = await response.json()

// С error handling
try {
  const response = await fetch(`/api/emotions/user?userId=user-123`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch user emotions')
  }
  
  const { success, data, count } = await response.json()
  console.log(`User has ${count} emotions:`, data)
} catch (error) {
  console.error('Error:', error)
}
```

---

## 📤 Response

### Success Response (200)

```typescript
{
  "success": true,
  "data": [
    {
      "id": "emotion-123",
      "emotionId": 1, // 1=😂, 2=🤡, 3=🔥, 4=💩
      "createdAt": "2025-10-23T10:00:00Z",
      "post": {
        "id": "post-456",
        "title": "Amazing video",
        "type": "video",
        "mediaUrl": "https://...",
        "createdAt": "2025-10-20T10:00:00Z",
        "creator": {
          "id": "creator-789",
          "name": "John Doe",
          "username": "johndoe",
          "avatar": "https://..."
        }
      },
      "comment": null
    },
    {
      "id": "emotion-124",
      "emotionId": 3, // 🔥
      "createdAt": "2025-10-22T15:30:00Z",
      "post": null,
      "comment": {
        "id": "comment-789",
        "content": "Great comment!",
        "postId": "post-555",
        "createdAt": "2025-10-22T15:25:00Z"
      }
    }
  ],
  "count": 2
}
```

### Error Response (400 - Missing userId)

```json
{
  "success": false,
  "error": "userId is required"
}
```

### Error Response (500 - Server Error)

```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## 📊 Response Fields

### Root Object

| Поле | Тип | Описание |
|------|-----|----------|
| `success` | boolean | Статус выполнения запроса |
| `data` | array | Массив эмоций пользователя |
| `count` | number | Количество эмоций |

### Emotion Object

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | ID эмоции |
| `emotionId` | number | Тип эмоции (1-4) |
| `createdAt` | string | Дата создания (ISO 8601) |
| `post` | object \| null | Информация о посте (если эмоция на посте) |
| `comment` | object \| null | Информация о комментарии (если эмоция на комментарии) |

### Post Object

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | ID поста |
| `title` | string | Заголовок поста |
| `type` | string | Тип поста (video, image, text, ai-video) |
| `mediaUrl` | string \| null | URL медиа-контента |
| `createdAt` | string | Дата создания поста |
| `creator` | object | Информация о создателе |

### Creator Object

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | ID создателя |
| `name` | string | Полное имя |
| `username` | string | Username |
| `avatar` | string \| null | URL аватара |

### Comment Object

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | ID комментария |
| `content` | string | Содержимое комментария |
| `postId` | string | ID поста, к которому относится комментарий |
| `createdAt` | string | Дата создания комментария |

---

## 🎭 Emotion Types

| emotionId | Emoji | Label |
|-----------|-------|-------|
| 1 | 😂 | Смешно |
| 2 | 🤡 | Клоун |
| 3 | 🔥 | Огонь |
| 4 | 💩 | Говно |

---

## 🔄 Сортировка

Эмоции возвращаются отсортированными по дате создания в **обратном порядке** (новые сначала):

```typescript
orderBy: {
  createdAt: 'desc'
}
```

---

## 💡 Примеры использования

### 1. Получить все эмоции пользователя

```typescript
import { useEffect, useState } from 'react'

function UserEmotionsPage() {
  const [emotions, setEmotions] = useState([])
  const [loading, setLoading] = useState(true)
  const user = useUser()

  useEffect(() => {
    if (!user?.id) return

    async function fetchEmotions() {
      try {
        const response = await fetch(`/api/emotions/user?userId=${user.id}`)
        const { success, data } = await response.json()
        
        if (success) {
          setEmotions(data)
        }
      } catch (error) {
        console.error('Failed to fetch emotions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEmotions()
  }, [user?.id])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>My Emotions ({emotions.length})</h1>
      {emotions.map(emotion => (
        <EmotionCard key={emotion.id} emotion={emotion} />
      ))}
    </div>
  )
}
```

### 2. Фильтрация эмоций по типу

```typescript
function UserEmotionsByType({ userId, emotionId }: { userId: string, emotionId: number }) {
  const [emotions, setEmotions] = useState([])

  useEffect(() => {
    async function fetchAndFilter() {
      const response = await fetch(`/api/emotions/user?userId=${userId}`)
      const { data } = await response.json()
      
      // Фильтруем на клиенте по emotionId
      const filtered = data.filter(e => e.emotionId === emotionId)
      setEmotions(filtered)
    }

    fetchAndFilter()
  }, [userId, emotionId])

  return (
    <div>
      <h2>Эмоций типа {emotionId}: {emotions.length}</h2>
      {/* ... */}
    </div>
  )
}
```

### 3. Статистика эмоций пользователя

```typescript
async function getUserEmotionStats(userId: string) {
  const response = await fetch(`/api/emotions/user?userId=${userId}`)
  const { data } = await response.json()
  
  const stats = {
    total: data.length,
    byType: {} as Record<number, number>,
    onPosts: data.filter(e => e.post !== null).length,
    onComments: data.filter(e => e.comment !== null).length
  }
  
  // Подсчет по типам эмоций
  data.forEach(emotion => {
    stats.byType[emotion.emotionId] = (stats.byType[emotion.emotionId] || 0) + 1
  })
  
  return stats
}

// Использование:
const stats = await getUserEmotionStats('user-123')
console.log('Total emotions:', stats.total)
console.log('😂:', stats.byType[1] || 0)
console.log('🔥:', stats.byType[3] || 0)
```

### 4. Группировка эмоций по постам

```typescript
function groupEmotionsByPost(emotions: any[]) {
  const grouped = new Map()
  
  emotions.forEach(emotion => {
    if (!emotion.post) return
    
    if (!grouped.has(emotion.post.id)) {
      grouped.set(emotion.post.id, {
        post: emotion.post,
        emotions: []
      })
    }
    
    grouped.get(emotion.post.id).emotions.push({
      id: emotion.id,
      emotionId: emotion.emotionId,
      createdAt: emotion.createdAt
    })
  })
  
  return Array.from(grouped.values())
}

// Использование:
const response = await fetch(`/api/emotions/user?userId=${user.id}`)
const { data } = await response.json()
const grouped = groupEmotionsByPost(data)

console.log('User reacted to', grouped.length, 'posts')
```

---

## 🔍 Включенные данные (Include)

API автоматически включает связанные данные:

```typescript
{
  include: {
    post: {
      select: {
        id: true,
        title: true,
        type: true,
        mediaUrl: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        }
      }
    },
    comment: {
      select: {
        id: true,
        content: true,
        createdAt: true,
        postId: true
      }
    }
  }
}
```

---

## ⚡ Производительность

### Оптимизации:
- ✅ Используется `select` для загрузки только необходимых полей
- ✅ Индексы в базе данных по `userId`
- ✅ Сортировка на уровне базы данных

### Рекомендации:
- Используйте пагинацию для больших объемов данных
- Кешируйте результаты на клиенте
- Добавьте дебаунс для частых запросов

---

## 🐛 Error Handling

```typescript
async function fetchUserEmotionsWithErrorHandling(userId: string) {
  try {
    if (!userId) {
      throw new Error('userId is required')
    }
    
    const response = await fetch(`/api/emotions/user?userId=${userId}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch emotions')
    }
    
    const { success, data, count } = await response.json()
    
    if (!success) {
      throw new Error('API returned unsuccessful response')
    }
    
    return { data, count }
  } catch (error) {
    console.error('[fetchUserEmotions] Error:', error)
    
    // Уведомление пользователя
    toast.error(error instanceof Error ? error.message : 'Failed to load emotions')
    
    return { data: [], count: 0 }
  }
}
```

---

## 📊 Use Cases

### 1. Профиль пользователя
Показать список всех постов, на которые пользователь поставил эмоции

### 2. Аналитика активности
Отслеживать, какие типы эмоций пользователь использует чаще всего

### 3. История взаимодействий
Отображать хронологию эмоциональных реакций пользователя

### 4. Рекомендации
Использовать историю эмоций для персонализации контента

---

## 🔒 Приватность

**Важно:** Эндпоинт возвращает эмоции по любому `userId` без проверки авторизации.

Если нужна приватность, добавьте проверку:

```typescript
// В route.ts
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  const currentUserId = await getCurrentUserFromSession(request)
  
  // Проверка: пользователь может видеть только свои эмоции
  if (userId !== currentUserId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }
  
  // ... остальной код
}
```

---

## 🔗 Связанные API

- `GET /api/posts/[id]/emotions` - Эмоции на конкретном посте
- `POST /api/posts/[id]/emotions` - Добавить/удалить эмоцию
- `GET /api/posts` - Список постов (включает `emotions` для каждого поста)

---

## 📝 Changelog

### v1.0.0 (2025-10-23)
- ✅ Начальная версия
- ✅ GET запрос с фильтрацией по `userId`
- ✅ Включены связанные посты и комментарии
- ✅ Сортировка по дате (desc)

---

Готово к использованию! 🎉

