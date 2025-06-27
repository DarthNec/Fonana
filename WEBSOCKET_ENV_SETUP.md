# WebSocket Server Environment Setup

## Создайте файл `websocket-server/.env`

```bash
cd websocket-server
cp ../.env .env
```

Или создайте вручную с минимальными настройками:

```env
# WebSocket Server Configuration
PORT=3002
NODE_ENV=development

# Database URL (скопируйте из основного .env)
DATABASE_URL=ваша_строка_подключения

# JWT Secret (скопируйте из основного .env)
NEXTAUTH_SECRET=ваш_секрет
```

## Запуск сервера

```bash
cd websocket-server
npm start
```

Сервер запустится на порту 3002 и будет готов принимать WebSocket соединения. 