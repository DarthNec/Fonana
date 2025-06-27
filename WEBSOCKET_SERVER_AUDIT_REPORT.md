# Аудит серверной инфраструктуры Fonana для WebSocket-слоя

**Дата аудита:** 30 декабря 2024  
**Автор:** AI Assistant  
**Цель:** Оценка готовности серверной части для полноценного real-time слоя через WebSocket

## Резюме

**Общая готовность: 30%**
- ✅ Клиентская часть: 100% готова
- ✅ Nginx конфигурация: 90% готова  
- ❌ WebSocket сервер: 0% (отсутствует)
- ❌ Маршрутизация событий: 0% (требует реализации)
- ❌ Масштабирование: 0% (нет Redis)

**Время на реализацию: 7-10 дней**

## Фаза 1: Аудит текущего состояния

### ✅ Что уже готово

#### 1. Клиентская часть WebSocket (100% готова)
- **Файл:** `lib/services/websocket.ts`
- **Функциональность:**
  - Автоматическое подключение к `/ws`
  - Reconnect с exponential backoff (max 5 попыток)
  - Очередь сообщений для offline режима
  - Throttling событий (100мс интервал)
  - Поддержка всех необходимых каналов:
    - `creator` - обновления создателя
    - `notifications` - уведомления пользователя
    - `feed` - обновления ленты
    - `post` - обновления конкретного поста

#### 2. Nginx конфигурация (90% готова)
```nginx
# Файл: nginx-fonana-production.conf
location / {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    # ... остальные настройки
}

# WebSocket configuration (if needed)
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
```
**Требуется только:** добавить location /ws для проксирования на WebSocket сервер

#### 3. Интеграции на клиенте
- **NotificationContext** - автоматическая подписка на уведомления
- **useRealtimePosts** - real-time обновления постов
- **RealtimePostsContainer** - обертка для ленты с real-time
- **Демо страница:** `/test/realtime-demo`

### ❌ Что отсутствует

#### 1. WebSocket сервер
- Нет серверной реализации WebSocket
- Нет зависимостей (ws, socket.io) в package.json
- Нет API роутов для WebSocket в Next.js
- PM2 запускает только Next.js процесс

#### 2. Аутентификация WebSocket
- Нет middleware для проверки JWT токенов
- Нет привязки соединений к пользователям
- Нет изоляции каналов по правам доступа

#### 3. Маршрутизация событий
- Нет обработчиков для:
  - `subscribe/unsubscribe` команд
  - Broadcast событий подписчикам
  - Фильтрации событий по каналам
- Нет интеграции с существующими API endpoints

#### 4. Инфраструктура масштабирования
- Нет Redis для pub/sub между процессами
- Нет механизма синхронизации состояния
- PM2 настроен на single instance

## Фаза 2: Требования vs Реальность

### ✅ Соответствует требованиям

| Компонент | Требование | Статус |
|-----------|------------|--------|
| Формат событий | JSON с type и data | ✅ Готов |
| Каналы | creator, notifications, feed, post | ✅ Готовы |
| Reconnect | Автоматическое переподключение | ✅ Готов |
| Offline очередь | Накопление сообщений | ✅ Готова |
| Throttling | Защита от частых событий | ✅ Готов |

### ❌ Требует реализации

| Компонент | Требование | Что нужно |
|-----------|------------|-----------|
| WebSocket endpoint | wss://fonana.me/ws | Создать сервер |
| JWT Auth | Проверка токенов | Middleware |
| События | 15+ типов событий | Handlers |
| Broadcast | Рассылка подписчикам | Логика каналов |
| Персистентность | Сохранение состояния | Redis/DB |

## Фаза 3: План внедрения

### Архитектура решения

```
┌─────────────┐     HTTPS/WSS    ┌─────────────┐
│   Browser   │ ◄──────────────► │    Nginx    │
│  (Client)   │                   │   (:443)    │
└─────────────┘                   └──────┬──────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                          │
                    ▼ /api/*                          ▼ /ws    │
            ┌──────────────┐                   ┌──────────────┐
            │   Next.js    │                   │  WebSocket   │
            │   (:3000)    │◄─────Redis────►   │   Server     │
            └──────┬───────┘    Pub/Sub        │   (:3002)    │
                   │                           └──────┬───────┘
                   │                                  │
                   └────────────┬─────────────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │  PostgreSQL  │
                        │   Database   │
                        └──────────────┘
```

### Вариант реализации: Отдельный WebSocket сервер (Рекомендуемый)

