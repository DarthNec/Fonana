#!/bin/bash

# Скрипт для настройки переменных окружения Solana на продакшн сервере
# Использование: ./scripts/setup-env-production.sh

echo "🔧 Настройка переменных окружения Solana для Fonana..."

# Проверяем, что мы на сервере
if [ ! -f "/var/www/fonana/.env" ]; then
    echo "❌ Ошибка: .env файл не найден в /var/www/fonana/"
    echo "Убедитесь, что вы запускаете скрипт на сервере"
    exit 1
fi

# Переходим в директорию проекта
cd /var/www/fonana || exit 1

# Создаем бекап .env файла
cp .env .env.backup_before_solana_$(date +%Y%m%d_%H%M%S)
echo "✅ Создан бекап .env файла"

# Функция для добавления или обновления переменной в .env
update_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" .env; then
        # Переменная существует, обновляем
        sed -i "s|^${key}=.*|${key}=\"${value}\"|" .env
        echo "✅ Обновлено: ${key}"
    else
        # Переменная не существует, добавляем
        echo "" >> .env
        echo "${key}=\"${value}\"" >> .env
        echo "✅ Добавлено: ${key}"
    fi
}

echo ""
echo "📡 Настройка Solana RPC и кошельков..."

# QuickNode RPC endpoints
update_env_var "NEXT_PUBLIC_SOLANA_RPC_HOST" "https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"
update_env_var "NEXT_PUBLIC_SOLANA_WS_ENDPOINT" "wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"

# Platform wallet
update_env_var "NEXT_PUBLIC_PLATFORM_WALLET" "npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4"

# Network
update_env_var "NEXT_PUBLIC_SOLANA_NETWORK" "mainnet-beta"

echo ""
echo "📋 Проверка установленных переменных:"
echo "-------------------------------------"
grep -E "SOLANA|PLATFORM_WALLET" .env | grep -v "^#"
echo "-------------------------------------"

echo ""
echo "✅ Переменные окружения настроены!"
echo ""
echo "⚠️  ВАЖНО: Не забудьте перезапустить приложение:"
echo "   pm2 restart fonana --update-env"
echo ""
echo "💡 Совет: В будущем вы можете изменить NEXT_PUBLIC_PLATFORM_WALLET"
echo "   на отдельный кошелек для платформы вместо личного."
echo "" 