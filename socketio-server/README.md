# Fonana Socket.IO Server

Отдельный Socket.IO сервер для платформы Fonana, работающий независимо от основного WebSocket сервера.

## Установка

```bash
cd socketio-server
npm install
```

## Конфигурация

Сервер использует переменные окружения из `../.env`:

- `SOCKETIO_PORT` - порт Socket.IO сервера (по умолчанию 3004)
- `DATABASE_URL` - подключение к PostgreSQL
- `NEXTAUTH_SECRET` - секрет для JWT токенов
- `REDIS_URL` - подключение к Redis (опционально)

## Запуск

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Использование на клиенте

```typescript
import { io } from 'socket.io-client';

// Подключение
const socket = io('http://localhost:3004', {
  auth: {
    token: 'your-jwt-token'
  }
});

// События
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// Подписка на канал
socket.emit('subscribe', {
  type: 'notifications',
  userId: 'user-id'
});

// Получение событий
socket.on('notification', (data) => {
  console.log('New notification:', data);
});
```

## API

### События от клиента к серверу

#### subscribe
Подписаться на канал обновлений.

```javascript
socket.emit('subscribe', {
  type: 'notifications', // или 'creator', 'feed', 'post'
  userId: 'user-id'      // или id, postId в зависимости от type
});
```

#### unsubscribe
Отписаться от канала.

```javascript
socket.emit('unsubscribe', {
  type: 'notifications',
  userId: 'user-id'
});
```

#### ping
Проверка соединения.

```javascript
socket.emit('ping');
```

### События от сервера к клиенту

#### connected
Подтверждение успешного подключения.

```javascript
socket.on('connected', (data) => {
  // data: { userId: string, message: string }
});
```

#### subscribed
Подтверждение подписки на канал.

```javascript
socket.on('subscribed', (data) => {
  // data: { channel: string, success: boolean }
});
```

#### unsubscribed
Подтверждение отписки от канала.

```javascript
socket.on('unsubscribed', (data) => {
  // data: { channel: string, success: boolean }
});
```

#### pong
Ответ на ping.

```javascript
socket.on('pong', () => {
  // Соединение живо
});
```

#### notification
Новое уведомление.

```javascript
socket.on('notification', (data) => {
  // data: { type: 'notification', userId: string, notification: any }
});
```

## Архитектура

```
Socket.IO Server (Port 3004)
├── HTTP Server
├── Socket.IO Server
│   ├── CORS настройки
│   ├── JWT Authentication middleware
│   ├── Rooms (каналы подписок)
│   └── Event broadcasting
├── Redis Pub/Sub (optional)
└── Prisma Database
```

## Отличия от WebSocket сервера

- **Socket.IO** вместо нативного WebSocket
- **Автоматическое переподключение** из коробки
- **Binary support** для передачи файлов
- **Комнаты (rooms)** для группировки клиентов
- **Упрощенная работа с событиями** через emit/on
- **Fallback на polling** если WebSocket недоступен

## Тестирование

Можно протестировать подключение через браузерную консоль:

```javascript
const socket = io('http://localhost:3004', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.emit('subscribe', {
  type: 'notifications',
  userId: 'your-user-id'
});
```

