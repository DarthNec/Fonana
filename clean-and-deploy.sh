#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🧹 ПОЛНАЯ ОЧИСТКА И ПЕРЕУСТАНОВКА FONANA${NC}"
echo -e "${YELLOW}Этот скрипт полностью удалит старую версию и установит новую${NC}"
echo ""

SERVER_IP="69.10.59.234"
SERVER_PORT="43988"
SERVER_USER="root"

# Шаг 1: Сборка проекта локально
echo -e "${BLUE}📦 Шаг 1: Сборка проекта...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка сборки!${NC}"
    exit 1
fi

# Шаг 2: Создание архива для деплоя
echo -e "${BLUE}📤 Шаг 2: Создание архива...${NC}"
rm -rf fonana-clean-deploy
mkdir -p fonana-clean-deploy

# Копируем все необходимые файлы
cp -r .next fonana-clean-deploy/
cp -r public fonana-clean-deploy/
cp -r app fonana-clean-deploy/
cp -r components fonana-clean-deploy/
cp -r lib fonana-clean-deploy/
cp -r prisma fonana-clean-deploy/
cp package*.json fonana-clean-deploy/
cp next.config.js fonana-clean-deploy/
cp tailwind.config.js fonana-clean-deploy/
cp postcss.config.js fonana-clean-deploy/
cp tsconfig.json fonana-clean-deploy/
cp .env.local fonana-clean-deploy/ 2>/dev/null || true
cp .env fonana-clean-deploy/ 2>/dev/null || true

# Создаем скрипт запуска
cat > fonana-clean-deploy/start-fonana.sh << 'EOF'
#!/bin/bash
echo "🚀 Запуск Fonana..."
export NODE_ENV=production
export PORT=3001
export HOSTNAME=0.0.0.0
npm start
EOF

chmod +x fonana-clean-deploy/start-fonana.sh

# Создаем systemd service
cat > fonana-clean-deploy/fonana.service << 'EOF'
[Unit]
Description=Fonana Web3 Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/fonana
ExecStart=/usr/bin/npm start
Environment="NODE_ENV=production"
Environment="PORT=3001"
Environment="HOSTNAME=0.0.0.0"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Создаем правильную конфигурацию nginx
cat > fonana-clean-deploy/nginx-fonana.conf << 'EOF'
server {
    listen 80;
    server_name fonana.me www.fonana.me;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fonana.me www.fonana.me;

    ssl_certificate /etc/letsencrypt/live/fonana.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fonana.me/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self';" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Next.js static files
    location /_next/static/ {
        alias /var/www/fonana/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Public files
    location /public/ {
        alias /var/www/fonana/public/;
        expires 1y;
        add_header Cache-Control "public";
        access_log off;
    }

    # Favicon, robots.txt
    location ~* ^/(favicon\.ico|robots\.txt|sitemap\.xml)$ {
        root /var/www/fonana/public;
        expires 1y;
        add_header Cache-Control "public";
        access_log off;
    }

    # Images and fonts
    location ~* \.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$ {
        root /var/www/fonana/public;
        expires 1y;
        add_header Cache-Control "public";
        access_log off;
    }

    # Proxy to Next.js
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
    }
}
EOF

# Архивируем
tar -czf fonana-clean-deploy.tar.gz -C fonana-clean-deploy .

echo -e "${GREEN}✅ Архив создан!${NC}"

# Шаг 3: Загрузка на сервер
echo -e "${BLUE}🔄 Шаг 3: Загрузка на сервер...${NC}"
scp -P $SERVER_PORT fonana-clean-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка загрузки!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Файлы загружены!${NC}"

# Шаг 4: Выполнение на сервере
echo -e "${BLUE}🔧 Шаг 4: Установка на сервере...${NC}"
echo -e "${YELLOW}Выполните следующие команды на сервере:${NC}"
echo ""
echo "ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP"
echo ""
echo "# 1. Остановка старых процессов"
echo "systemctl stop fonana 2>/dev/null || true"
echo "pkill -f node"
echo "pkill -f npm"
echo ""
echo "# 2. Очистка старых файлов"
echo "rm -rf /var/www/fonana"
echo "mkdir -p /var/www/fonana"
echo ""
echo "# 3. Распаковка новых файлов"
echo "cd /var/www/fonana"
echo "tar -xzf /tmp/fonana-clean-deploy.tar.gz"
echo ""
echo "# 4. Установка зависимостей"
echo "npm install --production"
echo ""
echo "# 5. Настройка systemd"
echo "cp fonana.service /etc/systemd/system/"
echo "systemctl daemon-reload"
echo ""
echo "# 6. Настройка nginx"
echo "cp nginx-fonana.conf /etc/nginx/sites-available/fonana"
echo "ln -sf /etc/nginx/sites-available/fonana /etc/nginx/sites-enabled/"
echo "nginx -t && systemctl reload nginx"
echo ""
echo "# 7. Запуск приложения"
echo "systemctl enable fonana"
echo "systemctl start fonana"
echo ""
echo "# 8. Проверка статуса"
echo "systemctl status fonana"
echo "curl -I https://fonana.me"
echo ""

# Очистка локальных файлов
rm -rf fonana-clean-deploy
rm -f fonana-clean-deploy.tar.gz

echo -e "${GREEN}🎉 Готово! Следуйте инструкциям выше для завершения установки.${NC}" 