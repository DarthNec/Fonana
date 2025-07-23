# 🚀 М7 EXECUTION PLAN: Пошаговый план внедрения

## 📅 Дата: 21.01.2025
## 🏷️ ID: [static_files_architecture_2025_021]
## 🎯 Цель: **Внедрение Secure Media API Architecture**
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Phase 7: Execution

---

## 📋 **EXECUTIVE SUMMARY**

### **Решение:** Secure Media API с интеллектуальной маршрутизацией

**Ключевые преимущества:**
- ✅ Мгновенная доступность новых файлов (без PM2 restart)
- ✅ Полная безопасность для тиров и платного контента
- ✅ Минимальная latency через CDN кеширование
- ✅ Zero downtime миграция
- ✅ Аудит доступа к премиум контенту

**Время реализации:** 6-8 часов

---

## 🎯 **ПОШАГОВЫЙ ПЛАН РЕАЛИЗАЦИИ**

### **✅ Phase 1: Подготовка (30 минут)**

#### **1.1 Создание структуры директорий**
```bash
# Локально для разработки
mkdir -p storage/media/{posts/{images,videos},avatars,backgrounds}

# На production
ssh fonana "mkdir -p /var/www/Fonana/storage/media/{posts/{images,videos},avatars,backgrounds}"
```

#### **1.2 Настройка переменных окружения**
```bash
# .env
STORAGE_PATH=/var/www/Fonana/storage
MEDIA_API_ENABLED=false  # Начинаем выключенным
MEDIA_API_ROLLOUT=0      # Процент пользователей
```

#### **1.3 Создание feature flag**
```typescript
// lib/utils/feature-flags.ts
export function useMediaAPI(): boolean {
  return process.env.NEXT_PUBLIC_MEDIA_API_ENABLED === 'true';
}
```

### **✅ Phase 2: Создание Media API (2 часа)**

#### **2.1 Основной route handler**
```typescript
// app/api/media/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkMediaAccess } from '@/lib/services/media-access'
import { createReadStream, existsSync } from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const mediaPath = params.path.join('/')
  
  // Security check
  if (mediaPath.includes('..')) {
    return new NextResponse('Invalid path', { status: 400 })
  }
  
  // Check access
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  const access = await checkMediaAccess(mediaPath, token)
  
  if (!access.allowed) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  
  // Find file (dual-path support)
  const storagePath = path.join(process.cwd(), 'storage/media', mediaPath)
  const publicPath = path.join(process.cwd(), 'public', mediaPath)
  
  const filePath = existsSync(storagePath) ? storagePath : 
                   existsSync(publicPath) ? publicPath : null
  
  if (!filePath) {
    return new NextResponse('Not found', { status: 404 })
  }
  
  // Stream file
  const stream = createReadStream(filePath)
  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': access.contentType,
      'Cache-Control': access.cacheControl,
      'X-Served-From': filePath.includes('storage') ? 'storage' : 'public'
    }
  })
}
```

#### **2.2 Access control service**
```typescript
// lib/services/media-access.ts
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'
import { getContentType } from '@/lib/utils/mime-types'

export async function checkMediaAccess(
  mediaPath: string,
  token: string | null
) {
  // Find associated post
  const post = await db.post.findFirst({
    where: {
      OR: [
        { mediaUrl: { contains: mediaPath } },
        { thumbnail: { contains: mediaPath } }
      ]
    },
    include: {
      creator: true
    }
  })
  
  // Non-post files (avatars, etc) - allow for now
  if (!post) {
    return {
      allowed: true,
      contentType: getContentType(mediaPath),
      cacheControl: 'public, max-age=31536000'
    }
  }
  
  // Get user from token
  const user = token ? await verifyJWT(token) : null
  
  // Check access
  const hasAccess = await checkPostAccess(post, user)
  
  return {
    allowed: hasAccess,
    contentType: getContentType(mediaPath),
    cacheControl: hasAccess 
      ? post.creatorId === user?.id 
        ? 'private, max-age=86400'  // Authors get longer cache
        : 'private, max-age=3600'   // Subscribers get 1 hour
      : 'no-store'
  }
}
```

