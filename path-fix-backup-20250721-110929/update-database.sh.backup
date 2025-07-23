#!/bin/bash

# Скрипт для обновления базы данных на сервере
# Использование: ./update-database.sh "postgresql://..."

DATABASE_URL=$1
SERVER="root@69.10.59.234"
SSH_PORT="43988"

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Ошибка: Укажите DATABASE_URL${NC}"
    echo "Использование: ./update-database.sh DATABASE_URL"
    echo ""
    echo "Примеры:"
    echo "  Supabase: ./update-database.sh \"postgresql://postgres:password@db.xxx.supabase.co:5432/postgres\""
    echo "  Neon:     ./update-database.sh \"postgresql://user:password@xxx.neon.tech/neondb\""
    echo "  Local:    ./update-database.sh \"postgresql://user:password@localhost:5432/fonana\""
    exit 1
fi

echo -e "${GREEN}🔄 Обновление базы данных Fonana${NC}"
echo -e "📍 Сервер: $SERVER"
echo -e "🗄️  Новая БД: ${DATABASE_URL:0:30}..."
echo ""

# Проверка подключения
echo -e "${YELLOW}Проверка SSH подключения...${NC}"
ssh -p $SSH_PORT -o ConnectTimeout=5 $SERVER "echo '✅ Подключение успешно'" || {
    echo -e "${RED}❌ Не удается подключиться к серверу${NC}"
    exit 1
}

# Обновление на сервере
ssh -p $SSH_PORT $SERVER << EOF
set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /var/www/fonana

echo -e "\${YELLOW}Создание бэкапа текущей БД...${NC}"
if [ -f "prisma/dev.db" ]; then
    cp prisma/dev.db prisma/dev.db.backup-\$(date +%Y%m%d-%H%M%S)
    echo -e "\${GREEN}✅ Бэкап создан${NC}"
fi

echo -e "\${YELLOW}Обновление .env файла...${NC}"
# Создаем временный файл с новым DATABASE_URL
grep -v "^DATABASE_URL=" .env > .env.tmp || true
echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env.tmp
mv .env.tmp .env
echo -e "\${GREEN}✅ .env обновлен${NC}"

echo -e "\${YELLOW}Применение миграций...${NC}"
npx prisma migrate deploy || {
    echo -e "\${YELLOW}Миграции не найдены, используем db push...${NC}"
    npx prisma db push
}

echo -e "\${YELLOW}Генерация Prisma клиента...${NC}"
npx prisma generate

echo -e "\${YELLOW}Перезапуск сервиса...${NC}"
systemctl restart fonana

# Проверка статуса
sleep 3
if systemctl is-active --quiet fonana; then
    echo -e "\${GREEN}✅ Сервис успешно перезапущен!${NC}"
else
    echo -e "\${RED}❌ Ошибка запуска сервиса${NC}"
    journalctl -u fonana --no-pager -n 20
    exit 1
fi

echo -e "\${GREEN}🎉 База данных успешно обновлена!${NC}"
EOF

echo ""
echo -e "${GREEN}✅ Обновление завершено!${NC}"
echo ""
echo "Полезные команды:"
echo "  Проверить статус: ssh -p $SSH_PORT $SERVER 'systemctl status fonana'"
echo "  Посмотреть логи:  ssh -p $SSH_PORT $SERVER 'journalctl -u fonana -f'"
echo "  Тест БД:          ssh -p $SSH_PORT $SERVER 'cd /var/www/fonana && npx prisma studio'" 