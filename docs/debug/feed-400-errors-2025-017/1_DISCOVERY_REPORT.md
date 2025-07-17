# 🔍 DISCOVERY REPORT: Feed Page 400 Errors

## 📅 Дата: 17.01.2025
## 🎯 Проблема: 16+ consecutive 400 errors on Feed page
## 🏷️ ID: [feed_400_errors_2025_017]

---

## 🔬 Playwright MCP Browser Investigation

### Console Analysis
```
[LOG] [useOptimizedPosts] Received 20 posts from API
[LOG] [useOptimizedPosts] Normalized 20 posts successfully
[ERROR] Failed to load resource: the server responded with a status of 400 ()
... (16 more identical errors)
```
- **Pattern**: API успешно возвращает посты, но затем следуют 400 ошибки
- **Timing**: Ошибки появляются после успешной загрузки постов

### Network Request Analysis
```
✅ [GET] /api/posts?sortBy=latest&page=1&limit=20 => 200 OK
❌ [GET] https://iwzfrnfemdeomowothhn.supabase.co/storage/v1/object/public/posts/images/thumb_*.webp => 400
❌ [GET] https://iwzfrnfemdeomowothhn.supabase.co/storage/v1/object/public/posts/*.jpg => 400
✅ [GET] http://localhost:3000/avatar_*.jpeg => 200 OK
```

### Pattern Recognition
- **Failed URLs**: Все начинаются с `https://iwzfrnfemdeomowothhn.supabase.co/storage/`
- **Success URLs**: Все локальные `http://localhost:3000/` загружаются успешно
- **Count**: Ровно 16 Supabase URLs, все возвращают 400

---

## 📊 Root Cause Analysis

### Migration History
From `docs/ARCHITECTURE_COMPLETE_MAP.md`:
```
- Проект мигрировал с Supabase на локальный PostgreSQL
- Многие поля из оригинальной схемы Supabase были потеряны при миграции
```

### Current State
1. **Database**: Migrated from Supabase to local PostgreSQL ✅
2. **Media Storage**: Still pointing to Supabase URLs ❌
3. **Result**: All Supabase media URLs return 400 (Bad Request)

---

## 🌐 Context7 Research

### Supabase Storage 400 Errors
Common causes:
1. **Expired/Invalid API Key**: Project no longer has valid Supabase credentials
2. **Storage Bucket Deleted**: Original storage bucket doesn't exist
3. **Public Access Disabled**: Bucket set to private after migration
4. **Project Suspended**: Supabase project inactive/deleted

### Next.js Image Handling Best Practices
```typescript
// Use Next.js Image with fallback
<Image 
  src={post.thumbnail}
  onError={(e) => {
    e.currentTarget.src = '/placeholder.jpg'
  }}
/>
```

---

## 🔎 Code Analysis

### Current Image URLs in Database
```sql
-- Sample from posts table
thumbnail: "https://iwzfrnfemdeomowothhn.supabase.co/storage/v1/object/public/posts/images/thumb_*.webp"
mediaUrl: "https://iwzfrnfemdeomowothhn.supabase.co/storage/v1/object/public/posts/*.jpg"
```

### Avatar URLs (Working)
```sql
-- From users table
avatar: "http://localhost:3000/avatar_*.jpeg"
-- OR
avatar: "/avatar_*.jpeg" (relative)
```

---

## 💡 Alternative Approaches

### Approach 1: URL Rewriting (Quick Fix)
- **Pros**: Minimal changes, fast implementation
- **Cons**: Requires local copies of all media
- **Implementation**: Proxy or rewrite Supabase URLs to local

### Approach 2: Fallback Images (Graceful Degradation)
- **Pros**: Immediate UX improvement, no data migration
- **Cons**: Loses original content
- **Implementation**: Show placeholders for 400 errors

### Approach 3: Media Migration (Complete Solution)
- **Pros**: Permanent fix, full control
- **Cons**: Time consuming, storage requirements
- **Implementation**: Download all media from Supabase, update URLs

### Approach 4: CDN/Cloud Storage (Modern Solution)
- **Pros**: Scalable, performant
- **Cons**: Requires setup and possible costs
- **Implementation**: Upload to Cloudinary/S3, update URLs

---

## 🧪 Verification Tests

### Test 1: Check Supabase Access
```bash
curl -I "https://iwzfrnfemdeomowothhn.supabase.co/storage/v1/object/public/posts/test.jpg"
# Expected: 400 or 404
```

### Test 2: Count Affected Posts
```sql
SELECT COUNT(*) FROM posts 
WHERE thumbnail LIKE '%supabase.co%' 
   OR mediaUrl LIKE '%supabase.co%';
-- Result: Number of posts with broken media
```

### Test 3: Local Media Availability
```bash
ls -la public/posts/
# Check if any media files exist locally
```

---

## 📈 Impact Assessment

### User Experience
- **Visual Impact**: High - broken images throughout feed
- **Functionality**: Medium - posts still readable, just no media
- **Performance**: Low - failed requests don't block UI

### System Load
- **Network**: 16+ failed requests per page load
- **Client**: Error handling overhead
- **Server**: No impact (external requests)

---

## ✅ Discovery Checklist

- [x] Context7 проверен для Supabase Storage
- [x] 4 альтернативных подхода исследованы
- [x] Прототипы тестов созданы
- [x] Best practices изучены
- [x] Precedents найдены (migration issues)
- [x] Playwright MCP exploration выполнена
- [x] Network logs проанализированы

---

## 🎯 Recommended Approach

**Two-Phase Solution**:
1. **Immediate**: Implement Approach 2 (Fallback Images) for instant UX improvement
2. **Long-term**: Plan Approach 3 or 4 based on resources

**Rationale**:
- Users see broken images NOW - need immediate fix
- Fallback prevents errors while planning permanent solution
- Can be implemented in < 30 minutes

**Next Step**: Create ARCHITECTURE_CONTEXT.md 