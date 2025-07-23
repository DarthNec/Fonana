#!/bin/bash

# Скрипт для исправления проблемы белого экрана на продакшне
# Проблема: несоответствие версий файлов из-за множественных процессов Node.js

echo "🔧 Fixing white screen issue..."

# 1. Убиваем ВСЕ процессы Node.js и PM2
echo "⚡ Killing all Node.js processes..."
pm2 kill
killall -9 node next-server sh 2>/dev/null || true
sleep 2

# 2. Проверяем что все процессы убиты
REMAINING=$(ps aux | grep -E 'node|next' | grep -v grep | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo "⚠️  Warning: Some Node processes still running. Force killing..."
    ps aux | grep -E 'node|next' | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# 3. Очищаем кеш Next.js
echo "🗑️  Clearing Next.js cache..."
cd /var/www/fonana
rm -rf .next/cache

# 4. Запускаем приложение через PM2
echo "🚀 Starting application..."
PORT=3000 pm2 start npm --name fonana -- start

# 5. Ждем запуска
echo "⏳ Waiting for application to start..."
sleep 5

# 6. Перезагружаем nginx
echo "🔄 Reloading nginx..."
nginx -s reload

# 7. Проверяем статус
echo "✅ Checking status..."
pm2 status

echo ""
echo "✨ Fix completed! The site should be working now."
echo "🌐 Check: https://fonana.me"
echo ""
echo "💡 If still seeing white screen:"
echo "   1. Clear browser cache (Ctrl+Shift+R)"
echo "   2. Try incognito mode"
echo "   3. Wait 1-2 minutes for cache to expire" 