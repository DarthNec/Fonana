#!/bin/bash

echo "=== Диагностика сервера Fonana ==="

# Подключение к серверу
# ssh -p 43988 root@69.10.59.234

echo "Команды для выполнения на сервере:"

echo "1. Перейти в директорию приложения:"
echo "cd /var/www/fonana"

echo "2. Проверить статус приложения:"
echo "pm2 status"
echo "ps aux | grep node"
echo "lsof -i :3001"

echo "3. Проверить логи:"
echo "pm2 logs"
echo "journalctl -u fonana.service -f"

echo "4. Пересобрать приложение:"
echo "npm install"
echo "npm run build"

echo "5. Перезапустить приложение:"
echo "pm2 restart all"
echo "# или"
echo "systemctl restart fonana.service"

echo "6. Проверить nginx:"
echo "nginx -t"
echo "systemctl status nginx"
echo "systemctl reload nginx"

echo "7. Если нужно очистить кеш Next.js:"
echo "rm -rf .next"
echo "npm run build"

echo "8. Проверить базу данных:"
echo "ls -la prisma/"
echo "npx prisma db push"

echo "=== Команды готовы! ===" 