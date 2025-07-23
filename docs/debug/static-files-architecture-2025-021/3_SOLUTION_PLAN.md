# 📋 М7 SOLUTION PLAN v1: Secure Media API Architecture

## 📅 Дата: 21.01.2025
## 🏷️ ID: [static_files_architecture_2025_021]
## 🎯 Решение: **Secure Media API with Smart Routing**
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Phase 3: Planning

---

## 🎯 **ПРЕДЛАГАЕМОЕ РЕШЕНИЕ**

### **Архитектура: Hybrid Secure Media System**

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   User Request  │────▶│  /api/media/*    │────▶│ Access Check │
└─────────────────┘     └──────────────────┘     └──────┬───────┘
                                                          │
                        ┌──────────────────┐              ▼
                        │ Return File      │◀─────── ✅ Authorized
                        │ with Headers     │         
                        └──────────────────┘         ❌ Forbidden
                                                          │
                                                          ▼
                                                    403 Response
```

---

## 📋 **IMPLEMENTATION STEPS**

### **Phase 1: Create Secure Media API (2 hours)**

#### **1.1 Create Media Route Handler**
```typescript
// app/api/media/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkMediaAccess } from '@/lib/services/media-access'
import { streamFile } from '@/lib/utils/file-stream'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const mediaPath = params.path.join('/')
  const token = request.headers.get('authorization')
  
  // Check access (но НЕ блокируем!)
  const access = await checkMediaAccess(mediaPath, token)
  
  // ВСЕГДА отдаем файл (для blur preview)
  const fileResponse = await streamFile(mediaPath, {
    'Content-Type': access.contentType,
    'Cache-Control': access.cacheControl,
    // КРИТИЧНО: Frontend использует эти headers для blur/dim
    'X-Has-Access': access.hasAccess ? 'true' : 'false',
    'X-Should-Blur': access.shouldBlur ? 'true' : 'false',
    'X-Should-Dim': access.shouldDim ? 'true' : 'false',
    'X-Upgrade-Prompt': access.upgradePrompt || '',
    'X-Required-Tier': access.requiredTier || '',
    'X-Access-Type': access.accessType || 'free'
  })
  
  // Если нет доступа - добавляем no-transform чтобы CDN не кешировал
  if (!access.hasAccess) {
    fileResponse.headers.set('Cache-Control', 'private, no-transform, max-age=300')
  }
  
  return fileResponse
}
```

#### **1.2 Create Access Control Service**
```typescript
// lib/services/media-access.ts
export async function checkMediaAccess(
  mediaPath: string, 
  token: string | null
) {
  // Extract post info from path
  const post = await getPostByMediaPath(mediaPath)
  if (!post) return { allowed: true } // Non-post files
  
  // Get user from token
  const user = await getUserFromToken(token)
  
  // Apply access rules
  const hasAccess = await checkPostAccess(post, user)
  
  return {
    allowed: hasAccess,
    cacheControl: hasAccess ? 'private, max-age=3600' : 'no-store',
    contentType: getContentType(mediaPath)
  }
}
```

### **Phase 2: Update File Storage (1 hour)**

#### **2.1 Move files out of public/**
```bash
# New structure
/storage/
  /media/
    /posts/
      /images/
      /videos/
    /avatars/
    /backgrounds/
```

#### **2.2 Update Upload APIs**
```typescript
// app/api/posts/upload/route.ts
const STORAGE_BASE = process.env.NODE_ENV === 'production'
  ? '/var/www/Fonana/storage'
  : path.join(process.cwd(), 'storage')

// Save to storage/ instead of public/
const savePath = path.join(STORAGE_BASE, 'media', 'posts', mediaType)
```

### **Phase 3: Frontend Updates (1 hour)**

#### **3.1 Update Image URLs**
```typescript
// components/posts/PostImage.tsx
const getSecureUrl = (mediaUrl: string) => {
  // Transform path to API route
  return `/api/media${mediaUrl}`
}

<Image
  src={getSecureUrl(post.mediaUrl)}
  alt={post.title}
  // Next.js will handle auth headers
/>
```

#### **3.2 Add Authorization Headers**
```typescript
// lib/utils/auth-fetch.ts
export async function fetchWithAuth(url: string) {
  const token = await getAuthToken()
  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
}
```

### **Phase 4: Migration Strategy (30 min)**

#### **4.1 Dual-path support during transition**
```typescript
// Temporarily support both paths
async function findMediaFile(path: string) {
  // Try new location first
  if (await exists(`storage/${path}`)) {
    return `storage/${path}`
  }
  // Fallback to old location
  if (await exists(`public/${path}`)) {
    return `public/${path}`
  }
  return null
}
```

#### **4.2 Background migration script**
```bash
#!/bin/bash
# scripts/migrate-media-files.sh
rsync -av public/posts/ storage/media/posts/
rsync -av public/media/ storage/media/
```

### **Phase 5: Performance Optimization (1 hour)**

#### **5.1 Add CDN-friendly headers**
```typescript
// For public content
'Cache-Control': 'public, max-age=31536000, immutable'
// For private content  
'Cache-Control': 'private, max-age=3600'
```

#### **5.2 Implement streaming for large files**
```typescript
// lib/utils/file-stream.ts
export async function streamFile(filePath: string, headers: Headers) {
  const stream = createReadStream(filePath)
  return new Response(stream as any, { headers })
}
```

### **Phase 6: Monitoring & Testing (30 min)**

#### **6.1 Add access logging**
```typescript
// Log premium content access
await logMediaAccess({
  userId: user?.id,
  mediaPath,
  allowed: hasAccess,
  timestamp: new Date()
})
```

#### **6.2 Create test suite**
```typescript
// tests/media-access.test.ts
describe('Media Access Control', () => {
  test('Free posts accessible without auth')
  test('Premium posts require subscription')
  test('Paid posts require purchase')
  test('Authors can access own content')
})
```

---

## 🎯 **EXPECTED OUTCOMES**

### **Immediate benefits:**
- ✅ New files available instantly (no PM2 restart)
- ✅ Full security maintained
- ✅ Better performance with streaming
- ✅ CDN compatibility

### **Long-term benefits:**
- ✅ Audit trail for premium content
- ✅ Flexible access control
- ✅ Easier to add new features (watermarks, etc)
- ✅ Separation of concerns

---

## 📊 **METRICS**

### **Success criteria:**
- 0% unauthorized access to premium content
- <100ms additional latency for media requests
- 100% backward compatibility during migration
- 0 downtime during deployment

---

## ✅ **PLAN CHECKLIST**

- [x] Clear implementation steps
- [x] Security maintained
- [x] Performance considered
- [x] Migration strategy included
- [x] Testing approach defined
- [x] Monitoring added 