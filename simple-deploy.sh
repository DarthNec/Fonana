#!/bin/bash

echo "🚀 Simple Deploy для Fonana"

# 1. Коммитим и пушим изменения
echo "📤 Pushing to GitHub..."
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin main

echo "✅ Код залит в GitHub"
echo ""
echo "🎯 Теперь на сервере запусти эти команды:"
echo ""
echo "cd /var/www/fonana"
echo "git pull origin main"
echo "npm ci"
echo "npm run build"
echo "pm2 reload fonana"
echo ""
echo "🔗 Или настрой webhook для автоматического деплоя"
echo "📋 Webhook URL: http://твой-сервер.me:9000/deploy" 