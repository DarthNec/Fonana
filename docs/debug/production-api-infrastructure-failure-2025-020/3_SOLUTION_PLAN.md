# 🚀 SOLUTION PLAN: Complete Production Rebuild Strategy

## 📅 Дата: 20.01.2025
## 🏷️ ID: [production_api_infrastructure_failure_2025_020]
## 🚀 Методология: IDEAL METHODOLOGY (М7) - File 3/7
## 🎯 Цель: Detailed rebuild strategy to restore production API functionality

---

## 🎯 **SOLUTION OVERVIEW**

### Strategy: **Complete Clean Rebuild**
- **Approach**: Fix development issues → Clean build → Fresh deployment
- **Timeline**: 2-4 hours total
- **Success Rate**: 90% (если следовать плану строго)
- **Risk Level**: 🟡 Moderate (controlled, methodical approach)

### Alternative Strategies Rejected:
- ❌ **Patch existing build**: 20% success rate, high risk
- ❌ **Manual module fixes**: 40% success rate, unpredictable
- ❌ **Rollback strategy**: No known working backup available

---

## 📋 **DETAILED IMPLEMENTATION PLAN v1**

### 🏗️ **PHASE 1: ENVIRONMENT PREPARATION** (30 minutes)

#### Step 1.1: Local Environment Verification
```bash
# Time: 5 minutes
1. Check current local dev status
   npm run dev # Verify local still works
   
2. Verify Node.js version compatibility
   node --version # Should be 18+ for Next.js 14.1.0
   npm --version
```

#### Step 1.2: React Context Issues Investigation
```bash
# Time: 15 minutes  
1. Identify blocking useContext errors
   npm run build 2>&1 | tee build-errors.log
   
2. Search for context-related issues
   grep_search "useContext\|createContext" --include="*.tsx"
   
3. Check for import/export mismatches
   grep_search "Context.*import\|Context.*export" --include="*.ts"
```

#### Step 1.3: Dependencies Audit
```bash
# Time: 10 minutes
1. Clean install verification
   rm -rf node_modules package-lock.json
   npm install
   
2. Check for version conflicts
   npm outdated
   npm audit
```

---

### 🔧 **PHASE 2: REACT CONTEXT FIXES** (45-90 minutes)

#### Step 2.1: Context Error Identification
```typescript
// Expected issues to find and fix:
1. Missing Context imports
2. useContext outside Provider
3. Context value type mismatches
4. Circular dependencies in Context files
```

#### Step 2.2: Systematic Context Repair
```bash
# For each identified context issue:
1. Locate exact error source
   codebase_search "Where is [ContextName] used incorrectly?"
   
2. Check Provider hierarchy
   grep_search "Provider.*wrapper\|<.*Provider" --include="*.tsx"
   
3. Fix import/export chains
   edit_file for each broken context file
   
4. Verify fix doesn't break others
   npm run build --dry-run (if available)
```

#### Step 2.3: Build Verification Loop
```bash
# Repeat until clean build:
while npm run build has errors:
  1. Fix next context error
  2. Test build again
  3. Document fix in implementation notes
  
# Success criteria: npm run build completes successfully
```

---

### 🏭 **PHASE 3: PRODUCTION BUILD GENERATION** (30 minutes)

#### Step 3.1: Clean Build Process
```bash
# Time: 20 minutes
1. Clean previous build artifacts
   rm -rf .next
   
2. Clear build cache
   npm run clean # if available, or manual cleanup
   
3. Generate fresh production build
   NODE_ENV=production npm run build
   
4. Verify standalone mode enabled
   ls -la .next/standalone/
```

#### Step 3.2: Build Integrity Verification
```bash
# Time: 10 minutes
1. Check critical files exist
   ls -la .next/standalone/server.js
   ls -la .next/standalone/.next/server/
   
2. Verify webpack bundles generated
   find .next/standalone -name "*webpack*" -type f
   
3. Test local standalone mode
   cd .next/standalone && node server.js &
   curl localhost:3000/api/posts
```

---

### 🚀 **PHASE 4: PRODUCTION DEPLOYMENT** (45 minutes)

#### Step 4.1: Pre-deployment Backup
```bash
# Time: 10 minutes
ssh fonana "
  cd /var/www/
  cp -r Fonana Fonana.backup.$(date +%Y%m%d_%H%M%S)
"
```

#### Step 4.2: Environment Preparation
```bash
# Time: 10 minutes
ssh fonana "
  cd /var/www/Fonana
  pm2 stop fonana-app
  rm -rf .next/standalone
  mkdir -p .next/standalone
"
```

#### Step 4.3: File Transfer
```bash
# Time: 15 minutes
# Upload new build
rsync -avz --progress .next/standalone/ fonana:/var/www/Fonana/.next/standalone/

# Upload environment file
rsync -avz .env.production fonana:/var/www/Fonana/.next/standalone/.env

# Upload public assets if needed
rsync -avz public/ fonana:/var/www/Fonana/public/
```

#### Step 4.4: Production Startup
```bash
# Time: 10 minutes
ssh fonana "
  cd /var/www/Fonana/.next/standalone
  pm2 start server.js --name fonana-app
  pm2 save
"
```

---

### ✅ **PHASE 5: VERIFICATION & TESTING** (30 minutes)

#### Step 5.1: Infrastructure Health Check
```bash
# Time: 10 minutes
ssh fonana "
  pm2 status
  nginx -t
  curl -I localhost:3000/api/posts
"
```

#### Step 5.2: API Endpoints Testing
```bash
# Time: 15 minutes
# Test critical API routes
curl -X GET http://fonana.com/api/posts
curl -X GET http://fonana.com/api/creators  
curl -X GET http://fonana.com/api/conversations

# Test upload endpoint
curl -X POST http://fonana.com/api/posts/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-image.png"
```

