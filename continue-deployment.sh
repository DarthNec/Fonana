#!/bin/bash

# Continue Fonana deployment from where it stopped
echo "🚀 Continuing Fonana deployment..."

# Read password securely
read -s -p "Введи пароль SSH для сервера 64.20.37.222: " SSH_PASS
echo

# Continue deployment
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no root@64.20.37.222 '
  set -euo pipefail
  
  echo "🔧 Fixing debconf and completing server setup..."
  export DEBIAN_FRONTEND=noninteractive
  
  # Fix debconf locks
  pkill -f debconf || true
  rm -f /var/cache/debconf/*.dat-old || true
  
  # Complete package configuration
  dpkg --configure -a || true
  apt install --fix-broken -y || true
  
  # Install Node.js if not present
  if ! which node >/dev/null; then
    echo "📥 Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  else
    echo "✅ Node.js already installed: $(node --version)"
  fi
  
  # Install PM2 globally
  if ! which pm2 >/dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
  else
    echo "✅ PM2 already installed: $(pm2 --version)"
  fi
  
  # Ensure nginx is running
  systemctl enable nginx || true
  systemctl start nginx || true
  
  echo "📊 Server software versions:"
  echo "Node.js: $(node --version)"
  echo "NPM: $(npm --version)" 
  echo "PM2: $(pm2 --version)"
  echo "Nginx: $(nginx -v 2>&1)"
  
  # Extract and setup Fonana app
  cd /tmp
  if [ -f deployment-package.tar.gz ]; then
    echo "📦 Extracting Fonana application..."
    
    # Create app directory
    mkdir -p /var/www/Fonana
    cd /var/www/Fonana
    
    # Extract files
    tar -xzf /tmp/deployment-package.tar.gz
    
    echo "📥 Installing Node.js dependencies..."
    npm install
    
    # Setup environment
    echo "🔐 Creating environment file..."
    cat > .env << ENV_FILE
NODE_ENV=production
DATABASE_URL=postgresql://fonana_user:fonana_pass@localhost:5432/fonana
NEXTAUTH_SECRET=rFbhMWHvRfHOj9JXKr7h1PQqSvYzN4pC8xT2uI3oP1nL
NEXTAUTH_URL=https://fonana.me
WS_PORT=3002
ENV_FILE
    
    echo "🚀 Starting Fonana with PM2..."
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << PM2_CONFIG
module.exports = {
  apps: [{
    name: "fonana",
    script: "npm",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "1G",
    error_file: "/var/log/fonana-error.log",
    out_file: "/var/log/fonana-out.log",
    log_file: "/var/log/fonana.log"
  }]
}
PM2_CONFIG

    # Stop any existing Fonana processes
    pm2 delete fonana || true
    
    # Start application
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    echo "🌐 Configuring Nginx..."
    cat > /etc/nginx/sites-available/fonana << NGINX_CONFIG
server {
    listen 80;
    server_name fonana.me www.fonana.me;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection '\''upgrade'\'';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_CONFIG

    # Enable site
    ln -sf /etc/nginx/sites-available/fonana /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload nginx
    nginx -t && systemctl reload nginx
    
    echo "🔒 Setting up SSL..."
    certbot --nginx -d fonana.me -d www.fonana.me --non-interactive --agree-tos --email admin@fonana.me || echo "SSL setup failed, continuing..."
    
    echo "✅ Deployment completed!"
    echo "🌐 Fonana should be available at: https://fonana.me"
    
    echo "📊 Final status check:"
    pm2 status
    systemctl status nginx --no-pager
    
  else
    echo "❌ Deployment package not found!"
    exit 1
  fi
'

echo "✅ Deployment script completed!" 