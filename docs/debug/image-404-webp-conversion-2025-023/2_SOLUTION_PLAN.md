# 📋 SOLUTION PLAN: Next.js Standalone Configuration Fix

**Дата:** 2025-01-23  
**Методология:** IDEAL M7 - Phase 3  
**Root Cause:** `output: 'standalone'` в next.config.js блокирует static file serving  

## 🎯 ПРОСТОЕ РЕШЕНИЕ

### ✅ **IDENTIFIED ROOT CAUSE:**
- **Problem**: `output: 'standalone'` в next.config.js
- **Effect**: Next.js не может отдавать static files из subdirectories 
- **Evidence**: Files существуют на диске, но браузер получает 404

### 🔧 **SOLUTION: Remove Standalone Mode**

#### Step 1: Fix next.config.js
```javascript
// REMOVE THIS LINE:
output: 'standalone',  // ❌ DELETE

// Keep everything else as-is
```

#### Step 2: Rebuild and Restart
```bash
# На сервере:
npm run build
pm2 restart fonana-app
```

## 📊 IMPACT ANALYSIS

### 🟢 **ZERO RISK SOLUTION:**
- **Configuration change only** - no code modifications
- **Easy rollback** - just add the line back if needed  
- **PM2 already configured** for standard mode (not standalone)
- **Preserves all existing functionality**

### 🎯 **EXPECTED RESULTS:**
- `/posts/images/thumb_*.webp` files will be served directly
- No more 404 errors for existing WebP thumbnails
- Faster image loading (static files vs API processing)
- No impact on our media API system

## ⚡ **IMPLEMENTATION PLAN**

### Phase 1: Local Testing (OPTIONAL)
1. Comment out `output: 'standalone'` locally
2. Test that `/posts/images/` static files work
3. Verify no regression in other functionality

### Phase 2: Production Fix
1. Edit next.config.js on server
2. Run `npm run build`  
3. Restart PM2 application
4. Test image loading immediately

### Phase 3: Validation
1. Check specific failing URLs work
2. Verify feed page shows images correctly
3. Confirm no new errors in console

## 🔄 ROLLBACK PLAN

If any issues arise:
```javascript
// Add back to next.config.js:
output: 'standalone',
```

Then rebuild and restart.

## ⚠️ WHY THIS WORKS

### Current State:
```
Browser → /posts/images/file.webp
  ↓
Next.js (standalone) → "Cannot serve subdirectory static files"  
  ↓
404 ❌
```

### After Fix:
```
Browser → /posts/images/file.webp
  ↓  
Next.js (standard) → serve static file from /public/posts/images/
  ↓
File delivered ✅
```

**Status:** Ready for immediate implementation - MINIMAL RISK, MAXIMUM IMPACT 