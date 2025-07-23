# 📋 М7 SOLUTION PLAN v2: Secure Media API с Blur System

## 📅 Дата: 21.01.2025
## 🏷️ ID: [static_files_architecture_2025_021]
## 🎯 Решение: **Media API с Preview System (не 403!)**
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Phase 3: Planning v2

---

## 🎯 **УТОЧНЕННОЕ РЕШЕНИЕ**

### **Архитектура: Smart Media Delivery с Preview**

```
User Request → /api/media/* → Check Access → Return File + Metadata
                                    ↓
                            ВСЕГДА 200 OK + Headers
                                    ↓
                        Frontend применяет blur/dim
```

**Ключевое отличие:** Файлы ВСЕГДА отдаются (для preview), но с metadata о доступе.

---

## 📋 **IMPLEMENTATION STEPS (UPDATED)**

### **Phase 1: Create Secure Media API (2 hours)**

#### **1.1 Create Media Route Handler**
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
  
  // Get auth token
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  // Check access (не блокируем, только получаем metadata)
  const access = await checkMediaAccess(mediaPath, token)
  
  // Find file (dual-path support during migration)
  const storagePath = path.join(process.cwd(), 'storage/media', mediaPath)
  const publicPath = path.join(process.cwd(), 'public', mediaPath)
  
  const filePath = existsSync(storagePath) ? storagePath : 
                   existsSync(publicPath) ? publicPath : null
  
  if (!filePath) {
    return new NextResponse('Not found', { status: 404 })
  }
  
  // ВСЕГДА отдаем файл для preview
  const stream = createReadStream(filePath)
  
  // Создаем response с правильными headers
  const response = new NextResponse(stream as any, {
    headers: {
      'Content-Type': access.contentType,
      // Cache headers зависят от доступа
      'Cache-Control': access.hasAccess 
        ? 'public, max-age=31536000, immutable'
        : 'private, no-transform, max-age=300',
      
      // КРИТИЧНО: Metadata для frontend
      'X-Has-Access': String(access.hasAccess),
      'X-Should-Blur': String(access.shouldBlur),
      'X-Should-Dim': String(access.shouldDim),
      'X-Upgrade-Prompt': access.upgradePrompt || '',
      'X-Required-Tier': access.requiredTier || '',
      'X-Access-Type': access.accessType || 'free',
      'X-Price': access.price ? String(access.price) : '0',
      
      // Debug info
      'X-Served-From': filePath.includes('storage') ? 'storage' : 'public'
    }
  })
  
  return response
}
```

#### **1.2 Enhanced Access Control Service**
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
  
  // Non-post files (avatars, etc) - full access
  if (!post) {
    return {
      hasAccess: true,
      shouldBlur: false,
      shouldDim: false,
      contentType: getContentType(mediaPath),
      cacheControl: 'public, max-age=31536000, immutable'
    }
  }
  
  // Get user from token
  const user = token ? await verifyJWT(token) : null
  
  // Get user subscription if exists
  let subscription = null
  if (user && post.creatorId) {
    subscription = await db.subscription.findFirst({
      where: {
        userId: user.id,
        creatorId: post.creatorId,
        isActive: true
      }
    })
  }
  
  // Check if user purchased the post
  let hasPurchased = false
  if (user) {
    const purchase = await db.postPurchase.findFirst({
      where: {
        userId: user.id,
        postId: post.id
      }
    })
    hasPurchased = !!purchase
  }
  
  // Use existing checkPostAccess logic
  const accessStatus = checkPostAccess(
    post,
    user,
    subscription,
    hasPurchased
  )
  
  return {
    hasAccess: accessStatus.hasAccess,
    shouldBlur: accessStatus.shouldBlur || false,
    shouldDim: accessStatus.shouldDim || false,
    upgradePrompt: accessStatus.upgradePrompt || '',
    requiredTier: post.minSubscriptionTier || '',
    accessType: accessStatus.accessType || 'free',
    price: post.price,
    contentType: getContentType(mediaPath),
    cacheControl: accessStatus.hasAccess
      ? 'public, max-age=31536000, immutable'
      : 'private, no-transform, max-age=300'
  }
}
```

