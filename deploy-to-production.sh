#!/bin/bash

# Fonana Production Deployment Script
# Usage: ./deploy-to-production.sh

set -e

echo "🚀 Starting Fonana deployment..."

# Проверка на дубликаты процессов
echo "🔍 Checking for duplicate processes..."
PROCESS_COUNT=$(ssh -p 43988 root@69.10.59.234 "ps aux | grep -E 'node|next' | grep -v grep | wc -l" 2>/dev/null || echo "0")
if [ "$PROCESS_COUNT" -gt "2" ]; then
    echo "⚠️  Warning: Found $PROCESS_COUNT node processes running!"
    echo "🛑 Running cleanup..."
    ssh -p 43988 root@69.10.59.234 "pkill -f node || true"
    sleep 2
fi

# Проверка портов
echo "🔍 Checking ports 3000 and 3001..."
ssh -p 43988 root@69.10.59.234 "lsof -i :3000 -i :3001 | grep LISTEN || echo 'Ports are free'"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# Stop any existing processes
echo "🧹 Cleaning up old processes..."
ssh -p 43988 root@69.10.59.234 "pm2 stop fonana || true && pm2 delete fonana || true"

# Kill any remaining node processes
echo "🔪 Force killing any remaining Node processes..."
ssh -p 43988 root@69.10.59.234 "pkill -f node || true"

# Clear Next.js cache
echo "🗑️  Clearing Next.js cache..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && rm -rf .next"

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

# Start the application with PM2
echo "🚀 Starting application..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && pm2 start ecosystem.config.js"

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 5

# Reload nginx
echo "🔄 Reloading nginx..."
ssh -p 43988 root@69.10.59.234 "nginx -s reload"

# Check application status
echo "📊 Checking application status..."
ssh -p 43988 root@69.10.59.234 "pm2 status"

# Final check for duplicate processes
echo "🔍 Final check for duplicate processes..."
FINAL_COUNT=$(ssh -p 43988 root@69.10.59.234 "ps aux | grep -E 'node|next' | grep -v grep | wc -l" 2>/dev/null || echo "0")
if [ "$FINAL_COUNT" -gt "2" ]; then
    echo "⚠️  Warning: Multiple node processes detected after deployment!"
fi

echo "✅ Deployment complete!"
echo "🌐 Application is live at: https://fonana.me"
echo "📋 Version deployed: $VERSION-$COMMIT"
echo ""
echo "💡 If you see a white screen:"
echo "   1. Clear browser cache (Ctrl+Shift+R)"
echo "   2. Try incognito mode"
echo "   3. Wait 1-2 minutes for cache to expire" 