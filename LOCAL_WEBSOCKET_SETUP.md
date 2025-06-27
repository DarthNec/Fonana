# Локальная настройка WebSocket-сервера

## Проблемы и решения

### 1. Ошибка Prisma клиента в websocket-server

**Проблема:**
```
Error: @prisma/client did not initialize yet. Please run "prisma generate"
```

**Решение:**
```bash
cd websocket-server
npx prisma generate --schema=../prisma/schema.prisma
```

### 2. Порт 3000 уже занят

**Проблема:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Решение:**
```bash
# Найти процесс на порту 3000
lsof -i :3000

# Убить процесс
kill -9 <PID>

# Или использовать другой порт
PORT=3001 npm start
```

### 3. Правильный запуск локально

**Для основного приложения:**
```bash
# В корне проекта
npm run dev
```

**Для WebSocket-сервера (в отдельном терминале):**
```bash
cd websocket-server
npm start
```

### 4. Проверка локального WebSocket

Откройте браузер и выполните в консоли:
```javascript
const ws = new WebSocket('ws://localhost:3002');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
```

## Переменные окружения

Убедитесь, что в `websocket-server/.env` есть:
```
DATABASE_URL="ваша_строка_подключения"
NEXTAUTH_SECRET="ваш_секрет"
PORT=3002
```

## Примечание

Локальная разработка WebSocket функций:
1. Запустите основное приложение (`npm run dev`)
2. Запустите WebSocket-сервер отдельно (`cd websocket-server && npm start`)
3. Используйте `ws://localhost:3002` для подключения 