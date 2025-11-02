# API Remix Chain - Получение цепочки ремиксов

## Описание

API endpoint для получения цепочки ремиксов, начиная от указанного поста и следуя по цепочке `remixId`.

## Endpoints

### GET `/api/posts/remix?postId={postId}`

Получает цепочку ремиксов, начиная от указанного поста.

#### Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `postId` | string | Да | ID поста, от которого начинать построение цепочки ремиксов |

#### Логика работы

1. Принимает `postId` как стартовую точку
2. **Двунаправленный поиск**:
   - Ищет все посты, у которых `remixId == postId` (кто ремиксит данный пост)
   - Если у текущего поста есть `remixId`, добавляет этот пост в поиск (что ремиксит данный пост)
3. **Рекурсивное расширение**: Для каждого найденного поста повторяет процесс поиска
4. **Защита от дубликатов**: Использует `Map` и `Set` для предотвращения повторного добавления постов
5. **Защита от циклов**: Отслеживает уже обработанные посты
6. **Сортировка**: Возвращает все связанные посты, отсортированные по дате создания

#### Пример запроса

```bash
GET /api/posts/remix?postId=post-123
```

#### Пример ответа

```json
{
  "success": true,
  "data": {
    "startPostId": "post-123",
    "chain": [
      {
        "id": "post-456",
        "title": "Первый ремикс",
        "content": "Содержимое первого ремикса",
        "type": "video",
        "category": "entertainment",
        "thumbnail": "https://example.com/thumb1.jpg",
        "mediaUrl": "https://example.com/video1.mp4",
        "requestId": "req-123",
        "isLocked": false,
        "minSubscriptionTier": null,
        "remixId": "post-123",
        "createdAt": "2025-10-22T10:00:00Z",
        "updatedAt": "2025-10-22T10:00:00Z",
        "creator": {
          "id": "user-1",
          "nickname": "creator1",
          "avatar": "https://example.com/avatar1.jpg",
          "fullName": "Creator One"
        },
        "likesCount": 25,
        "commentsCount": 5
      },
      {
        "id": "post-789",
        "title": "Второй ремикс",
        "content": "Содержимое второго ремикса",
        "type": "video",
        "category": "entertainment",
        "thumbnail": "https://example.com/thumb2.jpg",
        "mediaUrl": "https://example.com/video2.mp4",
        "requestId": "req-456",
        "isLocked": false,
        "minSubscriptionTier": null,
        "remixId": "post-456",
        "createdAt": "2025-10-22T11:00:00Z",
        "updatedAt": "2025-10-22T11:00:00Z",
        "creator": {
          "id": "user-2",
          "nickname": "creator2",
          "avatar": "https://example.com/avatar2.jpg",
          "fullName": "Creator Two"
        },
        "likesCount": 15,
        "commentsCount": 3
      }
    ],
    "totalCount": 2
  }
}
```

#### Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `success` | boolean | Статус успешности запроса |
| `data.startPostId` | string | ID поста, от которого началось построение цепочки |
| `data.chain` | array | Массив ремиксов в хронологическом порядке |
| `data.totalCount` | number | Общее количество ремиксов в цепочке |

#### Структура поста в цепочке

Каждый пост в цепочке содержит:

- `id` - ID поста
- `title` - Заголовок поста
- `content` - Содержимое поста
- `type` - Тип поста (video, image, text, etc.)
- `category` - Категория поста
- `thumbnail` - URL превью
- `mediaUrl` - URL медиа файла
- `requestId` - ID запроса для AI генерации
- `isLocked` - Заблокирован ли пост
- `minSubscriptionTier` - Минимальный уровень подписки
- `remixId` - ID поста, который ремиксит данный пост
- `createdAt` - Дата создания
- `updatedAt` - Дата обновления
- `creator` - Информация о создателе
- `likesCount` - Количество лайков
- `commentsCount` - Количество комментариев

#### Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Отсутствует обязательный параметр `postId` |
| 500 | Внутренняя ошибка сервера |

#### Особенности алгоритма

1. **Защита от циклических ссылок**: Использует `Set` для отслеживания уже посещенных постов
2. **Хронологический порядок**: Если есть несколько ремиксов одного поста, выбирается первый по времени создания
3. **Полная информация**: Каждый пост в цепочке содержит полную информацию, включая данные о создателе и статистику

#### Примеры использования

##### Получение цепочки ремиксов для конкретного поста
```bash
curl "http://localhost:3000/api/posts/remix?postId=your-post-id"
```

##### Пример полной цепочки ремиксов
```
Post A (original, no remixId)
  ↓ 
Post B (remixId: "post-a-id")
  ↓
Post C (remixId: "post-b-id")
  ↓
Post D (remixId: "post-c-id")
```

При запросе `/api/posts/remix?postId=post-b-id` (любой пост из цепочки) вернется **вся связанная цепочка**:
```json
{
  "success": true,
  "data": {
    "startPostId": "post-b-id",
    "chain": [
      { "id": "post-a-id", "remixId": null, "createdAt": "2025-01-01T10:00:00Z", ... },
      { "id": "post-b-id", "remixId": "post-a-id", "createdAt": "2025-01-01T11:00:00Z", ... },
      { "id": "post-c-id", "remixId": "post-b-id", "createdAt": "2025-01-01T12:00:00Z", ... },
      { "id": "post-d-id", "remixId": "post-c-id", "createdAt": "2025-01-01T13:00:00Z", ... }
    ],
    "totalCount": 4
  }
}
```

**Ключевая особенность**: Независимо от того, какой пост из цепочки вы запросите, API вернет **всю связанную цепочку**, включая оригинальный пост и все ремиксы.

## Тестирование

Для тестирования API создан файл `test-remix-chain.html`:

1. Запустите сервер разработки: `npm run dev`
2. Откройте в браузере: `http://localhost:3000/test-remix-chain.html`
3. Используйте интерфейс для тестирования различных сценариев

### POST `/api/posts/remix` (создание ремикса)

Существующий endpoint для создания нового поста-ремикса остается без изменений.

## Интеграция с фронтендом

API предназначен для использования в компонентах отображения ремиксов:
- Карусели ремиксов
- Списки связанных постов  
- Навигация по цепочке ремиксов
- Аналитика популярности контента
