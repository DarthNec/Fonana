# 🏗️ ARCHITECTURE CONTEXT - Production Environment Mapping
**Task ID:** enterprise-production-deployment-2025-024  
**Phase:** M7 ARCHITECTURE  
**Date:** 2025-01-24  
**Status:** 🚧 IN PROGRESS  

---

## 🌐 PRODUCTION ARCHITECTURE OVERVIEW

### **Current Production Stack:**
```mermaid
graph TB
    subgraph "🌍 Internet"
        U[Users] --> D[fonana.me]
    end
    
    subgraph "🖥️ VPS Server (64.20.37.222)"
        D --> N[Nginx :80/443]
        N --> A[Node.js App :3000]
        A --> DB[(PostgreSQL :5432)]
        
        PM2[PM2 Process Manager] --> A
    end
    
    subgraph "🔄 Development"
        GIT[Git Repository] --> |git pull| A
    end
    
    style N fill:#90EE90
    style A fill:#87CEEB
    style DB fill:#FFB6C1
    style PM2 fill:#DDA0DD
```

---

## 📁 CURRENT FILE STRUCTURE (Production)

### **Known Production Layout:**
```
/var/www/fonana/  (or similar)
├── app/
│   ├── api/
│   │   ├── search/route.ts          # 🔧 MODIFIED (Prisma fixes)
│   │   └── creators/route.ts        # 📊 DEPENDENCY
├── components/
│   ├── ui/
│   │   ├── EnterpriseError.tsx      # 🆕 NEW FILE
│   │   └── EnterpriseErrorBoundary.tsx # 🆕 NEW FILE
│   ├── MessagesPageClient.tsx       # 🔧 MODIFIED (enterprise wrapper)
│   ├── CreatorsExplorer.tsx         # 🔧 MODIFIED (enterprise wrapper)
│   └── SearchPageClient.tsx         # 🔧 MODIFIED (enterprise wrapper)
├── lib/
│   ├── validation/
│   │   └── schemas.ts               # 🆕 NEW FILE
│   ├── monitoring/
│   │   └── performance.ts           # 🆕 NEW FILE
│   └── hooks/
│       └── useEnterpriseQuery.ts    # 🆕 NEW FILE
├── ecosystem.config.js              # ⚠️ CRITICAL CONFIG
├── .env                             # 🔐 ENVIRONMENT VARS
└── package.json                     # 📦 DEPENDENCIES
```

---

## 🗄️ DATABASE ARCHITECTURE

### **Current Schema (Verified in Discovery):**
```sql
-- ✅ CONFIRMED: User model
model User {
  id           String   @id @default(cuid())
  nickname     String?  @unique
  fullName     String?
  bio          String?
  isVerified   Boolean  @default(false)  -- ✅ FIXED: was 'verified'
  // ...
}

-- ✅ CONFIRMED: Post model  
model Post {
  id         String   @id @default(cuid())
  title      String
  content    String
  creatorId  String
  // ...
  @@map("posts")  -- ✅ Table name is 'posts'
}
```

### **Database Connection:**
```javascript
// Production DATABASE_URL (need to verify):
postgresql://[user]:[pass]@localhost:5432/fonana

// Prisma Access Patterns (FIXED):
✅ prisma.user.findMany()    // was: prisma.users
✅ prisma.post.findMany()    // was: prisma.posts
✅ isVerified: true          // was: verified: true
```

---

## 🔄 DEPLOYMENT PROCESS ARCHITECTURE

### **Current Git Workflow:**
```mermaid
graph LR
    subgraph "💻 Development"
        L[Local Changes] --> C[Commit]
        C --> P[Push to main]
    end
    
    subgraph "🖥️ Production Server"
        P --> GP[git pull origin main]
        GP --> I[npm install]
        I --> B[npm run build]
        B --> R[pm2 restart]
        R --> V[Verify deployment]
    end
    
    style GP fill:#90EE90
    style B fill:#87CEEB
    style R fill:#FFB6C1
```

