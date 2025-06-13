#!/bin/bash

echo "🚀 Автоматическая пересборка Fonana на сервере..."

# Остановка процессов
echo "⏹️  Остановка процессов..."
pkill -9 -f node
systemctl stop fonana 2>/dev/null || true
sleep 2

# Переход в директорию
cd /var/www/fonana

# Очистка
echo "🗑️  Очистка старой сборки..."
rm -rf .next

# Пересборка
echo "🔨 Сборка проекта..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешна!"
    
    # Запуск
    echo "🚀 Запуск приложения..."
    PORT=3001 nohup npm start > /var/www/fonana/app.log 2>&1 &
    
    # Ждем запуска
    sleep 5
    
    # Проверка
    echo "🔍 Проверка работы..."
    curl -I http://localhost:3001 | head -5
    
    echo ""
    echo "✅ Готово! Проверьте https://fonana.me"
else
    echo "❌ Ошибка сборки!"
    exit 1
fi 