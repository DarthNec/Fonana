# 🏗️ ARCHITECTURE_CONTEXT: Messenger System Fix 2025-018

## 📅 Дата: 18.01.2025  
## 🎯 Scope: Комплексный анализ архитектуры системы сообщений

## 🔍 CURRENT SYSTEM STATE ANALYSIS

### ✅ **WORKING COMPONENTS** (Validated via Playwright MCP)

#### Frontend Pages Structure:
```
app/messages/
├── layout.tsx ✅ - Loads successfully  
└── page.tsx ✅ - Simple wrapper for MessagesPageClient
```

#### Component Hierarchy (DOUBLE WRAP ISSUE):
```
MessagesLayout: ClientShell → ErrorBoundary →
MessagesPage:   ClientShell → MessagesPageClient  ❌ PROBLEM!
```

#### API Endpoints Status:
- **GET `/api/conversations`**: ✅ **FUNCTIONAL** - Returns `{"error":"No token provided"}`
- **GET `/api/conversations/[id]/messages`**: ❌ **COMPILATION BLOCKED** - Prisma type errors

### ❌ **BROKEN COMPONENTS** (Identified via Playwright MCP)

#### Build System Issues:
- **CSS Generation**: All `/static/css/` files return 404
- **Bundle Chunks**: Some webpack chunks missing
- **Visual Result**: White screen instead of "No conversations yet"

#### Database Schema Problems:
```sql
-- CURRENT BROKEN STATE:
model Conversation {
  id            String    @default(cuid())
  lastMessageAt DateTime?
  @@ignore  ❌ -- Prevents Prisma client usage
}

model Message {
  id             String @id @default(cuid())
  senderId       String  -- No relation to User ❌
  conversationId String  -- No relation to Conversation ❌
}
```

#### Authentication Flow Issues:
- **NextAuth JWT**: Not integrated with messages API
- **WebSocket Auth**: No token passing mechanism
- **API Authorization**: Manual token checks required

## 📊 COMPONENT DEPENDENCY MAPPING

### Frontend Components Flow:
```
MessagesPage
├── ClientShell (auth wrapper)
├── MessagesPageClient 
│   ├── useUser() hook ✅
│   ├── Empty state UI ✅
│   └── No conversation creation logic ❌
```

### API Dependencies:
```
/api/conversations
├── JWT token validation ⚠️ (basic implementation)
├── Prisma user lookup ✅
├── Conversation queries ❌ (@@ignore model)
└── WebSocket integration ❌ (not implemented)

/api/conversations/[id]/messages  
├── Prisma Message queries ⚠️ (works without relations)
├── Manual sender lookup ⚠️ (workaround)
├── Message creation ❌ (compilation blocked)
└── Real-time updates ❌ (WebSocket not integrated)
```

### Database Relationships (CURRENT):
```
Users ←→ Messages: ❌ No direct relation (manual senderId lookup)
Users ←→ Conversations: ❌ No proper many-to-many junction
Conversations ←→ Messages: ❌ Conversation model ignored
```

## 🔄 DATA FLOW PATTERNS

### Authentication Flow:
```
1. User connects Solana wallet ✅
2. NextAuth creates session ✅  
3. JWT token generation ❌ (not configured for API)
4. API token validation ⚠️ (manual implementation)
```

### Message Creation Flow (THEORETICAL):
```
1. User selects conversation ❌ (no UI)
2. Frontend sends message ❌ (no API integration)
3. API validates user ❌ (JWT missing)
4. Database saves message ❌ (compilation blocked)
5. WebSocket broadcasts ❌ (not implemented)
6. UI updates ❌ (no real-time)
```

### Current User Experience:
```
1. Navigate to /messages ✅
2. Page loads white screen ❌ (CSS missing)
3. Should show "No conversations yet" ✅ (component exists)
4. No way to create conversations ❌ (no UI/API)
```

## 🎯 INTEGRATION POINTS

### Working Integration Examples (For Reference):
- **Posts System**: ✅ Full CRUD with proper Prisma relations
- **Subscriptions**: ✅ JWT auth + payment processing
- **User Management**: ✅ NextAuth + Solana wallet integration

### Messages System Integration Points:
- **Authentication**: ❌ Not integrated with NextAuth JWT
- **Database**: ❌ Schema inconsistencies prevent proper queries
- **Real-time**: ❌ WebSocket server exists but no JWT integration
- **UI/UX**: ❌ Double ClientShell wrap prevents rendering

