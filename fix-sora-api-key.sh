#!/bin/bash
# Скрипт для исправления проблемы с API ключом Sora в PM2

echo "🔧 Исправление проблемы с API ключом Sora в PM2"
echo "================================================"

# Проверяем, находимся ли мы в правильной директории
if [ ! -f "sorachecker.js" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта Fonana"
    exit 1
fi

# Проверяем наличие файла .env
if [ ! -f ".env" ]; then
    echo "📝 Создаем файл .env..."
    touch .env
    echo "✅ Файл .env создан"
else
    echo "✅ Файл .env уже существует"
fi

# Проверяем наличие переменной NEXT_PUBLIC_OPENAI_API_KEY в .env
if ! grep -q "NEXT_PUBLIC_OPENAI_API_KEY" .env; then
    echo "🔑 Добавляем переменную NEXT_PUBLIC_OPENAI_API_KEY в .env..."
    echo "" >> .env
    echo "# OpenAI API Configuration" >> .env
    echo "NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here" >> .env
    echo "✅ Переменная добавлена в .env"
else
    echo "✅ Переменная NEXT_PUBLIC_OPENAI_API_KEY уже существует в .env"
fi

# Проверяем PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 не установлен. Установите PM2: npm install -g pm2"
    exit 1
fi

echo ""
echo "📋 Инструкции для завершения настройки:"
echo "========================================"
echo "1. Отредактируйте файл .env и замените 'your_openai_api_key_here' на реальный API ключ OpenAI"
echo "2. Перезапустите PM2 процесс: pm2 restart sora-checker"
echo "3. Проверьте логи: pm2 logs sora-checker --lines 20"
echo ""
echo "🔍 Для проверки статуса используйте:"
echo "   pm2 status"
echo "   pm2 show sora-checker"
echo ""
echo "✅ Скрипт завершен!"








































