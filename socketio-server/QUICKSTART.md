# 🚀 Быстрый старт Socket.IO сервера

## Установка и запуск

### 1. Установите зависимости

```bash
cd socketio-server
npm install
```

### 2. Проверьте конфигурацию

Убедитесь что в `../.env` есть необходимые переменные:

```env
# Порт Socket.IO сервера
SOCKETIO_PORT=3004

# База данных
DATABASE_URL="postgresql://fonana_user:fonana_pass@localhost:5432/fonana"

# Секрет для JWT (должен совпадать с основным приложением)
NEXTAUTH_SECRET="ваш-секрет"

# Redis (опционально)
REDIS_URL="redis://localhost:6379"
```

### 3. Запустите сервер

**Development режим (с автоперезагрузкой):**
```bash
npm run dev
```

**Production режим:**
```bash
npm start
```

Вы должны увидеть:
```
✅ Environment variables loaded
✅ Prisma initialized
✅ Socket.IO server started on port 3004
📡 Waiting for connections...
🌐 Connect to: http://localhost:3004
```

### 4. Тестирование

Откройте в браузере `test-client.html`:

```bash
# В корне socketio-server/
open test-client.html
# или просто откройте файл двойным кликом
```

**Получение JWT токена:**

1. Откройте приложение Fonana в браузере
2. Откройте консоль разработчика (F12)
3. Выполните:
```javascript
// Получить токен NextAuth
fetch('/api/auth/session').then(r => r.json()).then(console.log)

// Или если используете AuthService
import { authService } from '@/lib/services/AuthService'
authService.getToken().then(console.log)
```

4. Скопируйте токен и вставьте в тестовый клиент

## Использование в React приложении

### Подключение к Socket.IO

```typescript
import { socketIOService } from '@/lib/services/socketio'

// В компоненте или хуке
useEffect(() => {
  // Подключаемся
  socketIOService.connect()
  
  // Слушаем события подключения
  socketIOService.on('connected', () => {
    console.log('Socket.IO connected!')
  })
  
  // Cleanup при размонтировании
  return () => {
    socketIOService.disconnect()
  }
}, [])
```

### Подписка на уведомления

```typescript
import { socketIOService } from '@/lib/services/socketio'

// Подписаться на уведомления
socketIOService.subscribeToNotifications(userId)

// Слушать уведомления
socketIOService.on('notification', (data) => {
  console.log('New notification:', data)
  // Обновить UI, показать уведомление, и т.д.
})

// Отписаться при размонтировании
useEffect(() => {
  return () => {
    socketIOService.unsubscribeFromNotifications(userId)
  }
}, [userId])
```

### Подписка на обновления постов

```typescript
// Подписаться на конкретный пост
socketIOService.subscribeToPost(postId)

// Слушать лайки
socketIOService.on('post_liked', (data) => {
  console.log('Post liked:', data)
  // Обновить счетчик лайков
})

// Слушать комментарии
socketIOService.on('comment_added', (data) => {
  console.log('New comment:', data)
  // Добавить комментарий в список
})
```

### Подписка на создателя

```typescript
// Подписаться на обновления создателя
socketIOService.subscribeToCreator(creatorId)

// Слушать новые посты
socketIOService.on('post_created', (data) => {
  console.log('New post from creator:', data)
})

// Слушать flash sales
socketIOService.on('flash_sale_created', (data) => {
  console.log('Flash sale started:', data)
})
```

## Отправка событий с сервера

В вашем API или серверном коде вы можете отправлять события пользователям:

```typescript
// В API route или серверном коде
import { io } from 'socket.io-client'

// Подключиться к Socket.IO серверу
const adminSocket = io('http://localhost:3004', {
  auth: { token: serverToken }
})

// Отправить уведомление конкретному пользователю
adminSocket.emit('send_to_user', {
  userId: 'user-id',
  event: {
    type: 'notification',
    data: {
      message: 'У вас новое уведомление!'
    }
  }
})

// Broadcast в канал
adminSocket.emit('broadcast_to_channel', {
  channel: 'creator_123',
  event: {
    type: 'post_created',
    data: {
      post: { /* данные поста */ }
    }
  }
})
```

## Проверка состояния

```typescript
// Проверить подключение
socketIOService.isConnected() // true/false

// Получить статистику
const stats = socketIOService.getStats()
console.log(stats)
// {
//   connected: true,
//   socketId: 'abc123',
//   reconnectAttempts: 0,
//   subscribedChannels: 3,
//   listeners: { notification: 2, post_liked: 1 }
// }
```

## Отличия от WebSocket сервера

| Функция | WebSocket (ws) | Socket.IO |
|---------|----------------|-----------|
| Автопереподключение | Ручное | Автоматическое |
| Fallback транспорты | Нет | Polling, WebSocket |
| Комнаты/каналы | Ручная реализация | Встроенные |
| События | JSON сообщения | Типизированные события |
| Бинарные данные | Ручная обработка | Автоматическая |
| Ping/Pong | Ручное | Автоматическое |

## Отладка

**Включить подробное логирование Socket.IO:**

В браузере (консоль):
```javascript
localStorage.debug = 'socket.io-client:*'
```

В Node.js:
```bash
DEBUG=socket.io:* npm run dev
```

**Проверить открытые соединения:**
```bash
# Linux/Mac
lsof -i :3004

# Windows
netstat -ano | findstr :3004
```

## Частые проблемы

### ❌ Connection refused
- Проверьте что сервер запущен: `npm run dev`
- Проверьте порт в URL: `http://localhost:3004`

### ❌ Authentication error
- Проверьте что JWT токен валидный
- Проверьте что `NEXTAUTH_SECRET` совпадает с основным приложением

### ❌ CORS errors
- Добавьте ваш домен в `cors.origin` в `src/server.js`

### ❌ Events not received
- Проверьте что вы подписались на канал через `subscribe()`
- Проверьте что событие правильно отправляется с сервера
- Проверьте имя события (case-sensitive)

