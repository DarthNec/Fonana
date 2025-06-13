#!/bin/bash

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔄 ПОЛНАЯ ПЕРЕУСТАНОВКА FONANA${NC}"
echo -e "${RED}⚠️  Это удалит ВСЁ и установит заново!${NC}"
echo ""

# Запуск clean-and-deploy.sh
chmod +x clean-and-deploy.sh
./clean-and-deploy.sh

echo ""
echo -e "${GREEN}✅ Скрипт завершен!${NC}"
echo -e "${YELLOW}📋 ВАЖНО: Теперь выполните команды на сервере, которые показаны выше!${NC}"
echo ""
echo -e "${BLUE}После выполнения команд на сервере, проверьте:${NC}"
echo "1. https://fonana.me - должен открываться сайт"
echo "2. В консоли браузера не должно быть 404 ошибок"
echo "3. Все статические файлы должны загружаться"
echo ""
echo -e "${GREEN}Удачи! 🚀${NC}" 