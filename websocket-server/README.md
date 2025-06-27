# Fonana WebSocket Server

Real-time WebSocket сервер для платформы Fonana, обеспечивающий мгновенные обновления уведомлений, постов и других событий.

## Архитектура

```
WebSocket Server (Port 3002)
├── JWT Authentication
├── Channel-based subscriptions
├── Redis Pub/Sub (optional)
└── Event broadcasting
```

## Установка

```bash
cd websocket-server
npm install
```

## Конфигурация

Сервер использует переменные окружения из `../.env`:

- `DATABASE_URL` - подключение к PostgreSQL
- `NEXTAUTH_SECRET` - секрет для JWT токенов
- `REDIS_URL` - подключение к Redis (опционально)
- `WS_PORT` - порт WebSocket сервера (по умолчанию 3002)

## Запуск

### Development
```bash
npm run dev
```

### Production
```bash
npm start
# или через PM2
pm2 start ecosystem.config.js
```

## Тестирование

```bash
# Замените TEST_USER_ID на реальный ID пользователя из БД
node test-client.js
```

## API

### Подключение

```javascript
const ws = new WebSocket('wss://fonana.me/ws?token=YOUR_JWT_TOKEN');
```

### Команды

#### Subscribe
```json
{
  "type": "subscribe",
  "channel": {
    "type": "notifications",
    "userId": "user-id"
  }
}
```

#### Unsubscribe
```json
{
  "type": "unsubscribe",
  "channel": {
    "type": "notifications",
    "userId": "user-id"
  }
}
```

#### Ping
```json
{
  "type": "ping"
}
```

### Каналы

- `notifications` - уведомления пользователя
- `feed` - обновления ленты
- `creator` - обновления создателя
- `post` - обновления конкретного поста

### События

#### Уведомления
- `notification` - новое уведомление
- `notification_read` - уведомление прочитано
- `notifications_cleared` - уведомления очищены
- `unread_notifications` - список непрочитанных

#### Посты
- `post_liked` / `post_unliked` - лайки
- `post_created` / `post_deleted` - управление постами
- `comment_added` / `comment_deleted` - комментарии

#### Создатели
- `creator_updated` - обновление профиля
- `new_subscription` - новая подписка

#### Лента
- `feed_update` - обновление ленты

## Интеграция с Next.js API

Для отправки событий из API endpoints:

```javascript
// В API endpoint
const { sendNotification } = require('../websocket-server/src/events/notifications');

// Отправка уведомления
await sendNotification(userId, {
  type: 'NEW_POST_FROM_SUBSCRIPTION',
  title: 'Новый пост',
  message: 'Создатель опубликовал новый пост'
});
```

## Масштабирование

При использовании нескольких серверов требуется Redis для синхронизации:

1. Установите Redis
2. Укажите `REDIS_URL` в `.env`
3. Запустите несколько экземпляров WebSocket сервера

## Безопасность

- JWT токены для аутентификации
- Проверка прав доступа к каналам
- Rate limiting (TODO)
- Origin validation (TODO)

## Мониторинг

Логи доступны в:
- `logs/ws-out.log` - основные логи
- `logs/ws-error.log` - ошибки
- `logs/ws-combined.log` - все логи

## Структура проекта

```
websocket-server/
├── index.js              # Точка входа
├── src/
│   ├── server.js        # WebSocket сервер
│   ├── auth.js          # JWT аутентификация
│   ├── channels.js      # Управление каналами
│   ├── redis.js         # Redis интеграция
│   ├── db.js            # Prisma клиент
│   └── events/          # Обработчики событий
│       ├── notifications.js
│       ├── posts.js
│       ├── creators.js
│       └── feed.js
├── test-client.js       # Тестовый клиент
├── ecosystem.config.js  # PM2 конфигурация
└── package.json
``` 