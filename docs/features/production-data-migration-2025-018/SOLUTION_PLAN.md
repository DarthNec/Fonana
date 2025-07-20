# 📋 SOLUTION PLAN: Production Data Migration
## Task ID: production-data-migration-2025-018
## Version: v1
## Date: 2025-01-18

---

## 🎯 **MIGRATION OBJECTIVES**

**Primary Goal**: Migrate 375 records from local PostgreSQL to production server
**Success Criteria**: 
- ✅ 59 users (56 creators) available via `/api/creators`
- ✅ 312 posts displayed on fonana.me homepage
- ✅ Zero data loss, zero corruption
- ✅ Application fully functional post-migration

---

## ⏰ **EXECUTION TIMELINE**

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| **Phase 1**: Pre-Migration Checks | 3 min | T+0 | T+3 | 🔄 Pending |
| **Phase 2**: Data Export | 2 min | T+3 | T+5 | 🔄 Pending |
| **Phase 3**: Production Prep | 2 min | T+5 | T+7 | 🔄 Pending |
| **Phase 4**: Data Import | 3 min | T+7 | T+10 | 🔄 Pending |
| **Phase 5**: Validation & Restart | 5 min | T+10 | T+15 | 🔄 Pending |

**Total Estimated Time**: 15 minutes  
**Downtime Window**: T+5 to T+12 (7 minutes)

---

## 🔧 **PHASE 1: PRE-MIGRATION CHECKS** (T+0 to T+3)

### 1.1 Environment Validation
```bash
# Verify local database connectivity
PGPASSWORD=fonana_pass psql -h localhost -U fonana_user -d fonana -c "SELECT COUNT(*) FROM users WHERE \"isCreator\" = true;"
# Expected: 56

# Verify production database connectivity  
ssh root@64.20.37.222 "PGPASSWORD=fonana_pass psql -h localhost -U fonana_user -d fonana -c 'SELECT COUNT(*) FROM users;'"
# Expected: 0

# Check disk space on production
ssh root@64.20.37.222 "df -h /var"
# Must have >1GB free
```

### 1.2 Application State Check
```bash
# Verify production app is running
ssh root@64.20.37.222 "pm2 status fonana"
# Should show: online

# Test production API (should be empty)
curl -I http://fonana.me/api/creators
# Expected: 200 OK but empty creators array
```

### 1.3 Backup Production (Safety)
```bash
# Create safety backup of empty production DB
ssh root@64.20.37.222 "
cd /tmp
PGPASSWORD=fonana_pass pg_dump -h localhost -U fonana_user -d fonana -Fc -f fonana_empty_backup.dump
ls -la fonana_empty_backup.dump
"
```

**✅ Phase 1 Success Criteria:**
- [ ] Local DB: 56 creators confirmed
- [ ] Production DB: 0 users confirmed
- [ ] Production app: Running status confirmed
- [ ] Disk space: >1GB available
- [ ] Safety backup: Created successfully

---

## 💾 **PHASE 2: DATA EXPORT** (T+3 to T+5)

### 2.1 Full Database Export (Local)
```bash
cd /tmp

# Export complete database with all data
echo "Starting export at $(date)"
PGPASSWORD=fonana_pass pg_dump \
  -h localhost \
  -U fonana_user \
  -d fonana \
  -Fc \
  --no-owner \
  --no-privileges \
  -f fonana_production_migration.dump

echo "Export completed at $(date)"

# Verify dump file
ls -lh fonana_production_migration.dump
# Should be ~1-5MB for 375 records

# Quick integrity check
pg_restore --list fonana_production_migration.dump | head -10
```

### 2.2 Transfer to Production Server
```bash
# Secure copy to production server
echo "Starting transfer at $(date)"
scp fonana_production_migration.dump root@64.20.37.222:/tmp/

# Verify transfer
ssh root@64.20.37.222 "ls -lh /tmp/fonana_production_migration.dump"
echo "Transfer completed at $(date)"
```

**✅ Phase 2 Success Criteria:**
- [ ] Dump file created successfully (~1-5MB)
- [ ] pg_restore --list shows expected tables
- [ ] File transferred to production server
- [ ] File integrity verified on production

---

## 🛑 **PHASE 3: PRODUCTION PREPARATION** (T+5 to T+7)

### 3.1 Stop Production Application
```bash
# Stop the application to prevent data conflicts
ssh root@64.20.37.222 "
echo 'Stopping application at $(date)'
pm2 stop fonana
pm2 status
"
```

### 3.2 Clear Production Database
```bash
# Clean existing data (should be empty, but safety first)
ssh root@64.20.37.222 "
echo 'Clearing production database at $(date)'
PGPASSWORD=fonana_pass psql -h localhost -U fonana_user -d fonana -c \"
-- Clear all data in correct order (foreign key safe)
DELETE FROM likes;
DELETE FROM comments;  
DELETE FROM subscriptions;
DELETE FROM posts;
DELETE FROM users;
DELETE FROM accounts;
DELETE FROM sessions;

-- Verify cleanup
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'posts', COUNT(*) FROM posts;
\"
"
```

**✅ Phase 3 Success Criteria:**
- [ ] Application stopped (PM2 status: stopped)
- [ ] Production database cleared (0 records in all tables)
- [ ] No foreign key conflicts during cleanup

**⚠️ CRITICAL CHECKPOINT**: Application is now down - proceed quickly to Phase 4

---

## 📥 **PHASE 4: DATA IMPORT** (T+7 to T+10)

### 4.1 Import Database (Production)
```bash
ssh root@64.20.37.222 "
echo 'Starting import at $(date)'
cd /tmp

# Import with verbose output for monitoring
PGPASSWORD=fonana_pass pg_restore \
  -h localhost \
  -U fonana_user \
  -d fonana \
  --verbose \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  fonana_production_migration.dump

echo 'Import completed at $(date)'
"
```

