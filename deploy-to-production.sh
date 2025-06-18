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
    echo "If the repository is private, make sure you have access configured"
    exit 1
}

# Optional: Build locally first
if [ "$LOCAL_BUILD" = true ]; then
    echo -e "${GREEN}📦 Building locally...${NC}"
    npm run build || {
        echo -e "${RED}❌ Local build failed${NC}"
        exit 1
    }
fi

# Deploy to server
echo -e "${GREEN}🔄 Deploying to server...${NC}"

# Method 1: If server has GitHub access (deploy key)
ssh -p $PORT $SERVER "cd $REMOTE_PATH && git pull origin main" 2>/dev/null && {
    echo -e "${GREEN}✅ Code updated via Git${NC}"
} || {
    echo -e "${YELLOW}⚠️  Git pull failed, trying SCP method...${NC}"
    
    # Method 2: Copy files via SCP
    # Create temp directory
    ssh -p $PORT $SERVER "mkdir -p $REMOTE_PATH/temp"
    
    # Copy changed files (you can add more files here)
    echo "Copying files..."
    scp -P $PORT \
        app/api/user/route.ts \
        lib/db.ts \
        middleware.ts \
        package.json \
        $SERVER:$REMOTE_PATH/temp/ 2>/dev/null || echo "Some files not found, skipping..."
    
    # Move files to correct locations
    ssh -p $PORT $SERVER "cd $REMOTE_PATH && \
        [ -f temp/route.ts ] && mv temp/route.ts app/api/user/route.ts; \
        [ -f temp/db.ts ] && mv temp/db.ts lib/db.ts; \
        [ -f temp/middleware.ts ] && mv temp/middleware.ts .; \
        [ -f temp/package.json ] && mv temp/package.json .; \
        rm -rf temp"
}

# Install dependencies if package.json changed
echo -e "${GREEN}📦 Checking dependencies...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_PATH && npm install --production"

# Build on server
echo -e "${GREEN}🔨 Building application...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_PATH && npm run build" || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}

# Restart application
echo -e "${GREEN}🔄 Restarting application...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_PATH && pm2 restart fonana" || {
    echo -e "${RED}❌ Failed to restart application${NC}"
    exit 1
}

# Check status
echo -e "${GREEN}📊 Checking application status...${NC}"
ssh -p $PORT $SERVER "pm2 status fonana"

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Application is live at: https://fonana.me${NC}" 