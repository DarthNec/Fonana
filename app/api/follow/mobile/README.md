# 📱 Follow Mobile API

**Endpoint**: `/api/follow/mobile`  
**Дата**: 19.10.2025  
**Назначение**: Упрощенный API для подписок без JWT аутентификации (для мобильного приложения)

## 🎯 Особенности

- ✅ **Без JWT токена** - аутентификация на стороне клиента
- ✅ **Простой интерфейс** - принимает `userId` напрямую
- ✅ **Идемпотентность** - повторные запросы не приводят к ошибкам
- ✅ **Автоматические счетчики** - обновляются `followingCount` и `followersCount`
- ✅ **Защита от отрицательных значений** - счетчики не уходят в минус

## 📡 Endpoints

### 1. POST - Подписаться на пользователя

**URL**: `POST /api/follow/mobile`

**Request Body**:
```json
{
  "userId": "clxxx123",       // ID пользователя, который подписывается
  "followingId": "clxxx456"   // ID пользователя, на которого подписываются
}
```

**Success Response** (201):
```json
{
  "success": true,
  "follow": {
    "id": "follow_id",
    "followerId": "clxxx123",
    "followingId": "clxxx456",
    "createdAt": "2025-10-19T12:00:00.000Z"
  },
  "message": "Successfully followed user"
}
```

**Already Following Response** (200):
```json
{
  "success": true,
  "follow": {
    "id": "existing_follow_id",
    "followerId": "clxxx123",
    "followingId": "clxxx456",
    "createdAt": "2025-10-01T10:00:00.000Z"
  },
  "message": "Already following this user"
}
```

**Error Responses**:
```json
// 400 - Missing userId
{
  "error": "User ID is required"
}

// 400 - Missing followingId
{
  "error": "Following ID is required"
}

// 400 - Self-follow attempt
{
  "error": "Cannot follow yourself"
}

// 404 - User not found
{
  "error": "User not found"
}

// 404 - Following user not found
{
  "error": "User to follow not found"
}

// 500 - Server error
{
  "error": "Failed to follow user",
  "details": "Error message"
}
```

---

### 2. DELETE - Отписаться от пользователя

**URL**: `DELETE /api/follow/mobile`

**Request Body**:
```json
{
  "userId": "clxxx123",       // ID пользователя, который отписывается
  "followingId": "clxxx456"   // ID пользователя, от которого отписываются
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Successfully unfollowed user"
}
```

**Not Following Response** (200):
```json
{
  "success": true,
  "message": "Not following this user"
}
```

**Error Responses**:
```json
// 400 - Missing userId
{
  "error": "User ID is required"
}

// 400 - Missing followingId
{
  "error": "Following ID is required"
}

// 404 - User not found
{
  "error": "User not found"
}

// 500 - Server error
{
  "error": "Failed to unfollow user",
  "details": "Error message"
}
```

---

### 3. GET - Проверить статус подписки

**URL**: `GET /api/follow/mobile?userId=xxx&followingId=yyy`

**Query Parameters**:
- `userId` (required) - ID пользователя, для которого проверяем
- `followingId` (required) - ID пользователя, на которого проверяем подписку

**Success Response** (200):
```json
{
  "success": true,
  "isFollowing": true,
  "follow": {
    "id": "follow_id",
    "followerId": "clxxx123",
    "followingId": "clxxx456",
    "createdAt": "2025-10-01T10:00:00.000Z"
  }
}
```

**Not Following Response** (200):
```json
{
  "success": true,
  "isFollowing": false,
  "follow": null
}
```

**Error Responses**:
```json
// 400 - Missing parameters
{
  "error": "User ID is required"
}

{
  "error": "Following ID is required"
}

// 500 - Server error
{
  "error": "Failed to check follow status",
  "details": "Error message"
}
```

## 📊 Автоматические обновления

### При подписке (POST):
```sql
-- Увеличиваем счетчики
UPDATE users SET followingCount = followingCount + 1 WHERE id = userId
UPDATE users SET followersCount = followersCount + 1 WHERE id = followingId
```

### При отписке (DELETE):
```sql
-- Уменьшаем счетчики с защитой от отрицательных значений
UPDATE users SET followingCount = followingCount - 1 WHERE id = userId
UPDATE users SET followersCount = followersCount - 1 WHERE id = followingId

-- Если счетчик стал отрицательным, устанавливаем 0
IF followingCount < 0 THEN SET followingCount = 0
IF followersCount < 0 THEN SET followersCount = 0
```

## 🔒 Валидации

1. **Self-follow prevention**: Нельзя подписаться на себя
2. **User existence**: Проверяется существование обоих пользователей
3. **Idempotency**: 
   - Повторная подписка → возвращает существующую
   - Повторная отписка → возвращает успех
