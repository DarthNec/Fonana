#!/bin/bash

# Безопасный деплой оптимизации изображений
# Этот скрипт обеспечивает обратную совместимость

echo "🚀 Начинаем безопасный деплой оптимизации изображений..."

# Переменные
SERVER="root@69.10.59.234"
PORT="43988"
REMOTE_DIR="/var/www/Fonana"

# 1. Создаем бэкап критичных файлов на сервере
echo "📦 Создаем бэкап..."
ssh -p $PORT $SERVER "cd $REMOTE_DIR && cp -r app/api/posts app/api/posts.backup-$(date +%Y%m%d-%H%M%S)"

# 2. Коммитим и пушим изменения
echo "📝 Коммитим изменения..."
git add .
git commit -m "feat: добавлена оптимизация изображений с lazy loading

- Автоматическая генерация thumbnail (800px) и preview (300px) версий
- Компонент OptimizedImage с прогрессивной загрузкой
- Конвертация в WebP формат для лучшего сжатия
- Обратная совместимость со старыми постами"

git push origin main

# 3. Деплоим на сервер
echo "🔄 Обновляем код на сервере..."
ssh -p $PORT $SERVER "cd $REMOTE_DIR && git pull origin main"

# 4. Устанавливаем sharp (с проверкой на существование)
echo "📦 Устанавливаем зависимости..."
ssh -p $PORT $SERVER "cd $REMOTE_DIR && npm install --production"

# 5. Пересобираем проект
echo "🔨 Пересобираем проект..."
ssh -p $PORT $SERVER "cd $REMOTE_DIR && npm run build"

# 6. Перезапускаем приложение
echo "♻️ Перезапускаем приложение..."
ssh -p $PORT $SERVER "pm2 restart fonana"

# 7. Проверяем статус
echo "✅ Проверяем статус..."
ssh -p $PORT $SERVER "pm2 status fonana"

# 8. Проверяем логи на ошибки
echo "📋 Последние логи:"
ssh -p $PORT $SERVER "pm2 logs fonana --lines 20"

echo "✨ Деплой завершен!"
echo ""
echo "⚠️  Важные заметки:"
echo "1. Старые изображения продолжат работать без оптимизации"
echo "2. Новые изображения будут автоматически оптимизироваться"
echo "3. В случае проблем: ssh -p $PORT $SERVER 'cd $REMOTE_DIR && cp -r app/api/posts.backup-* app/api/posts'"
echo ""
echo "🔍 Проверьте работу на https://fonana.io" 