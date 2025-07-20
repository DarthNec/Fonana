# 🏗️ ARCHITECTURE CONTEXT: Image Upload Placeholder Issue

## 📅 Дата: 20.01.2025
## 🏷️ ID: [image_upload_placeholder_2025_020]
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Phase 2

---

## 🔍 **DISCOVERY FINDINGS SUMMARY**

### Root Cause Identified:
1. ✅ **API Endpoint Working**: `/api/posts/upload` returns HTTP 200 
2. ❌ **WRONG DIRECTORY PATH**: Production code saves to `/var/www/fonana/` (lowercase 'f')
3. ✅ **Correct Path Should Be**: `/var/www/Fonana/` (uppercase 'F')
4. ❌ **Files Not Accessible**: Saved in wrong directory → URL 404
5. ❌ **Outdated Production Code**: Last build doesn't include recent path fix

### Error Pattern:
```
Source Code: `/var/www/Fonana/public/posts/${mediaType}` ✅ (correct)
Production:  `/var/www/fonana/public/posts/${mediaType}` ❌ (wrong case)
Result:      Files saved but not accessible via URL
```

---

## 🏗️ **CURRENT ARCHITECTURE ANALYSIS**

### Image Upload Flow:
```
Frontend Crop Component → FormData → POST /api/posts/upload → File Save → URL Response
                                          ↓
                               uploadDir = /var/www/fonana/ (WRONG!)
                                          ↓
                               File saved but not accessible
                                          ↓
                               Frontend shows placeholder (fallback)
```

### Component Mapping:
```
1. Frontend: Crop UI working ✅
2. API Route: app/api/posts/upload/route.ts ✅ (code fixed)
3. Build Process: .next/standalone/route.js ❌ (outdated)
4. File System: /var/www/Fonana/ vs /var/www/fonana/ ❌ (case mismatch)
5. URL Serving: /posts/images/file.jpg → 404 ❌
```

---

## 🔄 **DATA FLOW ANALYSIS**

### Current Broken Flow:
1. **User crops image** → ✅ Works
2. **Frontend submits FormData** → ✅ Works  
3. **API receives request** → ✅ Works
4. **API saves to `/var/www/fonana/`** → ❌ Wrong directory
5. **API returns URL `/posts/images/file.jpg`** → ✅ Correct URL
6. **Frontend requests image via URL** → ❌ 404 (file not in expected location)
7. **Frontend shows placeholder fallback** → ❌ User sees placeholder

### Expected Correct Flow:
1. User crops image → ✅
2. Frontend submits FormData → ✅  
3. API receives request → ✅
4. **API saves to `/var/www/Fonana/`** → ✅ Correct directory
5. API returns URL → ✅
6. **Frontend loads image successfully** → ✅ Image visible
7. **User sees uploaded image** → ✅ Success

---

## 🎯 **COMPONENTS AFFECTED**

### Production Build System:
- **Source**: `app/api/posts/upload/route.ts` (✅ correct code)
- **Built**: `.next/standalone/.next/server/app/api/posts/upload/route.js` (❌ outdated)
- **Deploy**: PM2 serves outdated build

### File System Structure:
```
/var/www/fonana/public/posts/images/    ❌ Wrong (files saved here)
        ↓
/var/www/Fonana/public/posts/images/    ✅ Correct (nginx serves from here)
```

### URL Routing:
- **Request**: `https://fonana.me/posts/images/file.jpg`
- **Nginx Serves From**: `/var/www/Fonana/public/posts/images/`
- **File Actually At**: `/var/www/fonana/public/posts/images/`
- **Result**: 404 Not Found

---

## 🔍 **INTEGRATION POINTS**

### Critical Integration Points:
1. **Build → Deploy Chain**:
   - `npm run build` → `.next/standalone/` → PM2 restart
   - **Issue**: Recent code changes not reflected in production build

