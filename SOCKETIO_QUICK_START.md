# ⚡ Socket.IO - Быстрый старт

## 🎯 Что создано

✅ **Полностью независимый Socket.IO сервер** (отдельно от WebSocket сервера)
- Порт: **3004**
- JWT аутентификация
- Redis поддержка (опционально)
- Комнаты/каналы для подписок

✅ **Клиентский сервис** для React приложения
- `lib/services/socketio.ts`
- Автопереподключение
- Типизированные события

✅ **Документация и примеры**
- Quickstart guide
- HTML тестовый клиент
- React примеры использования

---

## 🚀 Запуск за 3 шага

### 1. Установите зависимости

```bash
cd socketio-server
npm install
```

### 2. Запустите сервер

```bash
npm run dev
```

Вы увидите:
```
✅ Socket.IO server started on port 3004
📡 Waiting for connections...
```

### 3. Протестируйте

Откройте в браузере: `socketio-server/test-client.html`

**Получение JWT токена:**

Откройте консоль на http://localhost:3000:
```javascript
// Способ 1: Через AuthService
import { authService } from './lib/services/AuthService'
authService.getToken().then(console.log)

// Способ 2: Через session API
fetch('/api/auth/session').then(r => r.json()).then(console.log)
```

Скопируйте токен и вставьте в тестовый клиент.

---

## 💻 Использование в React

### Базовое подключение

```typescript
import { socketIOService } from '@/lib/services/socketio'

// В компоненте
useEffect(() => {
  socketIOService.connect()
  
  socketIOService.on('connected', () => {
    console.log('Connected!')
  })
  
  return () => socketIOService.disconnect()
}, [])
```

### Подписка на уведомления

```typescript
useEffect(() => {
  // Подписаться
  socketIOService.subscribeToNotifications(userId)
  
  // Слушать события
  socketIOService.on('notification', (data) => {
    console.log('New notification:', data)
  })
  
  // Отписаться при размонтировании
  return () => {
    socketIOService.unsubscribeFromNotifications(userId)
  }
}, [userId])
```

### Обновление лайков в реальном времени

```typescript
useEffect(() => {
  socketIOService.subscribeToPost(postId)
  
  socketIOService.on('post_liked', (data) => {
    setLikesCount(data.likesCount)
  })
  
  return () => socketIOService.unsubscribeFromPost(postId)
}, [postId])
```

---

## 📂 Структура файлов

```
socketio-server/
├── index.js                 # Точка входа
├── package.json            # Зависимости
├── src/
│   ├── server.js           # Socket.IO сервер
│   ├── auth.js             # JWT аутентификация
│   ├── db.js               # Prisma клиент
│   └── redis.js            # Redis Pub/Sub
├── test-client.html        # HTML тестовый клиент
├── examples/
│   └── useSocketIO.example.tsx  # React примеры
├── README.md               # Полная документация
└── QUICKSTART.md          # Детальный быстрый старт

lib/services/
└── socketio.ts            # Клиентский сервис

Корень проекта:
├── SOCKETIO_INTEGRATION.md    # Полное руководство
└── SOCKETIO_QUICK_START.md    # Этот файл
```

---

## 🔧 Настройка окружения

В корневом `.env` добавьте (если еще нет):

```env
SOCKETIO_PORT=3004
```

Остальные переменные уже должны быть настроены:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `REDIS_URL` (опционально)

---

## 📡 Доступные каналы подписки

| Канал | Описание | Пример |
|-------|----------|--------|
| `notifications` | Уведомления пользователя | `{ type: 'notifications', userId: '123' }` |
| `feed` | Лента постов пользователя | `{ type: 'feed', userId: '123' }` |
| `creator` | Обновления создателя | `{ type: 'creator', id: '123' }` |
| `post` | Обновления конкретного поста | `{ type: 'post', postId: '123' }` |

---

## 🎪 Типы событий

### Уведомления
- `notification` - Новое уведомление
- `notification_read` - Уведомление прочитано
- `notifications_cleared` - Все уведомления очищены

### Посты
- `post_created` - Новый пост создан
- `post_deleted` - Пост удален
- `post_liked` - Пост получил лайк
- `post_unliked` - Лайк убран

### Комментарии
- `comment_added` - Новый комментарий
- `comment_deleted` - Комментарий удален

### Создатели
- `creator_updated` - Данные создателя обновлены
- `new_subscription` - Новая подписка
- `subscription_cancelled` - Подписка отменена
- `earnings_updated` - Обновление заработка
- `flash_sale_created` - Новая flash sale
- `flash_sale_ended` - Flash sale завершена

---

## 🐛 Отладка

**Проверить что сервер запущен:**
```bash
# Windows
netstat -ano | findstr :3004

# Linux/Mac
lsof -i :3004
```

**Включить детальное логирование:**

В браузере (консоль):
```javascript
localStorage.debug = 'socket.io-client:*'
```

В сервере:
```bash
DEBUG=socket.io:* npm run dev
```

---

## 📖 Дополнительная документация

- **Детальный старт**: `socketio-server/QUICKSTART.md`
- **Полная документация**: `socketio-server/README.md`
- **Интеграция**: `SOCKETIO_INTEGRATION.md`
- **Примеры кода**: `socketio-server/examples/`

---

## ⚡ Преимущества Socket.IO

✅ **Автоматическое переподключение** - не нужно писать логику вручную  
✅ **Fallback транспорты** - работает даже без WebSocket  
✅ **Комнаты из коробки** - простая система подписок  
✅ **Бинарные данные** - можно передавать файлы  
✅ **TypeScript поддержка** - типизированные события  
✅ **Отличная документация** - socket.io/docs  

---

## 🎯 Следующие шаги

1. ✅ Запустите сервер: `cd socketio-server && npm run dev`
2. ✅ Протестируйте через `test-client.html`
3. ✅ Интегрируйте в компоненты (см. примеры)
4. ✅ Настройте production (Nginx + PM2)

Успешной интеграции! 🚀

