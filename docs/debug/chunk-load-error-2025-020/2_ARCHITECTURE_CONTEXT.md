# 🏗️ ARCHITECTURE CONTEXT: Chunk Load Error

## 📅 Дата: 20.01.2025
## 🏷️ ID: [chunk_load_error_2025_020]
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Phase 2

---

## 🔍 **DISCOVERY FINDINGS SUMMARY**

### Web Research Results:
1. **Known Issue**: ChunkLoadError в Next.js 13+ (особенно с 13.3.4+)
2. **Root Cause Pattern**: Static chunks deployment mismatches
3. **Production Impact**: Widespread problem в Vercel Community
4. **Version Issue**: Next.js 14.1.0 наследует баги от 13.3.4+

---

## 🏗️ **CURRENT ARCHITECTURE ANALYSIS**

### Next.js Build Pipeline:
```
Source Code → npm run build → .next/standalone/ → Production Server
                ↓
           .next/static/chunks/ → ?? Missing in standalone ??
```

### Production Structure (Current):
```
/var/www/Fonana/
├── .next/standalone/
│   ├── server.js ✅ (running)
│   ├── .next/static/ ✅ (copied earlier)
│   └── public/ ✅ (static assets)
└── .next/ (build artifacts)
    └── static/chunks/ → ⚠️ Potential source of truth
```

### Static Files Delivery Chain:
```
User Click → Dynamic Import → Webpack Request → /_next/static/chunks/9487-xxx.js
                                                           ↓
                                               Nginx → Static File ??
                                                           ↓
                                                   404 OR text/html
```

---

## 🔄 **DATA FLOW ANALYSIS**

### Normal Flow (Expected):
1. User interaction triggers dynamic import
2. Webpack requests specific chunk: `/_next/static/chunks/9487-fab326537be7215a.js`
3. Nginx serves static file with `application/javascript` MIME
4. Browser executes JavaScript chunk
5. React component renders

### Current Broken Flow:
1. User interaction triggers dynamic import ✅
2. Webpack requests chunk: `/_next/static/chunks/9487-fab326537be7215a.js` ✅
3. Nginx returns **404 OR text/html** ❌
4. Browser gets MIME type 'text/html' instead of executable script ❌
5. ChunkLoadError + React Error #423 ❌

---

## 🎯 **COMPONENTS AFFECTED**

### Static File Serving:
- **Nginx Configuration**: `/etc/nginx/sites-available/fonana`
- **Static Directory**: `/var/www/Fonana/.next/standalone/.next/static/`
- **Chunks Location**: `/var/www/Fonana/.next/standalone/.next/static/chunks/`

### Next.js Build System:
- **Standalone Mode**: `output: 'standalone'` in `next.config.js`
- **Webpack Config**: Default Next.js 14.1.0 webpack settings
- **Code Splitting**: Automatic chunk generation for dynamic imports

### PM2 Process:
- **Current Process**: `fonana-app` (PID 324893)
- **Server File**: `.next/standalone/server.js`
- **Static Serving**: Next.js built-in static handler

---

## 🔍 **INTEGRATION POINTS**

### Critical Integration Points:
1. **Next.js Build → Static Files**
   - Build generates chunks in `.next/static/chunks/`
   - Standalone build должен copy static files
   - PM2 serves через Next.js standalone server

2. **Nginx → Static Assets**
   - Nginx proxies requests to PM2
   - Static files served directly by Nginx OR proxied
   - MIME types configured in Nginx

3. **Browser → Webpack Chunks**
   - Dynamic imports trigger chunk requests
   - Webpack expects specific file paths
   - MIME type must be `application/javascript`

### Dependency Chain:
```
npm run build → .next/static/chunks/ generation
       ↓
Copy to .next/standalone/.next/static/chunks/
       ↓
PM2 restart with new files
       ↓
Nginx serves OR proxies static requests
       ↓
Browser receives correct MIME type
```

---

## ⚠️ **POTENTIAL FAILURE POINTS**

### 1. Build Artifacts Missing:
- `.next/static/chunks/9487-fab326537be7215a.js` не скопирован в standalone
- Build ID mismatch между server и client chunks
- Webpack manifest inconsistency

### 2. Nginx Routing Issues:
- `/_next/static/` requests не routing правильно
- MIME type detection failures
- Nginx serving HTML error pages вместо 404

### 3. PM2/Next.js Server Issues:
- Static file handler в standalone не работает
- Server не может найти chunks
- Build ID validation failures

---

## 📊 **ARCHITECTURAL CONSTRAINTS**

### Technology Stack:
- **Next.js**: 14.1.0 (known chunk loading issues)
- **Deployment**: Standalone build (not Vercel)
- **Server**: PM2 + Nginx reverse proxy
- **Static Files**: Mixed serving (Nginx + Next.js)

### Production Requirements:
- Zero downtime deployment
- Static file caching
- Code splitting for performance
- Self-hosted infrastructure

### Known Limitations:
- Next.js 13.3.4+ chunk loading regression
- Standalone build static files handling
- Self-hosted deployment complexity

---

## 🎯 **ARCHITECTURE IMPACT ZONES**

### High Impact:
- **User Experience**: Complete UI breakdown after interactions
- **Static File Delivery**: Core infrastructure component
- **Code Splitting**: Performance optimization broken

### Medium Impact:
- **Error Handling**: Need graceful fallbacks
- **Monitoring**: Chunk errors tracking
- **Deployment**: Build process validation

### Low Impact:
- **SEO**: Static content still works
- **Initial Load**: Only affects dynamic interactions

---

## 🔄 **NEXT STEPS FOR SOLUTION PLANNING**

1. **Static Files Audit**: Verify chunk files existence and paths
2. **Nginx Config Review**: Check static routing and MIME types  
3. **Build Process Analysis**: Validate standalone build artifacts
4. **Version Compatibility**: Consider Next.js downgrade strategy

**Status**: 🟡 Architecture mapped - Ready for Solution Planning 