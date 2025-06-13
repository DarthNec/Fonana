#!/bin/bash

# Скрипт для загрузки проекта на GitHub
# Использование: ./push-to-github.sh YOUR_GITHUB_USERNAME

if [ -z "$1" ]; then
    echo "❌ Ошибка: Укажите ваш GitHub username"
    echo "Использование: ./push-to-github.sh YOUR_GITHUB_USERNAME"
    echo "Пример: ./push-to-github.sh dukeklevenski"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="Fonana"

echo "🚀 Загрузка проекта Fonana на GitHub..."
echo "👤 GitHub пользователь: $GITHUB_USERNAME"
echo "📦 Название репозитория: $REPO_NAME"
echo ""

# Добавляем remote origin
echo "➕ Добавляю remote origin..."
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

# Проверяем, что remote добавлен
echo "✅ Проверяю remote..."
git remote -v

# Переименовываем ветку в main (если нужно)
echo "🔄 Проверяю название ветки..."
git branch -M main

# Пушим все ветки и теги
echo "📤 Загружаю код на GitHub..."
git push -u origin main --tags

echo ""
echo "✅ Готово! Проект загружен на GitHub"
echo "🔗 URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""
echo "📝 Не забудьте:"
echo "1. Добавить описание репозитория на GitHub"
echo "2. Добавить топики: solana, web3, nextjs, typescript, content-platform"
echo "3. Выбрать лицензию (рекомендую MIT)"
echo "4. Настроить GitHub Pages для документации (опционально)" 