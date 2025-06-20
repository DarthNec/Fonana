#!/bin/bash

# Deploy script for Fonana
# Usage: ./deploy-to-production.sh

set -e  # Exit on error

# Configuration
SERVER="root@69.10.59.234"
PORT="43988"
REMOTE_PATH="/var/www/fonana"
LOCAL_BUILD=false  # Set to true to build locally before deploy

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Fonana deployment...${NC}"

# Check if we have uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Push to GitHub
echo -e "${GREEN}📤 Pushing to GitHub...${NC}"
git push origin main || {
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    echo "Make sure you have committed your changes first"
    exit 1
}

# Clean up old processes to prevent white screen issue
echo -e "${GREEN}🧹 Cleaning up old processes...${NC}"
ssh -p $PORT $SERVER "pm2 stop fonana 2>/dev/null || true && killall -9 node next-server sh 2>/dev/null || true"
sleep 2

# Extra cleanup - make sure all Node processes are killed
echo -e "${GREEN}🔪 Force killing any remaining Node processes...${NC}"
ssh -p $PORT $SERVER "ps aux | grep -E 'node|next' | grep -v grep | awk '{print \$2}' | xargs kill -9 2>/dev/null || true"
sleep 1

# Clear Next.js cache
echo -e "${GREEN}🗑️  Clearing Next.js cache...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_PATH && rm -rf .next/cache"

# Deploy to server
echo -e "${GREEN}🔄 Updating code on server...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_PATH && git pull origin main" || {
    echo -e "${RED}❌ Failed to update code${NC}"
    exit 1
}

# Install dependencies if package.json changed
echo -e "${GREEN}📦 Checking dependencies...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_PATH && npm install --production"

# Run database migrations
echo -e "${GREEN}🗄️  Running database migrations...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_PATH && npx prisma migrate deploy" || {
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
}

# Generate Prisma Client
echo -e "${GREEN}🔧 Generating Prisma Client...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_PATH && npx prisma generate" || {
    echo -e "${RED}❌ Prisma generate failed${NC}"
    exit 1
}

# Build on server
echo -e "${GREEN}🔨 Building application...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_PATH && npm run build" || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}

# Start application
echo -e "${GREEN}🚀 Starting application...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_PATH && pm2 delete fonana 2>/dev/null || true && PORT=3000 pm2 start npm --name fonana -- start" || {
    echo -e "${RED}❌ Failed to start application${NC}"
    exit 1
}

# Wait for application to start
echo -e "${GREEN}⏳ Waiting for application to start...${NC}"
sleep 5

# Reload nginx
echo -e "${GREEN}🔄 Reloading nginx...${NC}"
ssh -p $PORT $SERVER "nginx -s reload"

# Check status
echo -e "${GREEN}📊 Checking application status...${NC}"
ssh -p $PORT $SERVER "pm2 status fonana"

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Application is live at: https://fonana.me${NC}"
echo -e ""
echo -e "${YELLOW}💡 If you see a white screen:${NC}"
echo -e "   1. Clear browser cache (Ctrl+Shift+R)"
echo -e "   2. Try incognito mode"
echo -e "   3. Wait 1-2 minutes for cache to expire" 