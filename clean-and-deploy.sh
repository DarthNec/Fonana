#!/bin/bash

echo "🧹 Cleaning server cache..."
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && rm -rf .next .turbo .cache node_modules/.cache"

echo "🚀 Running deployment..."
./deploy-to-production.sh

echo "✅ Done!" 