### **PM2 Process Management:**
```javascript
// ecosystem.config.js (Current Configuration)
module.exports = {
  apps: [{
    name: 'fonana',
    script: 'npm',
    args: 'start',           // ✅ NOT standalone mode
    cwd: '/var/www/fonana',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork'
  }]
}
```

---

## 🌐 NGINX CONFIGURATION ARCHITECTURE

### **Current Proxy Setup:**
```nginx
# /etc/nginx/sites-available/fonana
server {
    listen 80;
    listen 443 ssl;
    server_name fonana.me;
    
    # ✅ Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # ✅ Static files (important for /posts/images/)
    location /posts/images/ {
        root /var/www/fonana/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 📦 DEPENDENCY ARCHITECTURE

### **Package Dependencies Status:**

#### **✅ Already Installed (Confirmed by build):**
```json
{
  "dependencies": {
    "@tanstack/react-query": "^x.x.x",  // ✅ Used by enterprise hooks
    "react-error-boundary": "^x.x.x",   // ✅ Used by EnterpriseErrorBoundary
    "zod": "^x.x.x",                     // ✅ Used by validation schemas
    "next": "14.1.0",                    // ✅ Core framework
    "react": "^18.x.x",                  // ✅ Core library
    "@prisma/client": "^x.x.x"          // ✅ Database client
  }
}
```

#### **🔍 Need to Verify on Production:**
- Node.js version compatibility
- NPM/package.json state on server
- Prisma client generation status

---

## 🔄 DATA FLOW ARCHITECTURE

### **Enhanced API Request Flow:**
```mermaid
sequenceDiagram
    participant U as User
    participant N as Nginx
    participant A as Next.js App
    participant EB as EnterpriseErrorBoundary
    participant API as API Route
    participant P as Prisma
    participant DB as PostgreSQL
    participant EM as Error Monitor

    U->>N: Request /api/search?q=test
    N->>A: Proxy to :3000
    A->>EB: Wrap component
    EB->>API: Enhanced logging
    API->>P: prisma.user.findMany()
    P->>DB: SELECT * FROM users
    DB-->>P: Results
    P-->>API: Mapped data
    API-->>EB: Response + performance metrics
    EB-->>A: Structured logging
    A-->>N: JSON response
    N-->>U: Search results
    
    Note over EM: Console logs with user context
```

---

## 🔧 COMPONENT ARCHITECTURE CHANGES

### **Enterprise Error Boundary Wrapper Pattern:**
```typescript
// New Architecture Pattern:
// Before:
<Component />

// After:
<EnterpriseErrorBoundary context="ComponentName" queryKey={['key']}>
  <Component />
</EnterpriseErrorBoundary>
```

### **Enhanced Query Pattern:**
```typescript
// Before:
const { data, error } = useQuery({...})

// After:
const { data, error } = useQuery({
  // Enhanced with enterprise logging
  queryFn: async () => {
    console.info('[ENTERPRISE QUERY] Starting...')
    // ... query logic
    console.info('[ENTERPRISE QUERY] Complete')
  },
  retry: 3,
  retryDelay: exponentialBackoff
})
```

---

## 🔐 ENVIRONMENT VARIABLE ARCHITECTURE

### **Critical Variables Needed:**
```bash
# Database
DATABASE_URL=postgresql://fonana_user:fonana_pass@localhost:5432/fonana

# Authentication
NEXTAUTH_URL=https://fonana.me
NEXTAUTH_SECRET=...

# Solana (for wallet integration)
NEXT_PUBLIC_SOLANA_RPC_URL=...

# Production flags
NODE_ENV=production
```

### **🔍 Environment Verification Checklist:**
- [ ] DATABASE_URL points to correct production DB
- [ ] NEXTAUTH_URL matches domain
- [ ] All Solana wallet configurations present
- [ ] No development-only variables

---

## ⚡ PERFORMANCE ARCHITECTURE

### **New Performance Monitoring Points:**
```typescript
// Console-based monitoring (Production-safe)
console.info('[ENTERPRISE PERFORMANCE]', {
  operation: 'user-search',
  duration: endTime - startTime,
  memoryUsage: process.memoryUsage(),
  timestamp: new Date().toISOString()
})
```

### **Error Tracking Architecture:**
```typescript
// Session-based error frequency tracking
sessionStorage.setItem(`error_${component}_${errorType}`, count)

