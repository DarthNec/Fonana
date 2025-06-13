#!/bin/bash

echo "=== Очистка и перезапуск Fonana ==="

# Создаем скрипт для выполнения на сервере
cat > server_reset.sh << 'EOF'
#!/bin/bash

echo "=== Очистка и перезапуск Fonana на сервере ==="

# Остановка всех процессов Node.js
echo "Останавливаю все процессы Node.js..."
killall -9 node
killall -9 next-serv
pkill -f "node.*server"

# Проверка портов
echo "Проверяю открытые порты..."
lsof -i :3000 || echo "Порт 3000 свободен"
lsof -i :3001 || echo "Порт 3001 свободен"

# Очистка кэша
echo "Очищаю кэш Next.js..."
cd /var/www/fonana
rm -rf .next
rm -rf node_modules/.cache

# Пересборка приложения
echo "Пересобираю приложение..."
npm run build

# Запуск приложения на порту 3001
echo "Запускаю приложение на порту 3001..."
PORT=3001 nohup node node_modules/next/dist/bin/next start > nohup.out 2>&1 &

# Проверка запуска
sleep 3
ps aux | grep next
lsof -i :3001

# Проверка nginx
echo "Проверяю конфигурацию nginx..."
nginx -t

echo "Перезапускаю nginx..."
systemctl reload nginx

echo "Готово! Проверьте сайт."
EOF

# Отправка скрипта на сервер
echo "Отправляю скрипт на сервер..."
scp -P 43988 server_reset.sh root@69.10.59.234:/var/www/fonana/

# Выполнение скрипта на сервере
echo "Выполняю скрипт на сервере..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && chmod +x server_reset.sh && ./server_reset.sh"

# Удаление временного скрипта
rm server_reset.sh

echo "Готово!" 