4. **Counter protection**: Счетчики не уходят в отрицательные значения

## 💡 Примеры использования

### JavaScript/TypeScript (fetch):

```typescript
// Подписаться
async function followUser(userId: string, followingId: string) {
  const response = await fetch('/api/follow/mobile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, followingId })
  })
  
  const data = await response.json()
  
  if (data.success) {
    console.log('Подписка успешна!', data.follow)
  } else {
    console.error('Ошибка:', data.error)
  }
}

// Отписаться
async function unfollowUser(userId: string, followingId: string) {
  const response = await fetch('/api/follow/mobile', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, followingId })
  })
  
  const data = await response.json()
  
  if (data.success) {
    console.log('Отписка успешна!')
  } else {
    console.error('Ошибка:', data.error)
  }
}

// Проверить статус
async function checkFollowStatus(userId: string, followingId: string) {
  const response = await fetch(
    `/api/follow/mobile?userId=${userId}&followingId=${followingId}`
  )
  
  const data = await response.json()
  
  if (data.success) {
    console.log('Подписан:', data.isFollowing)
  } else {
    console.error('Ошибка:', data.error)
  }
}

// Использование
await followUser('user123', 'creator456')
await checkFollowStatus('user123', 'creator456') // true
await unfollowUser('user123', 'creator456')
await checkFollowStatus('user123', 'creator456') // false
```

### React Native:

```typescript
import { useState, useEffect } from 'react'

function FollowButton({ userId, creatorId }) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Проверяем статус при загрузке
  useEffect(() => {
    checkStatus()
  }, [userId, creatorId])
  
  async function checkStatus() {
    try {
      const response = await fetch(
        `/api/follow/mobile?userId=${userId}&followingId=${creatorId}`
      )
      const data = await response.json()
      setIsFollowing(data.isFollowing)
    } catch (error) {
      console.error('Failed to check follow status', error)
    }
  }
  
  async function toggleFollow() {
    setLoading(true)
    
    try {
      const response = await fetch('/api/follow/mobile', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          followingId: creatorId 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsFollowing(!isFollowing)
      }
    } catch (error) {
      console.error('Failed to toggle follow', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <button onClick={toggleFollow} disabled={loading}>
      {loading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  )
}
```

## 🔧 Логирование

Все операции логируются с префиксом `[API/follow/mobile]`:

```
[API/follow/mobile] Starting follow request...
[API/follow/mobile] Follow created: follow_id_123
[API/follow/mobile] Already following, returning existing
[API/follow/mobile] Starting unfollow request...
[API/follow/mobile] Follow deleted
[API/follow/mobile] Not following, returning success
```

## 🆚 Отличия от `/api/follow`

| Функция | `/api/follow` | `/api/follow/mobile` |
|---------|---------------|----------------------|
| Аутентификация | JWT Token (Bearer) | userId в body/params |
| Повторная подписка | Error 400 | Success (идемпотентность) |
| Повторная отписка | Error 400 | Success (идемпотентность) |
| Защита счетчиков | Нет | Да (не уходят в минус) |
| Использование | Web приложение | Мобильное приложение |

## ⚠️ Важные замечания

1. **Безопасность**: Этот endpoint не использует JWT, поэтому клиент должен контролировать доступ
2. **Идемпотентность**: Повторные запросы не приводят к ошибкам - это удобно для мобильных приложений
3. **Счетчики**: Автоматически обновляются и защищены от отрицательных значений
4. **Self-follow**: Попытка подписаться на себя возвращает ошибку 400

## 🐛 Обработка ошибок

Всегда проверяйте поле `success` в ответе:

```typescript
const response = await fetch('/api/follow/mobile', { ... })
const data = await response.json()

if (data.success) {
  // ✅ Операция успешна
  handleSuccess(data)
} else {
  // ❌ Произошла ошибка
  console.error(data.error, data.details)
  showError(data.error)
}
```

## 📈 База данных

### Таблица `Follow`:
```prisma
model Follow {
  id          String   @id @default(cuid())
  followerId  String   // Кто подписывается
  followingId String   // На кого подписываются
  createdAt   DateTime @default(now())
  
  follower    User @relation("UserFollowers", fields: [followerId], references: [id])
  following   User @relation("UserFollowing", fields: [followingId], references: [id])
  
  @@unique([followerId, followingId])
}
```

### Обновления User:
```prisma
model User {
  id              String @id
  followersCount  Int    @default(0)  // Количество подписчиков
  followingCount  Int    @default(0)  // Количество подписок
  ...
}
```


