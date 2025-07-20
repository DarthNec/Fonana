# 🏗️ ARCHITECTURE CONTEXT: Production Server Environment

**Target Server**: 64.20.37.222 (fonana.me)  
**OS**: Ubuntu 24.04.2 LTS (GNU/Linux 6.8.0-63-generic x86_64)  
**Analysis Date**: 2025-07-19  

## 🖥️ ТЕКУЩАЯ СИСТЕМНАЯ АРХИТЕКТУРА

### Server Infrastructure:
```
Internet → Domain (fonana.me) → Server (64.20.37.222) → Nginx → Node.js App (Port 3000)
                                                      ↓
                                                   Static Files
```

### Установленные компоненты:
```
✅ Ubuntu 24.04.2 LTS    - Базовая ОС
✅ Nginx 1.24.0          - Web server / Reverse proxy  
✅ OpenSSH               - Удалённый доступ
✅ APT Package Manager   - Управление пакетами
✅ Curl, Wget, Git      - Основные утилиты
✅ PostgreSQL Client     - Database connectivity tools

❌ Node.js              - JavaScript Runtime (ОТСУТСТВУЕТ)
❌ NPM                   - Package manager (ОТСУТСТВУЕТ) 
❌ PM2                   - Process manager (ОТСУТСТВУЕТ)
❌ SSL Certificates     - HTTPS setup (НЕ НАСТРОЕН)
```

## 📁 ФАЙЛОВАЯ СТРУКТУРА СЕРВЕРА

### Deployment Files:
```
/tmp/
├── deployment-package.tar.gz     ✅ (132MB - Fonana source code)
└── emergency-deploy.sh           ❓ (может присутствовать)

/var/www/Fonana/                   ✅ (извлечено из package)
├── package.json                   ✅ 
├── app/                           ✅ (Next.js app directory)
├── components/                    ✅ 
├── lib/                           ✅
├── prisma/                        ✅
├── public/                        ✅
├── .env                           ❓ (может быть создан/не создан)
├── ecosystem.config.js            ❓ (может быть создан/не создан)
└── node_modules/                  ❌ (не установлены dependencies)

/etc/nginx/
├── sites-available/fonana         ❓ (может быть настроен)
├── sites-enabled/fonana          ❓ (может быть активирован)
└── sites-enabled/default         ❓ (может быть отключен)

/var/log/
├── nginx/access.log               ✅ (nginx logs)
├── nginx/error.log                ✅ 
├── fonana-error.log               ❌ (PM2 logs не созданы)
├── fonana-out.log                 ❌
└── fonana.log                     ❌
```

## 🔗 СЕТЕВАЯ АРХИТЕКТУРА

### Network Configuration:
```
External Interface: enp9s0f1np1
IP Address: 64.20.37.222/30
Gateway: 64.20.37.223
DNS: Configured via DHCP

Ports Status:
- 22/TCP    ✅ SSH Access (active)
- 80/TCP    ✅ HTTP (nginx listening)
- 443/TCP   ❌ HTTPS (not configured)  
- 3000/TCP  ❌ Node.js App (not running)
- 3002/TCP  ❌ WebSocket Server (not running)
```

### Domain Configuration:
```
fonana.me       → 64.20.37.222  ✅ (DNS configured)
www.fonana.me   → 64.20.37.222  ✅ (DNS configured)
```

## ⚙️ ПРОЦЕССЫ И СЕРВИСЫ

### Active Services:
```bash
systemctl status nginx    → active (running) ✅
systemctl status ssh      → active (running) ✅  
systemctl status fwupd    → active (running) ✅
systemctl status systemd  → active (running) ✅

# Missing Critical Services:
pm2 status                → command not found ❌
node --version            → command not found ❌
```

### Process Tree Analysis:
```
init (PID 1)
├── nginx master process                    ✅
├── nginx worker processes                  ✅  
├── ssh daemon                              ✅
├── deployment bash script (PID 289777)    ⚠️ (возможно завис)
└── fwupd microcode updates                 ⚠️ (может блокировать apt)
```

## 🔧 DEPLOYMENT FLOW ANALYSIS

### Successful Steps (Completed):
```
1. SSH Connection        ✅ → Server access established
2. File Transfer         ✅ → deployment-package.tar.gz uploaded  
3. Nginx Installation    ✅ → Web server running
4. Package Extraction    ✅ → Fonana files in /var/www/Fonana/
5. Basic Configuration   ✅ → .env, nginx config attempts
```

### Failed/Incomplete Steps:
```
6. Node.js Installation  ❌ → apt install nodejs failed
7. PM2 Installation      ❌ → requires Node.js first
8. Dependencies Install  ❌ → npm install not possible
9. Application Startup   ❌ → cannot run without Node.js
10. SSL Configuration    ❌ → certbot not executed
```