### **✅ Phase 3: Frontend интеграция (1.5 часа)**

#### **3.1 Создание media URL helper**
```typescript
// lib/utils/media-url.ts
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder.png'
  
  // Check feature flag
  const useAPI = process.env.NEXT_PUBLIC_MEDIA_API_ENABLED === 'true'
  
  if (useAPI) {
    return `/api/media${path}`
  }
  
  return path
}

// Export for components
export { getMediaUrl as mediaUrl }
```

#### **3.2 Обновление компонентов**
```bash
# Массовая замена во всех компонентах
find components -name "*.tsx" -exec sed -i '' \
  "s/src={post\.mediaUrl}/src={getMediaUrl(post.mediaUrl)}/g" {} \;

find components -name "*.tsx" -exec sed -i '' \
  "s/src={\`\${.*\.mediaUrl}\`}/src={getMediaUrl($1.mediaUrl)}/g" {} \;
```

#### **3.3 Добавление auth headers для Next Image**
```typescript
// next.config.js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.js',
  }
}

// lib/image-loader.js
export default function imageLoader({ src, width, quality }) {
  // Add auth token to image requests
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth-token') 
    : null
    
  const params = new URLSearchParams({
    w: width,
    q: quality || 75
  })
  
  if (token) {
    params.append('token', token)
  }
  
  return `${src}?${params}`
}
```

### **✅ Phase 4: Миграция данных (1 час)**

#### **4.1 Pre-migration backup**
```bash
# scripts/backup-media.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "media_backup_${DATE}.tar.gz" public/posts public/media
echo "✅ Backup created: media_backup_${DATE}.tar.gz"
```

#### **4.2 Безопасная миграция**
```bash
# scripts/migrate-media.sh
#!/bin/bash
# Checksums before
find public/posts public/media -type f -exec md5sum {} \; > checksums_before.txt

# Copy with verification
rsync -av --checksum public/posts/ storage/media/posts/
rsync -av --checksum public/media/ storage/media/

# Checksums after
find storage/media -type f -exec md5sum {} \; > checksums_after.txt

# Verify
echo "🔍 Verifying migration..."
DIFF=$(diff checksums_before.txt checksums_after.txt | wc -l)
if [ $DIFF -eq 0 ]; then
  echo "✅ Migration successful! All files verified."
else
  echo "❌ Migration failed! Differences found."
  exit 1
fi
```

### **✅ Phase 5: Тестирование (1 час)**

#### **5.1 Unit tests**
```typescript
// tests/media-api.test.ts
describe('Media API', () => {
  test('allows free content without auth', async () => {
    const res = await GET('/api/media/posts/images/free.webp')
    expect(res.status).toBe(200)
  })
  
  test('blocks premium content without auth', async () => {
    const res = await GET('/api/media/posts/images/premium.webp')
    expect(res.status).toBe(403)
  })
  
  test('allows premium content with valid subscription', async () => {
    const token = generateToken({ tier: 'premium' })
    const res = await GET('/api/media/posts/images/premium.webp', {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(res.status).toBe(200)
  })
})
```

#### **5.2 E2E tests с Playwright**
```typescript
// tests/e2e/media-access.spec.ts
test('images load correctly with new API', async ({ page }) => {
  // Enable media API
  await page.addInitScript(() => {
    localStorage.setItem('MEDIA_API_ENABLED', 'true')
  })
  
  await page.goto('/feed')
  
  // Check no broken images
  const brokenImages = await page.$$eval('img', imgs => 
    imgs.filter(img => !img.complete).map(img => img.src)
  )
  
  expect(brokenImages).toHaveLength(0)
})
```

### **✅ Phase 6: Production деплой (30 минут)**

#### **6.1 Подготовка production**
```bash
# Deploy новый код
scp -r app/api/media fonana:/var/www/Fonana/app/api/
scp -r lib/services/media-access.ts fonana:/var/www/Fonana/lib/services/
scp -r lib/utils/media-url.ts fonana:/var/www/Fonana/lib/utils/

# Создание директорий
ssh fonana "mkdir -p /var/www/Fonana/storage/media/{posts,avatars,backgrounds}"

# Миграция файлов
ssh fonana "cd /var/www/Fonana && bash scripts/migrate-media.sh"
```

