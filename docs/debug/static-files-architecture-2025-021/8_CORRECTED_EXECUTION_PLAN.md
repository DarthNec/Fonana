# 🚀 М7 CORRECTED EXECUTION PLAN: С учетом Blur/Preview системы

## 📅 Дата: 21.01.2025
## 🏷️ ID: [static_files_architecture_2025_021_corrected]
## 🎯 Цель: **Media API с поддержкой существующей Blur системы**
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Phase 8: Corrected Execution

---

## 📋 **EXECUTIVE SUMMARY**

### **Решение:** Media API который ВСЕГДА отдает файлы + metadata

**Ключевые изменения от первоначального плана:**
- ❌ НЕ возвращаем 403 Forbidden
- ✅ ВСЕГДА отдаем файлы (для preview)
- ✅ Добавляем metadata headers для frontend
- ✅ Frontend сам применяет blur/dim/overlay

**Это соответствует вашей текущей архитектуре!**

---

## 🎯 **ИСПРАВЛЕННЫЙ ПЛАН РЕАЛИЗАЦИИ**

### **✅ Phase 1: Media API с Preview Support (2 часа)**

#### **1.1 Media Route Handler**
```typescript
// app/api/media/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkMediaAccess } from '@/lib/services/media-access'
import { createReadStream, existsSync, statSync } from 'fs'
import path from 'path'
import { Readable } from 'stream'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const mediaPath = params.path.join('/')
  
  // Security check
  if (mediaPath.includes('..') || mediaPath.includes('~')) {
    return new NextResponse('Invalid path', { status: 400 })
  }
  
  // Get auth token from header or query (для Next Image)
  const authHeader = request.headers.get('authorization')
  const queryToken = request.nextUrl.searchParams.get('token')
  const token = authHeader?.replace('Bearer ', '') || queryToken || null
  
  // Find file (поддержка dual-path во время миграции)
  const storagePath = path.join(process.cwd(), 'storage/media', mediaPath)
  const publicPath = path.join(process.cwd(), 'public', mediaPath)
  
  let filePath: string | null = null
  if (existsSync(storagePath)) {
    filePath = storagePath
  } else if (existsSync(publicPath)) {
    filePath = publicPath
  }
  
  if (!filePath) {
    return new NextResponse('Not found', { status: 404 })
  }
  
  // Get file stats for headers
  const stats = statSync(filePath)
  
  // Check access (получаем metadata, НЕ блокируем!)
  const access = await checkMediaAccess(mediaPath, token)
  
  // Handle range requests для video
  const range = request.headers.get('range')
  if (range && stats.size) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
    const chunksize = (end - start) + 1
    
    const stream = createReadStream(filePath, { start, end })
    
    return new NextResponse(stream as any, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunksize),
        'Content-Type': access.contentType,
        // Access metadata
        'X-Has-Access': String(access.hasAccess),
        'X-Should-Blur': String(access.shouldBlur),
        'X-Should-Dim': String(access.shouldDim)
      }
    })
  }
  
  // Normal response
  const stream = createReadStream(filePath)
  
  return new NextResponse(stream as any, {
    headers: {
      // Standard headers
      'Content-Type': access.contentType,
      'Content-Length': String(stats.size),
      'Last-Modified': stats.mtime.toUTCString(),
      'ETag': `"${stats.size}-${stats.mtime.getTime()}"`,
      
      // Cache control based on access
      'Cache-Control': access.hasAccess 
        ? 'public, max-age=31536000, immutable'
        : 'private, no-cache, no-transform',
      
      // КРИТИЧНО: Access metadata для frontend
      'X-Has-Access': String(access.hasAccess),
      'X-Should-Blur': String(access.shouldBlur),
      'X-Should-Dim': String(access.shouldDim),
      'X-Upgrade-Prompt': access.upgradePrompt || '',
      'X-Required-Tier': access.requiredTier || '',
      'X-Access-Type': access.accessType || 'free',
      'X-Price': access.price ? String(access.price) : '0',
      'X-Currency': access.currency || 'SOL'
    }
  })
}

// OPTIONS для CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Expose-Headers': 'X-Has-Access, X-Should-Blur, X-Should-Dim, X-Upgrade-Prompt'
    }
  })
}
```

