#!/bin/bash

# Fonana Server Deployment Script
SERVER_IP="69.10.59.234"
SERVER_PORT="43988"
SERVER_USER="root"  # Adjust if different
REMOTE_PATH="/var/www/fonana"
LOCAL_DEPLOY_DIR="fonana-deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Fonana deployment to server ${SERVER_IP}:${SERVER_PORT}${NC}"

# Step 1: Build application
echo -e "${BLUE}📦 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully!${NC}"

# Step 2: Prepare deployment files
echo -e "${BLUE}📤 Preparing deployment files...${NC}"

# Remove old deployment directory
rm -rf $LOCAL_DEPLOY_DIR
mkdir -p $LOCAL_DEPLOY_DIR

# Copy necessary files
cp -r .next $LOCAL_DEPLOY_DIR/
cp -r public $LOCAL_DEPLOY_DIR/
cp -r components $LOCAL_DEPLOY_DIR/
cp -r lib $LOCAL_DEPLOY_DIR/
cp -r app $LOCAL_DEPLOY_DIR/
cp -r prisma $LOCAL_DEPLOY_DIR/
cp package*.json $LOCAL_DEPLOY_DIR/
cp next.config.js $LOCAL_DEPLOY_DIR/
cp tailwind.config.js $LOCAL_DEPLOY_DIR/
cp postcss.config.js $LOCAL_DEPLOY_DIR/
cp tsconfig.json $LOCAL_DEPLOY_DIR/

# Copy .env file if exists
if [ -f .env ]; then
    cp .env $LOCAL_DEPLOY_DIR/
fi
if [ -f .env.local ]; then
    cp .env.local $LOCAL_DEPLOY_DIR/
fi

# Create start script for server
cat > $LOCAL_DEPLOY_DIR/start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Fonana on server..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Apply database migrations
echo "🗄️ Applying database migrations..."
npx prisma migrate deploy

# Kill existing process
pkill -f "next"
sleep 2

# Start the application
echo "🌟 Starting Fonana..."
nohup npm start > fonana.log 2>&1 &

echo "✅ Fonana started! Check fonana.log for output"
echo "🌐 Application should be available on port 3000"
EOF

chmod +x $LOCAL_DEPLOY_DIR/start.sh

# Create stop script
cat > $LOCAL_DEPLOY_DIR/stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping Fonana..."
pkill -f "next"
echo "✅ Fonana stopped"
EOF

chmod +x $LOCAL_DEPLOY_DIR/stop.sh

# Create deployment package
echo -e "${BLUE}📦 Creating deployment package...${NC}"
tar -czf fonana-deploy.tar.gz -C $LOCAL_DEPLOY_DIR .

echo -e "${GREEN}✅ Deployment files prepared!${NC}"

# Step 3: Upload to server
echo -e "${BLUE}🔄 Uploading to server...${NC}"

# Upload deployment package
scp -P $SERVER_PORT fonana-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Upload failed! Please check your server connection.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Files uploaded successfully!${NC}"

# Step 4: Deploy on server
echo -e "${BLUE}🔧 Deploying on server...${NC}"

ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP << 'ENDSSH'
    # Create application directory
    mkdir -p /var/www/fonana
    cd /var/www/fonana
    
    # Stop existing application
    pkill -f "next" || true
    
    # Extract new files
    tar -xzf /tmp/fonana-deploy.tar.gz
    
    # Install dependencies
    npm install
    
    # Start application
    chmod +x start.sh stop.sh
    ./start.sh
    
    echo "🎉 Deployment completed!"
    echo "🌐 Fonana is now running on the server"
    
    # Clean up
    rm /tmp/fonana-deploy.tar.gz
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${YELLOW}🌐 Your application should be available at: http://${SERVER_IP}:3000${NC}"
    echo -e "${YELLOW}📝 Server logs: ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} 'cd /var/www/fonana && tail -f fonana.log'${NC}"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

# Cleanup local files
rm -f fonana-deploy.tar.gz
rm -rf $LOCAL_DEPLOY_DIR

echo -e "${GREEN}✅ Local cleanup completed!${NC}" 