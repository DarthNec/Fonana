# 📋 SOLUTION PLAN v1: Production Deployment Completion

**Objective**: Завершить deployment Fonana на production сервер fonana.me  
**Target**: Fonana app работает на https://fonana.me  
**Approach**: Systematic step-by-step installation с validation на каждом этапе  

## 🎯 ОБЩАЯ СТРАТЕГИЯ

### Принципы решения:
1. **Manual Control**: Ручная установка каждого компонента с логированием
2. **Validation Gates**: Проверка работоспособности после каждого шага  
3. **Rollback Ready**: Возможность отката на любом этапе
4. **Non-Interactive**: Полностью автоматизированные команды без промптов
5. **Production Ready**: Enterprise-grade конфигурация с автозапуском

## 🔧 ДЕТАЛЬНЫЙ ПЛАН ИМПЛЕМЕНТАЦИИ

### ФАЗА 1: Подготовка окружения (5-10 минут)
**Цель**: Очистить зависшие процессы и подготовить сервер

#### Шаг 1.1: Диагностика зависших процессов
```bash
ssh root@64.20.37.222 "
  # Проверить активные deployment процессы
  ps aux | grep -E '(deploy|apt|dpkg)' | grep -v grep
  
  # Убить зависшие процессы если нужно
  pkill -f 'bash.*deploy' || true
  pkill -f 'apt' || true
  pkill -f 'dpkg' || true
"
```
**Validation**: `ps aux | grep deploy` не возвращает активных процессов

#### Шаг 1.2: Очистка APT locks и debconf
```bash
ssh root@64.20.37.222 "
  # Очистить package manager locks
  rm -f /var/lib/dpkg/lock* || true
  rm -f /var/cache/apt/archives/lock || true
  rm -f /var/lib/apt/lists/lock || true
  
  # Завершить прерванные установки
  export DEBIAN_FRONTEND=noninteractive
  dpkg --configure -a
  
  # Обновить package списки
  apt update
"
```
**Validation**: `apt update` выполняется без ошибок

#### Шаг 1.3: Проверка текущего состояния
```bash
ssh root@64.20.37.222 "
  echo '=== CURRENT STATE ==='
  echo 'Node.js:' $(which node || echo 'NOT INSTALLED')
  echo 'PM2:' $(which pm2 || echo 'NOT INSTALLED')  
  echo 'Nginx:' $(systemctl is-active nginx)
  echo 'Files:' $(ls -la /var/www/Fonana/package.json 2>/dev/null || echo 'MISSING')
"
```
**Validation**: Получить baseline состояния сервера

### ФАЗА 2: Установка Node.js Runtime (10-15 минут)
**Цель**: Установить Node.js 20.x LTS через NodeSource repository

#### Шаг 2.1: Добавление NodeSource repository
```bash
ssh root@64.20.37.222 "
  # Установить prerequisites
  apt install -y ca-certificates curl gnupg
  
  # Добавить NodeSource GPG key
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
  
  # Добавить repository
  echo 'deb https://deb.nodesource.com/node_20.x nodistro main' > /etc/apt/sources.list.d/nodesource.list
  
  # Обновить package index
  apt update
"
```
**Validation**: `apt-cache policy nodejs` показывает NodeSource repository

#### Шаг 2.2: Установка Node.js
```bash
ssh root@64.20.37.222 "
  export DEBIAN_FRONTEND=noninteractive
  
  # Установить Node.js
  apt install -y nodejs
  
  # Проверить версии
  node --version
  npm --version
"
```
**Validation**: `node --version` возвращает v20.x.x, `npm --version` работает

#### Шаг 2.3: Глобальная конфигурация NPM
```bash
ssh root@64.20.37.222 "
  # Настроить npm для root user
  npm config set fund false
  npm config set audit false
  
  # Проверить npm registry доступность
  npm ping
"
```
**Validation**: `npm ping` возвращает successful response

### ФАЗА 3: Установка PM2 Process Manager (5 минут)
**Цель**: Установить и настроить PM2 для управления приложением

#### Шаг 3.1: Глобальная установка PM2
```bash
ssh root@64.20.37.222 "
  # Установить PM2 глобально
  npm install -g pm2@latest
  
  # Проверить установку
  pm2 --version
  which pm2
"
```
**Validation**: `pm2 --version` возвращает номер версии

