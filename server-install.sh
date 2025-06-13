#!/bin/bash

# Этот скрипт выполняется НА СЕРВЕРЕ

echo "🚀 Установка Fonana на сервер..."

# 1. Остановка старых процессов
echo "⏹️  Остановка старых процессов..."
systemctl stop fonana 2>/dev/null || true
pkill -f node
pkill -f npm
sleep 2

# 2. Очистка старых файлов
echo "🗑️  Очистка старых файлов..."
rm -rf /var/www/fonana
mkdir -p /var/www/fonana

# 3. Распаковка новых файлов
echo "📦 Распаковка файлов..."
cd /var/www/fonana
tar -xzf /tmp/fonana-clean-deploy.tar.gz

# 4. Установка зависимостей
echo "📚 Установка зависимостей..."
npm install --production

# 5. Настройка systemd
echo "⚙️  Настройка systemd..."
cp fonana.service /etc/systemd/system/
systemctl daemon-reload

# 6. Настройка nginx
echo "🌐 Настройка nginx..."
cp nginx-fonana.conf /etc/nginx/sites-available/fonana
ln -sf /etc/nginx/sites-available/fonana /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 7. Запуск приложения
echo "🚀 Запуск приложения..."
systemctl enable fonana
systemctl start fonana

# 8. Проверка статуса
echo "✅ Проверка статуса..."
sleep 3
systemctl status fonana --no-pager

# 9. Тест доступности
echo ""
echo "🔍 Проверка доступности:"
curl -I https://fonana.me | head -5
echo ""
curl -I https://fonana.me/_next/static/chunks/webpack-f9a8923f791c7231.js | head -2

echo ""
echo "✅ Установка завершена!"
echo "🌐 Проверьте сайт: https://fonana.me" 