#### **1.2 Access Service с вашей логикой**
```typescript
// lib/services/media-access.ts
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'
import { getContentType } from '@/lib/utils/mime-types'
import { checkPostAccess } from '@/lib/utils/access'

export async function checkMediaAccess(
  mediaPath: string,
  token: string | null
) {
  // Определяем тип контента
  const contentType = getContentType(mediaPath)
  
  // Ищем пост по media path
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
  
  // Если это не медиа поста (avatar, background) - полный доступ
  if (!post) {
    return {
      hasAccess: true,
      shouldBlur: false,
      shouldDim: false,
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      accessType: 'public'
    }
  }
  
  // Парсим JWT если есть
  let user = null
  if (token) {
    try {
      user = await verifyJWT(token)
    } catch (e) {
      console.error('[Media Access] Invalid token:', e)
    }
  }
  
  // Проверяем подписку
  let subscription = null
  if (user && post.creatorId) {
    subscription = await db.subscription.findFirst({
      where: {
        userId: user.id,
        creatorId: post.creatorId,
        isActive: true
      },
      select: {
        plan: true
      }
    })
  }
  
  // Проверяем покупку
  let hasPurchased = false
  if (user && post.id) {
    const purchase = await db.postPurchase.findFirst({
      where: {
        userId: user.id,
        postId: post.id
      }
    })
    hasPurchased = !!purchase
  }
  
  // Используем вашу существующую логику checkPostAccess
  const accessStatus = checkPostAccess(
    post,
    user,
    subscription,
    hasPurchased
  )
  
  // Определяем upgrade prompt
  let upgradePrompt = ''
  if (!accessStatus.hasAccess) {
    if (post.minSubscriptionTier) {
      upgradePrompt = `Upgrade to ${post.minSubscriptionTier.toUpperCase()} to access`
    } else if (post.price && post.price > 0) {
      upgradePrompt = `Purchase for ${post.price} ${post.currency || 'SOL'}`
    } else if (post.isLocked) {
      upgradePrompt = 'Subscribe to access this content'
    }
  }
  
  return {
    hasAccess: accessStatus.hasAccess,
    shouldBlur: accessStatus.shouldBlur || false,
    shouldDim: accessStatus.shouldDim || false,
    upgradePrompt: accessStatus.upgradePrompt || upgradePrompt,
    requiredTier: post.minSubscriptionTier || '',
    accessType: accessStatus.accessType || 'free',
    price: post.price,
    currency: post.currency || 'SOL',
    contentType,
    cacheControl: accessStatus.hasAccess
      ? 'public, max-age=31536000, immutable'
      : 'private, no-cache, no-transform'
  }
}
```

### **✅ Phase 2: Minimal Frontend Changes (1 час)**

#### **2.1 Добавляем media URL helper**
```typescript
// lib/utils/media-url.ts
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder.png'
  
  // Feature flag для постепенного rollout
  if (process.env.NEXT_PUBLIC_USE_MEDIA_API === 'true') {
    return `/api/media${path}`
  }
  
  return path
}
```

#### **2.2 Hook для получения metadata (опционально)**
```typescript
// lib/hooks/useMediaMetadata.ts
import { useState, useEffect } from 'react'

export function useMediaMetadata(url: string) {
  const [metadata, setMetadata] = useState<any>(null)
  
  useEffect(() => {
    if (!url || !url.includes('/api/media')) return
    
    // HEAD request для metadata без загрузки файла
    fetch(url, { method: 'HEAD' })
      .then(res => ({
        hasAccess: res.headers.get('X-Has-Access') === 'true',
        shouldBlur: res.headers.get('X-Should-Blur') === 'true',
        shouldDim: res.headers.get('X-Should-Dim') === 'true',
        upgradePrompt: res.headers.get('X-Upgrade-Prompt')
      }))
      .then(setMetadata)
      .catch(console.error)
  }, [url])
  
  return metadata
}
```

### **✅ Phase 3: Storage Migration (1 час)**

