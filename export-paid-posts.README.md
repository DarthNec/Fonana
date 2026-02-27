# Export Paid Posts Script

## Описание

Скрипт для экспорта всех платных постов из базы данных в JSON файл.

## Что экспортируется

- **Все посты где `isPaid = true`**
- **Данные постов:**
  - ID, content, mediaUrl, type, price
  - isPaid, isVisible, timestamps
  - Информация о создателе (nickname, wallet, fullName)
  - Статистика (лайки, комментарии, покупки)

- **Статистика:**
  - Общее количество платных постов
  - Разбивка по типам (text, image, video, ai-video)
  - Общая выручка (сумма всех price)
  - Общее количество покупок, лайков, комментариев

## Формат output файла

```json
{
  "meta": {
    "exportedAt": "2026-02-26T...",
    "totalPosts": 150,
    "databaseUrl": "Connected"
  },
  "statistics": {
    "total": 150,
    "byType": {
      "image": 80,
      "video": 50,
      "ai-video": 20
    },
    "totalRevenue": 45.75,
    "totalPurchases": 320,
    "totalLikes": 1250,
    "totalComments": 450,
    "exportedAt": "2026-02-26T..."
  },
  "posts": [
    {
      "id": "...",
      "content": "...",
      "mediaUrl": "...",
      "type": "image",
      "price": "0.15",
      "isPaid": true,
      "isVisible": true,
      "createdAt": "...",
      "updatedAt": "...",
      "creatorId": "...",
      "creator": {
        "id": "...",
        "nickname": "...",
        "wallet": "...",
        "fullName": "..."
      },
      "_count": {
        "likes": 25,
        "comments": 10,
        "purchases": 8
      }
    }
    // ... остальные посты
  ]
}
```

## Использование

### Локальный запуск:

```bash
# Убедитесь, что DATABASE_URL настроен в .env
node export-paid-posts.js
```

### Output:

Файл сохраняется в корень проекта: **`paid_posts.json`**

### Пример вывода:

```
🔍 [Export] Fetching all paid posts from database...
✅ [Export] Found 150 paid posts

📊 [Export] Statistics:
   Total Paid Posts: 150
   By Type:
      - image: 80
      - video: 50
      - ai-video: 20
   Total Revenue: 45.75 SOL
   Total Purchases: 320
   Total Likes: 1250
   Total Comments: 450

💾 [Export] Saved to: C:\Users\...\paid_posts.json
✅ [Export] Export completed successfully!

🎉 [Export] Script finished
```

## Использование экспортированных данных

### Анализ данных:

```javascript
const data = require('./paid_posts.json')

// Найти самые дорогие посты
const expensivePosts = data.posts
  .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
  .slice(0, 10)

// Найти самые популярные
const popularPosts = data.posts
  .sort((a, b) => b._count.purchases - a._count.purchases)
  .slice(0, 10)

// Создатели с наибольшей выручкой
const creatorRevenue = {}
data.posts.forEach(post => {
  const wallet = post.creator.wallet
  creatorRevenue[wallet] = (creatorRevenue[wallet] || 0) + parseFloat(post.price)
})
```

### Фильтрация:

```javascript
// Только видео
const videosPaid = data.posts.filter(p => p.type === 'video')

// Посты дороже 0.5 SOL
const expensivePosts = data.posts.filter(p => parseFloat(p.price) > 0.5)

// Непроданные посты
const unsoldPosts = data.posts.filter(p => p._count.purchases === 0)
```

## Требования

- Node.js 18+
- Prisma Client установлен (`npm install`)
- Доступ к базе данных (DATABASE_URL в .env)

## Безопасность

⚠️ **ВАЖНО:** Файл `paid_posts.json` содержит:
- Wallet адреса создателей
- Полную информацию о ценах и выручке
- ID всех платных постов

**НЕ КОММИТИТЬ** этот файл в публичный репозиторий!

Файл уже добавлен в `.gitignore`:
```
paid_posts.json
```

## Troubleshooting

### Ошибка подключения к базе:
```
Error: Can't reach database server
```
**Решение:** Проверьте DATABASE_URL в .env файле.

### Пустой результат (0 постов):
```
✅ [Export] Found 0 paid posts
```
**Возможные причины:**
- В базе нет постов с `isPaid = true`
- Неверная база данных (проверьте DATABASE_URL)

## См. также

- `sorachecker.js` - Проверка AI-видео генераций
- `updateUserGeneration.js` - Обновление лимитов генераций
- `ai-activity-bot.js` - Бот активности AI

---

**Created:** 2026-02-26  
**Author:** AI Assistant  
**Status:** ✅ Ready to use