2. **File Save → URL Access**:
   - API saves file → Returns URL → Frontend requests URL
   - **Issue**: Case sensitivity mismatch breaks the chain

3. **Directory Structure Dependencies**:
   - Nginx serves from `/var/www/Fonana/`
   - Upload API saves to `/var/www/fonana/`
   - **Issue**: Different case sensitivity

### Deployment Dependencies:
```
Source Code Changes → npm run build → Deploy to Server → PM2 Restart
                                           ↓
                                   Copy chunks fix applied
                                           ↓
                                   BUT upload route not updated!
```

---

## ⚠️ **FAILURE ANALYSIS**

### Primary Failure Point:
**Build/Deploy Process**: Production code is outdated, doesn't include the upload directory case fix

### Secondary Failure Points:
1. **File System Case Sensitivity**: Linux file system distinguishes `/fonana/` vs `/Fonana/`
2. **Nginx Configuration**: Serves from uppercase path
3. **URL Resolution**: Browsers request files based on API response URLs

### Root Architecture Issue:
**Inconsistent Directory Naming**: 
- Some parts use `/var/www/fonana/` (lowercase)
- Other parts use `/var/www/Fonana/` (uppercase) 
- This creates deployment and access mismatches

---

## 📊 **ARCHITECTURAL CONSTRAINTS**

### Technology Stack:
- **Next.js**: 14.1.0 with standalone build
- **File Upload**: Sharp for image processing
- **File Serving**: Nginx + Next.js static file serving
- **Linux**: Case-sensitive file system

### Production Environment:
- **Server**: PM2 process manager
- **Static Files**: Nginx proxy + Next.js serving
- **Upload Processing**: Server-side Sharp image optimization
- **File Storage**: Local file system (not cloud)

### Known Dependencies:
- **Previous Fix Applied**: Placeholder images case fix (2025-019)
- **Recent Fix Applied**: Chunk loading fix (2025-020) 
- **Missing**: Upload route deployment with case fix

---

## 🎯 **ARCHITECTURE IMPACT ZONES**

### High Impact:
- **Image Upload Functionality**: Complete failure for users
- **Post Creation Flow**: Images not displayed in posts
- **User Experience**: Users see placeholders instead of uploaded images

### Medium Impact:
- **File System Management**: Orphaned files in wrong directory
- **Storage Usage**: Duplicate file storage in multiple directories
- **Deployment Process**: Build/deploy consistency issues

### Low Impact:
- **Other Upload Types**: Audio/video might have same issue
- **Legacy Content**: Existing posts not affected

---

## 🔄 **PREVIOUS FIXES CONTEXT**

### Related Fix (placeholder-images-issue-2025-019):
```typescript
// This fix was applied to app/api/posts/upload/route.ts:
if (process.env.NODE_ENV === 'production') {
  uploadDir = `/var/www/Fonana/public/posts/${mediaType}`  // Fixed: Fonana (uppercase F)
} else {
  // ... local dev path
}
```

**But**: Fix is in source code, not deployed to production!

### Recent Fix (chunk-load-error-2025-020):
- Build process was updated with chunk copying
- PM2 was restarted 
- **BUT**: Upload route code still not updated

---

## 🔄 **NEXT STEPS FOR SOLUTION PLANNING**

1. **Immediate Fix**: Rebuild and redeploy with correct upload path
2. **Build Process Validation**: Ensure all code changes are included
3. **File Migration**: Move orphaned files from wrong directory
4. **Deployment Verification**: Test upload flow end-to-end

**Status**: 🟡 Architecture fully mapped - ROOT CAUSE confirmed as deployment issue

---

## 💡 **SOLUTION APPROACH PREVIEW**

### Quick Fix Strategy:
1. **Build & Deploy**: Update production with correct upload path
2. **File Migration**: Move existing files from `/fonana/` to `/Fonana/`
3. **Validation**: Test complete upload flow

**Estimated Time**: 15 minutes
**Risk Level**: 🟢 Low (simple deployment + file move) 