```bash
#!/bin/bash
# scripts/migrate-to-storage.sh

# 1. Создаем структуру
echo "📁 Creating storage structure..."
mkdir -p storage/media/{posts/{images,videos,audio},avatars,backgrounds}

# 2. Копируем с проверкой
echo "📋 Copying files with verification..."
rsync -av --checksum --progress \
  public/posts/ storage/media/posts/ \
  --log-file=migration_$(date +%Y%m%d_%H%M%S).log

rsync -av --checksum --progress \
  public/media/avatars/ storage/media/avatars/ \
  --log-file=migration_avatars_$(date +%Y%m%d_%H%M%S).log

rsync -av --checksum --progress \
  public/media/backgrounds/ storage/media/backgrounds/ \
  --log-file=migration_backgrounds_$(date +%Y%m%d_%H%M%S).log

# 3. Проверяем
echo "✅ Verifying migration..."
find public/posts -type f | wc -l
find storage/media/posts -type f | wc -l

echo "✅ Migration complete! Files remain in both locations."
```

### **✅ Phase 4: Testing Strategy (30 минут)**

```typescript
// tests/media-access.test.ts
describe('Media Access with Blur System', () => {
  test('free content returns hasAccess=true', async () => {
    const res = await fetch('/api/media/posts/images/free.webp')
    expect(res.headers.get('X-Has-Access')).toBe('true')
    expect(res.headers.get('X-Should-Blur')).toBe('false')
  })
  
  test('premium content returns shouldBlur=true without auth', async () => {
    const res = await fetch('/api/media/posts/images/premium.webp')
    expect(res.status).toBe(200) // НЕ 403!
    expect(res.headers.get('X-Has-Access')).toBe('false')
    expect(res.headers.get('X-Should-Blur')).toBe('true')
  })
  
  test('premium content returns hasAccess=true with valid sub', async () => {
    const res = await fetch('/api/media/posts/images/premium.webp', {
      headers: { 'Authorization': 'Bearer valid-premium-token' }
    })
    expect(res.headers.get('X-Has-Access')).toBe('true')
    expect(res.headers.get('X-Should-Blur')).toBe('false')
  })
})
```

### **✅ Phase 5: Production Deployment (30 минут)**

```bash
# 1. Deploy API code
scp -r app/api/media fonana:/var/www/Fonana/app/api/
scp lib/services/media-access.ts fonana:/var/www/Fonana/lib/services/

# 2. Create storage on production
ssh fonana "mkdir -p /var/www/Fonana/storage/media/{posts,avatars,backgrounds}"

# 3. Migrate files on production
ssh fonana "cd /var/www/Fonana && bash scripts/migrate-to-storage.sh"

# 4. Enable with env variable
ssh fonana "echo 'NEXT_PUBLIC_USE_MEDIA_API=true' >> /var/www/Fonana/.env"

# 5. Restart PM2
ssh fonana "pm2 restart fonana"
```

---

## 📊 **SUCCESS METRICS**

### **Сохраняем существующий UX:**
- ✅ Preview с blur работает как раньше
- ✅ CTA кнопки показываются
- ✅ Никаких 403 ошибок

### **Решаем проблему:**
- ✅ Новые файлы доступны мгновенно
- ✅ PM2 restart НЕ нужен
- ✅ Безопасность сохранена

---

## 🚨 **ROLLBACK PLAN**

```bash
# Instant rollback
ssh fonana "echo 'NEXT_PUBLIC_USE_MEDIA_API=false' >> /var/www/Fonana/.env"
ssh fonana "pm2 restart fonana"

# Files остаются в обоих местах - все работает
```

---

## ✅ **FINAL CHECKLIST**

**Ключевые отличия от первого плана:**
- [x] НЕ блокируем доступ (no 403)
- [x] ВСЕГДА отдаем файлы
- [x] Metadata в headers
- [x] Frontend решает как показать
- [x] Минимальные изменения frontend
- [x] Совместимо с текущей blur системой

**Это решение:**
1. Решает проблему static cache
2. Сохраняет текущий UX
3. Не ломает безопасность
4. Легко откатить

**Готовы к реализации?** 🚀 