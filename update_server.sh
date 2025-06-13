#!/bin/bash

echo "=== Обновление сервера Fonana ==="

echo "Подключитесь к серверу:"
echo "ssh -p 43988 root@69.10.59.234"
echo ""
echo "Затем выполните эти команды на сервере:"
echo ""

echo "# 1. Перейти в директорию"
echo "cd /var/www/"
echo ""

echo "# 2. Распаковать архив"
echo "tar -xzf fonana-fixed.tar.gz -C fonana/"
echo ""

echo "# 3. Перейти в папку приложения"
echo "cd fonana"
echo ""

echo "# 4. Остановить текущее приложение"
echo "pkill -f 'node.*server.js'"
echo "pkill -f 'next start'"
echo ""

echo "# 5. Очистить кеш"
echo "rm -rf .next"
echo ""

echo "# 6. Установить зависимости"
echo "npm install"
echo ""

echo "# 7. Собрать приложение"
echo "npm run build"
echo ""

echo "# 8. Запустить приложение"
echo "./start_fonana.sh &"
echo ""

echo "# 9. Проверить что работает"
echo "curl -s http://localhost:3001 | head -10"
echo ""

echo "# 10. Перезапустить nginx"
echo "systemctl reload nginx"
echo ""

echo "=== Готово! ==="
echo "Проверьте сайт: https://fonana.me" 