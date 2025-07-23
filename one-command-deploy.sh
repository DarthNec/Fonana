#!/bin/bash

# Единый скрипт деплоя - выполнить на сервере после входа по SSH

set -e

echo "🚀 Запуск полного деплоя Fonana..."
echo "================================"

cd /var/www/Fonana

# Проверка Git репозитория
if [ ! -d ".git" ]; then
    echo "📦 Инициализация Git репозитория..."
    git init
    git remote add origin https://github.com/DukeDeSouth/Fonana.git
    
    # Сохраняем .env
    [ -f ".env" ] && cp .env .env.backup
    
    # Получаем код
    git fetch origin main
    git reset --hard origin/main
    
    # Восстанавливаем .env
    [ -f ".env.backup" ] && mv .env.backup .env
else
    echo "📥 Обновляем код..."
    git pull origin main
fi

# Настройка прав
chmod +x scripts/*.sh scripts/*.js 2>/dev/null || true

# Установка зависимостей
echo "📦 Проверка зависимостей..."
npm ci

# Настройка Solana переменных
echo "🔐 Настройка переменных окружения..."
grep -q "NEXT_PUBLIC_SOLANA_RPC_HOST" .env || cat >> .env << 'EOF'

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_HOST="https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"
NEXT_PUBLIC_SOLANA_WS_ENDPOINT="wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"
NEXT_PUBLIC_PLATFORM_WALLET="npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4"
NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"
EOF

# Миграции БД
echo "🗄️  Применение миграций..."
npx prisma migrate deploy || npx prisma db push --accept-data-loss

# Генерация Prisma
echo "🔨 Генерация Prisma клиента..."
npx prisma generate

# Сборка
echo "🏗️  Сборка приложения..."
NODE_ENV=production npm run build

# Перезапуск
echo "🔄 Перезапуск сервиса..."
systemctl restart fonana

# Проверка
sleep 5
echo ""
echo "✅ ДЕПЛОЙ ЗАВЕРШЕН!"
echo ""
echo "📊 Статус:"
systemctl status fonana --no-pager
echo ""
echo "📜 Последние логи:"
journalctl -u fonana -n 20 --no-pager
echo ""
echo "🔗 Проверьте: https://fonana.me" 