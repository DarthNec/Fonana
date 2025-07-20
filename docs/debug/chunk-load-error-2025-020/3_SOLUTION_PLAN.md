# 📋 SOLUTION PLAN: Chunk Load Error Fix

## 📅 Дата: 20.01.2025
## 🏷️ ID: [chunk_load_error_2025_020]
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Phase 3
## 📝 Версия: v1.0

---

## 🎯 **ROOT CAUSE CONFIRMED**

### 🔍 Диагностика показала:
1. ✅ **Chunk файл существует**: `/var/www/Fonana/.next/static/chunks/9487-fab326537be7215a.js` (75K)
2. ❌ **КРИТИЧНО: Standalone chunks directory ОТСУТСТВУЕТ**: `/var/www/Fonana/.next/standalone/.next/static/chunks`
3. ❌ **HTTP 404** для всех `/_next/static/chunks/` requests (Content-Type: text/html)
4. ✅ **Build IDs совпадают** - версионных конфликтов нет
5. ❌ **Nginx НЕ настроен** для static chunks routing

### 💡 **ГЛАВНАЯ ПРОБЛЕМА:**
**Build process НЕ копирует chunks в standalone directory**, но PM2 пытается служить из standalone location.

---

## 🚀 **SOLUTION STRATEGY**

### Phase 1: 🚨 **IMMEDIATE FIX** (5 минут)
**Цель**: Восстановить работоспособность немедленно

**Действие**: Скопировать chunks directory в standalone
```bash
cp -r /var/www/Fonana/.next/static/chunks /var/www/Fonana/.next/standalone/.next/static/
```

**Результат**: Chunk файлы станут доступны для PM2 server

### Phase 2: ⚙️ **BUILD PROCESS FIX** (15 минут)
**Цель**: Исправить автоматическое копирование при build

**Подходы**:

#### Option A: Post-build Script
Добавить в `package.json`:
```json
"scripts": {
  "build": "next build && npm run copy-chunks",
  "copy-chunks": "cp -r .next/static/chunks .next/standalone/.next/static/ 2>/dev/null || true"
}
```

#### Option B: Next.js Config Fix
Проверить `next.config.js` standalone configuration:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Возможно нужны дополнительные опции для static files
}
```

#### Option C: Enhanced Deployment Script
Обновить deployment automation для копирования chunks

### Phase 3: 🔧 **NGINX OPTIMIZATION** (10 минут)
**Цель**: Оптимизация serving static chunks

**Конфигурация**:
```nginx
# Добавить в /etc/nginx/sites-available/fonana
location /_next/static/ {
    alias /var/www/Fonana/.next/standalone/.next/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Served-By "nginx-static";
    
    # Fallback на PM2 если файл не найден
    try_files $uri @nextjs;
}

location @nextjs {
    proxy_pass http://127.0.0.1:3000;
    # ... остальные proxy settings
}
```

---

## 📊 **IMPLEMENTATION SEQUENCE**

### Step 1: Emergency Copy (Immediate)
```bash
#!/bin/bash
echo "🚨 EMERGENCY CHUNK FIX"
cd /var/www/Fonana

# Создаем chunks directory в standalone
mkdir -p .next/standalone/.next/static/chunks

# Копируем все chunks
cp -r .next/static/chunks/* .next/standalone/.next/static/chunks/

# Проверяем результат
ls -la .next/standalone/.next/static/chunks/ | head -10

echo "✅ Chunks copied. Testing..."
curl -I https://fonana.me/_next/static/chunks/9487-fab326537be7215a.js
```

### Step 2: Build Process Fix
```bash
#!/bin/bash
echo "⚙️ FIXING BUILD PROCESS"

# Update package.json script
cat package.json | jq '.scripts.build = "next build && npm run copy-chunks"' > package.json.tmp
cat package.json | jq '.scripts["copy-chunks"] = "cp -r .next/static/chunks .next/standalone/.next/static/ 2>/dev/null || true"' > package.json.tmp
mv package.json.tmp package.json

# Test locally
npm run build
ls -la .next/standalone/.next/static/chunks/
```

### Step 3: Nginx Enhancement (Optional)
```bash
#!/bin/bash
echo "🔧 ENHANCING NGINX CONFIG"

# Backup current config
cp /etc/nginx/sites-available/fonana /etc/nginx/sites-available/fonana.backup

# Add static chunks location
# (Manual edit required)

# Test and reload
nginx -t && systemctl reload nginx
```

---

## ⚠️ **RISK ASSESSMENT**

### 🔴 Critical Risks: **NONE**
- Copying chunks is safe operation
- No data loss potential
- Immediate rollback possible

### 🟡 Major Risks: **LOW**
- **Build process changes**: Could affect future deployments
  - *Mitigation*: Test locally before production
- **Nginx config changes**: Could affect static file serving
  - *Mitigation*: Backup config, test configuration

### 🟢 Minor Risks: **ACCEPTABLE**
- **Disk space usage**: Duplicated chunks (+~10MB)
- **Build time increase**: +5-10 seconds per build

---

## 📈 **SUCCESS METRICS**

### Immediate Success (Phase 1):
- [ ] HTTP 200 для `https://fonana.me/_next/static/chunks/9487-fab326537be7215a.js`
- [ ] Content-Type: `application/javascript` (not text/html)
- [ ] No more ChunkLoadError в browser console
- [ ] React error #423 resolved

### Long-term Success (Phase 2):
- [ ] Build process automatically copies chunks
- [ ] Future deployments don't break chunks
- [ ] Consistent static file serving

### Performance Success (Phase 3):
- [ ] Static chunks served directly by Nginx
- [ ] Improved caching headers
- [ ] Reduced PM2 load for static requests

---

## 🔄 **ROLLBACK PLAN**

### If Phase 1 Fails:
```bash
# Remove copied chunks
rm -rf /var/www/Fonana/.next/standalone/.next/static/chunks
# PM2 restart
pm2 restart fonana-app
```

### If Phase 2 Fails:
```bash
# Revert package.json
git checkout package.json
npm run build
```

### If Phase 3 Fails:
```bash
# Restore Nginx config
cp /etc/nginx/sites-available/fonana.backup /etc/nginx/sites-available/fonana
systemctl reload nginx
```

---

## 🚀 **IMPLEMENTATION TIMELINE**

| Phase | Duration | Priority | Risk Level |
|-------|----------|----------|------------|
| **Phase 1: Emergency Copy** | 5 минут | 🔴 Critical | 🟢 Low |
| **Phase 2: Build Process** | 15 минут | 🟡 High | 🟡 Medium |
| **Phase 3: Nginx Optimization** | 10 минут | 🔵 Optional | 🟡 Medium |

**Total Time**: 30 минут максимум

---

## ✅ **EXPECTED OUTCOME**

После выполнения решения:
1. **Пользователи смогут кликать на placeholder** без ChunkLoadError
2. **Все dynamic imports будут работать** корректно
3. **UI больше не будет ломаться** после взаимодействий
4. **Performance improved** через Nginx static serving

**Status**: 🟢 Ready for Implementation - ZERO Critical Risks 