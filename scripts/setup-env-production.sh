#!/bin/bash

# Скрипт настройки переменных окружения Solana для продакшна

echo "🔧 Настройка переменных окружения Solana для Fonana..."

# Проверяем, что мы на сервере
if [ ! -f "/var/www/Fonana/.env" ]; then
    echo "❌ Ошибка: .env файл не найден в /var/www/Fonana/"
    echo "Убедитесь, что вы запускаете скрипт на сервере"
    exit 1
fi

# Переходим в директорию проекта
cd /var/www/Fonana || exit 1

# Создаем бекап .env файла
cp .env .env.backup_before_solana_$(date +%Y%m%d_%H%M%S)
echo "✅ Создан бекап .env файла"

# Удаляем существующие переменные Solana (если есть)
sed -i '/NEXT_PUBLIC_SOLANA_RPC_ENDPOINT/d' .env
sed -i '/NEXT_PUBLIC_SOLANA_NETWORK/d' .env
sed -i '/SOLANA_NETWORK/d' .env
sed -i '/PLATFORM_WALLET_PRIVATE_KEY/d' .env
sed -i '/NEXT_PUBLIC_PLATFORM_WALLET/d' .env

# Добавляем новые переменные Solana
echo "" >> .env
echo "# === SOLANA CONFIGURATION ===" >> .env
echo "NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/" >> .env
echo "NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta" >> .env
echo "SOLANA_NETWORK=mainnet-beta" >> .env

# Эти значения должны быть заполнены администратором
echo "PLATFORM_WALLET_PRIVATE_KEY=" >> .env
echo "NEXT_PUBLIC_PLATFORM_WALLET=npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4" >> .env

echo ""
echo "✅ Переменные Solana добавлены в .env"
echo ""
echo "⚠️  ВАЖНО: Необходимо установить значение PLATFORM_WALLET_PRIVATE_KEY"
echo "    Это должен быть приватный ключ кошелька платформы"
echo ""
echo "📝 Текущие переменные Solana:"
grep -E "(SOLANA|PLATFORM_WALLET)" .env
echo ""
echo "🔧 Для завершения настройки:"
echo "   1. Откройте файл .env"
echo "   2. Установите значение PLATFORM_WALLET_PRIVATE_KEY"
echo "   3. Перезапустите приложение: pm2 restart fonana"
echo ""
echo "🔒 Убедитесь, что приватный ключ хранится в безопасности!"

# Проверяем, что все необходимые переменные установлены
echo ""
echo "🔍 Проверка переменных окружения..."

if grep -q "PLATFORM_WALLET_PRIVATE_KEY=$" .env; then
    echo "⚠️  PLATFORM_WALLET_PRIVATE_KEY не установлен"
else
    echo "✅ PLATFORM_WALLET_PRIVATE_KEY установлен"
fi

if grep -q "NEXT_PUBLIC_PLATFORM_WALLET=npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4" .env; then
    echo "✅ NEXT_PUBLIC_PLATFORM_WALLET установлен"
fi

echo ""
echo "🎉 Настройка завершена!" 