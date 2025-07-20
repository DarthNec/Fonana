#!/bin/bash

echo "📊 PM2 Status Check"
echo "=================="
ssh fonana "pm2 status"

echo -e "\n📋 Recent Upload Errors (last 50 lines)"
echo "======================================"
ssh fonana "pm2 logs fonana-app --lines 50 --nostream | grep -A 5 -B 5 'upload\|Error\|error' | tail -30"

echo -e "\n📁 Upload Route File Status"
echo "=========================="
ssh fonana "ls -la /var/www/Fonana/.next/standalone/.next/server/app/api/posts/upload/"

echo -e "\n🔍 File Type Check"
echo "================="
ssh fonana "file /var/www/Fonana/.next/standalone/.next/server/app/api/posts/upload/route.js"

echo -e "\n⚠️ Node.js Syntax Check"
echo "======================"
ssh fonana "cd /var/www/Fonana && node -c .next/standalone/.next/server/app/api/posts/upload/route.js 2>&1"

echo -e "\n📊 File Size and Permissions"
echo "==========================="
ssh fonana "stat /var/www/Fonana/.next/standalone/.next/server/app/api/posts/upload/route.js"
