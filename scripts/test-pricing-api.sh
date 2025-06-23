#!/bin/bash

echo "🔍 Тестирование API динамического ценообразования..."
echo ""

# Проверяем локально
echo "1. Локальный тест (http://localhost:3002/api/pricing):"
curl -s http://localhost:3002/api/pricing | python3 -m json.tool || echo "Локальный сервер не запущен"

echo ""
echo "2. Продакшн тест (https://fonana.me/api/pricing):"
curl -s https://fonana.me/api/pricing | python3 -m json.tool

echo ""
echo "3. Прямой тест через IP (http://69.10.59.234:3000/api/pricing):"
curl -s http://69.10.59.234:3000/api/pricing | python3 -m json.tool

echo ""
echo "📊 Тест завершен!" 