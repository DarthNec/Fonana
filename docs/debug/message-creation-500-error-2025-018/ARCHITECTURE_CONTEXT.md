# 🏗️ ARCHITECTURE CONTEXT: Message Creation 500 Error

## 🔄 КОМПОНЕНТЫ И ПОТОК ДАННЫХ

### Frontend Flow
```
CreatorPageClient.tsx
├── handleStartConversation()
├── jwtManager.getToken()
├── POST /api/conversations
└── router.push(/messages/[id])
```

### Backend Flow
```
/api/conversations/route.ts (POST)
├── JWT Verification (jwt.verify)
├── Request Body Parsing
├── User Lookup (Prisma)
├── Existing Conversation Check (Raw SQL)
├── Conversation Creation (Prisma)
├── Participants Addition (Raw SQL)
└── Response Formation
```

### Database Schema Relations
```
users (id, wallet, nickname, fullName, ...)
  ↓
Conversation (id, createdAt, updatedAt)
  ↓
_UserConversations (many-to-many relation)
  ├── "A" (conversationId) → Conversation.id
  └── "B" (userId) → users.id
```

## 🔗 ЗАВИСИМОСТИ И ВЕРСИИ

### Core Dependencies
- **Next.js**: 14.1.0 (API routes)
- **Prisma**: ^5.x (ORM + Raw SQL)
- **jsonwebtoken**: JWT verification
- **PostgreSQL**: Database backend

### Authentication Chain
```
Solana Wallet → NextAuth → JWT Token → API Verification
```

### JWT Flow
1. **Token Generation**: `/api/auth/wallet` creates JWT with `userId`
2. **Token Storage**: `jwtManager` stores in memory
3. **Token Usage**: All protected API routes verify token
4. **Token Verification**: `jwt.verify(token, ENV.NEXTAUTH_SECRET)`

## 🛠️ ИНТЕГРАЦИОННЫЕ ТОЧКИ

### Frontend → Backend Integration
- **jwtManager.getToken()**: Retrieves stored JWT
- **Authorization header**: `Bearer ${token}` format
- **Error handling**: Toast notifications for failures

### Backend → Database Integration  
- **Prisma Client**: Standard ORM operations
- **Raw SQL Queries**: Complex relationship queries
- **Foreign Key Constraints**: _UserConversations table

### Raw SQL Usage Points
1. **Existing conversation check**:
   ```sql
   SELECT c1."A" FROM "_UserConversations" c1
   INNER JOIN "_UserConversations" c2 ON c1."A" = c2."A"
   WHERE c1."B" = $userId AND c2."B" = $participantId
   ```

2. **Participants insertion**:
   ```sql
   INSERT INTO "_UserConversations" ("A", "B")
   VALUES ($conversationId, $userId), ($conversationId, $participantId)
   ```

3. **Participants retrieval**:
   ```sql
   SELECT u.* FROM users u WHERE u.id IN ($userId, $participantId)
   ```

## ⚡ ПАТТЕРНЫ АРХИТЕКТУРЫ

### Error Handling Pattern
```javascript
try {
  // Operation
} catch (error) {
  console.error('Details:', error)
  return NextResponse.json({ error: 'Message' }, { status: 500 })
}
```

### JWT Verification Pattern
```javascript
const authHeader = request.headers.get('authorization')
if (!authHeader?.startsWith('Bearer ')) {
  return 401
}
const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
```

### Database Query Pattern
```javascript
// Standard Prisma
const user = await prisma.user.findUnique({ where: { id } })

// Raw SQL for complex relations
const result = await prisma.$queryRaw`SELECT ... FROM ...`
```

## 🚨 КРИТИЧЕСКИЕ СВЯЗИ

### User Authentication Dependencies
- **NEXTAUTH_SECRET**: Must match between auth creation and verification
- **JWT Payload**: Must contain `userId` field
- **Token Expiry**: Must be valid during API call

### Database Constraints
- **Foreign Keys**: _UserConversations.B → users.id
- **Unique Constraints**: Conversation participant uniqueness
- **Connection Pool**: Prisma client connection limits

### Next.js Runtime Dependencies
- **Environment Variables**: Must be loaded correctly
- **Prisma Client**: Must be initialized
- **Database Connection**: PostgreSQL must be accessible

## 🔍 ПОТЕНЦИАЛЬНЫЕ ТОЧКИ ОТКАЗА

### JWT Verification Issues
- ❌ **NEXTAUTH_SECRET mismatch**: Different keys between creation/verification
- ❌ **Token format**: Invalid Bearer token format
- ❌ **Token expiry**: Expired JWT tokens
- ❌ **Missing userId**: JWT payload missing required fields

### Database Issues  
- ❌ **Connection failure**: PostgreSQL not accessible
- ❌ **Query syntax**: Raw SQL syntax errors
- ❌ **Foreign key violations**: Invalid user IDs
- ❌ **Transaction deadlocks**: Concurrent conversation creation

### Environment Issues
- ❌ **Missing ENV vars**: NEXTAUTH_SECRET not loaded
- ❌ **Prisma client**: Not properly initialized
- ❌ **Database URL**: Invalid connection string

## 📊 КОМПОНЕНТНАЯ ДИАГРАММА

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Next.js API    │    │   PostgreSQL    │
│                 │    │                  │    │                 │
│ CreatorPage     │───▶│ /api/conversations│───▶│ users           │
│ jwtManager      │    │ JWT verification │    │ Conversation    │
│ handleStart...  │    │ Prisma queries   │    │ _UserConversations│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Error Handling  │    │ Error Logging    │    │ Constraint      │
│ Toast Messages  │    │ Console Output   │    │ Validation      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🎯 АНАЛИЗ ТЕКУЩЕЙ ПРОБЛЕМЫ

### Observed Symptoms
- ✅ **JWT token found**: "[JWT] Valid token found in memory"
- ❌ **500 Error**: POST /api/conversations returns server error
- ❌ **No detailed error**: Generic 500 without specifics

### Expected Flow vs Actual
**Expected**: Token → Verification → DB Queries → Success Response
**Actual**: Token → ??? → 500 Error

### Missing Information
- 🔍 **Server logs**: Need to see console output with new logging
- 🔍 **DB state**: Verify users exist and DB connectivity
- 🔍 **Token payload**: Verify JWT contains correct userId
- 🔍 **Environment**: Verify NEXTAUTH_SECRET and DATABASE_URL

## 📝 СЛЕДУЮЩИЕ ШАГИ АНАЛИЗА

1. **Test endpoint directly**: Reproduce with curl/Postman
2. **Check server logs**: Monitor console output during request
3. **Verify DB connectivity**: Test Prisma connection
4. **Validate JWT payload**: Decode token contents  
5. **Check user existence**: Verify both users exist in DB 