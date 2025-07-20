#!/bin/bash

echo "🚀 БЫСТРО ЗАВЕРШАЕМ DEPLOYMENT FONANA!"

ssh root@64.20.37.222 << 'EOF'
  
  # Установка Node.js если нужно
  if ! which node; then
    echo "📥 Устанавливаем Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  fi
  
  # Установка PM2
  if ! which pm2; then
    echo "📦 Устанавливаем PM2..."
    npm install -g pm2
  fi
  
  # Настройка приложения
  echo "🔧 Настраиваем Fonana..."
  mkdir -p /var/www/Fonana
  cd /var/www/Fonana
  
  # Извлекаем приложение
  tar -xzf /tmp/deployment-package.tar.gz
  
  # Устанавливаем зависимости  
  npm install --production
  
  # Создаём .env
  cat > .env << ENV
NODE_ENV=production
DATABASE_URL=postgresql://fonana_user:fonana_pass@localhost:5432/fonana
NEXTAUTH_SECRET=rFbhMWHvRfHOj9JXKr7h1PQqSvYzN4pC8xT2uI3oP1nL
NEXTAUTH_URL=https://fonana.me
WS_PORT=3002
PORT=3000
ENV

  # PM2 конфиг
  cat > ecosystem.config.js << PM2
module.exports = {
  apps: [{
    name: "fonana",
    script: "npm",
    args: "run dev",
    env: { NODE_ENV: "production", PORT: 3000 },
    instances: 1,
    exec_mode: "fork"
  }]
}
PM2

  # Nginx конфиг для Fonana
  cat > /etc/nginx/sites-available/fonana << NGINX
server {
    listen 80 default_server;
    server_name fonana.me www.fonana.me _;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGINX

  # Активируем сайт
  rm -f /etc/nginx/sites-enabled/default
  ln -sf /etc/nginx/sites-available/fonana /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  
  # Запускаем приложение
  pm2 delete fonana 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
  
  echo "✅ FONANA ЗАПУЩЕНА!"
  echo "📊 Статус:"
  pm2 status
  echo "🌐 Проверьте: http://fonana.me"
  
EOF 