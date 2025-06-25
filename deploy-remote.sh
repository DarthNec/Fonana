#!/bin/bash

# Remote deployment script - executes on server
# This script is uploaded and executed on the server

set -e

echo "🚀 Starting local deployment on server..."

# Stop PM2 processes
echo "🛑 Stopping PM2 processes..."
pm2 stop fonana 2>/dev/null || true
pm2 delete fonana 2>/dev/null || true

# Kill remaining processes
echo "🔪 Killing remaining processes..."
pkill -f 'next-server' 2>/dev/null || true
pkill -f 'pm2.*fonana' 2>/dev/null || true
sleep 2

# Clear cache
echo "🗑️  Clearing Next.js cache..."
cd /var/www/fonana
rm -rf .next

# Update code
echo "🔄 Updating code..."
git pull origin main

# Generate version file
VERSION=$(date +%Y%m%d-%H%M%S)
COMMIT=$(git rev-parse --short HEAD)
echo "export const APP_VERSION = \"$VERSION-$COMMIT\";" > lib/version.ts

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Database operations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo "🔧 Generating Prisma Client..."
npx prisma generate

# Build application
echo "🔨 Building application..."
npm run build

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js

# Reload nginx
echo "🔄 Reloading nginx..."
nginx -s reload

# Show status
echo "📊 Application status:"
pm2 status

echo "✅ Deployment complete!" 