## 🔧 TECHNICAL DEBT ANALYSIS

### Critical Technical Debt:
1. **Prisma Schema Design**: Conversation model ignored, missing relations
2. **API Compilation**: TypeScript errors block build process
3. **Component Architecture**: Double wrapper pattern
4. **Authentication Integration**: Manual JWT handling instead of NextAuth integration

### Performance Implications:
- **Database Queries**: Manual user lookups instead of JOIN operations
- **Build Time**: Compilation errors slow development
- **Runtime**: Double component wrapping affects rendering
- **Real-time**: No WebSocket = polling required

### Maintenance Complexity:
- **Schema Evolution**: @@ignore prevents normal Prisma workflows
- **Type Safety**: Manual relations break TypeScript inference
- **Testing**: Compilation errors prevent proper testing
- **Debugging**: Multiple failure points obscure root causes

## 📋 DEPENDENCY REQUIREMENTS

### Current Dependencies Status:
- **Prisma ORM**: ✅ Installed, ❌ Schema inconsistent
- **NextAuth**: ✅ Configured for Solana, ❌ No JWT for API
- **Heroicons**: ✅ Used correctly in MessagesPageClient
- **WebSocket Server**: ✅ Exists, ❌ No JWT integration

### Missing Dependencies:
- **JWT token generation**: NextAuth JWT callbacks
- **Real-time client**: WebSocket client library integration
- **Message UI components**: Chat interface, message composer
- **File upload**: Media sharing capabilities

## 🔄 SYSTEM INTERACTIONS

### Cross-System Dependencies:
```
Messages System ←→ User System: ✅ Via useUser() hook
Messages System ←→ Auth System: ❌ JWT integration missing  
Messages System ←→ WebSocket: ❌ No authentication bridge
Messages System ←→ Notifications: ⚠️ Basic API exists
```

### External Integrations Required:
- **Solana Wallet**: For user identity
- **File Storage**: For media messages  
- **Push Notifications**: For real-time alerts
- **Rate Limiting**: For spam prevention

## 🏆 SUCCESS CRITERIA FOR FIXES

### Technical Success Metrics:
- [ ] **Compilation**: `npm run build` succeeds without errors
- [ ] **Page Rendering**: `/messages` shows proper UI (not white screen)
- [ ] **API Functionality**: All message endpoints return valid responses
- [ ] **Database Relations**: Proper Prisma relations with type safety

### User Experience Success Metrics:
- [ ] **Page Load**: Messages page renders in <2 seconds
- [ ] **Conversation Creation**: User can start new conversations
- [ ] **Message Sending**: Basic message functionality works
- [ ] **Real-time Updates**: Messages appear instantly (WebSocket)

### Enterprise Readiness Metrics:
- [ ] **Type Safety**: 100% TypeScript coverage for messages
- [ ] **Error Handling**: Graceful degradation when WebSocket fails
- [ ] **Authentication**: Secure JWT-based API access
- [ ] **Performance**: <200ms API response times

## 🎯 ARCHITECTURAL RECOMMENDATIONS

### Database Schema Redesign:
```sql
-- RECOMMENDED FUTURE STATE:
model Conversation {
  id            String    @id @default(cuid())
  participants  User[]    @relation("UserConversations")
  messages      Message[]
  lastMessageAt DateTime?
  createdAt     DateTime  @default(now())
  -- Remove @@ignore
}

model Message {
  id           String       @id @default(cuid())
  conversation Conversation @relation(fields: [conversationId], references: [id])
  sender       User         @relation(fields: [senderId], references: [id])
  content      String?
  createdAt    DateTime     @default(now())
}
```

### Authentication Integration:
```typescript
// NextAuth JWT callback configuration
callbacks: {
  jwt: async ({ token, user }) => {
    if (user) token.userId = user.id
    return token
  }
}
```

### Component Structure Fix:
```tsx
// Remove double ClientShell wrap
app/messages/layout.tsx: <ErrorBoundary> only
app/messages/page.tsx: <ClientShell><MessagesPageClient /></ClientShell>
```

---
**Created**: 2025-01-18  
**Status**: ✅ Complete - Ready for Solution Plan  
**Methodology**: Ideal M7 - Phase 1 (Architecture Context)  
**Next Phase**: Solution Plan with selected approach 