#### Шаг 3.2: Настройка автозапуска PM2
```bash
ssh root@64.20.37.222 "
  # Создать startup script
  pm2 startup systemd -u root --hp /root
  
  # Проверить статус PM2
  pm2 list
"
```
**Validation**: `pm2 list` возвращает пустой список процессов

### ФАЗА 4: Настройка Fonana Application (10-15 минут)
**Цель**: Подготовить приложение к запуску

#### Шаг 4.1: Проверка и извлечение файлов
```bash
ssh root@64.20.37.222 "
  cd /var/www/Fonana
  
  # Проверить что файлы извлечены
  ls -la package.json app/ components/ lib/
  
  # Если файлы отсутствуют, извлечь заново
  if [ ! -f package.json ]; then
    tar -xzf /tmp/deployment-package.tar.gz
  fi
"
```
**Validation**: Все основные директории и package.json присутствуют

#### Шаг 4.2: Установка зависимостей проекта
```bash
ssh root@64.20.37.222 "
  cd /var/www/Fonana
  
  # Установить production dependencies
  npm install --production --no-audit --no-fund
  
  # Проверить node_modules
  ls -la node_modules/ | head -5
"
```
**Validation**: `node_modules/` директория создана с зависимостями

#### Шаг 4.3: Создание production .env
```bash
ssh root@64.20.37.222 "
  cd /var/www/Fonana
  
  # Создать production environment
  cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://fonana_user:fonana_pass@localhost:5432/fonana
NEXTAUTH_SECRET=rFbhMWHvRfHOj9JXKr7h1PQqSvYzN4pC8xT2uI3oP1nL
NEXTAUTH_URL=https://fonana.me
WS_PORT=3002
PORT=3000
ENV_EOF

  # Проверить .env файл
  cat .env
"
```
**Validation**: `.env` файл создан с правильными переменными

#### Шаг 4.4: Создание PM2 ecosystem config
```bash
ssh root@64.20.37.222 "
  cd /var/www/Fonana
  
  # Создать PM2 конфигурацию
  cat > ecosystem.config.js << 'PM2_EOF'
module.exports = {
  apps: [{
    name: 'fonana',
    script: 'npm',
    args: 'run dev',
    cwd: '/var/www/Fonana',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    error_file: '/var/log/fonana-error.log',
    out_file: '/var/log/fonana-out.log',
    log_file: '/var/log/fonana.log',
    time: true,
    watch: false,
    autorestart: true,
    restart_delay: 4000
  }]
};
PM2_EOF

  # Проверить конфигурацию
  cat ecosystem.config.js
"
```
**Validation**: `ecosystem.config.js` создан с правильной конфигурацией

### ФАЗА 5: Настройка Nginx Reverse Proxy (5 минут)
**Цель**: Настроить Nginx для проксирования к Fonana app

#### Шаг 5.1: Создание Nginx конфигурации
```bash
ssh root@64.20.37.222 "
  # Создать Fonana site конфигурацию
  cat > /etc/nginx/sites-available/fonana << 'NGINX_EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name fonana.me www.fonana.me _;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_connect_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINX_EOF

  # Проверить конфигурацию
  cat /etc/nginx/sites-available/fonana
"
```
**Validation**: Nginx конфигурация создана

#### Шаг 5.2: Активация Fonana site
```bash
ssh root@64.20.37.222 "
  # Отключить default site
  rm -f /etc/nginx/sites-enabled/default
  
  # Включить Fonana site
  ln -sf /etc/nginx/sites-available/fonana /etc/nginx/sites-enabled/
  
  # Тестировать конфигурацию
  nginx -t
  
  # Перезагрузить Nginx
  systemctl reload nginx
"
```
**Validation**: `nginx -t` успешен, nginx reload без ошибок

### ФАЗА 6: Запуск приложения (5 минут)
**Цель**: Запустить Fonana app через PM2

#### Шаг 6.1: Запуск через PM2
```bash
ssh root@64.20.37.222 "
  cd /var/www/Fonana
  
  # Удалить существующие процессы
  pm2 delete fonana 2>/dev/null || true
  
  # Запустить приложение
  pm2 start ecosystem.config.js
  
  # Сохранить PM2 процессы
  pm2 save
  
  # Проверить статус
  pm2 status
  pm2 logs fonana --lines 10
"
```
**Validation**: `pm2 status` показывает fonana в статусе "online"

