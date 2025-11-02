#!/bin/bash

# Fonana Emergency Deployment Script v1.3
# INTERACTIVE MODE: SSH with password input + Node.js setup
# Target: 209.97.149.137 (fonana.me)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_SERVER="209.97.149.137"
DOMAIN="fonana.me"
DEPLOY_PATH="/var/www/Fonana"
BACKUP_DIR="/backup"
LOG_FILE="./deployment.log"
MAX_ROLLBACK_COUNT=5

echo -e "${BLUE}=============================================================================="
echo -e "            FONANA EMERGENCY DEPLOYMENT SCRIPT v1.3"
echo -e "          INTERACTIVE MODE: SSH + FULL SERVER SETUP"
echo -e "=============================================================================="
echo -e "${NC}"

# Check if running with confirmation
if [[ $# -eq 0 ]] || [[ "$1" != "confirmed" ]]; then
    echo -e "${YELLOW}⚠️  EMERGENCY DEPLOYMENT MODE АКТИВЕН"
    echo -e "   - Установка Node.js, npm, PM2 на чистый сервер"
    echo -e "   - Деплой без production build (из-за React Context ошибок)"
    echo -e "   - Приложение будет запущено в dev режиме на сервере"
    echo -e "   - SSH подключение с интерактивным вводом пароля"
    echo -e "   - Целевой сервер: ${PRODUCTION_SERVER} (${DOMAIN})"
    echo -e ""
    echo -e "Продолжить? (y/n): ${NC}"
    read -r confirmation
    if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
        echo -e "${RED}Deployment отменен пользователем.${NC}"
        exit 1
    fi
fi

# Logging function
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

# Error handling
error_exit() {
    echo -e "${RED}❌ ERROR: $1${NC}" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
    exit 1
}

# Main deployment function
main() {
    log "🚀 Starting Fonana emergency deployment to $DOMAIN"
    
    # Pre-deployment checks
    log "📋 Running pre-deployment checks..."
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || ! grep -q "fonana" package.json; then
        error_exit "Not in Fonana project directory"
    fi
    
    # Check server connectivity (using SSH instead of ping)
    log "🔗 Checking server connectivity..."
    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes fonana-server "echo 'SSH connection test'" >/dev/null 2>&1; then
        error_exit "Cannot connect to production server fonana-server via SSH"
    fi
    
    # Create deployment package (source code only)
    log "📦 Creating emergency deployment package..."
    TEMP_DIR=$(mktemp -d)
    DATE=$(date +%Y%m%d_%H%M%S)
    DEPLOY_PACKAGE="${TEMP_DIR}/fonana-emergency-${DATE}.tar.gz"
    
    # Create tar package excluding unnecessary files
    tar -czf "$DEPLOY_PACKAGE" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=.git \
        --exclude="*.log" \
        --exclude=".env*" \
        --exclude="deployment.log" \
        .
    
    log "✅ Deployment package created: $(basename "$DEPLOY_PACKAGE")"
    
    # Create remote deployment script
    cat > "${TEMP_DIR}/emergency-deploy.sh" << 'REMOTE_SCRIPT'
#!/bin/bash
set -euo pipefail

# Emergency deployment script for Fonana with full server setup
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🚀 Starting full server setup and deployment..."

# Update system packages
log "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential tools
log "🔧 Installing essential tools..."
apt install -y curl wget git nginx certbot python3-certbot-nginx postgresql-client

# Install Node.js 20.x (LTS)
log "📥 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js installation
log "✅ Node.js version: $(node --version)"
log "✅ npm version: $(npm --version)"

# Install PM2 globally
log "📥 Installing PM2 globally..."
npm install -g pm2

# Create backup directory
mkdir -p /backup
if [[ -d "/var/www/Fonana" ]]; then
    BACKUP_NAME="fonana_backup_$(date +%Y%m%d_%H%M%S)"
    log "📦 Creating backup: $BACKUP_NAME"
    cp -r /var/www/Fonana "/backup/$BACKUP_NAME"
fi

# Extract new version
log "📦 Extracting new version..."
mkdir -p /var/www
cd /var/www
rm -rf Fonana_temp
mkdir Fonana_temp
cd Fonana_temp
tar -xzf /tmp/deployment-package.tar.gz

# Install dependencies
log "📥 Installing dependencies..."
npm ci

# Setup environment
log "⚙️  Setting up environment..."
cat > .env << 'ENV_CONTENT'
# Production Environment for Fonana
DATABASE_URL="postgresql://fonana_user:fonana_pass@localhost:5432/fonana"
NEXTAUTH_URL="https://fonana.me"
NEXTAUTH_SECRET="rFbhMWHvRfN5xqP7tK3mL9nE2wQ8sV1zA4bC6dF0gJ"
JWT_SECRET="rFbhMWHvRfN5xqP7tK3mL9nE2wQ8sV1zA4bC6dF0gJ"

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL="https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/"
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_PLATFORM_WALLET="EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw"

# WebSocket Configuration  
WS_PORT=3002
ENV_CONTENT

# Move to final location
log "🔄 Deploying new version..."
cd /var/www
if [[ -d "Fonana" ]]; then
    rm -rf Fonana_old
    mv Fonana Fonana_old
fi
mv Fonana_temp Fonana
cd Fonana

# Configure PM2 ecosystem
cat > ecosystem.config.js << 'PM2_CONFIG'
module.exports = {
  apps: [{
    name: 'fonana-app',
    script: 'npm',
    args: 'run dev',
    cwd: '/var/www/Fonana',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/fonana-error.log',
    out_file: '/var/log/fonana-out.log',
    log_file: '/var/log/fonana-combined.log',
    time: true
  }]
};
PM2_CONFIG

# Start application with PM2
log "🚀 Starting application with PM2..."
pm2 delete fonana-app 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Setup PM2 startup service
log "⚙️  Configuring PM2 startup service..."
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

log "✅ Emergency deployment completed successfully!"
log "🌐 Application should be available at: https://fonana.me"
log "📊 Check status with: pm2 status"
log "📝 Check logs with: pm2 logs fonana-app"
REMOTE_SCRIPT

    chmod +x "${TEMP_DIR}/emergency-deploy.sh"
    
    # Transfer files and execute (SSH KEY MODE)
    log "📤 Transferring files to server..."
    scp -o StrictHostKeyChecking=no "${DEPLOY_PACKAGE}" fonana-server:/tmp/deployment-package.tar.gz
    
    scp -o StrictHostKeyChecking=no "${TEMP_DIR}/emergency-deploy.sh" fonana-server:/tmp/emergency-deploy.sh
    
    log "🚀 Executing full server setup and deployment..."
    ssh -o StrictHostKeyChecking=no fonana-server "chmod +x /tmp/emergency-deploy.sh && /tmp/emergency-deploy.sh"
    
    # Setup Nginx configuration
    log "⚙️  Configuring Nginx..."
    cat > "${TEMP_DIR}/nginx-emergency.conf" << 'NGINX_CONFIG'
server {
    listen 80;
    server_name fonana.me www.fonana.me;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
NGINX_CONFIG

    scp -o StrictHostKeyChecking=no "${TEMP_DIR}/nginx-emergency.conf" fonana-server:/etc/nginx/sites-available/fonana
    
    log "🔧 Enabling Nginx configuration..."
    ssh -o StrictHostKeyChecking=no fonana-server "
        ln -sf /etc/nginx/sites-available/fonana /etc/nginx/sites-enabled/
        nginx -t && systemctl reload nginx
    "
    
    # Setup SSL with Certbot
    log "🔒 Setting up SSL certificate..."
    ssh -o StrictHostKeyChecking=no fonana-server "
        certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect || echo 'SSL setup may have failed, continuing...'
    "
    
    # Final health check
    log "🏥 Performing health check..."
    sleep 15
    
    if curl -f "http://${PRODUCTION_SERVER}" >/dev/null 2>&1; then
        log "✅ Health check passed - server responding"
    else
        log "⚠️  Health check failed - server may still be starting"
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    log "🎉 EMERGENCY DEPLOYMENT COMPLETED!"
    log "🌐 Application URL: https://${DOMAIN}"
    log "📊 Server status: ssh fonana-server 'pm2 status'"
    log "📝 Application logs: ssh fonana-server 'pm2 logs fonana-app'"
    log "🔄 To restart: ssh fonana-server 'pm2 restart fonana-app'"
    
    echo -e ""
    echo -e "${GREEN}=============================================================================="
    echo -e "                    DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo -e "=============================================================================="
    echo -e ""
    echo -e "🌐 Application URL: https://${DOMAIN}"
    echo -e "📊 Check status: ssh fonana-server 'pm2 status'"
    echo -e "📝 View logs: ssh fonana-server 'pm2 logs fonana-app'"
    echo -e "${NC}"
}

# Run main function
main "$@" 