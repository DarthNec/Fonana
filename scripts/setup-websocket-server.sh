#!/bin/bash

# Скрипт для установки и настройки WebSocket сервера Fonana
# Usage: ./scripts/setup-websocket-server.sh

set -e

echo "🚀 Setting up Fonana WebSocket Server..."
echo "========================================"

# Проверяем, что мы в корневой директории проекта
if [ ! -f "package.json" ] || [ ! -d "websocket-server" ]; then
    echo "❌ Error: Run this script from the Fonana project root directory"
    exit 1
fi

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create it first."
    exit 1
fi

# Переходим в директорию WebSocket сервера
cd websocket-server

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔍 Checking environment variables..."

# Проверяем необходимые переменные окружения
if grep -q "DATABASE_URL" ../.env; then
    echo "✅ DATABASE_URL found"
else
    echo "❌ DATABASE_URL not found in .env"
    exit 1
fi

if grep -q "NEXTAUTH_SECRET" ../.env; then
    echo "✅ NEXTAUTH_SECRET found"
else
    echo "❌ NEXTAUTH_SECRET not found in .env"
    exit 1
fi

# Добавляем WS_PORT если его нет
if ! grep -q "WS_PORT" ../.env; then
    echo "➕ Adding WS_PORT=3002 to .env"
    echo "WS_PORT=3002" >> ../.env
fi

# Проверяем Redis (опционально)
if grep -q "REDIS_URL" ../.env; then
    echo "✅ REDIS_URL found (optional)"
else
    echo "⚠️  REDIS_URL not found - running in single server mode"
fi

echo ""
echo "🧪 Running test connection..."

# Получаем тестовый user ID
TEST_USER_ID=$(cd .. && npx prisma db execute --stdin <<< "SELECT id FROM \"User\" LIMIT 1;" 2>/dev/null | grep -E '^[a-zA-Z0-9]{20,}' | head -1 || echo "")

if [ -n "$TEST_USER_ID" ]; then
    echo "📝 Found test user: $TEST_USER_ID"
    
    # Обновляем тестовый файл с реальным ID
    sed -i.bak "s/const TEST_USER_ID = '.*'/const TEST_USER_ID = '$TEST_USER_ID'/" test-client.js
    rm test-client.js.bak
else
    echo "⚠️  No users found in database. Using default test ID."
fi

echo ""
echo "🔧 Configuration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start the WebSocket server:"
echo "   cd websocket-server && npm start"
echo ""
echo "2. Or run with PM2 (production):"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "3. Test the connection:"
echo "   cd websocket-server && node test-client.js"
echo ""
echo "4. Update Nginx configuration to add:"
echo "   location /ws {"
echo "       proxy_pass http://localhost:3002;"
echo "       proxy_http_version 1.1;"
echo "       proxy_set_header Upgrade \$http_upgrade;"
echo "       proxy_set_header Connection \"upgrade\";"
echo "   }"
echo ""
echo "✅ WebSocket server setup complete!" 