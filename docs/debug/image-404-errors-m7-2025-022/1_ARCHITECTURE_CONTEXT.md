# 🏗️ ARCHITECTURE CONTEXT: Image Serving Pipeline

**Задача:** Понять текущую архитектуру image serving для исправления 404 ошибок  
**Дата:** 2025-01-22  
**Предыдущий файл:** DISCOVERY_REPORT.md  

## 🗺️ ТЕКУЩАЯ АРХИТЕКТУРА

### Image Serving Flow (Current)
```mermaid
flowchart TD
    A[Browser Request] --> B{URL Path?}
    B -->|/api/media/*| C[Media API]
    B -->|/posts/images/*| D[Main Nginx Location /]
    B -->|/api/*| E[API Proxy]
    
    C --> F[X-Accel-Redirect Logic]
    F --> G[/internal/ Location]
    G --> H[File System]
    
    D --> I[Node.js Proxy]
    I --> J[Next.js App]
    J --> K[404 Error - No Static Handler]
    
    E --> I
```

### Current Components

#### 1. **Browser Layer**
- **Requests:** `/posts/images/thumb_xxx.webp`
- **Expectation:** Image file response
- **Current Result:** 404 from Node.js

#### 2. **Nginx Layer** 
- **Location /api/:** ✅ Proxy to Node.js port 3000
- **Location /:** ✅ Proxy to Node.js port 3000 (DEFAULT)
- **Location /posts/images/:** ❌ **MISSING!**

#### 3. **Node.js Layer (port 3000)**
- **API Routes:** ✅ Handle /api/* requests  
- **Page Routes:** ✅ Handle page rendering
- **Static Files:** ❌ NO handling for /posts/images/*

#### 4. **File System Layer**
- **Location:** `/var/www/Fonana/public/posts/images/`
- **Files:** ✅ Exist (confirmed via ls)
- **Access:** ❌ Not accessible via web

## 🔍 ПРОБЛЕМНЫЕ КОМПОНЕНТЫ

### 1. **Missing Nginx Location Rule**
**Проблема:** `/posts/images/*` requests попадают в default location `/`

**Current Nginx Config:**
```nginx
location /api/ {
    proxy_pass http://localhost:3000;  # ✅ Works
}

location / {
    proxy_pass http://127.0.0.1:3000;  # ❌ Catches /posts/images/
}
```

**Результат:** Static image requests проксируются на Node.js instead of file system

### 2. **Node.js Static File Gap**
**Проблема:** Next.js app НЕ настроен для serving `/posts/images/`

**Next.js Public Folder:**
- ✅ Serves `/public/*` as `/*` 
- ❌ НЕ serves `/posts/images/*` (outside public scope)

### 3. **X-Accel Setup Complexity** 
**Существующая система:**
- `/api/media/*` → X-Accel-Redirect to `/internal/`
- `/internal/` → File system with access control
- **Работает для API, НЕ работает для direct URLs**

## 🎯 ЗАВИСИМОСТИ И ИНТЕГРАЦИИ

### Upstream Dependencies
1. **Posts API** → generates correct URLs (`/posts/images/xxx`)
2. **transformMediaUrl** → converts formats (JPG→WebP)
3. **Upload System** → creates files in correct location
4. **Database** → stores correct paths

### Downstream Dependencies  
1. **Frontend Components** → expect images to load
2. **SEO/Performance** → relies on fast image serving
3. **User Experience** → visual content display
4. **Caching Systems** → CDN, browser cache

### Integration Points
1. **Media API** (`/api/media/`) - access-controlled serving
2. **Upload API** (`/api/posts/upload`) - file creation
3. **X-Accel System** - internal serving with headers
4. **Static Files** - public, direct serving

## 📊 PERFORMANCE CHARACTERISTICS

### Current Performance Issues
- **404 Requests:** 150+ per page load
- **Retry Loops:** Browser infinite retries
- **Node.js Overhead:** Static requests hitting application server
- **Network Waste:** Failed requests consuming bandwidth

### Target Performance Goals
- **Static Serving:** Direct Nginx → File System  
- **Cache Headers:** 1 year expiry for images
- **Zero Retries:** Successful first request
- **Separation:** Static vs Dynamic content serving

## 🔗 АРХИТЕКТУРНЫЕ ПАТТЕРНЫ

### Pattern 1: **Direct Static Serving** (Target)
```nginx
location /posts/images/ {
    alias /var/www/Fonana/public/posts/images/;
    expires 1y;
}
```
- **Pro:** Maximum performance
- **Con:** No access control

### Pattern 2: **Unified Media API** (Alternative)
```nginx  
location /posts/ {
    proxy_pass http://localhost:3000/api/media/;
}
```
- **Pro:** Centralized access control
- **Con:** Performance overhead

### Pattern 3: **Hybrid Approach** (Compromise)
- **Public images:** Direct Nginx serving
- **Protected images:** Media API serving
- **Logic:** Based on access requirements

## ⚠️ КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ

### 1. **X-Accel Integration**
- Существующая `/internal/` setup НЕ должна быть нарушена
- Media API depends на X-Accel для access control

### 2. **File Permissions**
- Images owned by different users (root, 501)  
- Nginx must have read access

### 3. **Cache Coherency**
- New images must be immediately available
- No cache invalidation conflicts

### 4. **Security**
- Public static serving vs private content
- No access control bypass

## 🎯 КОМПОНЕНТЫ ДЛЯ ИЗМЕНЕНИЯ

### Primary: **Nginx Configuration**
- Add location rule for `/posts/images/`
- Ensure proper order (before default location)
- Configure appropriate headers

### Secondary: **Frontend Fallback**
- transformMediaUrl already handles format conversion
- Может добавить retry logic for robustness

### Tertiary: **Monitoring**  
- Add specific monitoring for static file serving
- Track 404 rates, cache hit rates

## 📝 АРХИТЕКТУРНЫЕ РЕШЕНИЯ

### Decision 1: **Direct Nginx Serving**
**Rationale:** Maximum performance, simple solution
**Impact:** Requires Nginx config change + restart

### Decision 2: **Preserve X-Accel System** 
**Rationale:** Media API functionality must remain intact
**Impact:** Careful ordering of location rules

### Decision 3: **Separate Public vs Private**
**Rationale:** `/posts/images/` are public, no access control needed
**Impact:** Clear separation of concerns

## 🔄 NEXT STEPS

1. **SOLUTION_PLAN** - конкретная implementation strategy
2. **IMPACT_ANALYSIS** - влияние на existing systems  
3. **Implementation Plan** - step-by-step execution

---
**Статус:** ✅ **COMPLETED**  
**Следующий файл:** 2_SOLUTION_PLAN.md 