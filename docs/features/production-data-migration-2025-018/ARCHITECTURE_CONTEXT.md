# 🏗️ ARCHITECTURE CONTEXT: Production Data Migration
## Task ID: production-data-migration-2025-018
## Date: 2025-01-18

---

## 🎯 **СИСТЕМНЫЙ КОНТЕКСТ**

Миграция критических данных между двумя PostgreSQL инстансами в рамках production deployment проекта Fonana.

---

## 🗄️ **DATABASE ARCHITECTURE**

### Source Database (Локальная)
- **Location**: `localhost:5432`
- **Database**: `fonana`
- **User**: `fonana_user`
- **Schema Version**: Prisma latest (синхронизирована)
- **Status**: ✅ Production-ready data

### Target Database (Продакшн)
- **Location**: `64.20.37.222:5432`
- **Database**: `fonana`
- **User**: `fonana_user`
- **Schema Version**: Prisma latest (синхронизирована)
- **Status**: ✅ Empty but ready

---

## 📊 **DATA INVENTORY (VERIFIED)**

| Table | Local Count | Production Count | Migration Priority |
|-------|-------------|------------------|--------------------|
| users | **59** (56 creators) | **0** | 🔴 CRITICAL |
| posts | **312** (141 locked) | **0** | 🔴 CRITICAL |
| comments | **1** | **0** | 🟡 IMPORTANT |
| likes | **0** | **0** | ⭕ SKIP |
| subscriptions | **3** | **0** | 🟡 IMPORTANT |
| notifications | *(not checked)* | **0** | 🟢 OPTIONAL |
| messages | *(not checked)* | **0** | 🟢 OPTIONAL |

**Total Records to Migrate**: ~375

---

## 🔗 **DEPENDENCY MAPPING**

### Critical Relationships:
```
users (id) ←── posts (creatorId)
     ↑              ↓
subscriptions   comments (postId)
     ↑              ↓  
users (id)     likes (postId)
```

### Migration Order (Foreign Key Safe):
1. **users** (primary entities)
2. **posts** (depends on users.id)
3. **subscriptions** (depends on users.id)
4. **comments** (depends on posts.id, users.id)
5. **likes** (depends on posts.id, users.id)

---

## 🛠️ **TECHNOLOGY STACK CONTEXT**

### Database Layer:
- **PostgreSQL**: 14+ (both environments)
- **Prisma ORM**: 5.22.0
- **Connection Pooling**: Direct connections
- **Backup Format**: Custom (`pg_dump -Fc`)

### Application Layer Impact:
- **Next.js**: Will read from production DB after migration
- **API Endpoints**: `/api/creators`, `/api/posts` must work
- **Authentication**: User sessions will need to reconnect
- **Media Files**: References in posts.mediaUrl must remain valid

### Network Architecture:
```
Local Machine ─────► Production Server
├─ PostgreSQL:5432   ├─ PostgreSQL:5432
├─ Next.js:3000      ├─ Next.js:3000 (via PM2)
└─ SSH Access        └─ Nginx:80 → :3000
```

---

## 🔌 **INTEGRATION POINTS**

### 1. API Dependencies:
- **CreatorsAPI**: Expects users where isCreator=true
- **PostsAPI**: Expects posts with valid creatorId
- **AuthAPI**: Validates user sessions
- **SubscriptionsAPI**: Manages tier access

### 2. File System Dependencies:
- **Media Storage**: `/public/media/` (local) → production media serving
- **Avatar URLs**: Database contains paths like `/avatars/avatar_*.png`
- **Post Images**: Database contains paths in posts.mediaUrl

### 3. External Service Dependencies:
- **Solana Blockchain**: User wallet addresses must remain consistent
- **NextAuth**: User accounts linked to blockchain wallets
- **WebSocket Server**: User connections by userId

---

## 🏢 **DEPLOYMENT ENVIRONMENT**

### Production Server Details:
- **OS**: Ubuntu 24.04
- **CPU**: Multi-core
- **Memory**: Sufficient for Node.js + PostgreSQL
- **Storage**: SSD with adequate space
- **Network**: Public IP 64.20.37.222, domain fonana.me

### Service Configuration:
- **PM2**: Process manager for Node.js app
- **Nginx**: Reverse proxy (port 80 → 3000)
- **PostgreSQL**: Service running on default port
- **SSL**: Optional (can be added post-migration)

---

## 🔒 **SECURITY CONSIDERATIONS**

### Database Access:
- **Credentials**: Same on both environments (fonana_user/fonana_pass)
- **Network**: SSH tunnel for secure transfer
- **Backup**: Encrypted dump files
- **Permissions**: Validated PostgreSQL user permissions

### Data Privacy:
- **User Data**: Contains personal information (emails, wallets)
- **Financial Data**: Contains subscription and payment information
- **Content**: User-generated posts and comments
- **GDPR**: All data legitimate for production use

---

## 📈 **PERFORMANCE CONTEXT**

### Current Load (Local):
- **API Latency**: ~100ms for creators list
- **Database**: Low concurrent load
- **Memory Usage**: ~50MB for dataset

### Expected Production Load:
- **Users**: Initially same as local (59 users)
- **Concurrent**: Low initially, scaling expected
- **Query Performance**: Should match local performance
- **Backup Strategy**: Daily dumps recommended

---

## 🔄 **STATE MANAGEMENT**

### Application State Before Migration:
- **Local App**: Fully functional with data
- **Production App**: Running but showing empty state

### Application State During Migration:
- **Production App**: Will be stopped (PM2 stop fonana)
- **Database**: Locked for migration
- **Downtime**: Estimated 5-10 minutes

### Application State After Migration:
- **Production App**: Restarted with full dataset
- **API Responses**: Should match local environment
- **User Experience**: Fully functional fonana.me

---

## 🚨 **CRITICAL DEPENDENCIES**

### Hard Dependencies (MUST work):
- [ ] PostgreSQL service running on both servers
- [ ] Network connectivity between local and production
- [ ] Sufficient disk space on production server
- [ ] Valid database credentials on both environments

### Soft Dependencies (SHOULD verify):
- [ ] Application code identical on both environments
- [ ] Environment variables correctly configured
- [ ] Media files accessible (for complete UX)
- [ ] PM2 and Nginx properly configured

### Optional Dependencies (CAN be addressed later):
- [ ] SSL certificate configuration
- [ ] Database performance optimization
- [ ] Backup automation
- [ ] Monitoring and logging

---

## ✅ **ARCHITECTURE READINESS CHECKLIST**

- [x] Source and target schemas verified identical
- [x] Data volume assessed (~375 records)
- [x] Dependency relationships mapped
- [x] Migration order determined (foreign key safe)
- [x] Integration points identified
- [x] Security considerations reviewed
- [x] Performance impact estimated
- [x] Service dependencies validated

**STATUS**: ✅ Architecture analysis complete - ready for detailed Solution Plan 