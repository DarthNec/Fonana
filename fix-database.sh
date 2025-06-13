#!/bin/bash

# Исправление конфигурации БД на сервере

SERVER="root@69.10.59.234"
SSH_PORT="43988"

echo "🔧 Исправление конфигурации БД..."

# Обновляем схему на сервере
scp -P $SSH_PORT prisma/schema.prisma $SERVER:/var/www/fonana/prisma/

# Применяем изменения
ssh -p $SSH_PORT $SERVER << 'EOF'
cd /var/www/fonana

echo "📝 Обновление Prisma схемы..."
# Проверяем что схема обновлена
grep "postgresql" prisma/schema.prisma && echo "✅ Схема обновлена на PostgreSQL"

echo "🔄 Применение миграций..."
npx prisma db push --accept-data-loss
npx prisma generate

echo "🔄 Перезапуск сервиса..."
systemctl restart fonana

sleep 3
if systemctl is-active --quiet fonana; then
    echo "✅ Сервис работает!"
    systemctl status fonana --no-pager | head -10
else
    echo "❌ Ошибка запуска"
    journalctl -u fonana --no-pager -n 20
fi
EOF

echo "✅ Готово!"
echo "🌐 Проверьте сайт: https://fonana.me" 