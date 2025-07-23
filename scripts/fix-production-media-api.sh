#!/bin/bash

# Fix production Media API

echo "🔧 Fixing production setup..."

# Use SSHPASS to avoid password prompts
export SSHPASS="your_password_here"

SERVER="64.20.37.222"

# Function to run SSH commands
run_ssh() {
    sshpass -e ssh -o StrictHostKeyChecking=no -o PasswordAuthentication=yes root@$SERVER "$1"
}

# Stop PM2
echo "1. Stopping PM2..."
run_ssh "pm2 delete all"

# Check if API files exist
echo "2. Checking API files..."
run_ssh "ls -la /var/www/Fonana/app/api/media/"

# Restart PM2 with proper config
echo "3. Starting PM2..."
run_ssh "cd /var/www/Fonana && pm2 start ecosystem.config.js"

# Wait for startup
sleep 5

# Check logs
echo "4. Checking logs..."
run_ssh "pm2 logs --lines 10"

# Test API
echo "5. Testing API..."
curl -I https://fonana.me/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG

echo "✅ Done!" 