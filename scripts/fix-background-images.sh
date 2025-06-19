#!/bin/bash

echo "🔧 Fixing background images directory..."

# Создаем директорию для фоновых изображений
echo "Creating backgrounds directory..."
sudo mkdir -p /var/www/fonana/public/backgrounds

# Устанавливаем правильные права
echo "Setting permissions..."
sudo chown -R www-data:www-data /var/www/fonana/public/backgrounds
sudo chmod -R 755 /var/www/fonana/public/backgrounds

# Проверяем nginx конфигурацию
echo "Checking nginx configuration..."
if grep -q "location /backgrounds/" /etc/nginx/sites-available/fonana; then
    echo "✅ Nginx configuration for backgrounds exists"
else
    echo "⚠️  Nginx configuration for backgrounds not found"
    echo "Please add the following to your nginx config:"
    echo ""
    echo "    location /backgrounds/ {"
    echo "        alias /var/www/fonana/public/backgrounds/;"
    echo "        try_files \$uri =404;"
    echo "    }"
fi

# Проверяем структуру
echo ""
echo "Current structure:"
ls -la /var/www/fonana/public/

echo ""
echo "✅ Background images directory fixed!"
echo ""
echo "📝 Note: Users will need to re-upload their background images"
echo "   as the data was lost due to 'prisma db push --accept-data-loss'" 