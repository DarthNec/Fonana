# 📋 SOLUTION PLAN v1: Production Deployment Script

## 🎯 **ЦЕЛЬ**
Создать automated deployment script `./deploy-to-production.sh` для деплоя Fonana на сервер `fonana.me` (64.20.37.222) с complete preparatory и cleanup этапами.

## 📝 **ДЕТАЛЬНЫЙ ПЛАН DEPLOYMENT**

### **Phase 1: Environment Preparation** (Est: 15 min)
**Автоматизация настройки production окружения**

#### 1.1 Server Dependencies Installation
```bash
# System updates и основные зависимости
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y nginx nodejs npm postgresql postgresql-contrib git

# Node.js version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts

# PM2 для process management
npm install -g pm2
```

#### 1.2 Database Setup
```bash
# PostgreSQL configuration
sudo -u postgres createuser --interactive fonana_prod
sudo -u postgres createdb fonana_production
sudo -u postgres psql -c "ALTER USER fonana_prod PASSWORD 'SECURE_PRODUCTION_PASSWORD'"
```

#### 1.3 SSL Certificate Setup
```bash
# Let's Encrypt installation
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# SSL certificate generation
sudo certbot --nginx -d fonana.me -d www.fonana.me
```

### **Phase 2: Code Preparation** (Est: 10 min)
**Local repo подготовка и optimization**

#### 2.1 Pre-deployment Checks
```bash
# Код качество проверки
npm run lint
npm run type-check
npm test -- --run

# Build verification
npm run build
du -sh .next

# Dependencies analysis
npm audit --audit-level moderate
```

#### 2.2 Environment Configuration
```bash
# Production environment variables
cat > .env.production <<EOF
NODE_ENV=production
NEXTAUTH_URL=https://fonana.me
DATABASE_URL=postgresql://fonana_prod:SECURE_PASSWORD@localhost:5432/fonana_production
NEXTAUTH_SECRET=SECURE_64_CHAR_SECRET
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
EOF
```

### **Phase 3: Server Deployment** (Est: 20 min)
**Production deployment и configuration**

#### 3.1 Code Transfer
```bash
# Git-based deployment
ssh -o StrictHostKeyChecking=no root@64.20.37.222 "
  cd /var/www
  git clone https://github.com/DukeDeSouth/Fonana.git
  cd Fonana
  git checkout main
"

# File permissions setup
sudo chown -R www-data:www-data /var/www/Fonana
sudo chmod -R 755 /var/www/Fonana
```

#### 3.2 Dependencies & Build
```bash
# Production dependencies installation
cd /var/www/Fonana
npm ci --production=false
npm run build

# Database migration
npm run prisma:deploy
npm run prisma:seed
```

#### 3.3 Nginx Configuration
```nginx
# /etc/nginx/sites-available/fonana.me
server {
    listen 80;
    listen 443 ssl http2;
    server_name fonana.me www.fonana.me;
    
    ssl_certificate /etc/letsencrypt/live/fonana.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fonana.me/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000";
    
    # Gzip compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    
    # Next.js static assets
    location /_next/static/ {
        alias /var/www/Fonana/.next/static/;
        expires 1y;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Media files
    location /media/ {
        alias /var/www/Fonana/public/media/;
        expires 7d;
        access_log off;
    }
    
    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
}
```

### **Phase 4: Process Management** (Est: 5 min)
**PM2 configuration и service startup**

#### 4.1 PM2 Ecosystem Setup
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'fonana-production',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/Fonana',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/fonana/error.log',
    out_file: '/var/log/fonana/out.log',
    log_file: '/var/log/fonana/combined.log',
    time: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', '.next'],
    restart_delay: 4000
  }]
};
```

#### 4.2 Service Activation
```bash
# PM2 startup configuration
pm2 startup
pm2 start ecosystem.config.js
pm2 save

# Nginx service restart
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### **Phase 5: Post-deployment Verification** (Est: 10 min)
**Health checks и performance validation**

#### 5.1 Application Health Checks
```bash
# HTTP status verification
curl -I https://fonana.me
curl -I https://www.fonana.me

# API endpoints testing
curl https://fonana.me/api/creators | jq '.length'
curl https://fonana.me/api/posts | jq '.posts | length'

# SSL certificate verification
openssl s_client -connect fonana.me:443 -servername fonana.me < /dev/null | grep 'Verify return code'
```

#### 5.2 Performance Metrics
```bash
# PM2 monitoring
pm2 monit

# Nginx access logs
tail -f /var/log/nginx/access.log

# System resources
htop
df -h
```

## 🚀 **AUTOMATION FEATURES**

### **Rollback Capability**
```bash
# Automatic backup creation before deployment
tar -czf /backup/fonana-$(date +%Y%m%d-%H%M%S).tar.gz /var/www/Fonana

# Rollback function
rollback_deployment() {
    local backup_file=$1
    pm2 stop fonana-production
    rm -rf /var/www/Fonana
    tar -xzf $backup_file -C /
    pm2 restart fonana-production
}
```

### **Error Handling**
```bash
# Comprehensive error detection
set -euo pipefail
trap 'error_handler $? $LINENO' ERR

error_handler() {
    local exit_code=$1
    local line_number=$2
    echo "❌ Error occurred on line $line_number with exit code $exit_code"
    rollback_deployment
    exit $exit_code
}
```

### **Progress Monitoring**
```bash
# Real-time deployment status
log_step() {
    echo "🔄 $(date '+%H:%M:%S') - $1"
}

log_success() {
    echo "✅ $(date '+%H:%M:%S') - $1"
}

log_error() {
    echo "❌ $(date '+%H:%M:%S') - $1"
}
```

## 📊 **SUCCESS CRITERIA**

### **Deployment Validation Checklist:**
- [ ] ✅ **HTTPS accessible**: `https://fonana.me` returns 200
- [ ] ✅ **Homepage loads**: 70+ creators displayed
- [ ] ✅ **API functional**: `/api/creators` returns JSON
- [ ] ✅ **Database connected**: User authentication works
- [ ] ✅ **SSL valid**: Certificate expires > 30 days
- [ ] ✅ **Performance**: Page load < 3 seconds
- [ ] ✅ **PM2 stable**: Process running without errors
- [ ] ✅ **Nginx configured**: Static assets served correctly

### **Post-deployment Monitoring:**
- [ ] ✅ **Error logs**: No critical errors in PM2 logs
- [ ] ✅ **Memory usage**: < 80% of available RAM
- [ ] ✅ **Disk space**: > 20% free space remaining
- [ ] ✅ **CPU load**: Average < 70%

## 🎯 **ESTIMATED TIMELINE**

**Total Deployment Time: ~60 minutes**
- **Preparation**: 15 min
- **Code Transfer**: 10 min  
- **Server Configuration**: 20 min
- **Service Setup**: 5 min
- **Verification**: 10 min

**Rollback Time: ~5 minutes** (if needed)

## 🔧 **MAINTENANCE FEATURES**

### **Automated Updates**
```bash
# Future update script
update_deployment() {
    backup_current_deployment
    pull_latest_changes
    run_tests
    build_application
    restart_services
    verify_deployment
}
```

### **Monitoring Integration**
```bash
# Health check endpoint
curl -f https://fonana.me/api/health || send_alert

# Log rotation
logrotate /etc/logrotate.d/fonana
```

**🎯 ГОТОВ К IMPLEMENTATION** 