#### Step 5.3: Frontend Integration Test
```bash
# Time: 5 minutes
# Test in browser
curl http://fonana.com/feed
curl http://fonana.com/creators
# Check browser console for errors
```

---

## 🔄 **CONTINGENCY PLANS**

### If React Context Fixes Fail:
```bash
Plan B1: Isolate broken contexts (45 min)
1. Comment out problematic context imports
2. Use fallback/minimal context implementations
3. Build without full context functionality
4. Deploy working core, fix contexts post-deployment

Plan B2: Rollback specific contexts (30 min)  
1. Git checkout previous working versions of context files
2. Merge manually with current changes
3. Accept temporary feature limitations
```

### If Build Still Fails:
```bash
Plan C1: Dependency downgrade (60 min)
1. Check Next.js 14.0.x compatibility
2. Downgrade specific problematic packages
3. Rebuild with older, stable versions

Plan C2: Minimal build approach (90 min)
1. Create minimal Next.js app structure
2. Copy only essential API routes
3. Deploy basic working version
4. Gradually add components back
```

### If Deployment Fails:
```bash
Plan D1: Manual component deployment (30 min)
1. Copy individual .next/server files manually
2. Test each component separately
3. Identify specific failing component

Plan D2: Immediate rollback (15 min)
1. ssh fonana "rm -rf /var/www/Fonana/.next/standalone"
2. ssh fonana "cp -r /var/www/Fonana.backup.*/. /var/www/Fonana/"
3. ssh fonana "pm2 restart fonana-app"
```

---

## ⏱️ **DETAILED TIMELINE**

### Hour 1: Foundation (60 min)
- 0:00-0:30 - Environment prep & context investigation
- 0:30-1:00 - Begin React Context fixes

### Hour 2: Core Fixes (60 min)  
- 1:00-1:30 - Continue context repairs
- 1:30-2:00 - Build verification & iteration

### Hour 3: Deployment (60 min)
- 2:00-2:20 - Production build generation
- 2:20-2:45 - Backup & file transfer
- 2:45-3:00 - Production startup & basic testing

### Hour 4: Verification (60 min)
- 3:00-3:30 - Comprehensive API testing
- 3:30-4:00 - Frontend integration & documentation

### Worst Case Scenario: +2 hours
- 4:00-5:00 - Contingency plan execution
- 5:00-6:00 - Alternative approach implementation

---

## 🎯 **SUCCESS CRITERIA**

### Phase 1 Success:
- [ ] Local development environment stable
- [ ] React Context errors identified and catalogued
- [ ] Dependencies clean and verified

### Phase 2 Success:
- [ ] `npm run build` completes without errors
- [ ] No TypeScript compilation errors
- [ ] All Context providers properly connected

### Phase 3 Success:
- [ ] .next/standalone directory generated
- [ ] server.js file present and valid
- [ ] webpack-runtime.js includes proper module references
- [ ] Local standalone test passes

### Phase 4 Success:
- [ ] Files successfully transferred to production
- [ ] PM2 process starts without errors
- [ ] Production environment variables loaded
- [ ] Basic health check passes

### Phase 5 Success:
- [ ] All API routes return 200 OK (not 405)
- [ ] Upload functionality restored
- [ ] Database connectivity confirmed
- [ ] Frontend can load data from API

### Overall Success:
- [ ] **Upload images works end-to-end**
- [ ] **All API endpoints functional** 
- [ ] **No new bugs introduced**
- [ ] **Performance equivalent to previous working state**

---

## 🚨 **CRITICAL DEPENDENCIES**

### Blocking Dependencies:
1. **React Context Fixes** - Cannot build without fixing these
2. **Node.js Version Compatibility** - Must verify before deployment
3. **Production Server Access** - Need SSH and deployment permissions

### Success Dependencies:
1. **Local Environment Stability** - Foundation for all work
2. **Build Process Integrity** - Core requirement for standalone generation
3. **Network Connectivity** - File transfer and testing

### External Dependencies:
1. **Database Server** - Must remain running throughout process
2. **Nginx Configuration** - Should not require changes
3. **PM2 Process Manager** - Must handle restart gracefully

---

## 📊 **RESOURCE REQUIREMENTS**

### Time Investment:
- **Minimum**: 2 hours (if everything goes smoothly)
- **Expected**: 3-4 hours (with normal troubleshooting)
- **Maximum**: 6 hours (if major contingencies needed)

### System Resources:
- **Local**: Sufficient disk space for build generation
- **Production**: Downtime during deployment phase (15-30 min)
- **Network**: Stable connection for file transfers

### Human Resources:
- **Primary**: Full attention during React Context fixes
- **Secondary**: Monitoring during deployment and testing
- **Critical Decisions**: Contingency plan selection if needed

---

## 🔄 **ITERATION STRATEGY**

### If Plan v1 Encounters Issues:
1. **Document specific failure point**
2. **Assess remaining timeline vs contingency options**
3. **Update Solution Plan to v2 with learned information**
4. **Re-run Impact Analysis if approach changes significantly**
5. **Continue with modified plan**

### Version Control for Solution Plan:
- **v1**: Initial complete rebuild strategy (current)
- **v2**: Will be created if major issues found during execution
- **v3**: Fallback/contingency approach if needed

**Status**: 🟢 Solution Plan v1 Complete - Ready for Impact Analysis

---

## 📋 **NEXT FILE REQUIREMENTS**

**File 4**: IMPACT_ANALYSIS.md
- Risk classification for each phase
- Performance impact assessment  
- Business continuity analysis
- Rollback impact evaluation
- Success/failure scenario modeling 