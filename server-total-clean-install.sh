#!/bin/bash

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🧹 ПОЛНАЯ ОЧИСТКА И ПЕРЕУСТАНОВКА FONANA${NC}"
echo "============================================"
echo ""
echo -e "${YELLOW}ВНИМАНИЕ: Это удалит ВСЁ связанное с Fonana!${NC}"
echo ""

# Этот скрипт выполняется НА СЕРВЕРЕ
cat > /tmp/clean-server.sh << 'SCRIPT'
#!/bin/bash

echo "🛑 ЭТАП 1: ПОЛНАЯ ОСТАНОВКА ВСЕХ ПРОЦЕССОВ"
echo "==========================================="

# Остановка systemd сервисов
systemctl stop fonana 2>/dev/null || true
systemctl disable fonana 2>/dev/null || true

# Убийство всех Node.js процессов
pkill -9 -f node
pkill -9 -f npm
pkill -9 -f next
sleep 2

echo "✅ Все процессы остановлены"
echo ""

echo "🗑️ ЭТАП 2: УДАЛЕНИЕ ВСЕХ ФАЙЛОВ"
echo "================================"

# Удаление проекта
rm -rf /var/www/fonana
rm -rf /var/www/.next
rm -rf /root/.npm
rm -rf /root/.cache

# Удаление systemd сервисов
rm -f /etc/systemd/system/fonana*
systemctl daemon-reload

# Удаление nginx конфигураций
rm -f /etc/nginx/sites-enabled/fonana*
rm -f /etc/nginx/sites-available/fonana*
rm -rf /var/cache/nginx/*

# Удаление логов
rm -f /var/log/fonana*
rm -f /var/www/fonana*.log

# Удаление временных файлов
rm -f /tmp/fonana*
rm -f /tmp/*server*.sh
rm -f /tmp/auto-rebuild*.sh

echo "✅ Все файлы удалены"
echo ""

echo "🔧 ЭТАП 3: ПРОВЕРКА ЧИСТОТЫ"
echo "==========================="

# Проверка процессов
PROCS=$(ps aux | grep -E "(node|npm|next)" | grep -v grep | wc -l)
echo "Процессов Node.js: $PROCS (должно быть 0)"

# Проверка файлов
if [ -d "/var/www/fonana" ]; then
    echo "❌ Папка /var/www/fonana всё ещё существует!"
else
    echo "✅ Папка /var/www/fonana удалена"
fi

# Проверка nginx
NGINX_CONF=$(ls /etc/nginx/sites-*/fonana* 2>/dev/null | wc -l)
echo "Конфигураций nginx для fonana: $NGINX_CONF (должно быть 0)"

echo ""
echo "🧹 СЕРВЕР ПОЛНОСТЬЮ ОЧИЩЕН!"
echo ""
echo "Теперь можно устанавливать проект заново."
SCRIPT

echo -e "${BLUE}ШАГ 1: Загрузка скрипта очистки на сервер${NC}"
scp -P 43988 /tmp/clean-server.sh root@69.10.59.234:/tmp/

echo ""
echo -e "${BLUE}ШАГ 2: Выполнение очистки на сервере${NC}"
ssh -p 43988 root@69.10.59.234 "chmod +x /tmp/clean-server.sh && /tmp/clean-server.sh"

echo ""
echo -e "${GREEN}✅ Сервер очищен!${NC}"
echo ""
echo -e "${BLUE}ШАГ 3: Установка проекта заново${NC}"
echo ""
echo "Запустите:"
echo "./clean-and-deploy.sh"
echo ""
echo "Это создаст и загрузит свежую сборку проекта на чистый сервер." 