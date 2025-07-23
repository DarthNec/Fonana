#!/bin/bash

echo "🚀 Инициализация Git и деплой Fonana..."

ssh -p 43988 root@fonana.me << 'ENDSSH'
set -e

cd /var/www/fonana

echo "📍 Текущая директория: $(pwd)"

# Проверяем есть ли git
if [ ! -d ".git" ]; then
    echo "⚠️  Git репозиторий не найден, инициализируем..."
    
    # Бекап текущих файлов
    echo "💾 Создаем бекап текущей версии..."
    tar -czf /root/fonana-backup-$(date +%Y%m%d_%H%M%S).tar.gz \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='*.log' \
        .
    
    # Инициализация git
    git init
    git remote add origin https://github.com/DukeDeSouth/Fonana.git
    
    # Сохраняем локальные изменения
    if [ -f ".env" ]; then
        cp .env .env.local-backup
    fi
    
    # Получаем актуальный код
    echo "📥 Получаем код из GitHub..."
    git fetch origin main
    git reset --hard origin/main
    
    # Восстанавливаем .env
    if [ -f ".env.local-backup" ]; then
        mv .env.local-backup .env
    fi
else
    echo "✅ Git репозиторий найден"
    # Обновляем код
    echo "📥 Обновляем код из GitHub..."
    git pull origin main
fi

# Устанавливаем права на скрипты
echo "🔧 Настраиваем права доступа..."
if [ -d "scripts" ]; then
    chmod +x scripts/*.sh 2>/dev/null || true
    chmod +x scripts/*.js 2>/dev/null || true
fi

# Проверяем наличие npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен!"
    exit 1
fi

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
    echo "📦 Устанавливаем зависимости..."
    npm ci
fi

# Настраиваем переменные окружения
echo "🔐 Проверяем переменные окружения..."

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

# Добавляем переменные Solana
if ! grep -q "NEXT_PUBLIC_SOLANA_RPC_HOST" .env; then
    echo "⚠️  Добавляем переменные Solana..."
    update_env "NEXT_PUBLIC_SOLANA_RPC_HOST" "https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"
    update_env "NEXT_PUBLIC_SOLANA_WS_ENDPOINT" "wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"
    update_env "NEXT_PUBLIC_PLATFORM_WALLET" "npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4"
    update_env "NEXT_PUBLIC_SOLANA_NETWORK" "mainnet-beta"
fi

# Проверяем Prisma
if command -v npx &> /dev/null; then
    echo "🗄️  Применяем миграции базы данных..."
    npx prisma migrate deploy 2>/dev/null || {
        echo "⚠️  Используем db push..."
        npx prisma db push --accept-data-loss
    }
    
    echo "🔨 Генерируем Prisma клиент..."
    npx prisma generate
fi

# Собираем приложение
echo "🏗️  Собираем приложение..."
NODE_ENV=production npm run build

# Перезапускаем сервис
echo "🔄 Перезапускаем приложение..."
systemctl restart fonana

# Ждем запуска
sleep 5

# Проверяем статус
echo "📊 Статус приложения:"
systemctl status fonana --no-pager

# Проверка здоровья если есть скрипт
if [ -f "scripts/health-check.js" ]; then
    echo "🏥 Проверка здоровья системы..."
    node scripts/health-check.js || true
fi

# Показываем логи
echo "📜 Последние логи:"
journalctl -u fonana -n 30 --no-pager

echo "✅ Деплой завершен!"
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Деплой завершен успешно!"
    echo ""
    echo "🔍 Проверьте:"
    echo "   1. https://fonana.me - главная страница"
    echo "   2. https://fonana.me/dashboard/referrals - реферальная система"
    echo "   3. Платежи через Solana"
else
    echo "❌ Ошибка при деплое!"
    exit 1
fi 