#### **6.2 Постепенный rollout**
```bash
# Stage 1: Выключено (текущее состояние)
MEDIA_API_ENABLED=false

# Stage 2: Включено для dev team (через 1 час)
MEDIA_API_ENABLED=true
MEDIA_API_WHITELIST=user1,user2,user3

# Stage 3: 10% пользователей (через 1 день)
MEDIA_API_ROLLOUT=10

# Stage 4: 50% пользователей (через 2 дня)
MEDIA_API_ROLLOUT=50

# Stage 5: 100% пользователей (через 3 дня)
MEDIA_API_ROLLOUT=100
```

### **✅ Phase 7: Мониторинг и оптимизация (ongoing)**

#### **7.1 Метрики для отслеживания**
```typescript
// lib/monitoring/media-metrics.ts
export async function trackMediaAccess(
  userId: string | null,
  mediaPath: string,
  allowed: boolean,
  responseTime: number
) {
  await db.mediaAccessLog.create({
    data: {
      userId,
      mediaPath,
      allowed,
      responseTime,
      timestamp: new Date()
    }
  })
  
  // Alert on suspicious patterns
  if (!allowed && userId) {
    const recentAttempts = await db.mediaAccessLog.count({
      where: {
        userId,
        allowed: false,
        timestamp: { gte: new Date(Date.now() - 3600000) }
      }
    })
    
    if (recentAttempts > 10) {
      await notifySecurityTeam(`Suspicious access attempts from user ${userId}`)
    }
  }
}
```

#### **7.2 Performance dashboard**
```sql
-- Queries for monitoring
-- Average response time
SELECT AVG(response_time) as avg_ms
FROM media_access_logs
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Cache hit rate
SELECT 
  COUNT(CASE WHEN cache_hit THEN 1 END)::float / COUNT(*) as hit_rate
FROM media_access_logs
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Top accessed files
SELECT media_path, COUNT(*) as access_count
FROM media_access_logs
WHERE timestamp > NOW() - INTERVAL '1 day'
GROUP BY media_path
ORDER BY access_count DESC
LIMIT 20;
```

---

## 📊 **SUCCESS METRICS**

### **Immediate (Day 1):**
- ✅ New uploads accessible without PM2 restart
- ✅ 0% unauthorized access to premium content
- ✅ <100ms average response time

### **Short-term (Week 1):**
- ✅ 99.9% uptime
- ✅ 90% cache hit rate
- ✅ 0 security incidents

### **Long-term (Month 1):**
- ✅ 50% reduction in bandwidth costs (via CDN)
- ✅ 100% audit coverage for premium access
- ✅ Platform ready for new features (watermarks, etc)

---

## 🚨 **ROLLBACK PLAN**

Если что-то пойдет не так:

```bash
# 1. Отключить Media API немедленно
ssh fonana "cd /var/www/Fonana && echo 'NEXT_PUBLIC_MEDIA_API_ENABLED=false' >> .env"

# 2. Restart PM2
ssh fonana "pm2 restart fonana"

# 3. Файлы остаются в обоих местах - всё работает
```

---

## ✅ **FINAL CHECKLIST**

**Pre-deployment:**
- [ ] Backup media files
- [ ] Test migration script locally
- [ ] Review security implications
- [ ] Prepare rollback plan

**Deployment:**
- [ ] Deploy API code
- [ ] Run migration
- [ ] Enable for test users
- [ ] Monitor metrics

**Post-deployment:**
- [ ] Verify no broken images
- [ ] Check access logs
- [ ] Monitor performance
- [ ] Gradual rollout

---

## 💡 **ЗАКЛЮЧЕНИЕ**

Это решение устраняет архитектурную проблему Next.js static cache, сохраняя при этом полную безопасность системы тиров и платного контента. 

**Ключевые выводы:**
1. PM2 restart больше не нужен
2. Безопасность улучшена (аудит логи)
3. Производительность сохранена (CDN кеширование)
4. Готовность к новым фичам (watermarks, DRM)

**Время до production:** 6-8 часов активной работы 