# 🚀 М7 NGINX X-ACCEL SOLUTION: Гибридный подход

## 📅 Дата: 21.01.2025
## 🏷️ ID: [static_files_architecture_2025_021_nginx]
## 🎯 Решение: **Nginx X-Accel-Redirect + Media API**
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Alternative Solution

---

## 🎯 **СУТЬ РЕШЕНИЯ**

### **Как работает X-Accel-Redirect:**
```
1. User запрашивает /api/media/posts/images/premium.webp
2. API проверяет доступ (тиры, покупки, подписки)
3. API возвращает header: X-Accel-Redirect: /internal/posts/images/premium.webp
4. Nginx перехватывает header и отдает файл напрямую
5. Frontend получает файл + metadata headers
```

**Преимущества:**
- ✅ Zero CPU load на Node.js (только проверка прав)
- ✅ Максимальная скорость отдачи файлов
- ✅ Работает с существующей blur системой
- ✅ Nginx handles range requests для видео
- ✅ Мгновенная доступность новых файлов

---

## 📋 **IMPLEMENTATION PLAN**

### **Phase 1: API Route (1 час)**

#### **1.1 Media API с X-Accel-Redirect**
```typescript
// app/api/media/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkMediaAccess } from '@/lib/services/media-access'
import { getContentType } from '@/lib/utils/mime-types'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const mediaPath = params.path.join('/')
  
  // Security check
  if (mediaPath.includes('..')) {
    return new NextResponse('Invalid path', { status: 400 })
  }
  
  // Get auth token
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || null
  
  // Check access (как в вашей системе)
  const access = await checkMediaAccess(mediaPath, token)
  
  // Создаем response с X-Accel-Redirect
  const headers = new Headers({
    // Nginx internal redirect
    'X-Accel-Redirect': `/internal/${mediaPath}`,
    
    // Content headers
    'Content-Type': getContentType(mediaPath),
    'Content-Disposition': 'inline',
    
    // Cache control based on access
    'Cache-Control': access.hasAccess 
      ? 'public, max-age=31536000, immutable'
      : 'private, no-cache',
    
    // ВАЖНО: Metadata для frontend blur system
    'X-Has-Access': String(access.hasAccess),
    'X-Should-Blur': String(access.shouldBlur),
    'X-Should-Dim': String(access.shouldDim),
    'X-Upgrade-Prompt': access.upgradePrompt || '',
    'X-Required-Tier': access.requiredTier || '',
    'X-Access-Type': access.accessType || 'free',
    'X-Price': access.price ? String(access.price) : '0'
  })
  
  // Пустой body - Nginx сам отдаст файл
  return new NextResponse(null, { headers })
}
```

#### **1.2 Access Service (остается как есть)**
```typescript
// lib/services/media-access.ts
// Используем вашу существующую логику checkPostAccess
import { checkPostAccess } from '@/lib/utils/access'

export async function checkMediaAccess(mediaPath: string, token: string | null) {
  // ... существующая логика проверки доступа
  // Возвращает hasAccess, shouldBlur, shouldDim и т.д.
}
```

### **Phase 2: Nginx Configuration (30 минут)**

#### **2.1 Nginx config для X-Accel**
```nginx
# /etc/nginx/sites-available/fonana

server {
    listen 443 ssl http2;
    server_name fonana.me;
    
    # ... SSL config ...
    
    # API routes проксируем на Next.js
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # ВАЖНО: Разрешаем X-Accel-Redirect
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Internal location для X-Accel-Redirect
    location /internal/ {
        internal;  # Только для внутренних redirects!
        alias /var/www/Fonana/public/;
        
        # Отправляем правильные headers
        add_header Cache-Control "public, max-age=31536000, immutable";
        
        # Поддержка range requests для видео
        add_header Accept-Ranges bytes;
        
        # CORS если нужно
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Expose-Headers "X-Has-Access, X-Should-Blur, X-Should-Dim";
        
        # Типы файлов
        location ~ \.(jpg|jpeg|png|gif|webp)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        location ~ \.(mp4|webm|mov)$ {
            mp4;
            mp4_buffer_size 1m;
            mp4_max_buffer_size 5m;
        }
        
        location ~ \.(mp3|wav|ogg)$ {
            add_header Content-Type "audio/mpeg";
        }
    }
    
    # Остальные статические файлы как обычно
    location / {
        proxy_pass http://localhost:3000;
        # ...
    }
}
```

