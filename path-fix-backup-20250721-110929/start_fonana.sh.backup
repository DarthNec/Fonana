#!/bin/bash

echo "Запускаю Fonana..."

# Переходим в директорию приложения
cd /var/www/fonana

# Проверяем порт 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "Порт 3001 занят, останавливаю процесс..."
    pkill -f "node.*server.js"
    pkill -f "next start.*3001"
    sleep 3
fi

# Проверяем наличие базы данных
if [ ! -f "prisma/dev.db" ]; then
    echo "Создаю базу данных..."
    export DATABASE_URL="file:./prisma/dev.db"
    npx prisma db push
fi

# Устанавливаем переменные окружения
export NODE_ENV=production
export PORT=3001
export HOSTNAME=0.0.0.0
export DATABASE_URL="file:./prisma/dev.db"
export PATH=/root/.nvm/versions/node/v20.19.2/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Если есть standalone build, используем его
if [ -f ".next/standalone/server.js" ]; then
    echo "Запускаю в standalone режиме..."
    cd .next/standalone
    exec /root/.nvm/versions/node/v20.19.2/bin/node server.js
else
    echo "Запускаю через npm start..."
    exec /root/.nvm/versions/node/v20.19.2/bin/npm start
fi

echo "Запускаю Fonana..."

# Устанавливаем sharp для оптимизации изображений в standalone режиме
echo "Проверяю и устанавливаю зависимости..."
npm list sharp &>/dev/null || npm install sharp

echo "Fonana запущена на http://localhost:3001" 