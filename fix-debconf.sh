#!/bin/bash

# Fix debconf lock and complete nginx installation
echo "🔧 Fixing debconf lock and completing nginx installation..."

# Read password 
read -s -p "Введи пароль SSH: " SSH_PASS
echo

# Fix debconf and complete nginx installation
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no root@64.20.37.222 '
  echo "🔍 Killing debconf processes..."
  pkill -f debconf || true
  
  echo "🗑️ Removing debconf locks..."
  rm -f /var/cache/debconf/config.dat-old || true
  rm -f /var/cache/debconf/passwords.dat-old || true
  rm -f /var/cache/debconf/templates.dat-old || true
  
  echo "🔧 Reconfiguring failed packages..."
  export DEBIAN_FRONTEND=noninteractive
  dpkg --configure -a
  
  echo "🌐 Completing nginx installation..."
  apt install --fix-broken -y
  
  echo "✅ Checking nginx status..."
  systemctl status nginx || true
  
  echo "🚀 Continuing with Node.js installation..."
  if ! which node >/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  fi
  
  echo "📦 Installing PM2..."
  npm install -g pm2
  
  echo "✅ Server setup completed!"
  
  echo "📊 Versions installed:"
  node --version
  npm --version
  pm2 --version
  nginx -v
' 