#!/bin/bash

# Проверка доступа к серверу Fonana

SERVER="69.10.59.234"
SSH_PORT="43988"

echo "🔍 Проверка доступа к серверу Fonana"
echo "📍 IP адрес: $SERVER"
echo "🔌 SSH порт: $SSH_PORT"
echo ""

# Проверка ping
echo "1️⃣ Проверка доступности сервера (ping)..."
if ping -c 1 -W 2 $SERVER > /dev/null 2>&1; then
    echo "✅ Сервер доступен"
else
    echo "❌ Сервер не отвечает на ping"
fi

# Проверка HTTP
echo ""
echo "2️⃣ Проверка веб-сервера..."
if curl -s -o /dev/null -w "%{http_code}" http://$SERVER | grep -q "200\|301\|302"; then
    echo "✅ Веб-сервер работает"
    echo "🌐 Сайт: http://$SERVER"
else
    echo "⚠️  Веб-сервер не отвечает или возвращает ошибку"
fi

# Проверка SSH порта
echo ""
echo "3️⃣ Проверка SSH порта..."
if nc -z -w 2 $SERVER $SSH_PORT 2>/dev/null; then
    echo "✅ SSH порт $SSH_PORT открыт"
else
    echo "❌ SSH порт $SSH_PORT закрыт или недоступен"
fi

# Инструкции по SSH
echo ""
echo "4️⃣ SSH подключение..."
echo "Для подключения используйте:"
echo "  ssh -p $SSH_PORT root@$SERVER"
echo ""
echo "Если у вас нет SSH ключа:"
echo "1. Создайте SSH ключ: ssh-keygen -t ed25519"
echo "2. Добавьте публичный ключ на сервер"
echo "3. Или используйте пароль (если разрешено)"
echo ""
echo "Для деплоя запустите:"
echo "  ./deploy-to-server.sh root@$SERVER" 