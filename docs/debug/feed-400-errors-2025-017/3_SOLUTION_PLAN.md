# 📋 SOLUTION PLAN v1: Feed Page 400 Errors Fix

## 📅 Дата: 17.01.2025
## 🏷️ ID: [feed_400_errors_2025_017]
## 🚀 Версия: 1.0

---

## 🎯 Objectives

1. **Immediate**: Eliminate 400 errors in browser console
2. **Short-term**: Provide fallback images for better UX
3. **Long-term**: Implement proper media handling strategy

---

## 📊 Success Metrics

- ✅ Console 400 errors: 0 (down from 16+)
- ✅ Visible placeholders: 100% coverage
- ✅ Page load time: No degradation
- ✅ User experience: No broken images

---

## 🔧 Phase 1: Quick Fix - URL Transformation (15 minutes)

### Step 1.1: Create URL Transformer Utility
**File**: `lib/utils/mediaUrl.ts`
```typescript
export function transformMediaUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder.jpg';
  
  // Check if it's a Supabase URL
  if (url.includes('supabase.co/storage')) {
    // Extract filename from Supabase URL
    const match = url.match(/\/([^\/]+\.(jpg|jpeg|png|webp|gif))$/i);
    if (match) {
      const filename = match[1];
      // Check local first
      return `/posts/images/${filename}`;
    }
    
    // Extract from thumb_ pattern
    const thumbMatch = url.match(/thumb_([a-f0-9]+)\.(webp|jpg)/i);
    if (thumbMatch) {
      return `/posts/images/thumb_${thumbMatch[1]}.${thumbMatch[2]}`;
    }
  }
  
  return url;
}

export function getImageWithFallback(url: string | null | undefined): string {
  const transformed = transformMediaUrl(url);
  // Browser will handle fallback via onError
  return transformed;
}
```

### Step 1.2: Update PostNormalizer
**File**: `services/posts/normalizer.ts`
```typescript
import { transformMediaUrl } from '@/lib/utils/mediaUrl';

// In normalizePost function
thumbnail: transformMediaUrl(post.thumbnail),
mediaUrl: transformMediaUrl(post.mediaUrl),
```

---

## 🛡️ Phase 2: Component Error Handling (20 minutes)

### Step 2.1: Enhanced OptimizedImage Component
**File**: `components/OptimizedImage.tsx`
```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  src: string
  alt: string
  className?: string
  fallbackSrc?: string
  // ... other props
}

export default function OptimizedImage({ 
  src, 
  alt, 
  fallbackSrc = '/placeholder.jpg',
  ...props 
}: Props) {
  const [imgSrc, setImgSrc] = useState(src)
  const [isError, setIsError] = useState(false)
  
  const handleError = () => {
    if (!isError) {
      setIsError(true)
      setImgSrc(fallbackSrc)
      
      // Log for monitoring
      console.warn(`[OptimizedImage] Failed to load: ${src}`)
    }
  }
  
  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={handleError}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
    />
  )
}
```

### Step 2.2: Create Placeholder Image
**File**: `public/placeholder.jpg`
- Create a nice placeholder (gradient or pattern)
- Optimize for small size (< 20KB)
- Dimensions: 800x600 (aspect ratio 4:3)

---

## 🔄 Phase 3: Global Image Handler (15 minutes)

### Step 3.1: Next.js Custom Image Loader
**File**: `next.config.js`
```javascript
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './lib/imageLoader.js',
    domains: ['localhost', 'iwzfrnfemdeomowothhn.supabase.co'],
  },
}
```

**File**: `lib/imageLoader.js`
```javascript
export default function imageLoader({ src, width, quality }) {
  // Handle Supabase URLs
  if (src.includes('supabase.co/storage')) {
    // Try local version first
    const localUrl = src.replace(
      'https://iwzfrnfemdeomowothhn.supabase.co/storage/v1/object/public',
      ''
    );
    
    // Return local URL for browser to try
    return `${localUrl}?w=${width}&q=${quality || 75}`;
  }
  
  // Default for other URLs
  return `${src}?w=${width}&q=${quality || 75}`;
}
```

---

## 💾 Phase 4: Monitoring & Recovery (10 minutes)

### Step 4.1: Error Tracking
```typescript
// In OptimizedImage or global error handler
const trackImageError = (url: string) => {
  // Collect failed URLs for batch fixing
  fetch('/api/log', {
    method: 'POST',
    body: JSON.stringify({
      type: 'image_error',
      url,
      timestamp: new Date().toISOString()
    })
  });
}
```

### Step 4.2: Health Check Script
```bash
#!/bin/bash
# Check which images exist locally
psql $DATABASE_URL -c "
  SELECT DISTINCT 
    regexp_replace(thumbnail, '.*/', '') as filename
  FROM posts 
  WHERE thumbnail LIKE '%supabase%'
" | while read filename; do
  if [ -f "public/posts/images/$filename" ]; then
    echo "✓ $filename"
  else
    echo "✗ $filename"
  fi
done
```

---

## 🧪 Testing Plan

### Browser Testing
1. Clear browser cache
2. Load /feed page
3. Check console for 400 errors (should be 0)
4. Verify all posts show images or placeholders
5. Check network tab for retry attempts

### Playwright Automated Test
```typescript
test('no 400 errors on feed page', async ({ page }) => {
  const errors: string[] = []
  
  page.on('response', response => {
    if (response.status() === 400) {
      errors.push(response.url())
    }
  })
  
  await page.goto('/feed')
  await page.waitForTimeout(5000)
  
  expect(errors).toHaveLength(0)
})
```

---

## 📋 Implementation Order

1. **Create placeholder.jpg** (2 min)
2. **Add mediaUrl.ts utility** (5 min)
3. **Update PostNormalizer** (3 min)
4. **Test Phase 1** (5 min)
5. **Update OptimizedImage** (10 min)
6. **Test complete solution** (5 min)

Total: ~30 minutes

---

## 🚨 Rollback Plan

If issues occur:
1. Remove transformMediaUrl from normalizer
2. Revert OptimizedImage changes
3. Original broken state is "safer" than wrong images

---

## 🔮 Future Enhancements

### Phase 5: Media Migration (Later)
1. Script to download all Supabase images
2. Update database URLs
3. Set up CDN for production

### Phase 6: Upload Flow Fix
1. Configure local upload handling
2. Update upload endpoints
3. Remove Supabase dependencies

---

## ✅ Pre-Implementation Checklist

- [x] Placeholder design decided
- [x] URL patterns understood
- [x] Fallback strategy clear
- [x] Testing approach defined
- [x] Rollback plan ready

**Next Step**: Create IMPACT_ANALYSIS.md 