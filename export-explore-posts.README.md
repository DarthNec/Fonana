# Export Explore Posts Script

## 📝 Описание

Скрипт для экспорта данных страницы Explore (криэйторы и посты) в JSON файл `explore_posts.json`.

## 🎯 Что экспортируется

### 1. **Creators** (Криэйторы)
- Все пользователи, кроме `B_Julia`
- Ранжированные по приоритету:
  - **Первые 3 места** (фиксированные):
    1. `@mia-`
    2. `@nana`
    3. `@-chnytng`
  - **Остальные**: сортируются по количеству постов (DESC)

### 2. **All Posts** (Все посты)
- **750 последних постов** всех типов
- Только с CDN URLs (`https://fonanastorage.b-cdn.net/`)
- Исключены:
  - Локальные пути `/media/...`
  - Пустые `mediaUrl`

### 3. **Paid Posts** (Платные посты)
- Посты с `price > 0`
- Только CDN URLs
- Включены:
  - Информация о криэйторе
  - Статистика (likes, comments, purchases)

### 4. **Premium Posts** (Подписочные посты)
- Посты с `isSubscription = true`
- Только CDN URLs
- Включены:
  - Информация о криэйторе
  - Статистика (likes, comments, purchases)

## 📊 Структура выходного файла

```json
{
  "meta": {
    "exportedAt": "2026-02-26T...",
    "version": "1.0",
    "description": "Explore page data: creators and posts",
    "databaseUrl": "Connected"
  },
  "statistics": {
    "exportedAt": "2026-02-26T...",
    "creators": {
      "total": 150,
      "priority": 3,
      "excluded": ["B_Julia"]
    },
    "posts": {
      "all": 750,
      "paid": 54,
      "premium": 12
    }
  },
  "creators": [
    {
      "id": "...",
      "nickname": "mia-",
      "fullName": "Mima 11",
      "wallet": "...",
      "avatar": "...",
      "bio": "...",
      "subscribersCount": 123,
      "_count": {
        "posts": 45,
        "createdPosts": 45
      }
    },
    // ... остальные криэйторы
  ],
  "posts": {
    "all": [
      {
        "id": "...",
        "content": "...",
        "mediaUrl": "https://fonanastorage.b-cdn.net/...",
        "type": "image",
        "price": 0.02,
        "isSubscription": false,
        "createdAt": "2026-02-26T...",
        "creator": { ... },
        "_count": {
          "likes": 5,
          "comments": 2,
          "purchases": 1
        }
      },
      // ... остальные посты
    ],
    "paid": [ /* платные посты */ ],
    "premium": [ /* подписочные посты */ ]
  }
}
```

## 🚀 Использование

### Ручной запуск
```bash
node export-explore-posts.js
```

### Автоматический запуск (PM2)
Скрипт добавлен в `ecosystem.config.js` и запускается **каждый день в 3:00 утра**:

```bash
# Запустить через PM2
pm2 start ecosystem.config.js --only explore-posts-exporter

# Проверить статус
pm2 status explore-posts-exporter

# Посмотреть логи
pm2 logs explore-posts-exporter

# Остановить
pm2 stop explore-posts-exporter
```

## 📁 Файлы

- **Скрипт**: `export-explore-posts.js`
- **Выходной файл**: `explore_posts.json`
- **Логи** (production):
  - Errors: `/var/www/Fonana/logs/explore-posts-exporter-error.log`
  - Output: `/var/www/Fonana/logs/explore-posts-exporter-out.log`

## 🔄 Cron Schedule

```
0 3 * * *  # Каждый день в 3:00 утра
```

## ⚠️ Важные правила

1. **B_Julia** всегда исключена из списка криэйторов
2. **Приоритетные криэйторы** всегда на первых 3 местах:
   - `@mia-`
   - `@nana`
   - `@-chnytng`
3. **Только CDN медиа** - локальные `/media/...` пути исключены
4. **750 постов максимум** в `posts.all`

## 🛠️ Требования

- Node.js
- Prisma Client
- Доступ к базе данных (через `DATABASE_URL` в `.env`)

## 📝 Примечания

- Скрипт автоматически фильтрует посты без медиа или с локальными путями
- Все криэйторы ранжированы по количеству постов (кроме приоритетных)
- Экспорт включает полную статистику для мониторинга