### Dependency Chain:
```
Ubuntu APT → Node.js → NPM → PM2 → Application Start → SSL Setup
     ✅         ❌      ❌     ❌           ❌              ❌
```

## 🚨 CRITICAL INTEGRATION POINTS

### Database Connectivity:
```
Application → PostgreSQL Database
localhost:5432/fonana (fonana_user:fonana_pass)

Status: ❓ (не тестировано - нет Node.js для подключения)
Expected: ✅ (database работает локально)
```

### Nginx Reverse Proxy:
```
Current Config:
server {
    listen 80;
    server_name fonana.me www.fonana.me;
    
    location / {
        proxy_pass http://127.0.0.1:3000;  ← TARGET PORT
        proxy_set_header Host $host;
        # ... additional headers
    }
}

Status: ⚠️ (nginx готов, но приложение на порту 3000 не запущено)
```

### Environment Variables:
```
Expected .env structure:
NODE_ENV=production
DATABASE_URL=postgresql://fonana_user:fonana_pass@localhost:5432/fonana
NEXTAUTH_SECRET=rFbhMWHvRfHOj9JXKr7h1PQqSvYzN4pC8xT2uI3oP1nL  
NEXTAUTH_URL=https://fonana.me
WS_PORT=3002
PORT=3000

Status: ❓ (может быть создан или нет)
```

## 📊 ВЕРСИИ И ЗАВИСИМОСТИ

### System Dependencies:
```
curl --version        → 8.5.0   ✅
wget --version        → 1.21.4  ✅
git --version         → 2.43.0  ✅
nginx -v              → 1.24.0  ✅
psql --version        → 16.9    ✅ (client only)

node --version        → MISSING ❌  
npm --version         → MISSING ❌
pm2 --version         → MISSING ❌
```

### Expected Application Dependencies:
```
Node.js: v20.x LTS     (NodeSource repository)
NPM: v10.x            (bundled with Node.js)
PM2: v5.x             (global npm install)

Next.js: 14.1.0       (project dependency)
React: 18.x           (project dependency)  
Prisma: 5.x           (project dependency)
```

## 🔄 DATA FLOW PATTERNS

### Expected Production Flow:
```
User Request → Domain (fonana.me) → Nginx (Port 80/443)
                                       ↓
                                   Reverse Proxy
                                       ↓  
                                Next.js App (Port 3000)
                                       ↓
                                 Database Queries
                                       ↓
                                PostgreSQL (Port 5432)
```

### Current Broken Flow:
```
User Request → fonana.me → Nginx → 502 Bad Gateway
                              ↓
                           localhost:3000 ← CONNECTION REFUSED
                              ↓
                           (No Node.js process)
```

## ⚠️ СИСТЕМНЫЕ ОГРАНИЧЕНИЯ

### Resource Constraints:
```
Memory: Adequate (low usage)
Storage: 1.79TB available (0.6% used)
CPU: x86_64 architecture  
Network: Stable connection
```

### Security Considerations:
```
SSH: Password authentication (should consider key-based)
Firewall: Default Ubuntu configuration
SSL: Not configured (HTTP only)
Process privileges: Running as root (security risk)
```

## 🔧 КОНФИГУРАЦИОННЫЕ ЗАВИСИМОСТИ

### Critical Config Files:
```
/etc/nginx/nginx.conf              ✅ (system config)
/etc/nginx/sites-available/fonana  ❓ (may exist)
/var/www/Fonana/.env               ❓ (may exist)
/var/www/Fonana/ecosystem.config.js ❓ (may exist)
```

### Package Repository Access:
```
APT repositories: ✅ (working)
NodeSource repo: ❌ (not added yet)
NPM registry: ❌ (no npm installed)
```

## ✅ ARCHITECTURE ANALYSIS CHECKLIST

- [x] Все системные компоненты проанализированы?
- [x] Зависимости mapped?  
- [x] Integration points identified?
- [x] Data flow patterns documented?
- [x] Resource constraints assessed?
- [x] Configuration dependencies listed?
- [x] Network architecture verified?

## 🎯 АРХИТЕКТУРНЫЕ ВЫВОДЫ

**ГОТОВАЯ ИНФРАСТРУКТУРА**: Nginx, SSH, базовая ОС  
**MISSING RUNTIME**: Node.js ecosystem полностью отсутствует  
**CLEAR PATH**: Поэтапная установка Node.js → PM2 → App Start  
**NO BLOCKERS**: Ресурсы сервера достаточны, сеть стабильна  

**NEXT STEP**: Создать SOLUTION_PLAN.md с детальным планом установки компонентов. 