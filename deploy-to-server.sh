#!/bin/bash

# Скрипт для деплоя Fonana на сервер
# Использование: ./deploy-to-server.sh [user@server]

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Настройки по умолчанию
SERVER="${1:-root@69.10.59.234}"
SSH_PORT="43988"
REMOTE_DIR="/var/www/fonana"
LOCAL_DIR="."

echo -e "${GREEN}🚀 Деплой Fonana на сервер${NC}"
echo -e "📍 Сервер: $SERVER"
echo -e "🔌 SSH порт: $SSH_PORT"
echo -e "📁 Удаленная директория: $REMOTE_DIR"
echo ""

# Проверка SSH доступа
echo -e "${YELLOW}Проверка SSH подключения...${NC}"
ssh -p $SSH_PORT -o ConnectTimeout=5 $SERVER "echo '✅ SSH подключение успешно'" || {
    echo -e "${RED}❌ Не удается подключиться к серверу${NC}"
    echo "Убедитесь, что:"
    echo "1. Сервер доступен"
    echo "2. У вас есть SSH ключ"
    echo "3. Правильный пользователь и IP"
    echo "4. Порт $SSH_PORT открыт"
    exit 1
}

# Создание архива проекта
echo -e "${YELLOW}Создание архива проекта...${NC}"
tar -czf fonana-deploy.tar.gz \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='*.log' \
    --exclude='*.tar.gz' \
    --exclude='.env.local' \
    --exclude='prisma/dev.db' \
    .

echo -e "${GREEN}✅ Архив создан${NC}"

# Загрузка на сервер
echo -e "${YELLOW}Загрузка файлов на сервер...${NC}"
scp -P $SSH_PORT fonana-deploy.tar.gz $SERVER:/tmp/ || {
    echo -e "${RED}❌ Ошибка загрузки файлов${NC}"
    rm fonana-deploy.tar.gz
    exit 1
}

# Развертывание на сервере
echo -e "${YELLOW}Развертывание на сервере...${NC}"
ssh -p $SSH_PORT $SERVER << 'ENDSSH'
set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Подготовка директории...${NC}"
mkdir -p /var/www/fonana
cd /var/www/fonana

# Остановка сервиса
echo -e "${YELLOW}Остановка текущего сервиса...${NC}"
systemctl stop fonana 2>/dev/null || true

# Бэкап текущей версии
if [ -d ".next" ]; then
    echo -e "${YELLOW}Создание бэкапа...${NC}"
    tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz .next public prisma/dev.db 2>/dev/null || true
fi

# Распаковка новой версии
echo -e "${YELLOW}Распаковка новых файлов...${NC}"
tar -xzf /tmp/fonana-deploy.tar.gz
rm /tmp/fonana-deploy.tar.gz

# Установка зависимостей
echo -e "${YELLOW}Установка зависимостей...${NC}"
npm ci --production=false

# Создание .env если не существует
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Создание .env файла...${NC}"
    cat > .env << EOF
DATABASE_URL="file:./prisma/dev.db"
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
EOF
fi

# Генерация Prisma клиента
echo -e "${YELLOW}Генерация Prisma клиента...${NC}"
npx prisma generate

# Миграция БД
echo -e "${YELLOW}Применение миграций БД...${NC}"
npx prisma db push

# Сборка приложения
echo -e "${YELLOW}Сборка приложения...${NC}"
npm run build

# Установка прав
chmod +x *.sh
chown -R root:root /var/www/fonana

# Запуск сервиса
echo -e "${YELLOW}Запуск сервиса...${NC}"
systemctl daemon-reload
systemctl start fonana

# Проверка статуса
sleep 5
if systemctl is-active --quiet fonana; then
    echo -e "${GREEN}✅ Fonana успешно запущена!${NC}"
else
    echo -e "${RED}❌ Ошибка запуска${NC}"
    journalctl -u fonana --no-pager -n 20
    exit 1
fi

echo -e "${GREEN}🎉 Деплой завершен успешно!${NC}"
ENDSSH

# Очистка локальных файлов
rm fonana-deploy.tar.gz

echo -e "${GREEN}✅ Деплой завершен!${NC}"
echo -e "🌐 Сайт доступен по адресу: http://69.10.59.234"
echo ""
echo "Полезные команды на сервере:"
echo "  ssh -p $SSH_PORT $SERVER"
echo "  systemctl status fonana"
echo "  journalctl -u fonana -f"
echo "  systemctl restart fonana"
ENDSSH 