### **Phase 3: Frontend Integration (1 час)**

#### **3.1 Media URL Helper**
```typescript
// lib/utils/media-url.ts
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder.png'
  
  // Все media через API
  if (path.startsWith('/posts/') || 
      path.startsWith('/media/avatars/') || 
      path.startsWith('/media/backgrounds/')) {
    return `/api/media${path}`
  }
  
  // Остальное напрямую
  return path
}
```

#### **3.2 PostCard использует metadata**
Frontend компоненты уже умеют работать с blur - просто получат metadata из headers!

### **Phase 4: Testing (30 минут)**

```bash
# 1. Тест прямого доступа (должен быть 404)
curl -I https://fonana.me/internal/posts/images/premium.webp
# Expected: 404 (internal location)

# 2. Тест через API без токена
curl -I https://fonana.me/api/media/posts/images/premium.webp
# Expected: 200 + X-Should-Blur: true

# 3. Тест с валидным токеном
curl -I -H "Authorization: Bearer xxx" \
  https://fonana.me/api/media/posts/images/premium.webp
# Expected: 200 + X-Has-Access: true

# 4. Проверка range requests для видео
curl -I -H "Range: bytes=0-1000" \
  https://fonana.me/api/media/posts/videos/test.mp4
# Expected: 206 Partial Content
```

### **Phase 5: Production Deployment (30 минут)**

```bash
#!/bin/bash
# deploy-nginx-xaccel.sh

# 1. Deploy API route
scp app/api/media fonana:/var/www/Fonana/app/api/
scp lib/services/media-access.ts fonana:/var/www/Fonana/lib/services/

# 2. Backup nginx config
ssh fonana "sudo cp /etc/nginx/sites-available/fonana /etc/nginx/sites-available/fonana.backup"

# 3. Update nginx config
scp nginx-fonana.conf fonana:/tmp/
ssh fonana "sudo mv /tmp/nginx-fonana.conf /etc/nginx/sites-available/fonana"

# 4. Test nginx config
ssh fonana "sudo nginx -t"

# 5. Reload nginx (zero downtime)
ssh fonana "sudo nginx -s reload"

# 6. Restart PM2 последний раз
ssh fonana "pm2 restart fonana"

echo "✅ X-Accel-Redirect deployed!"
```

---

## 📊 **СРАВНЕНИЕ С ДРУГИМИ РЕШЕНИЯМИ**

### **vs Direct API Streaming:**
- ✅ **X-Accel**: Zero CPU на Node.js
- ❌ **API Stream**: High CPU usage
- ✅ **X-Accel**: Native nginx performance
- ❌ **API Stream**: Node.js overhead

### **vs PM2 Restart:**
- ✅ **X-Accel**: Instant availability
- ❌ **PM2**: Requires restart
- ✅ **X-Accel**: Zero downtime
- ❌ **PM2**: Brief downtime

### **vs CDN/S3:**
- ✅ **X-Accel**: Full control locally
- ❌ **CDN**: External dependency
- ✅ **X-Accel**: No extra costs
- ❌ **CDN**: Per-request pricing

---

## 🚀 **ПОЧЕМУ ЭТО ИДЕАЛЬНО ДЛЯ FONANA**

1. **Минимальные изменения кода** - только 1 API route
2. **Использует существующую blur систему** - headers передаются
3. **Максимальная производительность** - nginx native speed
4. **Безопасность сохранена** - API проверяет доступ
5. **Мгновенная доступность** - нет кеша Next.js
6. **Production ready** - проверенный pattern

---

## ✅ **FINAL CHECKLIST**

- [ ] API route с X-Accel-Redirect
- [ ] Nginx config с internal location
- [ ] Frontend использует /api/media URLs
- [ ] Metadata headers для blur system
- [ ] Range requests для видео
- [ ] Zero downtime deployment

**Время реализации: ~3 часа**
**Сложность: Средняя**
**Риски: Минимальные**

Готовы к реализации? 🚀 