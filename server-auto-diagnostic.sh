#!/bin/bash

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 АВТОМАТИЧЕСКАЯ ДИАГНОСТИКА СЕРВЕРА FONANA${NC}"
echo "============================================="
echo ""

# Функция для проверки
check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# 1. ПРОВЕРКА СТРУКТУРЫ
echo -e "${YELLOW}1. ПРОВЕРКА СТРУКТУРЫ ПРОЕКТА${NC}"
ssh -p 43988 root@69.10.59.234 "test -d /var/www/fonana" 2>/dev/null
check $? "Папка /var/www/fonana существует"

ssh -p 43988 root@69.10.59.234 "test -d /var/www/fonana/.next" 2>/dev/null
check $? "Папка .next существует"

ssh -p 43988 root@69.10.59.234 "test -d /var/www/fonana/node_modules" 2>/dev/null
check $? "Папка node_modules существует"

ssh -p 43988 root@69.10.59.234 "test -f /var/www/fonana/package.json" 2>/dev/null
check $? "Файл package.json существует"

echo ""

# 2. ПРОВЕРКА ПРОЦЕССОВ
echo -e "${YELLOW}2. ПРОВЕРКА ПРОЦЕССОВ${NC}"
ssh -p 43988 root@69.10.59.234 "ps aux | grep -q '[n]ode.*npm'" 2>/dev/null
check $? "Node.js процесс запущен"

ssh -p 43988 root@69.10.59.234 "lsof -i :3001 | grep -q LISTEN" 2>/dev/null
check $? "Порт 3001 прослушивается"

ssh -p 43988 root@69.10.59.234 "systemctl is-active fonana" 2>/dev/null | grep -q "active"
check $? "Systemd сервис fonana активен"

echo ""

# 3. ПРОВЕРКА NGINX
echo -e "${YELLOW}3. ПРОВЕРКА NGINX${NC}"
ssh -p 43988 root@69.10.59.234 "nginx -t" 2>/dev/null
check $? "Конфигурация nginx корректна"

ssh -p 43988 root@69.10.59.234 "grep -q '/var/www/fonana/.next/static' /etc/nginx/sites-available/fonana" 2>/dev/null
check $? "Пути к статическим файлам правильные"

echo ""

# 4. ПРОВЕРКА ДОСТУПНОСТИ
echo -e "${YELLOW}4. ПРОВЕРКА ДОСТУПНОСТИ${NC}"
curl -s -o /dev/null -w "%{http_code}" https://fonana.me | grep -q "200"
check $? "Сайт https://fonana.me доступен (HTTP 200)"

# Проверка статических файлов
WEBPACK_FILE=$(curl -s https://fonana.me | grep -o 'webpack-[a-f0-9]*\.js' | head -1)
if [ ! -z "$WEBPACK_FILE" ]; then
    curl -s -o /dev/null -w "%{http_code}" "https://fonana.me/_next/static/chunks/$WEBPACK_FILE" | grep -q "200"
    check $? "Статический файл $WEBPACK_FILE доступен"
else
    echo -e "${RED}❌ Не найден webpack файл в HTML${NC}"
fi

echo ""

# 5. ПРОВЕРКА ХЕШЕЙ
echo -e "${YELLOW}5. ПРОВЕРКА СООТВЕТСТВИЯ ХЕШЕЙ${NC}"
SERVER_HASH=$(ssh -p 43988 root@69.10.59.234 "ls /var/www/fonana/.next/static/chunks/webpack-*.js 2>/dev/null | head -1 | grep -o '[a-f0-9]\{16\}'" 2>/dev/null)
HTML_HASH=$(curl -s https://fonana.me | grep -o 'webpack-[a-f0-9]*\.js' | head -1 | grep -o '[a-f0-9]\{16\}')

if [ "$SERVER_HASH" = "$HTML_HASH" ]; then
    echo -e "${GREEN}✅ Хеши совпадают: $SERVER_HASH${NC}"
else
    echo -e "${RED}❌ Хеши НЕ совпадают!${NC}"
    echo -e "   Сервер: $SERVER_HASH"
    echo -e "   HTML:   $HTML_HASH"
fi

echo ""
echo "============================================="
echo -e "${BLUE}РЕКОМЕНДАЦИИ:${NC}"
echo ""

# Рекомендации на основе результатов
if [ "$SERVER_HASH" != "$HTML_HASH" ]; then
    echo -e "${YELLOW}⚠️  Необходима пересборка на сервере:${NC}"
    echo "   ssh -p 43988 root@69.10.59.234"
    echo "   cd /var/www/fonana"
    echo "   pkill -9 -f node"
    echo "   rm -rf .next"
    echo "   npm run build"
    echo "   PORT=3001 npm start"
fi 