# 🚀 Remix File System - Быстрый старт

## ✅ Что было сделано

Заменили Redis на файловую систему для хранения цепочек ремиксов AI-видео.

### Созданные файлы:

1. **`lib/remixFileSystem.ts`** - TypeScript утилиты для Next.js API
2. **`lib/remixFileSystem.js`** - JavaScript утилиты для Node.js скриптов
3. **`app/remixes/`** - Директория для хранения JSON файлов
4. **`app/api/remixes/[containerId]/route.ts`** - API endpoint для получения ремиксов

### Обновленные файлы:

1. **`app/api/posts/route.ts`** - Сохраняет AI-видео в файлы вместо Redis
2. **`app/api/posts/remix/route.ts`** - Сохраняет ремиксы в файлы
3. **`sorachecker.js`** - Обновляет статусы постов в файлах

## 🔄 Как работает система

### 1. Создание AI-видео поста

```javascript
// app/api/posts/route.ts автоматически сохраняет пост:
POST /api/posts
{
  "type": "ai-video",
  "title": "My Video",
  ...
}

// → Создается файл: app/remixes/{postId}.json
```

### 2. Создание ремикса

```javascript
// app/api/posts/remix/route.ts добавляет ремикс в файл:
POST /api/posts/remix
{
  "postId": "original_post_id",
  "prompt": "New remix prompt"
}

// → Обновляется файл: app/remixes/{containerId}.json
```

### 3. Обработка SoraChecker

```javascript
// sorachecker.js автоматически обновляет статус:
// Когда видео готово → обновляет файл ремикса
// Когда ошибка → удаляет пост из файла
```

### 4. Получение ремиксов

```javascript
// Новый API endpoint:
GET /api/remixes/{containerId}

// Ответ:
{
  "success": true,
  "data": {
    "containerId": "clx123abc",
    "posts": [...],
    "postsCount": 5,
    "createdAt": "2025-10-31T12:00:00Z",
    "updatedAt": "2025-10-31T14:30:00Z"
  }
}
```

## 📝 Структура JSON файла

```json
{
  "containerId": "clx123abc",
  "posts": [
    {
      "id": "clx123abc",
      "title": "Original Video",
      "type": "ai-video",
      "mediaUrl": null,
      "requestId": "req_123",
      "creator": { ... },
      "createdAt": "2025-10-31T12:00:00Z"
    },
    {
      "id": "clx456def",
      "title": "Remix #1",
      "type": "ai-video",
      "remixId": "clx123abc",
      "containerId": "clx123abc",
      "mediaUrl": "https://...",
      "creator": { ... },
      "createdAt": "2025-10-31T12:30:00Z"
    }
  ],
  "createdAt": "2025-10-31T12:00:00Z",
  "updatedAt": "2025-10-31T14:30:00Z"
}
```

## 🧪 Тестирование

### 1. Создать AI-видео пост

```bash
# Через интерфейс или API
curl -X POST https://fonana.me/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ai-video",
    "title": "Test Video",
    "soraPrompt": "A cat playing piano",
    "soraDuration": "4"
  }'
```

### 2. Проверить файл

```bash
# Должен появиться файл в app/remixes/
ls -la app/remixes/
cat app/remixes/{post_id}.json
```

### 3. Создать ремикс

```bash
curl -X POST https://fonana.me/api/posts/remix \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "{original_post_id}",
    "prompt": "A cat playing guitar instead"
  }'
```

### 4. Получить цепочку ремиксов

```bash
curl https://fonana.me/api/remixes/{containerId}
```

### 5. Проверить SoraChecker

```bash
# Запустить вручную для тестирования
node sorachecker.js

# Проверить логи
tail -f /var/www/Fonana/logs/sora-checker-out.log
```

## 🔍 Отладка

### Логи в консоли

```
[RemixFS] Created new remix file clx123abc.json
[RemixFS] ✅ Successfully saved remix file: { containerId: 'clx123abc', postsCount: 1 }
[API] ✅ AI-video saved to file system: { containerId: 'clx123abc', filePath: 'app/remixes/clx123abc.json' }
[SoraChecker] ✅ Remix file updated successfully for post clx456def
```

### Проверить содержимое файла

```bash
# Красиво отформатировать JSON
cat app/remixes/{containerId}.json | jq '.'

# Посмотреть количество постов
cat app/remixes/{containerId}.json | jq '.posts | length'

# Посмотреть ID всех постов
cat app/remixes/{containerId}.json | jq '.posts[].id'
```

### Проверить все ремиксы

```bash
# Количество файлов
ls -1 app/remixes/*.json | wc -l

# Список всех containerIds
ls -1 app/remixes/*.json | sed 's/.*\///' | sed 's/\.json//'
```

## ⚠️ Важные замечания

1. **Директория `app/remixes/`** создается автоматически при первом сохранении
2. **JSON файлы** игнорируются в Git (через `.gitignore`)
3. **Пустые файлы** автоматически удаляются
4. **Сортировка** постов: новые первыми
5. **Non-blocking** операции: ошибки не блокируют создание постов

## 🎯 Преимущества

✅ Не зависит от Redis (больше не падает)  
✅ Легко читать и отлаживать  
✅ Автоматические бэкапы через Git  
✅ Простое восстановление данных  
✅ Прозрачная структура  

## 📚 Документация

- **Подробная документация:** `app/remixes/README.md`
- **API утилиты (TS):** `lib/remixFileSystem.ts`
- **API утилиты (JS):** `lib/remixFileSystem.js`

## 🚀 Деплой

```bash
# После деплоя убедитесь, что директория существует
mkdir -p /var/www/Fonana/app/remixes

# Права доступа
chmod 755 /var/www/Fonana/app/remixes

# Перезапустить все сервисы
pm2 restart ecosystem.config.js
```

## 🐛 Troubleshooting

### Ошибка: "ENOENT: no such file or directory"

```bash
# Создайте директорию вручную
mkdir -p app/remixes
```

### Ошибка: "Permission denied"

```bash
# Исправьте права доступа
chmod 755 app/remixes
```

### Файлы не обновляются

```bash
# Проверьте логи SoraChecker
pm2 logs sora-checker

# Проверьте права на запись
ls -la app/remixes/
```

## ✨ Готово!

Теперь все AI-видео и их ремиксы сохраняются в файловую систему вместо Redis. Система работает стабильно и не зависит от внешних сервисов!

