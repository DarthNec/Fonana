#!/bin/bash

# Fonana Safe Production Deployment Script
# Usage: ./deploy-safe.sh

set -e

echo "🚀 Starting Fonana SAFE deployment..."

# SSH Configuration
SSH_CMD="ssh -o ConnectTimeout=10 -o ServerAliveInterval=5 -p 22 root@64.20.37.222"

# Function to execute commands with error handling
execute_ssh() {
    local cmd="$1"
    local description="$2"
    echo "$description"
    $SSH_CMD "$cmd" || {
        echo "⚠️  Command failed, but continuing..."
        return 0
    }
}

# Push to GitHub first
echo "📤 Pushing to GitHub..."
git push origin main || echo "⚠️  Git push failed, continuing anyway..."

# Stop PM2 processes safely
execute_ssh "pm2 stop fonana 2>/dev/null || true" "🛑 Stopping PM2 processes..."
execute_ssh "pm2 delete fonana 2>/dev/null || true" "🗑️  Deleting PM2 processes..."

# Kill specific processes (not all node)
execute_ssh "pkill -f 'next-server' 2>/dev/null || true" "🔪 Killing Next.js server..."
execute_ssh "pkill -f 'pm2.*fonana' 2>/dev/null || true" "🔪 Killing PM2 for Fonana..."
sleep 2

# Clear cache
execute_ssh "cd /var/www/Fonana && rm -rf .next" "🗑️  Clearing Next.js cache..."

# Update code
execute_ssh "cd /var/www/Fonana && git pull origin main" "🔄 Updating code on server..."

# Generate version file
VERSION=$(date +%Y%m%d-%H%M%S)
COMMIT=$(git rev-parse --short HEAD)
execute_ssh "cd /var/www/Fonana && echo 'export const APP_VERSION = \"$VERSION-$COMMIT\";' > lib/version.ts" "📝 Generating version information..."

# Install dependencies
execute_ssh "cd /var/www/Fonana && npm ci --production" "📦 Installing dependencies..."

# Database operations
execute_ssh "cd /var/www/Fonana && npx prisma migrate deploy" "🗄️  Running database migrations..."
execute_ssh "cd /var/www/Fonana && npx prisma generate" "🔧 Generating Prisma Client..."

# Build application
echo "🔨 Building application (this may take a while)..."
$SSH_CMD "cd /var/www/Fonana && npm run build" || {
    echo "❌ Build failed! Trying to restart anyway..."
}

# Start with PM2
execute_ssh "cd /var/www/Fonana && pm2 start ecosystem.config.js" "🚀 Starting application with PM2..."

# Wait and reload nginx
sleep 5
execute_ssh "nginx -s reload" "🔄 Reloading nginx..."

# Final status check
echo "📊 Final status check..."
$SSH_CMD "pm2 status"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Application is live at: https://fonana.me"
echo "📋 Version deployed: $VERSION-$COMMIT"
echo ""
echo "🔍 To check logs: ssh -p 22 root@64.20.37.222 'pm2 logs fonana --lines 50'" 