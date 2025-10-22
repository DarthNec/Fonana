#!/bin/bash
# Скрипт для исправления проблемы с частыми запросами Sora-checker

echo "🔧 Исправление проблемы с частыми запросами Sora-checker"
echo "========================================================"

# Проверяем, находимся ли мы в правильной директории
if [ ! -f "ecosystem.config.js" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта Fonana"
    exit 1
fi

# Проверяем PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 не установлен. Установите PM2: npm install -g pm2"
    exit 1
fi

echo "🛑 Останавливаем текущий процесс sora-checker..."
pm2 stop sora-checker

echo "📝 Проверяем конфигурацию ecosystem.config.js..."
if grep -q "autorestart: true" ecosystem.config.js; then
    echo "❌ Найдена проблема: autorestart: true"
    echo "🔧 Исправляем конфигурацию..."
    
    # Создаем резервную копию
    cp ecosystem.config.js ecosystem.config.js.backup
    
    # Исправляем конфигурацию
    sed -i 's/autorestart: true/autorestart: false/g' ecosystem.config.js
    
    echo "✅ Конфигурация исправлена"
else
    echo "✅ Конфигурация уже корректна (autorestart: false)"
fi

echo "🔄 Перезапускаем PM2 с новой конфигурацией..."
pm2 restart ecosystem.config.js

echo "📊 Проверяем статус процессов..."
pm2 status

echo ""
echo "📋 Инструкции для проверки:"
echo "=========================="
echo "1. Проверьте статус: pm2 status sora-checker"
echo "2. Проверьте логи: pm2 logs sora-checker --lines 20"
echo "3. Подождите 2-3 минуты и проверьте логи снова"
echo "4. Убедитесь, что записи в логах появляются раз в минуту"
echo ""
echo "🔍 Для мониторинга используйте:"
echo "   pm2 logs sora-checker --lines 0 -f"
echo ""
echo "✅ Скрипт завершен!"

