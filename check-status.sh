#!/bin/bash

echo "🔍 Checking deployment status on server 64.20.37.222..."
echo "Please enter SSH password when prompted."

ssh root@64.20.37.222 '
  echo "=== SERVER STATUS CHECK ==="
  echo "📊 System info:"
  uname -a
  echo
  
  echo "🌐 Network interfaces:"
  ip addr show | grep "inet " | head -3
  echo
  
  echo "🔧 Installed software:"
  echo "Node.js: $(which node && node --version || echo "Not installed")"
  echo "NPM: $(which npm && npm --version || echo "Not installed")"  
  echo "PM2: $(which pm2 && pm2 --version || echo "Not installed")"
  echo "Nginx: $(which nginx && nginx -v 2>&1 || echo "Not installed")"
  echo
  
  echo "📦 Deployment files:"
  ls -la /tmp/deployment-package.tar.gz 2>/dev/null || echo "No deployment package found"
  ls -la /var/www/Fonana/ 2>/dev/null | head -5 || echo "No Fonana directory found"
  echo
  
  echo "🚀 Running processes:"
  ps aux | grep -E "(nginx|pm2|node)" | grep -v grep || echo "No relevant processes running"
  echo
  
  echo "🌐 Nginx status:"
  systemctl status nginx --no-pager || echo "Nginx not running"
  echo
  
  echo "📡 Open ports:"
  netstat -tlnp | grep -E ":(80|443|3000)" || echo "No web ports open"
  echo
  
  echo "📝 Recent logs:"
  tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No nginx error logs"
' 