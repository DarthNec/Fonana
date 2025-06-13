#!/bin/bash

echo "🔧 Исправление проблемы со статическими файлами на сервере Fonana..."

SERVER="69.10.59.234"
SERVER_USER="root"

# Копируем новую конфигурацию на сервер
echo "📋 Копирование новой Nginx конфигурации..."
scp -P 43988 nginx-fonana-static-fix.conf $SERVER_USER@$SERVER:/tmp/nginx-fonana.conf

# Выполняем команды на сервере
ssh -p 43988 $SERVER_USER@$SERVER << 'EOF'
set -e

echo "🔍 Проверка структуры директорий..."
# Создаем директории если их нет
mkdir -p /var/www/fonana/current/public/avatars
mkdir -p /var/www/fonana/current/public/backgrounds
mkdir -p /var/www/fonana/current/public/posts

echo "🔒 Установка правильных прав доступа..."
# Устанавливаем правильные права
chown -R www-data:www-data /var/www/fonana/current/public/avatars
chown -R www-data:www-data /var/www/fonana/current/public/backgrounds
chown -R www-data:www-data /var/www/fonana/current/public/posts
chmod -R 755 /var/www/fonana/current/public/avatars
chmod -R 755 /var/www/fonana/current/public/backgrounds
chmod -R 755 /var/www/fonana/current/public/posts

echo "📁 Проверка существующих файлов..."
ls -la /var/www/fonana/current/public/avatars/ || echo "Директория avatars пуста"
ls -la /var/www/fonana/current/public/backgrounds/ || echo "Директория backgrounds пуста"

echo "🔧 Применение новой Nginx конфигурации..."
# Бэкап текущей конфигурации
cp /etc/nginx/sites-available/fonana /etc/nginx/sites-available/fonana.backup.$(date +%Y%m%d_%H%M%S)

# Копируем новую конфигурацию
cp /tmp/nginx-fonana.conf /etc/nginx/sites-available/fonana

echo "✅ Проверка конфигурации Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "🔄 Перезагрузка Nginx..."
    systemctl reload nginx
    echo "✅ Nginx успешно перезагружен!"
else
    echo "❌ Ошибка в конфигурации Nginx! Восстанавливаем бэкап..."
    cp /etc/nginx/sites-available/fonana.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/fonana
    exit 1
fi

echo "🔍 Проверка статуса..."
systemctl status nginx --no-pager | head -20

echo "📊 Тестирование доступа к директориям..."
# Создаем тестовый файл
echo "test" > /var/www/fonana/current/public/avatars/test.txt
chown www-data:www-data /var/www/fonana/current/public/avatars/test.txt

# Проверяем доступ
curl -I http://localhost/avatars/test.txt || echo "Не удалось получить доступ к тестовому файлу"

# Удаляем тестовый файл
rm -f /var/www/fonana/current/public/avatars/test.txt

echo "✅ Конфигурация применена!"
echo ""
echo "📌 Важно: Убедитесь, что приложение сохраняет файлы в:"
echo "   - /var/www/fonana/current/public/avatars/"
echo "   - /var/www/fonana/current/public/backgrounds/"
echo "   - /var/www/fonana/current/public/posts/"
EOF

echo "✅ Скрипт выполнен!" 