### 4.2 Verify Import Success
```bash
ssh root@64.20.37.222 "
echo 'Verifying import at $(date)'
PGPASSWORD=fonana_pass psql -h localhost -U fonana_user -d fonana -c \"
-- Verify critical data
SELECT 'users' as table_name, COUNT(*) as total_count, 
       COUNT(*) FILTER (WHERE \\\"isCreator\\\" = true) as creators_count
FROM users
UNION ALL
SELECT 'posts', COUNT(*), COUNT(*) FILTER (WHERE \\\"isLocked\\\" = true)
FROM posts
UNION ALL  
SELECT 'subscriptions', COUNT(*), 0 FROM subscriptions;

-- Check foreign key integrity
SELECT COUNT(*) as orphaned_posts 
FROM posts p 
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.\\\"creatorId\\\");
\"
"
```

**✅ Phase 4 Success Criteria:**
- [ ] Import completed without errors
- [ ] Users table: 59 records (56 creators)
- [ ] Posts table: 312 records
- [ ] Foreign key integrity: 0 orphaned posts
- [ ] No constraint violations

---

## ✅ **PHASE 5: VALIDATION & RESTART** (T+10 to T+15)

### 5.1 Restart Production Application
```bash
ssh root@64.20.37.222 "
echo 'Restarting application at $(date)'
pm2 start fonana
sleep 10
pm2 status
"
```

### 5.2 API Validation Tests
```bash
echo "Testing production APIs at $(date)"

# Test creators API
echo "🔸 Testing /api/creators:"
curl -s http://fonana.me/api/creators | jq '.creators | length'
# Expected: 56

# Test posts API  
echo "🔸 Testing /api/posts:"
curl -s http://fonana.me/api/posts | jq '.posts | length'
# Expected: 20 (first page)

# Test homepage
echo "🔸 Testing homepage:"
curl -I http://fonana.me/
# Expected: 200 OK
```

### 5.3 Full Application Test
```bash
# Test key application endpoints
echo "🔸 Testing complete application:"

# Check creators page loads
curl -s http://fonana.me/creators | grep -q "creators" && echo "✅ Creators page OK" || echo "❌ Creators page FAIL"

# Check feed page loads  
curl -s http://fonana.me/feed | grep -q "posts" && echo "✅ Feed page OK" || echo "❌ Feed page FAIL"

# Check dashboard access
curl -s http://fonana.me/dashboard | grep -q "dashboard" && echo "✅ Dashboard OK" || echo "❌ Dashboard FAIL"

echo "Migration validation completed at $(date)"
```

### 5.4 Performance Verification
```bash
# Check response times
echo "🔸 Performance check:"
time curl -s http://fonana.me/api/creators > /dev/null
# Should be <2 seconds

# Check memory usage
ssh root@64.20.37.222 "
pm2 show fonana | grep memory
free -h
"
```

**✅ Phase 5 Success Criteria:**
- [ ] Application restarted successfully (PM2 status: online)
- [ ] `/api/creators` returns 56 creators
- [ ] `/api/posts` returns posts with pagination
- [ ] Homepage loads successfully (200 OK)
- [ ] All key pages accessible
- [ ] Response times <2 seconds
- [ ] No memory issues detected

---

## 🚨 **ROLLBACK PLAN** (If Migration Fails)

### If Import Fails (Phase 4):
```bash
ssh root@64.20.37.222 "
echo 'ROLLBACK: Restoring empty database'
PGPASSWORD=fonana_pass pg_restore \
  -h localhost -U fonana_user -d fonana \
  --clean --create \
  /tmp/fonana_empty_backup.dump

pm2 start fonana
"
```

### If Application Fails (Phase 5):
```bash
ssh root@64.20.37.222 "
echo 'ROLLBACK: Emergency restart sequence'
pm2 stop fonana
pm2 start fonana
pm2 logs fonana --lines 20
"
```

---

## 📊 **SUCCESS METRICS**

### Quantifiable Outcomes:
- **Data Migration**: 375 records transferred successfully
- **API Performance**: `/api/creators` responds in <2 seconds
- **Application Availability**: 99%+ uptime post-migration
- **User Experience**: All pages load successfully
- **Data Integrity**: 100% foreign key compliance

### Functional Validation:
- ✅ Users can see all 56 creators on homepage
- ✅ Posts display correctly with tier access logic
- ✅ Creator profiles show accurate post counts
- ✅ Subscription system works with migrated data
- ✅ Search functionality works with full dataset

---

## 🔄 **POST-MIGRATION TASKS**

### Immediate (Within 1 hour):
- [ ] Monitor application logs for errors
- [ ] Verify media file accessibility
- [ ] Test user authentication flows
- [ ] Check WebSocket connections

### Short-term (Within 24 hours):
- [ ] Set up automated database backups
- [ ] Configure monitoring and alerting
- [ ] Optimize database performance
- [ ] Document production URLs for team

### Long-term (Within 1 week):
- [ ] Implement SSL certificate (HTTPS)
- [ ] Set up CI/CD for future deployments
- [ ] Performance optimization and caching
- [ ] User acceptance testing with stakeholders

---

## ✅ **EXECUTION READINESS CHECKLIST**

- [x] Discovery research completed
- [x] Architecture context analyzed
- [x] Step-by-step plan documented
- [x] Success criteria defined
- [x] Rollback procedures prepared
- [x] Timeline with checkpoints established
- [x] Risk mitigation strategies identified
- [ ] **Ready for execution approval**

**STATUS**: ✅ Solution Plan v1 complete - awaiting user approval for execution 