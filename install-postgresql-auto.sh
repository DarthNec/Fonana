#!/bin/bash

# Автоматическая установка PostgreSQL без интерактивных вопросов

SERVER="root@69.10.59.234"
SSH_PORT="43988"

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🐘 Установка PostgreSQL на сервер Fonana${NC}"
echo -e "📍 Сервер: $SERVER"
echo ""

# Установка на сервере
ssh -p $SSH_PORT $SERVER 'bash -s' << 'EOF'
set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Пропускаем интерактивные вопросы
export DEBIAN_FRONTEND=noninteractive

echo -e "${YELLOW}Установка PostgreSQL 16...${NC}"

# Добавляем репозиторий PostgreSQL
apt-get install -y wget ca-certificates
sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update

# Устанавливаем PostgreSQL
apt-get install -y postgresql-16 postgresql-contrib-16

echo -e "${GREEN}✅ PostgreSQL установлен${NC}"

# Настройка PostgreSQL
echo -e "${YELLOW}Настройка PostgreSQL...${NC}"

# Оптимизация для 64GB RAM
cat >> /etc/postgresql/16/main/postgresql.conf << 'PGCONF'

# Fonana optimization (64GB RAM)
shared_buffers = 16GB
effective_cache_size = 48GB
maintenance_work_mem = 2GB
work_mem = 64MB
max_connections = 200
checkpoint_completion_target = 0.9
random_page_cost = 1.1
effective_io_concurrency = 200
PGCONF

# Перезапуск PostgreSQL
systemctl restart postgresql

echo -e "${YELLOW}Создание базы данных...${NC}"

# Генерация пароля
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Создание БД
sudo -u postgres psql << SQLEOF
CREATE DATABASE fonana;
CREATE USER fonana_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE fonana TO fonana_user;
ALTER DATABASE fonana OWNER TO fonana_user;
SQLEOF

# Сохранение credentials
cat > /root/fonana-db-credentials.txt << CREDS
=== Fonana Database Credentials ===
Database: fonana
User: fonana_user
Password: $DB_PASSWORD
Host: localhost
Port: 5432

Connection string:
DATABASE_URL="postgresql://fonana_user:$DB_PASSWORD@localhost:5432/fonana?schema=public"
CREDS

chmod 600 /root/fonana-db-credentials.txt

# Обновление Fonana
cd /var/www/fonana
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)
sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://fonana_user:$DB_PASSWORD@localhost:5432/fonana?schema=public\"|" .env

echo -e "${YELLOW}Применение миграций...${NC}"
npx prisma db push
npx prisma generate

echo -e "${YELLOW}Перезапуск Fonana...${NC}"
systemctl restart fonana

echo -e "${GREEN}🎉 PostgreSQL установлен!${NC}"
echo ""
echo "📄 Credentials: /root/fonana-db-credentials.txt"
echo ""
echo "PostgreSQL status:"
systemctl status postgresql --no-pager | head -5
echo ""
echo "Fonana status:"
systemctl status fonana --no-pager | head -5
EOF

echo ""
echo -e "${GREEN}✅ Готово!${NC}"
echo ""
echo "Проверить credentials:"
echo "  ssh -p $SSH_PORT $SERVER 'cat /root/fonana-db-credentials.txt'" 