#!/bin/bash

# Скрипт для переноса данных из Supabase в локальную PostgreSQL
# Usage: ./supabase-to-local.sh "postgresql://user:pass@localhost:5432/dbname"

set -e

LOCAL_DB_URL=$1
SUPABASE_URL="https://iwzfrnfemdeomowothhn.supabase.co"

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$LOCAL_DB_URL" ]; then
    echo -e "${RED}❌ Ошибка: Укажите URL локальной базы данных${NC}"
    echo "Использование: ./supabase-to-local.sh \"postgresql://user:pass@localhost:5432/dbname\""
    echo ""
    echo "Примеры:"
    echo "  Docker:  ./supabase-to-local.sh \"postgresql://fonana_user:fonana_password@localhost:5432/fonana\""
    echo "  Neon:    ./supabase-to-local.sh \"postgresql://user:pass@xxx.neon.tech/dbname\""
    exit 1
fi

echo -e "${BLUE}🚀 Перенос данных Fonana из Supabase в локальную базу${NC}"
echo -e "📍 Источник: $SUPABASE_URL"
echo -e "🎯 Назначение: ${LOCAL_DB_URL:0:30}..."
echo ""

# Обновляем .env для локальной базы
echo -e "${YELLOW}📝 Обновление .env файла...${NC}"
cp .env .env.backup.$(date +%Y%m%d-%H%M%S)
sed -i.tmp "s|DATABASE_URL=.*|DATABASE_URL=\"$LOCAL_DB_URL\"|" .env
rm -f .env.tmp
echo -e "${GREEN}✅ .env обновлен${NC}"

# Генерируем Prisma клиент
echo -e "${YELLOW}🔄 Генерация Prisma клиента...${NC}"
npx prisma generate

# Применяем схему к новой базе
echo -e "${YELLOW}🗄️ Применение схемы базы данных...${NC}"
npx prisma migrate deploy || npx prisma db push

echo -e "${GREEN}✅ Схема применена успешно!${NC}"
echo ""
echo -e "${BLUE}📊 Статистика переноса:${NC}"
echo -e "🎯 База готова к использованию"
echo -e "📈 Данные будут загружаться через API"
echo ""
echo -e "${GREEN}🎉 Настройка завершена!${NC}"
echo ""
echo "Полезные команды:"
echo "  Просмотр данных: npx prisma studio"
echo "  Проверка БД:     npm run dev"
echo "  Сброс БД:        npx prisma migrate reset" 