### **Phase 2: Update File Storage (1 hour)**

Остается как в v1 - перемещаем файлы из public/ в storage/

### **Phase 3: Frontend Integration (1.5 hours)**

#### **3.1 Enhanced Media URL Helper**
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

// Новая функция для обработки metadata
export async function checkMediaMetadata(response: Response) {
  return {
    hasAccess: response.headers.get('X-Has-Access') === 'true',
    shouldBlur: response.headers.get('X-Should-Blur') === 'true',
    shouldDim: response.headers.get('X-Should-Dim') === 'true',
    upgradePrompt: response.headers.get('X-Upgrade-Prompt') || '',
    requiredTier: response.headers.get('X-Required-Tier') || '',
    accessType: response.headers.get('X-Access-Type') || 'free',
    price: parseFloat(response.headers.get('X-Price') || '0')
  }
}
```

#### **3.2 Smart Image Component**
```typescript
// components/SmartImage.tsx
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getMediaUrl, checkMediaMetadata } from '@/lib/utils/media-url'
import { cn } from '@/lib/utils'

interface SmartImageProps {
  src: string
  alt: string
  className?: string
  onUpgradeClick?: () => void
  // ... other Image props
}

export function SmartImage({ 
  src, 
  alt, 
  className,
  onUpgradeClick,
  ...props 
}: SmartImageProps) {
  const [metadata, setMetadata] = useState<any>(null)
  const [imageUrl, setImageUrl] = useState(getMediaUrl(src))
  
  useEffect(() => {
    // Prefetch для получения metadata
    fetch(imageUrl, { method: 'HEAD' })
      .then(response => checkMediaMetadata(response))
      .then(setMetadata)
      .catch(console.error)
  }, [imageUrl])
  
  const shouldBlur = metadata?.shouldBlur || false
  const shouldDim = metadata?.shouldDim || false
  
  return (
    <div className="relative">
      <Image
        src={imageUrl}
        alt={alt}
        className={cn(
          className,
          shouldBlur && 'blur-xl',
          shouldDim && 'brightness-50'
        )}
        {...props}
      />
      
      {/* Overlay с кнопкой если нет доступа */}
      {metadata && !metadata.hasAccess && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 dark:bg-black/90 rounded-lg p-6 text-center">
            <p className="text-lg font-semibold mb-4">
              {metadata.upgradePrompt}
            </p>
            {onUpgradeClick && (
              <button
                onClick={onUpgradeClick}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:scale-105 transition-transform"
              >
                {metadata.price > 0 
                  ? `Unlock for ${metadata.price} SOL`
                  : `Upgrade to ${metadata.requiredTier?.toUpperCase()}`
                }
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

### **Phase 4: Migration Strategy (30 min)**

Остается как в v1

### **Phase 5: Performance Optimization (1 hour)**

#### **5.1 CDN-aware caching**
```typescript
// Для контента с доступом - агрессивное кеширование
'Cache-Control': 'public, max-age=31536000, immutable'

// Для preview (без доступа) - короткое кеширование
'Cache-Control': 'private, no-transform, max-age=300'
```

#### **5.2 Lazy loading metadata**
Frontend загружает metadata через HEAD request, не блокируя отображение

### **Phase 6: Testing & Monitoring**

Добавляем тесты для blur/dim системы

---

## 🎯 **EXPECTED OUTCOMES**

### **User Experience:**
- ✅ Пользователи видят preview контента (с blur)
- ✅ Понятные CTA для upgrade/purchase
- ✅ Мгновенная загрузка preview
- ✅ Безопасность контента сохранена

### **Technical:**
- ✅ No PM2 restart needed
- ✅ CDN friendly architecture
- ✅ Progressive enhancement
- ✅ Backward compatible

---

## 📊 **KEY DIFFERENCES FROM v1**

### **Was (v1):**
- 403 Forbidden для locked контента
- Полная блокировка доступа
- Не видно preview

### **Now (v2):**
- 200 OK всегда + metadata headers
- Preview с blur/dim эффектами
- Smart CTA overlays
- Better conversion (users see value) 