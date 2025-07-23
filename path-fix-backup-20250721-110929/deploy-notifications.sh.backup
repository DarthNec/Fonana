#!/bin/bash

echo "🚀 Deploying Notification System to Production"
echo "============================================"

# Проверяем подключение к серверу
SERVER_IP="69.10.59.234"
SERVER_PORT="43988"
SERVER_USER="root"
SERVER_PATH="/var/www/fonana"

echo "📡 Checking server connection..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "echo '✅ Connected to server'" || {
    echo "❌ Failed to connect to server"
    exit 1
}

echo ""
echo "📦 Preparing deployment..."

# Добавляем новые файлы в git
git add -A
git commit -m "feat: Add notification system with ASMR sounds

- Created Notification model in database
- Added notification API endpoints
- Created NotificationContext for state management
- Added NotificationsDropdown component in navbar
- Integrated notifications for likes, comments, and subscriptions
- Added two types of sounds: single and trill
- Fixed SubscribeModal syntax error"

# Пушим на GitHub
echo ""
echo "📤 Pushing to GitHub..."
git push origin main || {
    echo "❌ Failed to push to GitHub"
    exit 1
}

echo ""
echo "🔄 Deploying to production server..."

# Деплоим на сервер
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP << 'EOF'
cd /var/www/fonana

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🗄️ Running database migrations..."
npx prisma migrate deploy
npx prisma generate

echo "🏗️ Building application..."
npm run build

echo "🔄 Restarting services..."
pm2 restart fonana

echo "✅ Deployment complete!"
EOF

echo ""
echo "🎉 Notification system deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test notifications on https://fonana.me"
echo "2. Replace placeholder sounds with better ASMR sounds"
echo "3. Monitor server logs: ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP 'pm2 logs fonana'"
echo ""
echo "🔔 Features added:"
echo "- Sound notifications for likes and comments"
echo "- Bell icon in navbar with unread count"
echo "- Notification dropdown menu"
echo "- User settings integration"
echo "- Automatic polling for new notifications" 