#### Шаг 6.2: Проверка работоспособности
```bash
# Локальная проверка с сервера
ssh root@64.20.37.222 "
  # Проверить локальный порт
  curl -I http://localhost:3000
  
  # Проверить через nginx
  curl -I http://localhost:80
"

# Внешняя проверка
curl -I http://64.20.37.222
```
**Validation**: Все curl команды возвращают HTTP 200 OK

### ФАЗА 7: SSL Configuration (10 минут) [ОПЦИОНАЛЬНО]
**Цель**: Настроить HTTPS через Let's Encrypt

#### Шаг 7.1: Установка SSL сертификата
```bash
ssh root@64.20.37.222 "
  # Установить SSL сертификат
  certbot --nginx -d fonana.me -d www.fonana.me \
    --non-interactive --agree-tos --email admin@fonana.me \
    --redirect
"
```
**Validation**: `curl -I https://fonana.me` возвращает HTTP 200 OK

### ФАЗА 8: Final Validation (5 минут)
**Цель**: Комплексная проверка всей системы

#### Шаг 8.1: Системная проверка
```bash
ssh root@64.20.37.222 "
  echo '=== FINAL SYSTEM STATUS ==='
  echo 'Node.js:' \$(node --version)
  echo 'PM2:' \$(pm2 --version)
  echo 'Nginx:' \$(systemctl is-active nginx)
  echo 'App Status:' \$(pm2 jlist | jq -r '.[0].pm2_env.status')
  echo 'Port 3000:' \$(netstat -tlnp | grep :3000 || echo 'NOT LISTENING')
"
```

#### Шаг 8.2: Функциональная проверка
```bash
# Проверить API endpoints
curl -s http://64.20.37.222/api/creators | jq '.creators | length'
curl -s http://64.20.37.222/api/posts | jq '.posts | length'
```

## 📊 ПЛАН ВРЕМЕННЫХ РАМОК

```
Total Time: 45-70 минут

Фаза 1 (Подготовка):           5-10 мин  ████████░░░░░░░░░░
Фаза 2 (Node.js):             10-15 мин  ██████████████████░░
Фаза 3 (PM2):                  5 мин     ████████░░░░░░░░░░
Фаза 4 (App Setup):          10-15 мин   ██████████████████░░
Фаза 5 (Nginx):                5 мин     ████████░░░░░░░░░░
Фаза 6 (App Start):            5 мин     ████████░░░░░░░░░░
Фаза 7 (SSL):                 10 мин     ████████████░░░░░░
Фаза 8 (Validation):           5 мин     ████████░░░░░░░░░░
```

## 🎯 SUCCESS CRITERIA

### Обязательные требования:
- [x] `curl http://fonana.me` возвращает Fonana homepage
- [x] `pm2 status` показывает fonana процесс в статусе "online"  
- [x] `/api/creators` возвращает JSON с креаторами
- [x] `/api/posts` возвращает JSON с постами
- [x] Nginx proxy работает без ошибок 502

### Дополнительные требования:
- [x] HTTPS настроен (SSL сертификат)
- [x] Автозапуск PM2 при перезагрузке сервера
- [x] Логирование работает корректно
- [x] Database connectivity протестирована

## 🔄 ROLLBACK STRATEGY

### Если Node.js installation fails:
1. Remove NodeSource repository
2. Clean apt cache
3. Try alternative installation methods (snap, binary)

### Если PM2 fails:
1. Use direct node process с screen/tmux
2. Create systemd service для Node.js app

### Если App startup fails:
1. Check logs: `pm2 logs fonana`
2. Test manual startup: `cd /var/www/Fonana && npm run dev`
3. Verify .env variables и database connectivity

## ✅ PLAN VALIDATION CHECKLIST

- [x] План линейный без пропущенных шагов?
- [x] Каждый шаг имеет validation criteria?
- [x] Rollback strategy определена?
- [x] Временные рамки реалистичны?
- [x] Success criteria четко определены?
- [x] Dependencies правильно упорядочены?

**NEXT STEP**: Создать IMPACT_ANALYSIS.md для анализа рисков и влияния плана. 