# Исправление проблем с авторизацией (25 декабря 2024)

## Проблемы
1. **"Authentication failed"** при попытке подключить кошелек в обычном браузере
2. **Белый экран** на мобильных устройствах с ошибкой "Application error: a client-side exception has occurred"

## Причины

### 1. Отсутствовал JWT_SECRET
- На продакшн сервере не была установлена переменная окружения `JWT_SECRET`
- Без этой переменной JWT токены не могли быть созданы и проверены
- Это приводило к ошибке "Authentication failed" при любой попытке авторизации

### 2. Отсутствовал routes-manifest.json
- Файл `.next/routes-manifest.json` отсутствовал, что указывает на неполный build
- Это вызывало белый экран и ошибки при загрузке приложения

## Решение

### 1. Добавлен JWT_SECRET в .env
```bash
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && echo 'JWT_SECRET=\"fonana-secret-key-2024-december\"' >> .env"
```

### 2. Исправлен белый экран
```bash
# Запущен скрипт исправления
./scripts/fix-white-screen.sh

# Перезапущено приложение с правильной конфигурацией
pm2 delete all && pm2 start ecosystem.config.js
```

### 3. Отключен DEBUG режим
- Отключен DEBUG_MODE в файлах:
  - `components/HybridWalletConnect.tsx`
  - `app/api/auth/wallet/route.ts`
  - `lib/auth/jwt.ts`

## Важные замечания

### Обязательные переменные окружения
Для работы авторизации через кошелек ОБЯЗАТЕЛЬНО должны быть установлены:
```env
JWT_SECRET="ваш-секретный-ключ"
# или
NEXTAUTH_SECRET="ваш-секретный-ключ"
```

### Приоритет переменных
Система использует следующий приоритет:
1. `JWT_SECRET` (если установлен)
2. `NEXTAUTH_SECRET` (если JWT_SECRET не установлен)
3. `'your-secret-key'` (небезопасный fallback для разработки)

### Проверка после деплоя
После каждого деплоя проверяйте:
1. Наличие JWT_SECRET: `grep JWT_SECRET .env`
2. Статус приложения: `pm2 status`
3. Отсутствие ошибок: `pm2 logs fonana --lines 50`

## Профилактика

### При деплое новой инсталляции
1. Скопируйте `.env.example` в `.env`
2. Обязательно установите все секретные ключи
3. Проверьте что build завершился успешно
4. Используйте `pm2 start ecosystem.config.js`, а не `npm start`

### При возникновении белого экрана
1. Используйте скрипт: `./scripts/fix-white-screen.sh`
2. Проверьте логи: `pm2 logs fonana --lines 100`
3. Убедитесь что все переменные окружения установлены

## Связанные файлы
- `lib/auth/jwt.ts` - логика создания и проверки JWT токенов
- `app/api/auth/wallet/route.ts` - API endpoint для авторизации
- `components/HybridWalletConnect.tsx` - компонент подключения кошелька
- `scripts/fix-white-screen.sh` - скрипт исправления белого экрана 