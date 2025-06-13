#!/bin/bash

echo "🚀 Быстрое исправление путей nginx для Fonana"
echo ""
echo "Этот скрипт автоматически исправит проблему с путями"
echo ""

# Загрузка исправленной конфигурации
echo "1. Загружаем исправленную конфигурацию на сервер:"
echo "scp -P 43988 nginx-fonana-fixed-paths.conf root@69.10.59.234:/tmp/fonana-nginx-fixed.conf"
echo ""

# Команды для выполнения на сервере
echo "2. Затем выполните на сервере:"
echo "ssh -p 43988 root@69.10.59.234"
echo ""
echo "# Резервная копия"
echo "cp /etc/nginx/sites-available/fonana /etc/nginx/sites-available/fonana.backup-$(date +%Y%m%d)"
echo ""
echo "# Применение исправленной конфигурации"
echo "cp /tmp/fonana-nginx-fixed.conf /etc/nginx/sites-available/fonana"
echo ""
echo "# Проверка и перезапуск"
echo "nginx -t && systemctl reload nginx"
echo ""
echo "# Проверка результата"
echo "curl -I https://fonana.me/_next/static/chunks/webpack-f9a8923f791c7231.js"
echo ""
echo "✅ Готово!" 