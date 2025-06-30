# Отчет об исправлении подписки и авторизации на WebSocket сервере Fonana

**Дата**: 30 июня 2025  
**Время**: 03:40 - 04:30 MSK  
**Статус**: ✅ ЧАСТИЧНО ИСПРАВЛЕНО

## Исходная проблема

При тестировании на https://fonana.me/test-websocket-notifications.html:
- JWT токен успешно создавался и валидировался на клиенте
- WebSocket соединение устанавливалось
- После отправки события `subscribe` сервер немедленно закрывал соединение с кодом `1008 Unauthorized`

## Выполненный анализ

### 1. Проверка загрузки переменных окружения
- **Проблема**: Next.js API routes не получали переменные окружения, даже когда PM2 правильно их загружал
- **Попытки решения**:
  - Добавление `require('dotenv').config()` в next.config.js
  - Создание модуля lib/env.ts для загрузки переменных
  - Использование start-production-final.js для инжекции переменных

### 2. Создание константного модуля
- **Решение**: Создан файл `lib/constants/env.ts` с фолбэк значениями:
```typescript
export const ENV = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fonana_dev?schema=public',
  NODE_ENV: process.env.NODE_ENV || 'production'
}
```

### 3. Обновление API endpoints
- Обновлены файлы:
  - `app/api/auth/wallet/route.ts` - использует ENV.NEXTAUTH_SECRET
  - `app/api/user/notifications/route.ts` - использует ENV.NEXTAUTH_SECRET

## Результаты

### ✅ Что работает:
1. **API уведомлений** - успешно возвращает данные при валидном JWT токене
2. **WebSocket сервер** - правильно загружает переменные окружения
3. **Генерация JWT токенов** - токены создаются с правильным ключом

### ⚠️ Что требует доработки:
1. **Переменные окружения в Next.js** - требуется более элегантное решение для передачи переменных в API routes
2. **WebSocket подписка** - необходимо проверить логику обработки события subscribe

## Тестирование

Для тестирования используйте следующий JWT токен пользователя `oli`:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWNjZXVtZzcwMDFpeWpsZXNsdmN6dXg2Iiwid2FsbGV0IjoiOEtxeDZLb0hEWVpkSnRoNjVMR1ozZGlQdVNEbjlETFBMSGRIZFVVMzdtd2ciLCJzdWIiOiJjbWNjZXVtZzcwMDFpeWpsZXNsdmN6dXg2IiwiaWF0IjoxNzUxMjU4MzgyLCJleHAiOjE3NTM4NTAzODJ9.y5dTXjiyDh_VRP_qF4lsAihtrrBOu7cmf6MLikxQSG4
```

Сохраните токен в localStorage через консоль браузера:
```javascript
localStorage.setItem('jwt-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

## Рекомендации

1. **Исследовать использование** `publicRuntimeConfig` в Next.js для передачи переменных окружения
2. **Добавить диагностику** в WebSocket сервер для логирования причин отклонения подписки
3. **Рассмотреть миграцию** на Next.js 13+ с app directory и улучшенной поддержкой переменных окружения

## Файлы, измененные в процессе:
- `lib/constants/env.ts` (создан)
- `app/api/auth/wallet/route.ts`
- `app/api/user/notifications/route.ts`
- `next.config.js`
- `websocket-server/index.js` 