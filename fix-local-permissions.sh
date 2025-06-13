#!/bin/bash

echo "🔧 Проверка и исправление прав доступа на локальной машине..."

# Проверяем существование директорий
echo "📁 Проверка директорий..."
if [ ! -d "public/avatars" ]; then
    echo "❌ Директория public/avatars не найдена. Создаю..."
    mkdir -p public/avatars
fi

if [ ! -d "public/backgrounds" ]; then
    echo "❌ Директория public/backgrounds не найдена. Создаю..."
    mkdir -p public/backgrounds
fi

if [ ! -d "public/posts" ]; then
    echo "❌ Директория public/posts не найдена. Создаю..."
    mkdir -p public/posts
fi

# Проверяем права доступа
echo "🔒 Проверка прав доступа..."
ls -la public/ | grep -E "(avatars|backgrounds|posts)"

# Устанавливаем правильные права
echo "🔧 Установка прав доступа..."
chmod 755 public/avatars
chmod 755 public/backgrounds
chmod 755 public/posts

# Тестируем запись
echo "📝 Тестирование записи в директории..."
touch public/avatars/test.txt && rm public/avatars/test.txt && echo "✅ Запись в avatars работает"
touch public/backgrounds/test.txt && rm public/backgrounds/test.txt && echo "✅ Запись в backgrounds работает"
touch public/posts/test.txt && rm public/posts/test.txt && echo "✅ Запись в posts работает"

echo ""
echo "📊 Итоговая структура:"
ls -la public/ | grep -E "(avatars|backgrounds|posts)"

echo ""
echo "✅ Проверка завершена!" 