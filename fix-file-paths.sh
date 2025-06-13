#!/bin/bash

echo "🔧 Исправление путей к загруженным файлам..."

SERVER="69.10.59.234"
SERVER_USER="root"
SSH_PORT="43988"

ssh -p $SSH_PORT $SERVER_USER@$SERVER << 'EOF'
set -e

echo "📁 Проверка текущей ситуации..."
echo "Файлы в /public/avatars:"
ls -la /public/avatars/ 2>/dev/null || echo "Директория не существует"

echo "Файлы в /var/www/fonana/current/public/avatars:"
ls -la /var/www/fonana/current/public/avatars/ 2>/dev/null || echo "Директория не существует"

echo "🚚 Перемещение существующих файлов..."
# Создаем целевые директории если их нет
mkdir -p /var/www/fonana/current/public/avatars
mkdir -p /var/www/fonana/current/public/backgrounds
mkdir -p /var/www/fonana/current/public/posts

# Перемещаем файлы если они есть
if [ -d "/public/avatars" ] && [ "$(ls -A /public/avatars 2>/dev/null)" ]; then
    echo "Перемещаю файлы из /public/avatars..."
    mv /public/avatars/* /var/www/fonana/current/public/avatars/ 2>/dev/null || true
fi

if [ -d "/public/backgrounds" ] && [ "$(ls -A /public/backgrounds 2>/dev/null)" ]; then
    echo "Перемещаю файлы из /public/backgrounds..."
    mv /public/backgrounds/* /var/www/fonana/current/public/backgrounds/ 2>/dev/null || true
fi

echo "🔗 Создание символических ссылок..."
# Удаляем старые директории
rm -rf /public/avatars /public/backgrounds /public/posts 2>/dev/null || true

# Создаем директорию /public если её нет
mkdir -p /public

# Создаем символические ссылки
ln -sf /var/www/fonana/current/public/avatars /public/avatars
ln -sf /var/www/fonana/current/public/backgrounds /public/backgrounds
ln -sf /var/www/fonana/current/public/posts /public/posts

echo "✅ Проверка результата..."
echo "Символические ссылки в /public:"
ls -la /public/

echo "🔒 Установка прав доступа..."
chown -R www-data:www-data /var/www/fonana/current/public/avatars
chown -R www-data:www-data /var/www/fonana/current/public/backgrounds
chown -R www-data:www-data /var/www/fonana/current/public/posts
chmod -R 755 /var/www/fonana/current/public/avatars
chmod -R 755 /var/www/fonana/current/public/backgrounds
chmod -R 755 /var/www/fonana/current/public/posts

echo "📊 Финальная проверка..."
echo "Содержимое /var/www/fonana/current/public/avatars:"
ls -la /var/www/fonana/current/public/avatars/ | head -10

echo "✅ Готово!"
EOF

echo "✅ Скрипт выполнен!" 