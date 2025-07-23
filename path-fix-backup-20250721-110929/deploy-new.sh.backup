#!/bin/bash

# Fonana Production Deployment Script - New Approach
# Usage: ./deploy-new.sh

echo "🚀 Starting Fonana deployment (new approach)..."

# Update cache version
echo "🔄 Updating cache version..."
./scripts/update-cache-version.sh

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# Upload and execute deployment script on server
echo "📤 Uploading deployment script to server..."
scp -P 43988 deploy-remote.sh root@69.10.59.234:/tmp/deploy-remote.sh

echo "🚀 Executing deployment on server..."
# Use nohup to prevent SSH disconnection from stopping the script
ssh -p 43988 root@69.10.59.234 "chmod +x /tmp/deploy-remote.sh && nohup /tmp/deploy-remote.sh > /var/www/fonana/deploy.log 2>&1 &"

echo "⏳ Deployment started in background. Waiting 10 seconds..."
sleep 10

echo "📋 Checking deployment log..."
ssh -p 43988 root@69.10.59.234 "tail -20 /var/www/fonana/deploy.log"

echo "📊 Checking PM2 status..."
ssh -p 43988 root@69.10.59.234 "pm2 status"

echo ""
echo "✅ Deployment initiated!"
echo "🌐 Application should be live at: https://fonana.me"
echo ""
echo "📋 To check full deployment log:"
echo "   ssh -p 43988 root@69.10.59.234 'cat /var/www/fonana/deploy.log'"
echo ""
echo "📊 To check application status:"
echo "   ssh -p 43988 root@69.10.59.234 'pm2 status'" 