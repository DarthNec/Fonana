#!/bin/bash

# Скрипт установки PostgreSQL на сервер Fonana
# Для сервера с 64GB RAM и Ryzen 5 3600XT

SERVER="root@69.10.59.234"
SSH_PORT="43988"

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🐘 Установка PostgreSQL на сервер Fonana${NC}"
echo -e "📍 Сервер: $SERVER"
echo -e "💾 RAM: 64GB (выделим 16GB для PostgreSQL)"
echo ""

# Установка на сервере
ssh -p $SSH_PORT $SERVER << 'EOF'
set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Обновление системы...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Установка PostgreSQL 16...${NC}"
# Добавляем официальный репозиторий PostgreSQL
sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install postgresql-16 postgresql-contrib-16 -y

echo -e "${GREEN}✅ PostgreSQL установлен${NC}"

# Настройка PostgreSQL для производительности (64GB RAM сервер)
echo -e "${YELLOW}Оптимизация PostgreSQL для 64GB RAM...${NC}"

# Бэкап оригинального конфига
cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.backup

# Оптимизация параметров для 64GB RAM
cat >> /etc/postgresql/16/main/postgresql.conf << 'PGCONF'

# Оптимизация для Fonana (64GB RAM, SSD)
# Память
shared_buffers = 16GB              # 25% от RAM
effective_cache_size = 48GB        # 75% от RAM
maintenance_work_mem = 2GB         # для VACUUM, CREATE INDEX
work_mem = 64MB                    # для сортировок
wal_buffers = 64MB

# Подключения
max_connections = 200              # достаточно для веб-приложения

# Checkpoint
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
max_wal_size = 4GB
min_wal_size = 1GB

# Планировщик запросов
random_page_cost = 1.1             # для SSD
effective_io_concurrency = 200     # для SSD

# Логирование
log_min_duration_statement = 1000  # логировать запросы дольше 1 сек
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0

# Автовакуум
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s

# Статистика
track_io_timing = on
track_functions = all
PGCONF

# Разрешаем подключения
echo -e "${YELLOW}Настройка подключений...${NC}"
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/16/main/postgresql.conf

# Настройка pg_hba.conf для локальных подключений
echo "host    fonana          fonana_user     127.0.0.1/32            scram-sha-256" >> /etc/postgresql/16/main/pg_hba.conf

# Перезапуск PostgreSQL
systemctl restart postgresql

echo -e "${YELLOW}Создание базы данных и пользователя...${NC}"

# Генерация безопасного пароля
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Создание БД и пользователя
sudo -u postgres psql << SQLEOF
CREATE DATABASE fonana;
CREATE USER fonana_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE fonana TO fonana_user;
ALTER DATABASE fonana OWNER TO fonana_user;

-- Оптимизация для веб-приложения
ALTER DATABASE fonana SET log_statement = 'mod';
ALTER DATABASE fonana SET log_duration = on;
ALTER DATABASE fonana SET log_min_duration_statement = 1000;
SQLEOF

echo -e "${GREEN}✅ База данных создана${NC}"

# Сохранение credentials
echo -e "${YELLOW}Сохранение данных подключения...${NC}"
cat > /root/fonana-db-credentials.txt << CREDS
=== Fonana Database Credentials ===
Database: fonana
User: fonana_user
Password: $DB_PASSWORD
Host: localhost
Port: 5432

Connection string:
DATABASE_URL="postgresql://fonana_user:$DB_PASSWORD@localhost:5432/fonana?schema=public"

Сохраните эти данные в безопасном месте!
CREDS

chmod 600 /root/fonana-db-credentials.txt

# Обновление .env в Fonana
cd /var/www/fonana
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)
sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://fonana_user:$DB_PASSWORD@localhost:5432/fonana?schema=public\"|" .env

echo -e "${YELLOW}Применение миграций Prisma...${NC}"
npx prisma migrate deploy || npx prisma db push
npx prisma generate

echo -e "${YELLOW}Перезапуск Fonana...${NC}"
systemctl restart fonana

echo -e "${GREEN}🎉 PostgreSQL установлен и настроен!${NC}"
echo ""
echo "📄 Credentials сохранены в: /root/fonana-db-credentials.txt"
echo "🔗 Connection string обновлен в .env"
echo ""
echo "Статус PostgreSQL:"
systemctl status postgresql --no-pager | head -10
echo ""
echo "Статус Fonana:"
systemctl status fonana --no-pager | head -10
EOF

echo ""
echo -e "${GREEN}✅ Установка завершена!${NC}"
echo ""
echo "Команды для проверки:"
echo "  ssh -p $SSH_PORT $SERVER 'cat /root/fonana-db-credentials.txt'"
echo "  ssh -p $SSH_PORT $SERVER 'systemctl status postgresql'"
echo "  ssh -p $SSH_PORT $SERVER 'sudo -u postgres psql -c \"\\l\"'"
EOF 