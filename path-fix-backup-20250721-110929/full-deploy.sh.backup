#!/bin/bash

# Полный скрипт деплоя Fonana
# Запускать на сервере в директории /var/www/fonana

set -e

echo "🚀 Начинаем полный деплой Fonana..."
echo "=================================="

# Сохраняем текущий коммит для отката
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
echo "📌 Текущий коммит: $CURRENT_COMMIT"

# Бекап .env
if [ -f .env ]; then
    cp .env .env.backup_$(date +%Y%m%d_%H%M%S)
    echo "✅ Создан бекап .env"
fi

# Обновление кода
echo ""
echo "📥 Обновляем код из GitHub..."
git pull origin main

# Проверка и установка прав на скрипты
echo ""
echo "🔧 Настраиваем права доступа..."
chmod +x scripts/*.sh
chmod +x scripts/*.js

# Установка зависимостей если изменился package.json
if git diff $CURRENT_COMMIT HEAD --name-only | grep -q "package.json"; then
    echo ""
    echo "📦 Устанавливаем зависимости..."
    npm ci
fi

# Настройка переменных окружения Solana
echo ""
echo "🔐 Настраиваем переменные окружения Solana..."

# Функция для добавления/обновления переменной
update_env() {
    local key=$1
    local value=$2
    if grep -q "^${key}=" .env; then
        sed -i "s|^${key}=.*|${key}=\"${value}\"|" .env
    else
        echo "" >> .env
        echo "${key}=\"${value}\"" >> .env
    fi
}

# Добавляем переменные Solana
update_env "NEXT_PUBLIC_SOLANA_RPC_HOST" "https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"
update_env "NEXT_PUBLIC_SOLANA_WS_ENDPOINT" "wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"
update_env "NEXT_PUBLIC_PLATFORM_WALLET" "npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4"
update_env "NEXT_PUBLIC_SOLANA_NETWORK" "mainnet-beta"

echo "✅ Переменные окружения настроены"

# Применение миграций
echo ""
echo "🗄️  Применяем миграции базы данных..."
npx prisma migrate deploy || {
    echo "⚠️  Ошибка миграции, пробуем еще раз с флагами..."
    npx prisma db push --accept-data-loss
}

# Генерация Prisma клиента
echo ""
echo "🔨 Генерируем Prisma клиент..."
npx prisma generate

# Сборка приложения
echo ""
echo "🏗️  Собираем приложение..."
NODE_ENV=production npm run build || {
    echo "❌ Сборка не удалась!"
    echo "Откатываемся на предыдущий коммит..."
    git reset --hard $CURRENT_COMMIT
    npm ci
    exit 1
}

# Перезапуск PM2
echo ""
echo "🔄 Перезапускаем приложение..."
pm2 reload fonana --update-env

# Ждем запуска
sleep 5

# Проверка статуса
echo ""
echo "📊 Проверяем статус..."
pm2 status

# Проверка здоровья
echo ""
echo "🏥 Проверка здоровья системы..."
node scripts/health-check.js || echo "⚠️  Проверка здоровья завершилась с предупреждениями"

# Показываем последние логи
echo ""
echo "📜 Последние логи:"
pm2 logs fonana --lines 30 --nostream

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "🔍 Проверьте:"
echo "   1. https://fonana.me - работает"
echo "   2. https://fonana.me/dashboard/referrals - доступна"
echo "   3. Платежи работают корректно"
echo ""
echo "📌 Для отката используйте:"
echo "   git reset --hard $CURRENT_COMMIT"
echo "   npm ci && npm run build && pm2 restart fonana" 