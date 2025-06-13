#!/bin/bash

echo "🔍 Диагностика Fonana..."

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "=========================="
echo "🔧 СИСТЕМНАЯ ИНФОРМАЦИЯ"
echo "=========================="
info "Hostname: $(hostname)"
info "Дата: $(date)"
info "Пользователь: $(whoami)"
info "Рабочая директория: $(pwd)"

echo ""
echo "=========================="
echo "📦 ПРОВЕРКА NODE.JS"
echo "=========================="
node --version > /dev/null 2>&1
check "Node.js установлен: $(node --version 2>/dev/null || echo 'НЕ УСТАНОВЛЕН')"

npm --version > /dev/null 2>&1  
check "NPM установлен: $(npm --version 2>/dev/null || echo 'НЕ УСТАНОВЛЕН')"

echo ""
echo "=========================="
echo "📁 ПРОВЕРКА ФАЙЛОВ"
echo "=========================="
[ -f "package.json" ]
check "package.json существует"

[ -f ".env" ]
if [ $? -eq 0 ]; then
    check ".env файл существует"
    echo "   DATABASE_URL: $(grep DATABASE_URL .env | cut -d'=' -f2)"
else
    warning ".env файл отсутствует"
fi

[ -f "next.config.js" ]
check "next.config.js существует"

[ -d "prisma" ]
check "Директория prisma существует"

[ -f "prisma/schema.prisma" ]
check "Схема Prisma существует"

[ -f "prisma/dev.db" ]
check "База данных SQLite существует"

echo ""
echo "=========================="
echo "🏗️  ПРОВЕРКА СБОРКИ"
echo "=========================="
[ -d ".next" ]
check "Директория .next существует"

[ -d ".next/standalone" ]
check "Standalone сборка существует"

[ -f ".next/standalone/server.js" ]
check "Файл server.js существует"

[ -d "node_modules" ]
check "node_modules установлены"

echo ""
echo "=========================="
echo "🔌 ПРОВЕРКА ПОРТОВ"
echo "=========================="
if netstat -tuln | grep :3001 > /dev/null; then
    check "Порт 3001 открыт"
    PROCESS=$(lsof -ti:3001)
    if [ ! -z "$PROCESS" ]; then
        info "PID процесса на порту 3001: $PROCESS"
        info "Команда: $(ps -p $PROCESS -o comm= 2>/dev/null || echo 'Неизвестно')"
    fi
else
    warning "Порт 3001 свободен"
fi

if netstat -tuln | grep :80 > /dev/null; then
    check "Порт 80 (nginx) открыт"
else
    warning "Порт 80 свободен"
fi

echo ""
echo "=========================="
echo "🎯 ПРОВЕРКА СЕРВИСОВ"
echo "=========================="
systemctl is-active --quiet fonana
check "Сервис fonana активен"

systemctl is-enabled --quiet fonana
check "Сервис fonana включен для автозапуска"

systemctl is-active --quiet nginx
check "Сервис nginx активен"

echo ""
echo "=========================="
echo "📋 ЛОГИ СЕРВИСА"
echo "=========================="
echo "Последние 10 строк логов fonana:"
journalctl -u fonana --no-pager -n 10 2>/dev/null || warning "Не удается получить логи"

echo ""
echo "=========================="
echo "🌐 ПРОВЕРКА СЕТИ"
echo "=========================="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 > /tmp/status_code 2>/dev/null
STATUS_CODE=$(cat /tmp/status_code 2>/dev/null || echo "000")
if [ "$STATUS_CODE" = "200" ]; then
    check "HTTP ответ от localhost:3001: $STATUS_CODE"
else
    warning "HTTP ответ от localhost:3001: $STATUS_CODE"
fi

curl -s -o /dev/null -w "%{http_code}" http://localhost:80 > /tmp/status_code_80 2>/dev/null
STATUS_CODE_80=$(cat /tmp/status_code_80 2>/dev/null || echo "000")
if [ "$STATUS_CODE_80" = "200" ] || [ "$STATUS_CODE_80" = "301" ] || [ "$STATUS_CODE_80" = "302" ]; then
    check "HTTP ответ от localhost:80: $STATUS_CODE_80"
else
    warning "HTTP ответ от localhost:80: $STATUS_CODE_80"
fi

echo ""
echo "=========================="
echo "💡 РЕКОМЕНДАЦИИ"
echo "=========================="

if [ ! -f ".env" ]; then
    echo "• Создайте .env файл с DATABASE_URL"
fi

if [ ! systemctl is-active --quiet fonana ]; then
    echo "• Запустите сервис: systemctl start fonana"
fi

if [ "$STATUS_CODE" != "200" ]; then
    echo "• Проверьте логи: journalctl -u fonana -f"
fi

echo ""
echo "🔍 Диагностика завершена" 