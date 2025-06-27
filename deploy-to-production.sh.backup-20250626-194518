#!/bin/bash

# Fonana Production Deployment Script
# Usage: ./deploy-to-production.sh
# 
# This script safely deploys Fonana to production using a single SSH connection
# to avoid disconnection when stopping processes

set -e

echo "🚀 Starting Fonana deployment..."

# Update cache version locally
echo "🔄 Updating cache version..."
./scripts/update-cache-version.sh

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# Get version info for later
VERSION=$(date +%Y%m%d-%H%M%S)
COMMIT=$(git rev-parse --short HEAD)

# Main deployment - everything in one SSH session
echo "🚀 Deploying to production server..."
ssh -p 43988 root@69.10.59.234 'bash -s' << 'DEPLOY_SCRIPT'
set -e  # Exit on error inside SSH session

echo "🔍 Starting deployment process..."

# Step 1: Safely stop PM2 processes
echo "⏹️  Stopping PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Step 2: Kill remaining node processes from fonana directory only
echo "🧹 Cleaning up remaining node processes..."
# Use more specific pattern to avoid killing SSH or system processes
ps aux | grep -E 'node.*/var/www/fonana' | grep -v grep | grep -v ssh | awk '{print $2}' | while read pid; do
    if [ ! -z "$pid" ]; then
        kill -TERM $pid 2>/dev/null || true
    fi
done

# Give processes time to terminate gracefully
sleep 2

# Force kill if still running
ps aux | grep -E 'node.*/var/www/fonana' | grep -v grep | grep -v ssh | awk '{print $2}' | while read pid; do
    if [ ! -z "$pid" ]; then
        kill -9 $pid 2>/dev/null || true
    fi
done

# Step 3: Clean up ports
echo "🔌 Cleaning up ports..."
for port in {3000..3010}; do
    # Get PID using port and kill it (excluding SSH port)
    if [ $port -ne 43988 ]; then
        PID=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$PID" ]; then
            kill -9 $PID 2>/dev/null || true
        fi
    fi
done

# Step 4: Disable systemd service if exists
echo "🛑 Disabling systemd service..."
systemctl stop fonana 2>/dev/null || true
systemctl disable fonana 2>/dev/null || true

# Step 5: Clear caches
echo "🗑️  Clearing caches..."
cd /var/www/fonana
rm -rf .next
rm -rf node_modules/.cache
rm -rf .pm2

# Clean up large PM2 logs
find /root/.pm2/logs -name '*.log' -size +100M -delete 2>/dev/null || true

# Step 6: Pull latest code
echo "🔄 Pulling latest code..."
git pull origin main

# Step 7: Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Step 8: Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Step 9: Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Step 10: Build application
echo "🔨 Building application..."
npm run build

# Step 11: Start application with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js --instances 1

# Step 12: Save PM2 process list
pm2 save

# Step 13: Reload nginx
echo "🔄 Reloading nginx..."
nginx -s reload

# Wait for app to stabilize
sleep 5

# Final status check
echo "📊 Deployment complete! Final status:"
echo "=== PM2 Status ==="
pm2 list

echo ""
echo "=== Active ports ==="
for port in {3000..3010}; do
    if lsof -i :$port 2>/dev/null | grep LISTEN > /dev/null; then
        echo "Port $port: IN USE"
    fi
done

echo ""
echo "=== Node processes ==="
ps aux | grep -E 'node.*/var/www/fonana' | grep -v grep | grep -v ssh || echo "No extra node processes found"

echo ""
echo "✅ Server deployment completed successfully!"
DEPLOY_SCRIPT

# Generate version file after deployment
echo "📝 Generating version information..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && echo 'export const APP_VERSION = \"$VERSION-$COMMIT\";' > lib/version.ts"

# Final check from outside
echo ""
echo "🔍 Running final health check..."
PROCESS_COUNT=$(ssh -p 43988 root@69.10.59.234 "pm2 list | grep fonana | grep online | wc -l" 2>/dev/null || echo "0")
if [ "$PROCESS_COUNT" -eq "1" ]; then
    echo "✅ Deployment successful! Exactly 1 fonana process running."
else
    echo "⚠️  Warning: Expected 1 fonana process, but found $PROCESS_COUNT"
fi

echo ""
echo "✅ Deployment complete!"
echo "🌐 Application is live at: https://fonana.me"
echo "📋 Version deployed: $VERSION-$COMMIT"
echo ""
echo "💡 If you see issues:"
echo "   1. Check logs: ssh -p 43988 root@69.10.59.234 'pm2 logs fonana --lines 50'"
echo "   2. Check status: ./scripts/devops-status.sh"
echo "   3. Clear browser cache (Ctrl+Shift+R)" 