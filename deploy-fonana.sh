#!/bin/bash

echo "🚀 Развертывание Fonana..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Проверка root прав
if [[ $EUID -ne 0 ]]; then
   error "Этот скрипт должен запускаться с правами root"
   exit 1
fi

# Установка рабочей директории
WORK_DIR="/var/www/fonana"
cd $WORK_DIR || { error "Не удается перейти в директорию $WORK_DIR"; exit 1; }

log "Остановка существующих процессов..."
systemctl stop fonana 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true

log "Создание .env файла..."
cat > .env << EOF
# Database
DATABASE_URL="file:./prisma/dev.db"

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com

# Platform Configuration
NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE=10
NEXT_PUBLIC_DONATION_FEE_PERCENTAGE=2.5
NEXT_PUBLIC_CONTENT_FEE_PERCENTAGE=15

# Production
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
EOF

log "Установка зависимостей..."
npm ci --production=false

log "Генерация Prisma клиента..."
npx prisma generate

log "Инициализация базы данных..."
if [ ! -f "prisma/dev.db" ]; then
    npx prisma db push
    log "База данных создана"
else
    log "База данных уже существует"
fi

log "Сборка приложения..."
npm run build

log "Установка sharp для оптимизации изображений..."
npm install sharp

log "Настройка прав доступа..."
chmod +x start_fonana.sh
chown -R root:root $WORK_DIR

log "Копирование systemd service..."
cp fonana.service /etc/systemd/system/
systemctl daemon-reload

log "Настройка nginx..."
if [ -f "nginx-fonana-production.conf" ]; then
    cp nginx-fonana-production.conf /etc/nginx/sites-available/fonana
    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/fonana /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    log "Nginx настроен"
else
    warning "Файл nginx-fonana-production.conf не найден"
fi

log "Запуск сервиса..."
systemctl enable fonana
systemctl start fonana

# Ожидание запуска
sleep 5

log "Проверка статуса..."
if systemctl is-active --quiet fonana; then
    log "✅ Fonana успешно запущена!"
    log "🌐 Доступно по адресу: http://69.10.59.234"
else
    error "❌ Ошибка запуска Fonana"
    log "Логи сервиса:"
    journalctl -u fonana --no-pager -n 20
    exit 1
fi

log "Проверка портов..."
if netstat -tuln | grep :3001 > /dev/null; then
    log "✅ Порт 3001 открыт"
else
    warning "⚠️  Порт 3001 не открыт"
fi

log "🎉 Развертывание завершено!"
echo "📊 Статус сервиса: systemctl status fonana"
echo "📋 Логи: journalctl -u fonana -f"
echo "🔧 Перезапуск: systemctl restart fonana" 