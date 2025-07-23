#!/bin/bash

# 🚀 FONANA DEPLOYMENT: SWITCH TO NORMAL MODE
# Этот скрипт переключает с standalone на normal Next.js mode
# Автор: М7 Methodology Analysis

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PRODUCTION_SERVER="fonana"
DEPLOY_PATH="/var/www/Fonana"
BACKUP_SUFFIX=$(date +%Y%m%d_%H%M%S)

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

echo -e "${BLUE}================================================================"
echo -e "      FONANA: ПЕРЕКЛЮЧЕНИЕ НА NORMAL MODE"
echo -e "      Устраняем standalone mode для решения image 404"
echo -e "================================================================${NC}"

# Анализ проблемы
echo -e "\n📋 ${BLUE}АНАЛИЗ ПРОБЛЕМЫ:${NC}"
echo "  🔍 Root Cause: standalone mode блокирует доступ к public/posts/images/"
echo "  🎯 Solution: переключение на standard Next.js production mode"
echo "  ⚡ Benefit: прямой доступ к uploaded файлам без sync"
echo ""

# Backup current configs
log "📦 Создаем backup текущих конфигураций..."

ssh $PRODUCTION_SERVER "
cd $DEPLOY_PATH
# Backup configs
cp next.config.js next.config.js.backup_$BACKUP_SUFFIX
cp ecosystem.config.js ecosystem.config.js.backup_$BACKUP_SUFFIX
"

log "✅ Backup создан с суффиксом: $BACKUP_SUFFIX"

# Show current config
log "📋 Текущая конфигурация:"
echo "Production next.config.js:"
ssh $PRODUCTION_SERVER "grep -n 'output.*standalone' $DEPLOY_PATH/next.config.js || echo 'standalone not found'"
echo ""
echo "Production ecosystem.config.js:"
ssh $PRODUCTION_SERVER "grep -n 'script.*standalone' $DEPLOY_PATH/ecosystem.config.js || echo 'standalone not found'"

# Confirmation
echo ""
warning "Этот скрипт выполнит следующие изменения:"
echo "  1. ❌ Удалит 'output: standalone' из next.config.js"
echo "  2. 🔄 Изменит PM2 script на 'npm start'"
echo "  3. 🏗️  Пересоберет приложение в normal mode"
echo "  4. 🔄 Перезапустит PM2 application"
echo "  5. ✅ Протестирует доступность изображений"
echo ""

read -p "Продолжить? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Операция отменена пользователем"
fi

# Step 1: Remove standalone from next.config.js
log "🔧 Шаг 1: Удаляем standalone mode из next.config.js"

ssh $PRODUCTION_SERVER "
cd $DEPLOY_PATH
# Remove the standalone output line
sed -i '/output: .standalone.,/d' next.config.js
# Remove comments about standalone
sed -i '/Force standalone/d' next.config.js
sed -i '/standalone generation/d' next.config.js
sed -i '/standalone even with/d' next.config.js
"

log "✅ standalone mode удален из next.config.js"

# Step 2: Update PM2 configuration
log "🔧 Шаг 2: Обновляем PM2 конфигурацию для normal mode"

ssh $PRODUCTION_SERVER "
cd $DEPLOY_PATH
# Update PM2 script from standalone to npm start
sed -i \"s|script: '.next/standalone/server.js'|script: 'npm start'|\" ecosystem.config.js
# Update name if needed
sed -i \"s|'fonana-app'|'fonana'|\" ecosystem.config.js
"

log "✅ PM2 конфигурация обновлена"

# Step 3: Verify changes
log "📋 Проверяем примененные изменения:"
ssh $PRODUCTION_SERVER "
cd $DEPLOY_PATH
echo '--- next.config.js changes ---'
grep -n 'output' next.config.js || echo 'output directive removed ✅'
echo ''
echo '--- ecosystem.config.js changes ---'
grep -A2 -B2 'script:' ecosystem.config.js
"

# Step 4: Build application in normal mode
log "🏗️  Шаг 3: Пересборка приложения в normal mode"

ssh $PRODUCTION_SERVER "
cd $DEPLOY_PATH
echo 'Starting build process...'
NODE_ENV=production npm run build
echo 'Build completed!'
"

log "✅ Приложение пересобрано в normal mode"

# Step 5: Restart PM2
log "🔄 Шаг 4: Перезапускаем PM2 с новой конфигурацией"

ssh $PRODUCTION_SERVER "
cd $DEPLOY_PATH
# Stop current process
pm2 delete fonana-app 2>/dev/null || echo 'Previous process not found'
pm2 delete fonana 2>/dev/null || echo 'Previous process not found'

# Start with new config
pm2 start ecosystem.config.js
pm2 save
"

log "✅ PM2 перезапущен с normal mode"

# Step 6: Wait for startup
log "⏳ Ожидаем запуска приложения (30 секунд)..."
sleep 30

# Step 7: Health check
log "🏥 Проверяем статус приложения..."

ssh $PRODUCTION_SERVER "
cd $DEPLOY_PATH
echo '=== PM2 Status ==='
pm2 status
echo ''
echo '=== Application Logs (last 10 lines) ==='
pm2 logs fonana --lines 10 --nostream
"

# Step 8: Test image accessibility
log "🖼️  Шаг 5: Тестируем доступность изображений"

echo "Тестируем lafufu image..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://fonana.me/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG)

if [ "$HTTP_STATUS" = "200" ]; then
    log "🎉 УСПЕХ! Изображение lafufu доступно (HTTP 200)"
else
    warning "Изображение вернуло HTTP $HTTP_STATUS - проверьте файл на сервере"
fi

# Final verification
log "🔍 Финальная проверка..."

ssh $PRODUCTION_SERVER "
echo 'Checking if file exists:'
ls -la $DEPLOY_PATH/public/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG 2>/dev/null || echo 'File not found in public/'
"

echo ""
echo -e "${GREEN}================================================================"
echo -e "                 ПЕРЕКЛЮЧЕНИЕ ЗАВЕРШЕНО!"
echo -e "================================================================${NC}"
echo ""
echo -e "✅ ${GREEN}Normal mode активирован${NC}"
echo -e "🔍 ${BLUE}Проверьте результат:${NC} https://fonana.me"
echo -e "📊 ${BLUE}PM2 статус:${NC} ssh fonana 'pm2 status'"
echo -e "📝 ${BLUE}Логи:${NC} ssh fonana 'pm2 logs fonana'"
echo ""
echo -e "🔙 ${YELLOW}Откат при проблемах:${NC}"
echo -e "   ssh fonana 'cd $DEPLOY_PATH && cp next.config.js.backup_$BACKUP_SUFFIX next.config.js'"
echo -e "   ssh fonana 'cd $DEPLOY_PATH && cp ecosystem.config.js.backup_$BACKUP_SUFFIX ecosystem.config.js'"
echo -e "   ssh fonana 'cd $DEPLOY_PATH && npm run build && pm2 restart fonana'"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "🎯 ${GREEN}ПРОБЛЕМА РЕШЕНА! lafufu изображения теперь загружаются.${NC}"
else
    warning "Возможно, потребуется дополнительная диагностика. HTTP Status: $HTTP_STATUS"
fi 