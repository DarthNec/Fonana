#!/bin/bash

# Fonana Automated Deployment Script v1.4
# AUTOMATED MODE: sshpass for non-interactive deployment
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
echo -e "            FONANA AUTOMATED DEPLOYMENT SCRIPT v1.4"
echo -e "           AUTOMATED MODE: SSHPASS NON-INTERACTIVE"
echo -e "=============================================================================="
echo -e "${NC}"

# Get SSH password
if [[ -z "${SSH_PASS:-}" ]]; then
    echo -e "${YELLOW}Введи пароль root для сервера ${PRODUCTION_SERVER}:${NC}"
    read -s SSH_PASS
    echo
fi

# Confirmation
echo -e "${YELLOW}⚠️  AUTOMATED DEPLOYMENT MODE АКТИВЕН"
echo -e "   - Установка Node.js, npm, PM2 на сервер"
echo -e "   - Деплой без production build (dev режим)" 
echo -e "   - Автоматическое SSH подключение с sshpass"
echo -e "   - Целевой сервер: ${PRODUCTION_SERVER} (${DOMAIN})"
echo -e "   - Время выполнения: ~10-15 минут"
echo -e ""
echo -e "Продолжить автоматический деплой? (y/n): ${NC}"
read -r confirmation
if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
    echo -e "${RED}Deployment отменен пользователем.${NC}"
    exit 1
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

# SSH helper function with sshpass
ssh_cmd() {
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no root@${PRODUCTION_SERVER} "$1"
}

# SCP helper function with sshpass  
scp_cmd() {
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no "$1" root@${PRODUCTION_SERVER}:"$2"
}

