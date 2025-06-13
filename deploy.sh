#!/bin/bash

# Fonana Deployment Script
echo "🚀 Starting Fonana deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build the application
echo -e "${BLUE}📦 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully!${NC}"

# Copy files to server (adjust paths as needed)
echo -e "${BLUE}📤 Preparing deployment files...${NC}"

# Create deployment directory
DEPLOY_DIR="fonana-deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy necessary files
cp -r .next $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/
cp package*.json $DEPLOY_DIR/
cp next.config.js $DEPLOY_DIR/

# Copy Docker files if using containerized deployment
cp Dockerfile $DEPLOY_DIR/
cp docker-compose.yml $DEPLOY_DIR/
cp .dockerignore $DEPLOY_DIR/

echo -e "${GREEN}✅ Deployment files prepared in ${DEPLOY_DIR}${NC}"

# Production deployment options
echo -e "${YELLOW}🔧 Deployment options:${NC}"
echo "1. Docker deployment: cd ${DEPLOY_DIR} && docker-compose up -d"
echo "2. Node.js deployment: cd ${DEPLOY_DIR} && npm install --production && npm start"
echo "3. PM2 deployment: cd ${DEPLOY_DIR} && npm install --production && pm2 start npm --name 'fonana' -- start"

echo -e "${GREEN}🎉 Deployment preparation completed!${NC}" 