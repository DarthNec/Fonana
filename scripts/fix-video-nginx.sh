#!/bin/bash

# Скрипт для исправления nginx конфигурации для видео файлов

echo "🔧 Обновление nginx конфигурации для поддержки видео..."

# Создаем резервную копию текущей конфигурации
echo "📋 Создание резервной копии..."
sudo cp /etc/nginx/sites-available/fonana /etc/nginx/sites-available/fonana.backup.$(date +%Y%m%d_%H%M%S)

# Создаем временный файл с новой конфигурацией
cat > /tmp/nginx-fonana-new.conf << 'EOF'
server {
    listen 80;
    server_name 69.10.59.234 fonana.me www.fonana.me;
    
    # Increase client body size for file uploads
    client_max_body_size 100M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types 
        text/plain 
        text/css 
        text/xml 
        text/javascript 
        application/javascript 
        application/xml+rss 
        application/json
        image/svg+xml;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Serve posts (images, videos, audio) directly from filesystem
    location /posts/ {
        alias /var/www/fonana/public/posts/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # Enable CORS for media files
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        
        # Specific handling for video files
        location ~ \.mp4$ {
            mp4;
            mp4_buffer_size     1m;
            mp4_max_buffer_size 5m;
        }
        
        # Ensure proper MIME types
        location ~ \.(mp4|webm|ogg)$ {
            add_header Content-Type video/mp4;
        }
    }
    
    # Serve avatars directly from filesystem
    location /avatars/ {
        alias /var/www/fonana/public/avatars/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # Serve backgrounds directly from filesystem
    location /backgrounds/ {
        alias /var/www/fonana/public/backgrounds/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # Static assets with long cache
    location /_next/static/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Next.js assets
    location /_next/image {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "public, max-age=3600";
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static files (images, fonts, etc.)
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|woff|woff2|ttf|eot|css|js)$ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "public, max-age=86400";
    }
    
    # Main application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout       60s;
        proxy_send_timeout          60s;
        proxy_read_timeout          60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Error pages
    error_page 404 /404;
    error_page 500 502 503 504 /500;
}

# WebSocket configuration (if needed)
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
EOF

# Копируем новую конфигурацию
echo "📝 Применение новой конфигурации..."
sudo cp /tmp/nginx-fonana-new.conf /etc/nginx/sites-available/fonana

# Проверяем конфигурацию
echo "🔍 Проверка конфигурации nginx..."
if sudo nginx -t; then
    echo "✅ Конфигурация валидна"
    
    # Перезагружаем nginx
    echo "🔄 Перезагрузка nginx..."
    sudo systemctl reload nginx
    
    echo "✅ Nginx успешно перезагружен"
else
    echo "❌ Ошибка в конфигурации nginx!"
    echo "🔙 Восстановление из резервной копии..."
    sudo cp /etc/nginx/sites-available/fonana.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/fonana
    exit 1
fi

# Создаем директории если их нет
echo "📁 Проверка директорий..."
sudo mkdir -p /var/www/fonana/public/posts/videos
sudo mkdir -p /var/www/fonana/public/posts/images
sudo mkdir -p /var/www/fonana/public/posts/audio
sudo mkdir -p /var/www/fonana/public/avatars
sudo mkdir -p /var/www/fonana/public/backgrounds

# Устанавливаем правильные права доступа
echo "🔐 Установка прав доступа..."
sudo chown -R www-data:www-data /var/www/fonana/public/
sudo chmod -R 755 /var/www/fonana/public/posts/
sudo chmod -R 755 /var/www/fonana/public/avatars/
sudo chmod -R 755 /var/www/fonana/public/backgrounds/

echo "✨ Готово! Nginx настроен для обслуживания видео файлов."
echo "📹 Видео файлы теперь доступны по адресу: https://fonana.me/posts/videos/"

# Проверяем наличие видео файлов
VIDEO_COUNT=$(find /var/www/fonana/public/posts/videos -type f -name "*.mp4" -o -name "*.webm" | wc -l)
if [ "$VIDEO_COUNT" -gt 0 ]; then
    echo "📊 Найдено видео файлов: $VIDEO_COUNT"
else
    echo "⚠️  Видео файлы пока не загружены"
fi 