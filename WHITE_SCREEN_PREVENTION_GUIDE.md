# 🚨 Руководство по предотвращению белого экрана на Fonana

## Проблема
Белый экран с ошибками 400 при загрузке статических файлов (.css, .js).

## Причины
1. **Множественные процессы Node.js** - старые процессы не убиваются, создается конфликт версий
2. **Несоответствие buildId** - браузер пытается загрузить файлы старой версии
3. **Кеширование** - nginx/браузер кеширует старые версии HTML

## Симптомы
```
Failed to load resource: the server responded with a status of 400 ()
webpack-[hash].js - 400 error
layout-[hash].js - 400 error
[hash].css - 400 error
```

## Быстрое решение

### На сервере:
```bash
ssh -p 43988 root@69.10.59.234
cd /var/www/fonana
chmod +x scripts/fix-white-screen.sh
./scripts/fix-white-screen.sh
```

### В браузере:
1. Очистить кеш: `Ctrl+Shift+R` (Windows) или `Cmd+Shift+R` (Mac)
2. Открыть в инкогнито режиме
3. Подождать 1-2 минуты

## Как избежать в будущем

### 1. Используйте правильный деплой скрипт
```bash
./deploy-to-production.sh
```
НЕ запускайте деплой несколько раз подряд!

### 2. Проверяйте процессы перед деплоем
```bash
ssh -p 43988 root@69.10.59.234 "ps aux | grep -E 'node|next' | grep -v grep"
```
Если видите больше одного процесса - запустите fix-white-screen.sh

### 3. Улучшенный deploy скрипт
Добавьте в начало deploy-to-production.sh:
```bash
# Убиваем старые процессы перед деплоем
echo "🧹 Cleaning up old processes..."
ssh -p 43988 root@69.10.59.234 "pm2 stop fonana 2>/dev/null || true"
ssh -p 43988 root@69.10.59.234 "killall -9 node next-server 2>/dev/null || true"
sleep 2
```

### 4. Мониторинг
Регулярно проверяйте:
```bash
ssh -p 43988 root@69.10.59.234 "pm2 status"
```
Должен быть только ОДИН процесс fonana!

## Детальная диагностика

### 1. Проверить buildId на сервере:
```bash
ssh -p 43988 root@69.10.59.234 "cat /var/www/fonana/.next/BUILD_ID"
```

### 2. Проверить какой buildId запрашивает браузер:
Откройте DevTools → Network → посмотрите пути к файлам

### 3. Проверить наличие файлов:
```bash
ssh -p 43988 root@69.10.59.234 "ls -la /var/www/fonana/.next/static/chunks/"
```

## Постоянное решение (TODO)

1. **Добавить health check в nginx:**
```nginx
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

2. **Использовать PM2 cluster mode:**
```bash
pm2 start npm --name fonana -i max -- start
```

3. **Добавить graceful shutdown:**
```javascript
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
  })
})
```

## Контакты для помощи
- Telegram: @your_telegram
- Email: support@fonana.me

---
Последнее обновление: 20 июня 2025 