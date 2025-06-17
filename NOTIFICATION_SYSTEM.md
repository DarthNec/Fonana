# Система звуковых уведомлений

## Обзор

Реализована система звуковых уведомлений с приятными ASMR-звуками для оповещения пользователей о:
- Лайках на посты и комментарии
- Новых комментариях и ответах
- Новых подписчиках
- Покупках постов
- Новых постах от подписок

## Архитектура

### База данных

Добавлена модель `Notification`:
```prisma
model Notification {
  id            String   @id @default(cuid())
  userId        String
  type          NotificationType
  title         String
  message       String
  isRead        Boolean  @default(false)
  metadata      Json?    // Дополнительные данные (postId, commentId, etc)
  createdAt     DateTime @default(now())
  
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum NotificationType {
  LIKE_POST
  LIKE_COMMENT
  COMMENT_POST
  REPLY_COMMENT
  NEW_SUBSCRIBER
  POST_PURCHASE
  NEW_POST_FROM_SUBSCRIPTION
}
```

### API Endpoints

- `GET /api/user/notifications` - получить уведомления пользователя
- `PUT /api/user/notifications` - пометить как прочитанные
- `DELETE /api/user/notifications` - удалить уведомления

### Компоненты

1. **NotificationContext** (`lib/contexts/NotificationContext.tsx`)
   - Управляет состоянием уведомлений
   - Polling каждые 30 секунд для получения новых
   - Воспроизведение звуков

2. **NotificationsDropdown** (`components/NotificationsDropdown.tsx`)
   - Выпадающее меню в навбаре
   - Показывает список уведомлений
   - Управление прочитанными/непрочитанными

### Звуковые эффекты

Два типа звуков в `public/sounds/`:
- `notification-single.mp3` - для одного уведомления
- `notification-trill.mp3` - для нескольких уведомлений (трель)

## Интеграция

Уведомления создаются автоматически при:

1. **Лайках постов** (`api/posts/[id]/like/route.ts`)
2. **Комментариях** (`api/posts/[id]/comments/route.ts`)
3. **Новых подписках** (`api/subscriptions/process-payment/route.ts`)
4. **Создании постов** (`lib/db.ts` - функция `createPost`)

## Настройки пользователя

Уведомления учитывают настройки из `UserSettings`:
- `notifyComments` - уведомления о комментариях
- `notifyLikes` - уведомления о лайках
- `notifyNewPosts` - уведомления о новых постах
- `notifyNewSubscriptions` - уведомления о подписчиках

## Использование

### Для разработчиков

```typescript
// Создать уведомление о лайке
await notifyPostLike(postOwnerId, likerName, postTitle, postId)

// Создать уведомление о комментарии
await notifyNewComment(postOwnerId, commenterName, postTitle, postId, commentId)

// Получить уведомления в компоненте
const { notifications, unreadCount, markAsRead } = useNotifications()
```

### Для пользователей

1. Колокольчик в навбаре показывает количество непрочитанных
2. Клик открывает список уведомлений
3. Звук воспроизводится при получении новых
4. Можно отметить как прочитанные или удалить

## Рекомендации по звукам

Замените файлы-заглушки на настоящие ASMR-звуки:
- Длительность: 0.5-1 секунда для одиночного, 1-2 секунды для трели
- Громкость: Мягкая и ненавязчивая
- Стиль: ASMR-подобный, успокаивающий
- Формат: MP3, 128kbps или выше

## Дальнейшие улучшения

1. WebSocket для real-time уведомлений вместо polling
2. Push-уведомления в браузере
3. Email уведомления для важных событий
4. Группировка похожих уведомлений
5. Настройка громкости звука пользователем 