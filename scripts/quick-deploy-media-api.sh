#!/bin/bash

# Quick deploy Media API files to production
# No passphrase bullshit

echo "🚀 Deploying Media API files to production..."

# Copy API files
echo "📦 Copying API route..."
scp -o StrictHostKeyChecking=no -o PasswordAuthentication=yes -r app/api/media root@64.20.37.222:/var/www/Fonana/app/api/

echo "📦 Copying services..."
scp -o StrictHostKeyChecking=no -o PasswordAuthentication=yes lib/services/media-access.ts root@64.20.37.222:/var/www/Fonana/lib/services/

echo "📦 Copying utils..."
scp -o StrictHostKeyChecking=no -o PasswordAuthentication=yes lib/utils/mime-types.ts root@64.20.37.222:/var/www/Fonana/lib/utils/

# Rebuild on production
echo "🔨 Rebuilding Next.js..."
ssh -o StrictHostKeyChecking=no -o PasswordAuthentication=yes root@64.20.37.222 "cd /var/www/Fonana && npm run build && pm2 restart fonana-app"

echo "✅ Done! Testing..."

# Test
sleep 5
curl -I https://fonana.me/api/media/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG

echo ""
echo "🎉 Media API deployed!" 