# 🔌 Socket.IO Integration Guide

Руководство по интеграции нового Socket.IO сервера в приложение Fonana.

## 📋 Оглавление

1. [Установка и запуск сервера](#установка-и-запуск-сервера)
2. [Интеграция в React приложение](#интеграция-в-react-приложение)
3. [Отправка событий с сервера](#отправка-событий-с-сервера)
4. [Примеры использования](#примеры-использования)
5. [Production deployment](#production-deployment)

---

## 🚀 Установка и запуск сервера

### 1. Установите зависимости

```bash
cd socketio-server
npm install
```

### 2. Настройте переменные окружения

В корневом `.env` файле добавьте:

```env
# Socket.IO Server
SOCKETIO_PORT=3004
```

Остальные переменные (`DATABASE_URL`, `NEXTAUTH_SECRET`, `REDIS_URL`) уже должны быть настроены.

### 3. Запустите сервер

**Development:**
```bash
cd socketio-server
npm run dev
```

**Production:**
```bash
cd socketio-server
npm start
```

Или через PM2:
```bash
pm2 start socketio-server/index.js --name "socketio-server"
```

### 4. Проверьте подключение

Откройте `socketio-server/test-client.html` в браузере и протестируйте подключение.

---

## ⚛️ Интеграция в React приложение

### 1. Создайте хук для Socket.IO

Создайте файл `app/hooks/useSocketIO.ts`:

```typescript
import { useEffect, useState, useCallback } from 'react'
import { socketIOService, SubscriptionChannel } from '@/lib/services/socketio'

export function useSocketIO() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Подключаемся
    socketIOService.connect()

    // События подключения
    const handleConnected = () => setConnected(true)
    const handleDisconnected = () => setConnected(false)

    socketIOService.on('connected', handleConnected)
    socketIOService.on('disconnected', handleDisconnected)

    setConnected(socketIOService.isConnected())

    return () => {
      socketIOService.off('connected', handleConnected)
      socketIOService.off('disconnected', handleDisconnected)
    }
  }, [])

  const subscribe = useCallback((channel: SubscriptionChannel) => {
    socketIOService.subscribe(channel)
  }, [])

  const unsubscribe = useCallback((channel: SubscriptionChannel) => {
    socketIOService.unsubscribe(channel)
  }, [])

  const on = useCallback((event: string, handler: Function) => {
    socketIOService.on(event, handler)
    return () => socketIOService.off(event, handler)
  }, [])

  return { connected, subscribe, unsubscribe, on, service: socketIOService }
}
```

### 2. Используйте в компонентах

**Пример: Уведомления**

```tsx
import { useSocketIO } from '@/hooks/useSocketIO'

export function NotificationsBell({ userId }: { userId: string }) {
  const { connected, subscribe, unsubscribe, on } = useSocketIO()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!connected) return

    subscribe({ type: 'notifications', userId })

    const unsub = on('notification', (data: any) => {
      setCount(prev => prev + 1)
      toast.success('Новое уведомление!')
    })

    return () => {
      unsubscribe({ type: 'notifications', userId })
      unsub()
    }
  }, [connected, userId])

  return (
    <button>
      🔔 {count > 0 && <span className="badge">{count}</span>}
    </button>
  )
}
```

**Пример: Лайки постов**

```tsx
export function PostLikes({ postId, initialLikes }: Props) {
  const { connected, subscribe, unsubscribe, on } = useSocketIO()
  const [likes, setLikes] = useState(initialLikes)

  useEffect(() => {
    if (!connected) return

    subscribe({ type: 'post', postId })

    const unsubLiked = on('post_liked', (data: any) => {
      if (data.postId === postId) {
        setLikes(data.likesCount)
      }
    })

    const unsubUnliked = on('post_unliked', (data: any) => {
      if (data.postId === postId) {
        setLikes(data.likesCount)
      }
    })

    return () => {
      unsubscribe({ type: 'post', postId })
      unsubLiked()
      unsubUnliked()
    }
  }, [connected, postId])

  return <div>❤️ {likes}</div>
}
```

### 3. Добавьте индикатор подключения (опционально)

```tsx
export function ConnectionStatus() {
  const { connected } = useSocketIO()
  
  return (
    <div className={`status ${connected ? 'online' : 'offline'}`}>
      {connected ? '🟢 Online' : '🔴 Offline'}
    </div>
  )
}
```

---

## 📤 Отправка событий с сервера

### Вариант 1: Через API endpoint

Создайте helper функцию `lib/socketio-emit.ts`:

```typescript
import { Server } from 'socket.io'

// В API route
export async function sendNotification(userId: string, notification: any) {
  // Отправляем через Socket.IO сервер
  const io = getSocketIOServerInstance()
  
  io.to(`notifications_${userId}`).emit('notification', {
    type: 'notification',
    userId,
    notification
  })
}

// Пример использования в API route
export async function POST(request: Request) {
  // ... создание уведомления в БД
  
  // Отправляем через Socket.IO
  await sendNotification(userId, notification)
  
  return NextResponse.json({ success: true })
}
```

### Вариант 2: Прямое подключение к Socket.IO серверу

```typescript
import { io } from 'socket.io-client'

// Создайте серверный клиент
const serverClient = io('http://localhost:3004', {
  auth: { token: SERVER_TOKEN }
})

// Отправьте событие
serverClient.emit('broadcast_to_channel', {
  channel: 'notifications_user123',
  event: {
    type: 'notification',
    data: { message: 'Hello!' }
  }
})
```

### Вариант 3: Через Redis Pub/Sub

Если у вас настроен Redis:

```typescript
import { redis } from '@/lib/redis'

// Публикуем событие в Redis
await redis.publish(
  'socketio:notifications_user123',
  JSON.stringify({
    type: 'notification',
    userId: 'user123',
    notification: { message: 'Hello!' }
  })
)
```

Socket.IO сервер автоматически подхватит это событие и отправит клиентам.

---

## 📚 Примеры использования

Полные примеры доступны в `socketio-server/examples/useSocketIO.example.tsx`:

- **NotificationsExample** - Уведомления в реальном времени
- **PostLikesExample** - Обновление счетчика лайков
- **CreatorUpdatesExample** - Обновления от создателей
- **CommentsExample** - Комментарии в реальном времени
- **ConnectionIndicator** - Индикатор статуса подключения

---

## 🚀 Production Deployment

### 1. Настройте Nginx

Добавьте в конфигурацию Nginx:

```nginx
# Socket.IO proxy
location /socket.io/ {
    proxy_pass http://localhost:3004;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Важно для WebSocket
    proxy_read_timeout 86400;
}
```

### 2. Обновите CORS настройки

В `socketio-server/src/server.js`:

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://fonana.me',
      'https://www.fonana.me'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
})
```

### 3. Запустите через PM2

```bash
pm2 start socketio-server/index.js --name "socketio-server"
pm2 save
```

### 4. Обновите клиентский URL

В production клиент будет подключаться через:

```typescript
// lib/services/socketio.ts автоматически определит окружение
// Production: https://fonana.me (через Nginx на порт 3004)
// Development: http://localhost:3004
```

---

## 🔍 Отладка

### Проверка подключений

```bash
# Проверить что сервер запущен
ps aux | grep "socketio-server"

# Проверить открытые порты
lsof -i :3004

# Логи PM2
pm2 logs socketio-server
```

### Тестирование в браузере

```javascript
// В консоли браузера
const socket = io('http://localhost:3004', {
  auth: { token: 'your-jwt-token' }
})

socket.on('connected', (data) => {
  console.log('Connected:', data)
})

socket.emit('subscribe', {
  type: 'notifications',
  userId: 'your-user-id'
})
```

### Debug режим Socket.IO

```javascript
// Браузер
localStorage.debug = 'socket.io-client:*'

// Сервер
DEBUG=socket.io:* npm run dev
```

---

## 🔄 Миграция с WebSocket на Socket.IO

Если вы хотите мигрировать с существующего WebSocket сервера:

1. **Оба сервера могут работать параллельно** (разные порты)
2. **Постепенная миграция компонентов** - переносите по одному
3. **Обратная совместимость** - интерфейсы похожи:

```typescript
// Было (WebSocket)
wsService.subscribeToNotifications(userId)
wsService.on('notification', handler)

// Стало (Socket.IO)
socketIOService.subscribeToNotifications(userId)
socketIOService.on('notification', handler)
```

---

## 📝 Чеклист интеграции

- [ ] Установлены зависимости в `socketio-server/`
- [ ] Настроены переменные окружения
- [ ] Сервер запущен и доступен на порту 3004
- [ ] Создан хук `useSocketIO` в приложении
- [ ] Протестировано подключение через `test-client.html`
- [ ] Интегрировано в компоненты (уведомления, посты, и т.д.)
- [ ] Настроен Nginx для production
- [ ] Добавлен в PM2 для автозапуска
- [ ] Настроены CORS для production доменов

---

## 🆘 Поддержка

Документация:
- **Quick Start**: `socketio-server/QUICKSTART.md`
- **README**: `socketio-server/README.md`
- **Примеры**: `socketio-server/examples/`
- **Тест клиент**: `socketio-server/test-client.html`

Socket.IO документация: https://socket.io/docs/v4/

