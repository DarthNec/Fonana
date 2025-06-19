#!/bin/bash

echo "🚀 Копируем скрипт на сервер..."
scp scripts/create-test-flash-sale.js root@69.10.59.234:/var/www/fonana/scripts/

echo "🔧 Запускаем скрипт на сервере..."
ssh root@69.10.59.234 "cd /var/www/fonana && node scripts/create-test-flash-sale.js"

echo "✅ Готово!" 