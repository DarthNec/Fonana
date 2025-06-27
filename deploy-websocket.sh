#!/bin/bash

echo "🚀 Deploying Fonana WebSocket Server to Production..."

# Переменные
SERVER="root@69.10.59.234"
SERVER_PORT="43988"
SERVER_PATH="/var/www/fonana"

# Проверка и создание папки логов
echo "📁 Checking logs directory..."
ssh -p $SERVER_PORT $SERVER << 'EOF'
if [ ! -d "/var/www/fonana/logs" ]; then
    mkdir -p /var/www/fonana/logs
    echo "✅ Created logs directory"
else
    echo "✅ Logs directory exists"
fi
EOF

# Генерация Prisma клиента на сервере
echo "🔧 Generating Prisma client..."
ssh -p $SERVER_PORT $SERVER << 'EOF'
cd /var/www/fonana/websocket-server
npx prisma generate --schema=../prisma/schema.prisma
echo "✅ Prisma client generated"
EOF

# Копирование .env файла в websocket-server
echo "📋 Copying .env file..."
ssh -p $SERVER_PORT $SERVER << 'EOF'
cd /var/www/fonana
if [ ! -f websocket-server/.env ]; then
    cp .env websocket-server/.env
    echo "✅ .env file copied"
else
    echo "✅ .env file already exists"
fi
EOF

# Проверка Nginx конфигурации
echo "🔍 Checking Nginx configuration..."
ssh -p $SERVER_PORT $SERVER << 'EOF'
if grep -q "location /ws" /etc/nginx/sites-available/fonana; then
    echo "✅ WebSocket proxy already configured in Nginx"
else
    echo "❌ WebSocket proxy not found in Nginx config"
    echo "Please add the following to /etc/nginx/sites-available/fonana:"
    echo "
location /ws {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \"upgrade\";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
    proxy_buffering off;
}"
fi
EOF

# Перезапуск PM2 с новой конфигурацией
echo "🔄 Restarting PM2..."
ssh -p $SERVER_PORT $SERVER << 'EOF'
cd /var/www/fonana
pm2 stop all
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
echo "✅ PM2 processes restarted"
EOF

# Проверка статуса
echo "📊 Checking status..."
ssh -p $SERVER_PORT $SERVER "pm2 status"

echo "
✅ WebSocket server deployment complete!

Next steps:
1. If Nginx config was missing, add it manually and run: sudo systemctl reload nginx
2. Test WebSocket connection at wss://fonana.me/ws
3. Monitor logs: pm2 logs fonana-ws
" 