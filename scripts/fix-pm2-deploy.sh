#!/bin/bash

echo "🚀 FONANA PM2 DEPLOY FIX SCRIPT"
echo "================================"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📍 Проверяем что занимает порт 3000...${NC}"
PORT_PROCESS=$(lsof -ti:3000)
if [ ! -z "$PORT_PROCESS" ]; then
    echo -e "${RED}❌ Порт 3000 занят процессом: $PORT_PROCESS${NC}"
    echo -e "${YELLOW}🔧 Убиваем процесс...${NC}"
    kill -9 $PORT_PROCESS
    sleep 2
else
    echo -e "${GREEN}✅ Порт 3000 свободен${NC}"
fi

echo -e "${YELLOW}📍 Останавливаем все PM2 процессы...${NC}"
pm2 stop all
pm2 delete all

echo -e "${YELLOW}📍 Проверяем директорию...${NC}"
cd /var/www/Fonana
pwd

echo -e "${YELLOW}📍 Проверяем файл server.js...${NC}"
if [ -f ".next/standalone/server.js" ]; then
    echo -e "${GREEN}✅ server.js найден${NC}"
else
    echo -e "${RED}❌ server.js НЕ найден! Нужен build${NC}"
    exit 1
fi

echo -e "${YELLOW}📍 Запускаем новый PM2 процесс...${NC}"
pm2 start .next/standalone/server.js --name fonana-app

echo -e "${YELLOW}📍 Ждем 5 секунд для стабилизации...${NC}"
sleep 5

echo -e "${YELLOW}📍 Проверяем статус PM2...${NC}"
pm2 list

echo -e "${YELLOW}📍 Проверяем логи (последние 10 строк)...${NC}"
pm2 logs fonana-app --lines 10 --nostream

echo -e "${YELLOW}📍 Тестируем доступность сайта...${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Сайт доступен (HTTP $STATUS)${NC}"
else
    echo -e "${RED}❌ Сайт НЕ доступен (HTTP $STATUS)${NC}"
fi

echo -e "${YELLOW}📍 Проверяем новый API загрузки (исправленный путь)...${NC}"
echo "Путь должен быть: /var/www/Fonana/public/posts/images/"

echo -e "${GREEN}🎉 ДЕПЛОЙ ЗАВЕРШЕН!${NC}"
echo "================================"
echo "PM2 статус:"
pm2 list --no-color
echo ""
echo "Для мониторинга логов: pm2 logs fonana-app"
echo "Для перезапуска: pm2 restart fonana-app" 