# Remix File System - Хранение цепочек ремиксов AI-видео

## 📋 Описание

Вместо Redis для хранения цепочек ремиксов AI-видео используется файловая система. Каждый ремикс-контейнер хранится в отдельном JSON файле в директории `app/remixes/`.

## 📂 Структура

```
app/remixes/
├── {containerId1}.json
├── {containerId2}.json
└── {containerId3}.json
```

Где `containerId` - это ID оригинального поста, к которому привязаны все ремиксы.

## 📄 Формат JSON файла

```json
{
  "containerId": "clx123abc",
  "posts": [
    {
      "id": "clx123abc",
      "title": "Original AI Video",
      "type": "ai-video",
      "mediaUrl": "https://...",
      "requestId": "req_abc123",
      "createdAt": "2025-10-31T12:00:00Z",
      "creator": {
        "id": "user123",
        "name": "Creator Name",
        "username": "creator",
        "avatar": "https://..."
      },
      "likes": 10,
      "comments": 5,
      "access": { ... },
      "media": { ... }
    },
    {
      "id": "clx456def",
      "title": "Remix #1",
      "type": "ai-video",
      "remixId": "clx123abc",
      "containerId": "clx123abc",
      ...
    }
  ],
  "createdAt": "2025-10-31T12:00:00Z",
  "updatedAt": "2025-10-31T14:30:00Z"
}
```

## 🔧 API Endpoints

### 1. Сохранение ремикса (автоматически)

**Когда:** При создании AI-видео поста или ремикса

**Код:** В `app/api/posts/route.ts` и `app/api/posts/remix/route.ts`

```typescript
import { saveRemixToFile } from '@/lib/remixFileSystem'

// Сохранение поста в файл
await saveRemixToFile(containerId, fullPostData)
```

**Логика:**
- Если файл существует → добавляет пост в массив `posts`
- Если файла нет → создает новый файл с одним постом
- Автоматически сортирует посты по дате (новые первыми)
- Обновляет поле `updatedAt`

### 2. Получение ремиксов

**Endpoint:** `GET /api/remixes/[containerId]`

**Пример:**
```bash
curl https://fonana.me/api/remixes/clx123abc
```

**Ответ:**
```json
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

## 📚 Утилиты в `lib/remixFileSystem.ts`

### `saveRemixToFile(containerId, post)`
Создает или обновляет файл ремикса. Добавляет новый пост или обновляет существующий.

```typescript
const saved = await saveRemixToFile('clx123abc', postData)
if (saved) {
  console.log('✅ Remix saved!')
}
```

### `getRemixFromFile(containerId)`
Получает данные ремикса из файла.

```typescript
const remixData = await getRemixFromFile('clx123abc')
if (remixData) {
  console.log('Posts:', remixData.posts.length)
}
```

### `deletePostFromRemix(containerId, postId)`
Удаляет конкретный пост из ремикса. Если постов не осталось, удаляет файл.

```typescript
const deleted = await deletePostFromRemix('clx123abc', 'clx456def')
```

### `updatePostInRemix(containerId, postId, updates)`
Обновляет данные поста в ремиксе (например, после завершения генерации).

```typescript
await updatePostInRemix('clx123abc', 'clx456def', {
  mediaUrl: 'https://new-url.com',
  type: 'video'
})
```

### `getAllRemixes()`
Получает список всех containerIds с ремиксами.

```typescript
const containerIds = await getAllRemixes()
// ['clx123abc', 'clx789ghi', ...]
```

## 🔄 Интеграция с Sora Checker

Когда `sorachecker.js` завершает генерацию видео, он может обновить статус поста в файле:

```javascript
const { updatePostInRemix } = require('./lib/remixFileSystem')

// После успешной загрузки видео
await updatePostInRemix(containerId, postId, {
  mediaUrl: bunnyUrl,
  type: 'video', // Меняем с ai-video на video
  status: 'completed'
})
```

## 🎯 Преимущества файловой системы

1. **Надежность:** Не зависит от Redis, данные не теряются при падении сервера
2. **Простота:** Легко читать и отлаживать - можно открыть JSON в любом редакторе
3. **Бэкапы:** Легко делать резервные копии - просто копировать папку
4. **Версионность:** Можно отслеживать изменения через Git
5. **Производительность:** Для небольшого количества ремиксов быстрее чем Redis
6. **Debugging:** Прозрачная структура данных

## ⚠️ Важные моменты

1. **Синхронность:** Все операции с файлами - синхронные (fs.readFileSync, fs.writeFileSync)
2. **Конкурентность:** При высокой нагрузке возможны race conditions
3. **Размер файлов:** Для больших цепочек (>100 ремиксов) файлы могут стать большими
4. **Кеширование:** Рассмотреть кеширование в памяти для часто запрашиваемых ремиксов

## 🔒 Безопасность

- Директория `app/remixes/` не доступна напрямую через URL
- Доступ только через API endpoint `/api/remixes/[containerId]`
- Валидация containerId при чтении файлов

## 📊 Мониторинг

Логи содержат информацию о всех операциях:

```
[RemixFS] Created new remix file clx123abc.json
[RemixFS] ✅ Successfully saved remix file: { containerId: 'clx123abc', postsCount: 1 }
[RemixFS] Added new post to clx123abc.json
[RemixFS] ✅ Successfully loaded remix file: { containerId: 'clx123abc', postsCount: 5 }
```

## 🚀 Миграция с Redis

Если у вас есть данные в Redis, создайте скрипт для миграции:

```javascript
const redis = require('./app/api/redis/redisClient')
const { saveRemixToFile } = require('./lib/remixFileSystem')

async function migrateFromRedis() {
  // Получить все ключи remix_chain:*
  const keys = await redis.keys('remix_chain:*')
  
  for (const key of keys) {
    const containerId = key.replace('remix_chain:', '')
    const data = await redis.get(key)
    const posts = JSON.parse(data)
    
    // Сохранить каждый пост в файл
    for (const post of posts) {
      await saveRemixToFile(containerId, post)
    }
  }
}
```

## 📝 TODO

- [ ] Добавить индексацию для быстрого поиска
- [ ] Реализовать автоочистку старых ремиксов
- [ ] Добавить сжатие для больших файлов
- [ ] Рассмотреть SQLite для масштабирования

