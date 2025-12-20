# DISCOVERY REPORT: Сравнение локальной и продакшен версий Fonana

## 🔍 Анализ различий между локальной и продакшен версиями

### Общая информация
- **Локальная версия**: Windows, Cursor IDE, разработка
- **Продакшен версия**: Ubuntu Server, 64.20.37.222, рабочая версия
- **Дата анализа**: 21 октября 2025

---

## 📊 Сравнение package.json

### ✅ Идентичные зависимости
Основные зависимости полностью совпадают:
- Next.js 14.1.0
- React 18
- Prisma 5.22.0
- Все UI библиотеки (@radix-ui, @headlessui, @heroicons)
- Blockchain библиотеки (@solana, @web3modal)
- Zustand, TanStack Query, и другие

### 🔍 Различия в зависимостях

#### Локальная версия имеет дополнительные пакеты:
```json
// Локальная версия
"ioredis": "^5.7.0",           // Redis клиент
"openai": "^6.3.0",            // OpenAI API
"socket.io": "^4.8.1",         // Socket.IO сервер
"socket.io-client": "^4.8.1"   // Socket.IO клиент
```

#### Продакшен версия НЕ имеет:
- `ioredis` - Redis клиент
- `openai` - OpenAI API
- `socket.io` - Socket.IO сервер
- `socket.io-client` - Socket.IO клиент

---

## 🔧 Сравнение конфигураций

### Nginx конфигурация

#### Продакшен nginx (/etc/nginx/sites-available/fonana):
- ✅ **HTTP сервер** (порт 80)
- ✅ **HTTPS сервер** (порт 443) с SSL сертификатами
- ✅ **SocketIO проксирование** `/socket.io/` → `localhost:3004`
- ✅ **WebSocket поддержка** `/ws` → `localhost:3002`
- ✅ **Основное приложение** `/` → `localhost:3000`
- ✅ **Кэширование** статических ресурсов
- ✅ **Security headers** (HSTS, X-Frame-Options, etc.)

#### Локальная nginx конфигурация:
- ❌ **Отсутствует** - используется только Next.js dev сервер
- ❌ **Нет SSL** - только HTTP
- ❌ **Нет проксирования** SocketIO

### Переменные окружения

#### Продакшен (.env):
```bash
DATABASE_URL="postgresql://fonana_user:fonana_pass@localhost:5432/fonana"
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-key-change-in-production"
JWT_SECRET="jwt-secret-key-for-development"
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
```

#### Локальная (.env):
```bash
DATABASE_URL="postgresql://fonana_user:fonana_pass@64.20.37.222:5432/fonana?schema=public&connection_limit=5"
NEXT_PUBLIC_SOLANA_NETWORK=mainnet
NEXT_PUBLIC_SOLANA_RPC_URL="https://clemmie-lyscvd-fast-mainnet.helius-rpc.com"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="cf8c4b7e-4d39-41da-9a6e-8e45a0e9d9f1"
JWT_SECRET="cf8c4b7e-4d39-41da-9a6e-8e45a0e9d9f1"
REDIS_URL=redis://64.20.37.222:6379
STABILITY_API_KEY="sk-JNA5HtlDbmaYJXeqV7HkSDUOl8goPsCpRUEAQjCiHSWgzJXJ"
HUGGINGFACE_API_KEY="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"
NEXT_PUBLIC_OPENAI_API_KEY="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"
OPENAI_WEBHOOK_SECRET="whsec_Txf9nxsKKfnCsHtmEm4BOBcEcC7GyjDkIYje0NsAwI="
```

---

## 🏗️ Архитектурные различия

### Продакшен архитектура:
```
[Internet] → [Nginx:443] → [Next.js:3000]
                ↓
        [SocketIO:3004] ← [Nginx проксирование]
                ↓
        [WebSocket:3002] ← [Nginx проксирование]
                ↓
        [PostgreSQL:5432] + [Redis:6379]
```

### Локальная архитектура:
```
[Browser] → [Next.js Dev Server:3000]
                ↓
        [PostgreSQL:64.20.37.222:5432] + [Redis:64.20.37.222:6379]
```

---

## 🔍 Ключевые различия

### 1. **Сетевые настройки**
- **Продакшен**: Все сервисы на localhost
- **Локальная**: База данных и Redis на удаленном сервере

### 2. **SSL/TLS**
- **Продакшен**: Полная SSL поддержка с Let's Encrypt
- **Локальная**: Только HTTP

### 3. **SocketIO**
- **Продакшен**: SocketIO сервер работает на порту 3004
- **Локальная**: SocketIO зависимости есть, но сервер не запущен

### 4. **AI интеграции**
- **Продакшен**: Нет AI API ключей
- **Локальная**: OpenAI, Stability AI, Hugging Face API

### 5. **Redis**
- **Продакшен**: Redis на localhost:6379
- **Локальная**: Redis на удаленном сервере

### 6. **Solana сеть**
- **Продакшен**: devnet
- **Локальная**: mainnet

---

## 📊 Статус сервисов

### Продакшен сервисы:
- ✅ **Next.js**: Порт 3000 (next-server)
- ✅ **SocketIO**: Порт 3004 (node index.js)
- ✅ **PostgreSQL**: Порт 5432
- ✅ **Redis**: Порт 6379
- ✅ **Nginx**: Порты 80, 443

### Локальные сервисы:
- ✅ **Next.js Dev**: Порт 3000
- ❌ **SocketIO**: Не запущен
- ❌ **PostgreSQL**: Удаленный сервер
- ❌ **Redis**: Удаленный сервер
- ❌ **Nginx**: Не настроен

---

## 🎯 Выводы

### Основные различия:
1. **Продакшен** - полная production-ready архитектура
2. **Локальная** - development окружение с удаленными сервисами
3. **SocketIO** - настроен только на продакшене
4. **AI функции** - доступны только локально
5. **SSL** - только на продакшене

### Рекомендации:
1. **Синхронизировать зависимости** - добавить SocketIO на продакшен
2. **Настроить AI API** на продакшене для полной функциональности
3. **Обновить переменные окружения** на продакшене
4. **Добавить Redis клиент** на продакшен

---

## 📋 Следующие шаги

1. **Анализ кода** - сравнить исходный код
2. **Проверка миграций** - сравнить Prisma схемы
3. **Тестирование функций** - проверить различия в функциональности
4. **Создание плана синхронизации** - привести версии к единому состоянию


















































