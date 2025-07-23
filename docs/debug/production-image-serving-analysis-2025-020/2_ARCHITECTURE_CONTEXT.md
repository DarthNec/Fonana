# 🏗️ ARCHITECTURE CONTEXT: Production Image Serving Analysis

## 📅 Дата: 20.01.2025
## 🏷️ ID: [production_image_serving_analysis_2025_020]
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Phase 2

---

## 🔍 **CURRENT PRODUCTION ARCHITECTURE**

### **Next.js Configuration Analysis:**
```javascript
// Current next.config.js (after local fix):
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**',
    },
    {
      protocol: 'http', 
      hostname: 'localhost',
      port: '3000',
      pathname: '/posts/**',
    },
    {
      protocol: 'https',
      hostname: 'fonana.me',
      pathname: '/posts/**',
    }
  ]
}
```

**✅ LOCAL BEHAVIOR:**
- `curl http://localhost:3000/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG` → **200 OK**
- Next.js Image Optimization works correctly
- Files accessible through Next.js static serving

**❌ PRODUCTION BEHAVIOR:**  
- `curl https://fonana.me/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG` → **404 NOT FOUND**
- Physical file exists: `/var/www/Fonana/public/posts/images/0612cc5b000dcff7ed9879dbc86942cf.JPG`
- Next.js config updated but not working

---

## 🏗️ **PRODUCTION DEPLOYMENT ARCHITECTURE**

### **Key Components From Context7 Research:**

1. **Next.js Standalone Mode Issues:**
   ```bash
   # From Context7: Next.js standalone requires manual static file copying
   cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
   ```
   
2. **Nginx + Next.js Static File Serving Patterns:**
   ```nginx
   # Pattern 1: Direct static serving
   location /posts/images/ {
       root /var/www/Fonana/public;
   }
   
   # Pattern 2: Proxy fallback
   location / {
       try_files $uri @nextjs;
   }
   
   location @nextjs {
       proxy_pass http://127.0.0.1:3000;
   }
   ```

3. **Next.js Image Optimization + Production:**
   - remotePatterns работают только когда Next.js server может serve files
   - В standalone mode статические файлы могут быть недоступны
   - Nginx должен serve статические файлы напрямую или proxy to Next.js

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **Potential Issue #1: Standalone Mode Static Files**
**Context7 Evidence:**
> "After building your Next.js application with `output: 'standalone'`, use these commands to manually copy the `public` and `.next/static` folders into the `.next/standalone` directory"

**Our Production Setup:**
- Uses PM2 with Next.js standalone mode
- public/ files might not be copied to .next/standalone/
- Next.js cannot serve files that aren't in standalone directory

### **Potential Issue #2: Nginx Routing Configuration**
**Context7 Pattern:**
```nginx
server {
    location /images/ {
        root /data;  # Serves files from /data/images/
    }
    location / {
        proxy_pass http://www.example.com;
    }
}
```

**Missing in Our Setup:**
- No dedicated nginx location block for `/posts/images/`
- All requests proxy to Next.js instead of static serving
- Next.js cannot find files → 404

### **Potential Issue #3: File Permissions/Ownership**
- Nginx user vs file owner mismatch
- Next.js process user vs file owner mismatch

---

## 📊 **CURRENT ECOSYSTEM ANALYSIS**

### **PM2 Configuration (ecosystem.config.js):**
```javascript
// Current production setup
{
  name: "fonana-app",
  script: ".next/standalone/server.js",
  cwd: "/var/www/Fonana",
  // Environment variables...
}
```

### **File Structure Analysis:**
```
/var/www/Fonana/
├── .next/
│   ├── standalone/
│   │   ├── server.js          ✅ Running via PM2
│   │   ├── public/            ❓ Copied or missing?
│   │   └── .next/
│       └── static/            ❓ Copied or missing?
├── public/
│   └── posts/
│       └── images/
│           └── *.JPG          ✅ Physical files exist
└── next.config.js             ✅ Updated with remotePatterns
```

**Critical Questions:**
1. Are public/ files copied to .next/standalone/public/?
2. Is nginx configured to serve static files directly?
3. Does standalone server.js have access to files?

---

## 🔗 **INTEGRATION POINTS**

### **1. Nginx → Next.js Proxy Chain:**
```
Client Request: https://fonana.me/posts/images/file.JPG
       ↓
Nginx (Port 443) → Proxy to Next.js (Port 3000?)
       ↓
Next.js Standalone Server → Look for file in standalone/public/
       ↓
File Not Found → 404 Error
```

### **2. Expected Working Chain:**
```
Client Request: https://fonana.me/posts/images/file.JPG
       ↓
Nginx → Direct serve from filesystem OR
       ↓
Nginx → Proxy to Next.js with correct file paths
       ↓ 
Next.js → Serve from standalone/public/ (if copied)
```

---

## 🎯 **MISSING COMPONENTS IDENTIFIED**

### **A. Static File Copy Process (Context7 Critical):**
```bash
# Required after each build:
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

### **B. Nginx Static Serving Configuration:**
```nginx
# Direct static serving (preferred)
location /posts/ {
    root /var/www/Fonana/public;
    expires 1y;
    access_log off;
}

# OR proxy with fallback
location / {
    try_files $uri @nextjs;
}

location @nextjs {
    proxy_pass http://127.0.0.1:3000;
}
```

### **C. Build Process Integration:**
- Automated copying of static files in deployment
- PM2 restart after file copying
- Nginx configuration update process

---

## ⚠️ **ARCHITECTURAL RISKS**

### **🔴 Critical Risks:**
1. **Manual Static File Management** - files not automatically copied
2. **Nginx Configuration Gap** - no static serving rules
3. **Build Process Incomplete** - missing post-build steps

### **🟡 Major Risks:**
1. **Performance Impact** - all static requests go through Node.js
2. **Single Point of Failure** - if Next.js crashes, static files inaccessible
3. **Scaling Issues** - Node.js serving static files inefficient

### **🟢 Minor Risks:**
1. **Cache Headers** - static files not optimally cached
2. **CDN Readiness** - current setup not CDN-friendly

---

## 📋 **SOLUTION APPROACHES PREVIEW**

### **Approach A: Nginx Direct Static Serving** 
- Add nginx location blocks for /posts/
- Serve files directly from filesystem
- Fallback to Next.js for dynamic content

### **Approach B: Fix Standalone Static File Copying**
- Implement automated copying in build process
- Update PM2 deployment scripts
- Keep current proxy-only nginx setup

### **Approach C: Hybrid Solution**
- Nginx serves static files directly
- Copy files to standalone for Next.js Image component
- Best of both approaches

---

## 🎯 **NEXT PHASE REQUIREMENTS**

For **Solution Plan Phase:**
1. **Context7 validation** of each approach with official docs
2. **Impact Analysis** of nginx config changes on production
3. **Implementation Simulation** of file copying automation
4. **Risk Assessment** for each solution approach

**Architecture Understanding: ✅ COMPLETE**
- Current setup analyzed
- Root causes identified  
- Integration points mapped
- Solution approaches identified 