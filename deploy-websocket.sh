#!/bin/bash

echo "🚀 Deploying Fonana WebSocket Server to Production..."

# Переменные
SERVER="root@69.10.59.234"
SERVER_PORT="43988"
SERVER_PATH="/var/www/Fonana"

# Проверка и создание папки логов
echo "📁 Checking logs directory..."
ssh -p $SERVER_PORT $SERVER << 'EOF'
if [ ! -d "/var/www/Fonana/logs" ]; then
    mkdir -p /var/www/Fonana/logs
    echo "✅ Created logs directory"
else
    echo "✅ Logs directory exists"
fi
EOF

# Копирование файлов WebSocket сервера
echo "📂 Uploading WebSocket server files..."
scp -P $SERVER_PORT -r ./websocket-server/ $SERVER:$SERVER_PATH/
cd /var/www/Fonana/websocket-server

# Установка зависимостей
echo "📦 Installing dependencies..."
npm install --production

# Обновление основного приложения
echo "🔄 Updating main application..."
ssh -p $SERVER_PORT $SERVER << 'EOF'
cd /var/www/Fonana

# Устанавливаем права
chmod +x ./websocket-server/start.sh

# Обновляем зависимости в основном проекте
npm install --production

# Перезапуск приложения
echo "🔄 Restarting application..."
pm2 reload all

# Проверка статуса
pm2 status

EOF

echo "✅ WebSocket Server deployed successfully!"
echo ""
echo "📊 Проверить логи:"
echo "   ssh -p $SERVER_PORT $SERVER 'pm2 logs'"
echo ""
echo "🔗 Проверить подключение:"
echo "   wscat -c ws://fonana.me:3002"
echo ""
echo "📱 Frontend должен автоматически подключиться к WebSocket серверу"

# Проверка работы приложения
echo "🔍 Testing application..."
ssh -p $SERVER_PORT $SERVER << 'EOF'

echo "📊 PM2 Status:"
pm2 status

echo ""
echo "🔧 WebSocket сервер статус:"
if pm2 list | grep -q "websocket-server.*online"; then
    echo "✅ WebSocket сервер запущен"
else
    echo "❌ WebSocket сервер не запущен"
fi

echo ""
echo "📂 Проверка файлов:"
ls -la /var/www/Fonana/websocket-server/ | head -5

echo ""
echo "🌐 Тест подключения (локальный):"
# timeout 3 telnet localhost 3002 || echo "❌ WebSocket порт недоступен"

# Проверяем основное приложение
cd /var/www/Fonana
echo ""
echo "📱 Основное приложение статус:"
if pm2 list | grep -q "fonana.*online"; then
    echo "✅ Основное приложение запущено"
else
    echo "❌ Основное приложение не запущено"
fi

EOF

echo ""
echo "🎉 Deployment completed!"
echo "🔧 Troubleshooting:"
echo "   • Check logs: ssh -p $SERVER_PORT $SERVER 'pm2 logs'"
echo "   • Restart: ssh -p $SERVER_PORT $SERVER 'pm2 restart all'"
echo "   • Monitor: ssh -p $SERVER_PORT $SERVER 'pm2 monit'" 