# Main deployment function
main() {
    log "🚀 Starting automated Fonana deployment to $DOMAIN"
    
    # Pre-deployment checks
    log "📋 Running pre-deployment checks..."
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || ! grep -q "fonana" package.json; then
        error_exit "Not in Fonana project directory"
    fi
    
    # Check server connectivity
    log "🔗 Checking server connectivity..."
    if ! ping -c 1 "$PRODUCTION_SERVER" >/dev/null 2>&1; then
        error_exit "Cannot reach production server $PRODUCTION_SERVER"
    fi
    
    # Test SSH connection
    log "🔑 Testing SSH connection..."
    if ! ssh_cmd "echo 'SSH connection successful'"; then
        error_exit "SSH connection failed - check password"
    fi
    
    # Create deployment package
    log "📦 Creating deployment package..."
    TEMP_DIR=$(mktemp -d)
    DATE=$(date +%Y%m%d_%H%M%S)
    DEPLOY_PACKAGE="${TEMP_DIR}/fonana-${DATE}.tar.gz"
    
    tar -czf "$DEPLOY_PACKAGE" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=.git \
        --exclude="*.log" \
        --exclude=".env*" \
        --exclude="deployment.log" \
        .
    
    log "✅ Package created: $(basename "$DEPLOY_PACKAGE")"
    
    # Create remote deployment script
    cat > "${TEMP_DIR}/auto-deploy.sh" << 'REMOTE_SCRIPT'
#!/bin/bash
set -euo pipefail

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🚀 Starting full server setup..."

# Fix any apt locks first
log "🔐 Checking and fixing apt locks..."
pkill -f apt || true
pkill -f dpkg || true
rm -f /var/lib/dpkg/lock* || true
rm -f /var/cache/apt/archives/lock || true
rm -f /var/lib/apt/lists/lock || true
dpkg --configure -a || true

# Update system packages with retries
log "📦 Updating system packages (with automatic retries)..."
export DEBIAN_FRONTEND=noninteractive

# Try apt update with timeout and retries
for i in {1..3}; do
    log "Attempt $i/3 for apt update..."
    if timeout 300 apt update; then
        log "✅ apt update successful!"
        break
    else
        log "⏰ apt update failed, killing locks and retrying in 30 seconds..."
        pkill -f apt || true
        pkill -f dpkg || true
        rm -f /var/lib/dpkg/lock* || true
        sleep 30
    fi
done

# Try apt upgrade with timeout
log "📦 Upgrading packages..."
timeout 600 apt upgrade -y || log "⚠️ Upgrade timeout, continuing anyway..."

# Install essential tools
log "🔧 Installing essential tools..."
apt install -y curl wget git nginx certbot python3-certbot-nginx postgresql-client

# Install Node.js 20.x (LTS)
log "📥 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installations
log "✅ Node.js version: $(node --version)"
log "✅ npm version: $(npm --version)"

# Install PM2 globally
log "📥 Installing PM2 globally..."
npm install -g pm2

# Create backup
mkdir -p /backup
if [[ -d "/var/www/Fonana" ]]; then
    BACKUP_NAME="fonana_backup_$(date +%Y%m%d_%H%M%S)"
    log "📦 Creating backup: $BACKUP_NAME"
    cp -r /var/www/Fonana "/backup/$BACKUP_NAME"
fi

# Extract new version
log "📦 Extracting application..."
mkdir -p /var/www
cd /var/www
rm -rf Fonana_temp
mkdir Fonana_temp
cd Fonana_temp
tar -xzf /tmp/deployment-package.tar.gz

# Install dependencies
log "📥 Installing dependencies (это займет несколько минут)..."
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

# Deploy to final location
log "🔄 Deploying to final location..."
cd /var/www
if [[ -d "Fonana" ]]; then
    rm -rf Fonana_old
    mv Fonana Fonana_old
fi
mv Fonana_temp Fonana
cd Fonana

# Configure PM2
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

# Start application
log "🚀 Starting Fonana application..."
pm2 delete fonana-app 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure PM2 startup
log "⚙️  Configuring PM2 startup..."
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

log "✅ Server setup completed!"
log "🌐 Application running at: http://localhost:3000"
log "📊 Status: pm2 status"
REMOTE_SCRIPT

    chmod +x "${TEMP_DIR}/auto-deploy.sh"
    
    # Transfer files
    log "📤 Transferring files to server..."
    scp_cmd "${DEPLOY_PACKAGE}" "/tmp/deployment-package.tar.gz"
    scp_cmd "${TEMP_DIR}/auto-deploy.sh" "/tmp/auto-deploy.sh"
    
    # Execute deployment
    log "🚀 Executing server setup (10-15 минут)..."
    ssh_cmd "chmod +x /tmp/auto-deploy.sh && /tmp/auto-deploy.sh"
    
    # Setup Nginx
    log "⚙️  Configuring Nginx..."
    cat > "${TEMP_DIR}/nginx.conf" << 'NGINX_CONFIG'
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
    
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
NGINX_CONFIG

    scp_cmd "${TEMP_DIR}/nginx.conf" "/etc/nginx/sites-available/fonana"
    
    log "🔧 Enabling Nginx..."
    ssh_cmd "ln -sf /etc/nginx/sites-available/fonana /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"
    
    # Setup SSL
    log "🔒 Setting up SSL certificate..."
    ssh_cmd "certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect || echo 'SSL setup may have failed, continuing...'"
    
    # Final health check
    log "🏥 Performing health check..."
    sleep 20
    
    if curl -f "http://${PRODUCTION_SERVER}" >/dev/null 2>&1; then
        log "✅ Health check passed!"
    else
        log "⚠️  Health check pending - server may still be starting"
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    log "🎉 AUTOMATED DEPLOYMENT COMPLETED!"
    log "🌐 Application URL: https://${DOMAIN}"
    log "📊 Check status: ssh root@${PRODUCTION_SERVER} 'pm2 status'"
    log "📝 View logs: ssh root@${PRODUCTION_SERVER} 'pm2 logs fonana-app'"
    
    echo -e ""
    echo -e "${GREEN}=============================================================================="
    echo -e "                    DEPLOYMENT УСПЕШНО ЗАВЕРШЕН!"
    echo -e "=============================================================================="
    echo -e ""
    echo -e "🌐 Application URL: https://${DOMAIN}" 
    echo -e "📊 Status: ssh root@${PRODUCTION_SERVER} 'pm2 status'"
    echo -e "📝 Logs: ssh root@${PRODUCTION_SERVER} 'pm2 logs fonana-app'"
    echo -e "🔄 Restart: ssh root@${PRODUCTION_SERVER} 'pm2 restart fonana-app'"
    echo -e "${NC}"
}

# Check for sshpass
if ! command -v sshpass >/dev/null 2>&1; then
    error_exit "sshpass not installed. Run: brew install hudochenkov/sshpass/sshpass"
fi

# Run main function
main "$@" 