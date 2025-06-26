#!/bin/bash

# Fonana Production Deployment Script
# Usage: ./deploy-to-production.sh

set -e

echo "🚀 Starting Fonana deployment..."

# Проверка на дубликаты процессов
echo "🔍 Checking for duplicate processes..."
PROCESS_COUNT=$(ssh -p 43988 root@69.10.59.234 "ps aux | grep -E 'node.*fonana|next-server' | grep -v grep | grep -v ssh | wc -l" 2>/dev/null || echo "0")
if [ "$PROCESS_COUNT" -gt "0" ]; then
    echo "⚠️  Warning: Found $PROCESS_COUNT node processes running!"
    echo "🛑 Running aggressive cleanup..."
fi

# Проверка всех портов от 3000 до 3010
echo "🔍 Checking all possible ports (3000-3010)..."
ssh -p 43988 root@69.10.59.234 "
    for port in {3000..3010}; do
        if lsof -i :\$port | grep LISTEN > /dev/null 2>&1; then
            echo \"Port \$port is in use\"
        fi
    done
"

# Push to GitHub
echo "🔄 Updating cache version..."
./scripts/update-cache-version.sh

echo "📤 Pushing to GitHub..."
git push origin main

# АГРЕССИВНАЯ ОЧИСТКА ВСЕХ ПРОЦЕССОВ FONANA
echo "🧹 Aggressive cleanup of ALL Fonana processes..."
ssh -p 43988 root@69.10.59.234 "
    echo '=== Step 1: Stop PM2 processes ==='
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    echo '=== Step 2: Kill all Node.js processes in /var/www/fonana ==='
    # Найти все процессы node, работающие из директории fonana, исключая SSH
    ps aux | grep -E 'node.*\/var\/www\/fonana' | grep -v grep | grep -v ssh | grep -v 'ssh-agent' | awk '{print \$2}' | xargs -r kill -9 2>/dev/null || true
    
    echo '=== Step 3: Kill all next-server processes (safely) ==='
    # Более безопасный подход - убиваем только процессы с полным путем
    ps aux | grep '/var/www/fonana.*next-server' | grep -v grep | grep -v ssh | awk '{print \$2}' | xargs -r kill -9 2>/dev/null || true
    
    echo '=== Step 4: Kill anything listening on ports 3000-3010 ==='
    for port in {3000..3010}; do
        # Проверяем что это не SSH порт
        if [ \$port -ne 43988 ]; then
            lsof -ti:\$port | xargs -r kill -9 2>/dev/null || true
        fi
    done
    
    echo '=== Step 5: Kill any remaining node processes with fonana in command ==='
    # Исключаем SSH и добавляем проверку на путь
    ps aux | grep -i 'node.*fonana' | grep '/var/www/fonana' | grep -v grep | grep -v ssh | grep -v 'ssh-agent' | awk '{print \$2}' | xargs -r kill -9 2>/dev/null || true
    
    echo '=== Step 6: Clean systemd if it exists ==='
    systemctl stop fonana 2>/dev/null || true
    systemctl disable fonana 2>/dev/null || true
    
    echo '=== Step 7: Final cleanup - kill node processes from specific directory ==='
    # Убиваем только процессы node из директории /var/www/fonana
    pgrep -f 'node.*/var/www/fonana' | xargs -r kill -9 2>/dev/null || true
    
    # Небольшая пауза для гарантии
    sleep 2
    
    echo '=== Cleanup complete. Checking results... ==='
    echo \"Remaining node processes:\"
    ps aux | grep node | grep -v grep | grep -v ssh || echo 'No node processes found'
    echo \"\"
    echo \"Ports 3000-3010 status:\"
    for port in {3000..3010}; do
        if lsof -i :\$port 2>/dev/null | grep LISTEN; then
            echo \"WARNING: Port \$port still in use!\"
        fi
    done
"

# Clear Next.js cache и другие временные файлы
echo "🗑️  Clearing all caches and temp files..."
ssh -p 43988 root@69.10.59.234 "
    cd /var/www/fonana
    rm -rf .next
    rm -rf node_modules/.cache
    rm -rf .pm2
    # Очистка логов PM2 если они слишком большие
    find /root/.pm2/logs -name '*.log' -size +100M -delete 2>/dev/null || true
"

# Update code on server
echo "🔄 Updating code on server..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && git pull origin main"

# Generate version file
echo "📝 Generating version information..."
VERSION=$(date +%Y%m%d-%H%M%S)
COMMIT=$(git rev-parse --short HEAD)
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && echo 'export const APP_VERSION = \"$VERSION-$COMMIT\";' > lib/version.ts"

# Install dependencies
echo "📦 Checking dependencies..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npm ci --production"

# Run database migrations
echo "🗄️  Running database migrations..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npx prisma migrate deploy"

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npx prisma generate"

# Build the application
echo "🔨 Building application..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npm run build"

# Start the application with PM2 - ТОЛЬКО ОДИН ЭКЗЕМПЛЯР
echo "🚀 Starting application (single instance)..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && pm2 start ecosystem.config.js --instances 1"

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 5

# Reload nginx
echo "🔄 Reloading nginx..."
ssh -p 43988 root@69.10.59.234 "nginx -s reload"

# Check application status
echo "📊 Checking application status..."
ssh -p 43988 root@69.10.59.234 "pm2 status"

# Final comprehensive check
echo "🔍 Final comprehensive check..."
ssh -p 43988 root@69.10.59.234 "
    echo '=== PM2 Status ==='
    pm2 list
    echo ''
    echo '=== Node processes ==='
    ps aux | grep -E 'node.*fonana' | grep -v grep | grep -v ssh || echo 'No extra node processes'
    echo ''
    echo '=== Port usage (3000-3010) ==='
    for port in {3000..3010}; do
        if lsof -i :\$port 2>/dev/null | grep LISTEN; then
            echo \"Port \$port: IN USE\"
            lsof -i :\$port | grep LISTEN
        fi
    done
    echo ''
    echo '=== Memory usage ==='
    free -h
"

# Проверка на множественные процессы
FINAL_COUNT=$(ssh -p 43988 root@69.10.59.234 "pm2 list | grep fonana | grep online | wc -l" 2>/dev/null || echo "0")
if [ "$FINAL_COUNT" -ne "1" ]; then
    echo "⚠️  ERROR: Expected 1 fonana process, but found $FINAL_COUNT!"
    echo "🔧 Attempting to fix..."
    ssh -p 43988 root@69.10.59.234 "pm2 delete all && cd /var/www/fonana && pm2 start ecosystem.config.js --instances 1"
fi

echo "✅ Deployment complete!"
echo "🌐 Application is live at: https://fonana.me"
echo "📋 Version deployed: $VERSION-$COMMIT"
echo ""
echo "💡 If you see a white screen:"
echo "   1. Clear browser cache (Ctrl+Shift+R)"
echo "   2. Try incognito mode"
echo "   3. Wait 1-2 minutes for cache to expire"
echo ""
echo "🔍 To check for issues, run:"
echo "   ./scripts/devops-status.sh" 