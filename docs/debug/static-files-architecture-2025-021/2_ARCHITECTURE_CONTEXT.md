# 🏗️ М7 ARCHITECTURE CONTEXT: Current System Analysis

## 📅 Дата: 21.01.2025
## 🏷️ ID: [static_files_architecture_2025_021]
## 🎯 Анализ: **Текущая архитектура доступа к медиа файлам**
## 🚀 Методология: IDEAL METHODOLOGY (М7) - Phase 2: Architecture

---

## 🔍 **ТЕКУЩАЯ АРХИТЕКТУРА**

### **1. Upload Flow:**
```
User Upload → /api/posts/upload → Sharp Processing → Save to /public/posts/images/
                                          ↓
                                   WebP optimization
                                          ↓
                                   Database: mediaUrl + thumbnail
```

### **2. Access Control System:**

#### **Tier Hierarchy:**
```typescript
enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip'
}
```

#### **Post Access Logic:**
```typescript
// From logs analysis
checkPostAccess(post, user) {
  // 1. Author always has access
  if (post.creatorId === user.id) return true
  
  // 2. Free posts
  if (!post.isLocked && !post.minSubscriptionTier) return true
  
  // 3. Tier-based access
  if (post.minSubscriptionTier) {
    return userTier >= post.minSubscriptionTier
  }
  
  // 4. Paid posts
  if (post.isLocked) {
    return hasPurchased(post.id, user.id)
  }
}
```

### **3. Current File Serving:**
```
Request: /posts/images/file.webp
    ↓
Next.js Static Handler
    ↓
Check public/ directory (cached at startup)
    ↓
Return file OR 404
```

### **4. Components & Dependencies:**

#### **Upload Components:**
- `app/api/posts/upload/route.ts` - main upload handler
- `app/api/upload/route.ts` - general file upload
- Sharp library - image optimization
- File system writes to public/

#### **Access Components:**
- `app/api/posts/route.ts` - checks access for posts
- `lib/services/subscription.ts` - tier checking
- `lib/services/post-access.ts` - access logic

#### **Frontend Components:**
- `components/posts/` - display logic
- `lib/hooks/useOptimizedPosts.ts` - data fetching
- Next.js Image component - optimization

### **5. Database Schema:**

```sql
posts table:
- id
- creatorId
- mediaUrl (path to file)
- thumbnail (path to WebP)
- isLocked (boolean)
- minSubscriptionTier (enum)
- price (for paid posts)

subscriptions table:
- userId
- creatorId  
- tier
- status
```

### **6. Security Requirements:**

**Must protect:**
- Premium/VIP tier content
- Paid posts
- Creator exclusive content

**Must allow:**
- Free posts access
- Author access to own content
- Proper tier hierarchy

---

## 🔗 **INTEGRATION POINTS**

### **Critical paths:**
1. Upload API → File System → Database
2. Frontend → API → Access Check → File Serve
3. CDN/Cache → Origin Server → File

### **Dependencies:**
- Next.js static file serving
- PM2 process management
- Nginx reverse proxy
- PostgreSQL database

---

## ⚠️ **CONSTRAINTS**

### **Technical:**
- Next.js caches public/ at startup
- Cannot use direct Nginx serving (breaks security)
- Must maintain WebP optimization
- Must support large files (videos)

### **Business:**
- Zero downtime requirement
- Instant file availability
- Maintain monetization model
- Audit trail for premium content

---

## 🎯 **KEY INSIGHTS**

1. **Current architecture assumes static public/ folder**
2. **No mechanism for dynamic file authorization**
3. **PM2 restart is a workaround, not solution**
4. **Need to separate public vs protected content**
5. **API route can maintain all security checks**

---

## ✅ **ARCHITECTURE CHECKLIST**

- [x] All components mapped
- [x] Data flow documented
- [x] Security requirements clear
- [x] Integration points identified
- [x] Constraints understood
- [x] Dependencies listed 