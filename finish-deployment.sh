#!/bin/bash

echo "🚀 FINISHING FONANA DEPLOYMENT ON FONANA.ME"
echo "============================================"

ssh root@64.20.37.222 '
  set -e
  
  echo "📥 Installing Node.js 20.x LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  
  echo "📦 Installing PM2 globally..."
  npm install -g pm2
  
  echo "📂 Setting up Fonana application..."
  
  # Create application directory
  mkdir -p /var/www/Fonana
  cd /var/www/Fonana
  
  # Extract application
  tar -xzf /tmp/deployment-package.tar.gz --strip-components=0
  
  echo "📥 Installing Node.js dependencies..."
  npm install --production
  
  echo "🔐 Creating production environment file..."
  cat > .env << EOF
NODE_ENV=production
DATABASE_URL=postgresql://fonana_user:fonana_pass@localhost:5432/fonana  
NEXTAUTH_SECRET=rFbhMWHvRfHOj9JXKr7h1PQqSvYzN4pC8xT2uI3oP1nL
NEXTAUTH_URL=https://fonana.me
WS_PORT=3002
PORT=3000
EOF

  echo "🚀 Creating PM2 ecosystem configuration..."
  cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: "fonana",
    script: "npm",
    args: "run dev",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "1G",
    error_file: "/var/log/fonana-error.log", 
    out_file: "/var/log/fonana-out.log",
    log_file: "/var/log/fonana.log",
    watch: false,
    autorestart: true
  }]
}
EOF

  echo "🌐 Configuring Nginx for fonana.me..."
  cat > /etc/nginx/sites-available/fonana << EOF
server {
    listen 80;
    server_name fonana.me www.fonana.me;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

  # Enable Fonana site
  ln -sf /etc/nginx/sites-available/fonana /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  
  echo "🔥 Starting services..."
  
  # Test nginx config
  nginx -t
  
  # Enable and start nginx
  systemctl enable nginx
  systemctl start nginx
  
  # Start Fonana application with PM2
  pm2 delete fonana 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup
  
  echo "✅ DEPLOYMENT COMPLETED!"
  echo "======================================"
  echo "🌐 Fonana is now running on: http://fonana.me"
  echo "📊 Check status with: pm2 status"
  echo "📝 View logs with: pm2 logs fonana"
  echo "🔧 Nginx status: systemctl status nginx"
  echo "======================================"
  
  echo "📊 Final verification:"
  echo "Node.js: $(node --version)"
  echo "PM2: $(pm2 --version)" 
  pm2 status
  systemctl status nginx --no-pager
' 