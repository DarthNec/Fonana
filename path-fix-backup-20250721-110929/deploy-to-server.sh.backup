#!/bin/bash

# Скрипт для деплоя Fonana на продакшн сервер

echo "🚀 Начинаем деплой Fonana на продакшн..."

# Конфигурация
SERVER="root@fonana.me"
PORT="43988"
PROJECT_DIR="/var/www/fonana"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📡 Подключаемся к серверу...${NC}"

# Выполняем все команды на сервере
ssh -p $PORT $SERVER << 'ENDSSH'
set -e

# Переходим в директорию проекта
cd /var/www/fonana

echo "📍 Текущая директория: $(pwd)"
echo "📌 Текущий коммит: $(git rev-parse --short HEAD)"

# Создаем бекап
echo "💾 Создаем бекап .env..."
cp .env .env.backup_$(date +%Y%m%d_%H%M%S)

# Обновляем код
echo "📥 Обновляем код из GitHub..."
git pull origin main

# Устанавливаем права на скрипты
echo "🔧 Настраиваем права доступа..."
chmod +x scripts/*.sh
chmod +x scripts/*.js

# Проверяем изменения в package.json
if git diff HEAD@{1} HEAD --name-only | grep -q "package.json"; then
    echo "📦 Обнаружены изменения в зависимостях, устанавливаем..."
    npm ci
fi

# Настраиваем переменные окружения
echo "🔐 Проверяем переменные окружения Solana..."

# Функция для добавления/обновления переменной
update_env() {
    local key=$1
    local value=$2
    if grep -q "^${key}=" .env; then
        sed -i "s|^${key}=.*|${key}=\"${value}\"|" .env
        echo "✅ Обновлено: ${key}"
    else
        echo "" >> .env
        echo "${key}=\"${value}\"" >> .env
        echo "✅ Добавлено: ${key}"
    fi
}

# Добавляем переменные Solana если их нет
if ! grep -q "NEXT_PUBLIC_SOLANA_RPC_HOST" .env; then
    echo "⚠️  Добавляем переменные Solana..."
    update_env "NEXT_PUBLIC_SOLANA_RPC_HOST" "https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"
    update_env "NEXT_PUBLIC_SOLANA_WS_ENDPOINT" "wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"
    update_env "NEXT_PUBLIC_PLATFORM_WALLET" "npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4"
    update_env "NEXT_PUBLIC_SOLANA_NETWORK" "mainnet-beta"
fi

# Применяем миграции
echo "🗄️  Применяем миграции базы данных..."
npx prisma migrate deploy || {
    echo "⚠️  Используем db push..."
    npx prisma db push --accept-data-loss
}

# Генерируем Prisma клиент
echo "🔨 Генерируем Prisma клиент..."
npx prisma generate

# Собираем приложение
echo "🏗️  Собираем приложение..."
NODE_ENV=production npm run build

# Перезапускаем PM2
echo "🔄 Перезапускаем приложение..."
pm2 reload fonana --update-env

# Ждем запуска
sleep 5

# Проверяем статус
echo "📊 Статус приложения:"
pm2 status

# Проверка здоровья
echo "🏥 Проверка здоровья системы..."
node scripts/health-check.js || true

# Показываем логи
echo "📜 Последние логи:"
pm2 logs fonana --lines 30 --nostream

echo "✅ Деплой завершен успешно!"
ENDSSH

# Проверяем результат
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Деплой завершен успешно!${NC}"
    echo ""
    echo "🔍 Проверьте:"
    echo "   1. https://fonana.me - главная страница"
    echo "   2. https://fonana.me/dashboard/referrals - реферальная система"
    echo "   3. Платежи через Solana"
else
    echo -e "${RED}❌ Ошибка при деплое!${NC}"
    exit 1
fi 