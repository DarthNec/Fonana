# 📱 Follow Mobile API - Краткое резюме

**Файл**: `app/api/follow/mobile/route.ts`  
**Дата**: 19.10.2025  
**Статус**: ✅ Готов к использованию

## 🚀 Быстрый старт

### Подписаться:
```bash
curl -X POST http://localhost:3000/api/follow/mobile \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","followingId":"creator456"}'
```

### Отписаться:
```bash
curl -X DELETE http://localhost:3000/api/follow/mobile \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","followingId":"creator456"}'
```

### Проверить статус:
```bash
curl "http://localhost:3000/api/follow/mobile?userId=user123&followingId=creator456"
```

## 🎯 Ключевые особенности

1. **Без JWT токена** - передается `userId` напрямую
2. **Идемпотентность** - повторные запросы не ломают систему
3. **Автоматические счетчики** - `followersCount` и `followingCount` обновляются автоматически
4. **Защита от минуса** - счетчики не уходят в отрицательные значения

## 📊 API Methods

| Method | Endpoint | Body/Query | Описание |
|--------|----------|------------|----------|
| `POST` | `/api/follow/mobile` | `{userId, followingId}` | Подписаться |
| `DELETE` | `/api/follow/mobile` | `{userId, followingId}` | Отписаться |
| `GET` | `/api/follow/mobile?userId=xxx&followingId=yyy` | - | Проверить статус |
| `GET` | `/api/follow/mobile/all?userId=xxx` | - | **Получить все подписки** |

## ✅ Response Format

Все успешные ответы содержат:
```json
{
  "success": true,
  "message": "...",
  // + дополнительные поля
}
```

## 🔥 TypeScript пример

```typescript
// Универсальная функция для управления подписками
async function manageFollow(
  action: 'follow' | 'unfollow' | 'check',
  userId: string,
  followingId: string
) {
  if (action === 'check') {
    const response = await fetch(
      `/api/follow/mobile?userId=${userId}&followingId=${followingId}`
    )
    const data = await response.json()
    return data.isFollowing
  }
  
  const response = await fetch('/api/follow/mobile', {
    method: action === 'follow' ? 'POST' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, followingId })
  })
  
  return await response.json()
}

// Использование
const isFollowing = await manageFollow('check', 'user123', 'creator456')
if (!isFollowing) {
  await manageFollow('follow', 'user123', 'creator456')
}
```

## 🆚 Сравнение с `/api/follow`

| | Standard API | Mobile API |
|---|---|---|
| **Auth** | JWT Token | userId parameter |
| **Повторная операция** | ❌ Error | ✅ Success |
| **Идемпотентность** | ❌ Нет | ✅ Да |
| **Защита счетчиков** | ❌ Нет | ✅ Да |

## 🆕 Получение всех подписок

### Новый endpoint: `/api/follow/mobile/all`

Получить список всех создателей, на которых подписан пользователь:

```typescript
// GET /api/follow/mobile/all?userId=xxx
const response = await fetch(`/api/follow/mobile/all?userId=user_123`)
const { creators, count } = await response.json()

console.log(`User follows ${count} creators`)

creators.forEach(creator => {
  console.log(`- ${creator.nickname}:`, {
    followers: creator.followersCount,
    posts: creator.postsCount,
    subscription: creator.subscription?.plan || 'none'
  })
})
```

**Response включает:**
- ✅ Полная информация о создателе (nickname, avatar, bio)
- ✅ Счетчики (followers, following, posts)
- ✅ Статус подписки (plan, validUntil)
- ✅ Pricing тарифы создателя
- ✅ Сортировка по дате подписки (новые первые)

**См. подробнее:** `docs/FOLLOW_ALL_MOBILE_API_SUMMARY.md`

---

## 📖 Полная документация

- `/app/api/follow/mobile/README.md` - Follow/Unfollow endpoints
- `/app/api/follow/mobile/all/README.md` - Get all followings endpoint