// Performance context logging
console.warn('[PERFORMANCE CONTEXT]', {
  memory: performance.memory,
  navigation: performance.getEntriesByType('navigation')[0]
})
```

---

## 🛡️ RISK MITIGATION ARCHITECTURE

### **Rollback-Safe Design:**
1. **Git-based rollback:** `git reset --hard HEAD~1`
2. **Component isolation:** Error boundaries prevent cascade failures
3. **Graceful degradation:** APIs work even if monitoring fails
4. **Zero breaking changes:** All additions are non-destructive

### **Circuit Breaker Pattern:**
```typescript
// In EnterpriseErrorBoundary
if (errorCount > 5) {
  sessionStorage.removeItem(errorKey)
  console.warn('[ERROR RESET] Clearing after 5 crashes')
}
```

---

## 📊 MONITORING ARCHITECTURE

### **Structured Logging Format:**
```typescript
// Standard enterprise log format
console.error('[ENTERPRISE ERROR]', {
  component: 'SearchPageClient',
  userId: user?.id,
  error: { message, stack, name },
  timestamp: new Date().toISOString(),
  url: window.location.href,
  userAgent: navigator.userAgent,
  queryKey: ['search', 'test']
})
```

### **Performance Tracking:**
```typescript
// Memory and timing tracking
const performanceData = {
  memory: performance.memory ? {
    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
  } : undefined,
  duration: endTime - startTime
}
```

---

## 🔄 INTEGRATION POINTS

### **Critical Integration Verification:**

#### **1. Database Integration:**
- ✅ Prisma model names corrected
- 🔍 Need to verify schema matches production
- 🔍 Test queries against production data

#### **2. API Integration:**
- ✅ `/api/search` tested locally
- ✅ `/api/creators` confirmed working
- 🔍 Need production environment testing

#### **3. Authentication Integration:**
- ✅ `useUser` hook integrated in error logging
- 🔍 Verify JWT flow works with new error boundaries
- 🔍 Test authenticated API calls

#### **4. Frontend Integration:**
- ✅ React Query enhanced with enterprise logging
- ✅ Error boundaries wrapping critical components
- 🔍 Browser console monitoring in production

---

## 📋 ARCHITECTURE READINESS ASSESSMENT

### **✅ Ready Components:**
- **API Routes:** Prisma fixes applied and tested
- **Error Handling:** Enterprise boundaries implemented
- **Performance Monitoring:** Console-based tracking ready
- **Component Wrappers:** All critical components wrapped

### **🔍 Need Verification:**
- **Production Database:** Schema compatibility
- **Environment Variables:** Complete configuration
- **PM2 Configuration:** Current state verification
- **Dependency Versions:** Production package state

### **⚠️ Potential Issues:**
- **Console Log Volume:** May increase log output
- **Memory Overhead:** Additional React tree depth
- **Error Masking:** Boundaries might hide real issues

---

## 🎯 ARCHITECTURE SUCCESS CRITERIA

### **Post-Deployment Architecture Health:**
1. **API Response Times:** < 500ms for search
2. **Error Boundary Coverage:** All critical components wrapped
3. **Console Log Structure:** Consistent enterprise format
4. **Memory Usage:** < 10% increase from baseline
5. **Component Isolation:** Errors don't cascade

---

## 📊 NEXT PHASE PREPARATION

### **For Solution Plan Phase:**
- **Deployment Steps:** Git pull → Build → PM2 restart
- **Testing Strategy:** API verification → UI testing → Performance check
- **Rollback Plan:** Git reset → Rebuild → Restart
- **Success Metrics:** API functional + Error boundaries active

---

**Architecture Understanding: 90% Complete**  
**Ready for Solution Planning Phase** ✅

**Next Phase:** SOLUTION_PLAN - Detailed step-by-step deployment process 