#!/bin/bash

# Скрипт для полного отключения systemd service

echo "🔧 Отключаем systemd service для Fonana..."

# Останавливаем service
echo "📍 Останавливаем fonana.service..."
ssh -p 43988 root@69.10.59.234 "systemctl stop fonana.service 2>/dev/null || echo 'Service not running'"

# Отключаем автозапуск
echo "📍 Отключаем автозапуск..."
ssh -p 43988 root@69.10.59.234 "systemctl disable fonana.service 2>/dev/null || echo 'Service not enabled'"

# Удаляем файл service
echo "📍 Удаляем файл service..."
ssh -p 43988 root@69.10.59.234 "rm -f /etc/systemd/system/fonana.service"

# Перезагружаем systemd
echo "📍 Перезагружаем systemd daemon..."
ssh -p 43988 root@69.10.59.234 "systemctl daemon-reload"

# Проверяем статус
echo "📍 Проверяем статус..."
ssh -p 43988 root@69.10.59.234 "systemctl list-units --type=service | grep fonana || echo '✅ Fonana service полностью удален'"

echo "✅ Готово! Теперь используйте только PM2 для управления приложением." 