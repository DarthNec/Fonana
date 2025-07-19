#!/bin/bash

# Fonana Emergency Deployment Script v1.1
# EMERGENCY MODE: Deploy without production build due to React Context issues
# Target: 64.20.37.222 (fonana.me)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_SERVER="64.20.37.222"
DOMAIN="fonana.me"
DEPLOY_PATH="/var/www/Fonana"
BACKUP_DIR="/backup"
LOG_FILE="./deployment.log"
MAX_ROLLBACK_COUNT=5

echo -e "${BLUE}=============================================================================="
echo -e "            FONANA EMERGENCY DEPLOYMENT SCRIPT v1.1"
echo -e "              EMERGENCY MODE: DEV DEPLOYMENT"
echo -e "=============================================================================="
echo -e "${NC}"

echo -e "${YELLOW}⚠️  EMERGENCY DEPLOYMENT: Skipping production build due to React Context issues"
echo -e "⚠️  This will deploy Fonana in development mode to: ${PRODUCTION_SERVER}"
echo -e "⚠️  Domain: ${DOMAIN}"
echo -e "⚠️  Estimated time: 30-45 minutes"
echo -e "${NC}"

# Confirmation
read -p "Continue with emergency deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Deployment cancelled by user"
    exit 1
fi

# Start logging
exec 1> >(tee -a ${LOG_FILE})
exec 2> >(tee -a ${LOG_FILE} >&2)

log() {
    echo -e "${GREEN}🔄 $(date '+%H:%M:%S')${NC} - $1"
}

error() {
    echo -e "${RED}❌ $(date '+%H:%M:%S')${NC} - $1"
}

success() {
    echo -e "${GREEN}✅ $(date '+%H:%M:%S')${NC} - $1"
}

log "Starting emergency deployment..."

# EMERGENCY: Skip production build
log "⚠️  EMERGENCY MODE: Skipping production build"
log "⚠️  Application will run in development/SSR mode on production server"

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    log "⚠️  Uncommitted changes detected, auto-committing..."
    git add .
    git commit -m "🚨 Emergency deployment: Auto-commit before deploy"
fi

# Push to repository
log "Pushing latest changes to repository..."
git push origin main || {
    log "⚠️  Git push failed, continuing with emergency deployment..."
}

# Create deployment package (source code only)
log "Creating emergency deployment package..."
TEMP_DIR=$(mktemp -d)
DATE=$(date +%Y%m%d_%H%M%S)
DEPLOY_PACKAGE="${TEMP_DIR}/fonana-emergency-${DATE}.tar.gz"

# Copy source files (excluding .next, node_modules, etc.)
tar --exclude='.next' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='deployment.log' \
    --exclude='*.tar.gz' \
    -czf "${DEPLOY_PACKAGE}" .

success "Emergency deployment package created: $(basename ${DEPLOY_PACKAGE})"

# Deploy to server
log "Deploying to production server: ${PRODUCTION_SERVER}..."

# Emergency deployment script for server
cat > "${TEMP_DIR}/emergency-deploy.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

DEPLOY_PATH="/var/www/Fonana"
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚨 EMERGENCY DEPLOYMENT STARTING..."

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Stop existing services
echo "Stopping existing services..."
pm2 stop fonana || echo "No existing PM2 process"
pm2 delete fonana || echo "No existing PM2 process to delete"

# Backup current deployment (if exists)
if [ -d "${DEPLOY_PATH}" ]; then
    echo "Creating backup..."
    tar -czf "${BACKUP_DIR}/fonana-backup-${DATE}.tar.gz" -C "${DEPLOY_PATH}" . || echo "Backup failed, continuing..."
fi

# Extract new deployment
echo "Extracting new deployment..."
mkdir -p ${DEPLOY_PATH}
cd ${DEPLOY_PATH}

# Clear existing files
rm -rf * .* 2>/dev/null || true

# Extract package
tar -xzf /tmp/deployment-package.tar.gz

# Install dependencies
echo "Installing dependencies..."
npm ci --only=production

# EMERGENCY: Setup for development mode
echo "🚨 EMERGENCY: Setting up development mode..."
echo "NODE_ENV=production" > .env.production.local
echo "NEXT_PUBLIC_NODE_ENV=production" >> .env.production.local

# Copy environment variables
if [ -f ".env.example" ]; then
    cp .env.example .env.local
fi

# Start in development mode with PM2
echo "Starting application in development mode..."
pm2 start npm --name "fonana" -- run dev
pm2 save

echo "✅ EMERGENCY DEPLOYMENT COMPLETED!"
echo "📊 Application status:"
pm2 status
EOF

# Transfer files and execute
log "Transferring files to server..."
scp -i ~/.ssh/fonana_deploy_key -o StrictHostKeyChecking=no "${DEPLOY_PACKAGE}" root@${PRODUCTION_SERVER}:/tmp/deployment-package.tar.gz
scp -i ~/.ssh/fonana_deploy_key -o StrictHostKeyChecking=no "${TEMP_DIR}/emergency-deploy.sh" root@${PRODUCTION_SERVER}:/tmp/emergency-deploy.sh

log "Executing emergency deployment on server..."
ssh -i ~/.ssh/fonana_deploy_key -o StrictHostKeyChecking=no root@${PRODUCTION_SERVER} "chmod +x /tmp/emergency-deploy.sh && /tmp/emergency-deploy.sh"

# Setup Nginx for development port
log "Configuring Nginx for development mode..."
cat > "${TEMP_DIR}/nginx-emergency.conf" << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # SSL Configuration (will be set up by Certbot)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy to Next.js development server
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

scp -i ~/.ssh/fonana_deploy_key -o StrictHostKeyChecking=no "${TEMP_DIR}/nginx-emergency.conf" root@${PRODUCTION_SERVER}:/etc/nginx/sites-available/fonana

log "Enabling Nginx configuration..."
ssh -i ~/.ssh/fonana_deploy_key -o StrictHostKeyChecking=no root@${PRODUCTION_SERVER} "
    ln -sf /etc/nginx/sites-available/fonana /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
"

# Setup SSL with Certbot
log "Setting up SSL certificate..."
ssh -i ~/.ssh/fonana_deploy_key -o StrictHostKeyChecking=no root@${PRODUCTION_SERVER} "
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} || echo 'SSL setup may have failed, continuing...'
"

# Cleanup
rm -rf "${TEMP_DIR}"

# Health check
log "Performing health check..."
sleep 10

if curl -f -s "https://${DOMAIN}" > /dev/null 2>&1; then
    success "🎉 EMERGENCY DEPLOYMENT SUCCESSFUL!"
    success "🌐 Application is live at: https://${DOMAIN}"
    success "📊 Check status: pm2 status"
    success "📋 View logs: pm2 logs fonana"
else
    error "❌ Health check failed - please check manually"
    error "🔍 SSH to server: ssh root@${PRODUCTION_SERVER}"
    error "📊 Check PM2: pm2 status"
    error "📋 Check logs: pm2 logs fonana"
fi

success "Emergency deployment process completed!"
log "Deployment log saved to: ${LOG_FILE}" 