#### Структура проекта
```
websocket-server/
├── package.json
├── index.js              # Главный файл сервера
├── src/
│   ├── server.js        # WebSocket сервер
│   ├── auth.js          # JWT аутентификация
│   ├── channels.js      # Управление каналами
│   ├── events/
│   │   ├── notifications.js
│   │   ├── posts.js
│   │   ├── creators.js
│   │   └── feed.js
│   ├── redis.js         # Redis клиент
│   └── db.js            # Prisma клиент
└── ecosystem.config.js  # PM2 конфигурация
```

#### Примерная реализация
```javascript
// websocket-server/src/server.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('./auth');
const { handleSubscribe, handleUnsubscribe } = require('./channels');

const wss = new WebSocket.Server({ port: 3002 });

wss.on('connection', async (ws, req) => {
  // Аутентификация через query параметр или header
  const token = extractToken(req);
  const user = await verifyToken(token);
  
  if (!user) {
    ws.close(1008, 'Unauthorized');
    return;
  }
  
  ws.userId = user.id;
  ws.subscriptions = new Set();
  
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    switch(data.type) {
      case 'subscribe':
        handleSubscribe(ws, data.channel);
        break;
      case 'unsubscribe':
        handleUnsubscribe(ws, data.channel);
        break;
      // ... другие команды
    }
  });
  
  ws.on('close', () => {
    // Очистка подписок
  });
});
```

### Этапы внедрения

#### Этап 1: Подготовка инфраструктуры (1-2 дня)
1. **Установка зависимостей:**
   ```bash
   cd /var/www/fonana
   mkdir websocket-server
   cd websocket-server
   npm init -y
   npm install ws jsonwebtoken redis @prisma/client
   ```

2. **Обновление PM2 конфигурации:**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [
       {
         name: 'fonana',
         script: 'npm',
         args: 'start',
         cwd: '/var/www/fonana',
         instances: 1,
         env: { PORT: 3000 }
       },
       {
         name: 'fonana-ws',
         script: './index.js',
         cwd: '/var/www/fonana/websocket-server',
         instances: 1,
         env: { PORT: 3002 }
       }
     ]
   }
   ```

3. **Обновление Nginx:**
   ```nginx
   location /ws {
       proxy_pass http://localhost:3002;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_read_timeout 86400;
   }
   ```

#### Этап 2: Базовая реализация (2-3 дня)
- WebSocket сервер с аутентификацией
- Обработчики подписок на каналы
- Базовые события (notifications, posts)
- Интеграция с Prisma для доступа к БД
- Логирование и обработка ошибок

#### Этап 3: Интеграция с API (2-3 дня)
- Модификация API endpoints для отправки событий
- Redis pub/sub для связи Next.js ↔ WebSocket
- Обработка всех типов событий
- Тестирование на локальной среде

#### Этап 4: Тестирование и оптимизация (1-2 дня)
- Load testing с множеством соединений
- Оптимизация производительности
- Настройка мониторинга
- Документация

#### Этап 5: Production деплой (1 день)
- Поэтапный деплой на production
- Мониторинг метрик
- Готовность к откату

### Альтернативные решения

#### 1. Socket.io (не рекомендуется)
**Плюсы:** Больше функций из коробки  
**Минусы:** Избыточность, несовместимость с текущим клиентом

#### 2. Next.js API Routes (ограничен)
**Плюсы:** Единый процесс  
**Минусы:** Плохая поддержка WebSocket в App Router

#### 3. Сторонние сервисы (Pusher, Ably)
**Плюсы:** Готовое решение  
**Минусы:** Зависимость, стоимость, задержки

## Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Проблемы с масштабированием | Средняя | Redis с самого начала |
| Утечки памяти | Средняя | Мониторинг, автоперезапуск |
| DDoS через WebSocket | Низкая | Rate limiting, проверка origin |
| Рассинхронизация данных | Средняя | Event sourcing, версионирование |

## Рекомендации

1. **Начать с MVP** - базовые уведомления и обновления постов
2. **Использовать отдельный сервер** - проще масштабировать
3. **Внедрить Redis сразу** - избежать проблем в будущем
4. **Логировать все события** - для отладки и аналитики
5. **Мониторинг с первого дня** - память, CPU, количество соединений

## Заключение

Клиентская инфраструктура полностью готова и ждет серверную реализацию. Рекомендуемый подход - создание отдельного WebSocket сервера на Node.js с использованием библиотеки `ws`. Это обеспечит:

- ✅ Полный контроль над логикой
- ✅ Легкое масштабирование
- ✅ Независимость от Next.js
- ✅ Совместимость с текущим клиентом

После реализации пользователи получат:
- Мгновенные уведомления
- Real-time обновления ленты
- Живые счетчики лайков/комментариев
- Синхронизацию между вкладками
- Улучшенный UX

**Готовность к запуску через: 7-10 дней** 