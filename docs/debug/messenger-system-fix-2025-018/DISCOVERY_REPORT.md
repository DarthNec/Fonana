# 🔍 DISCOVERY REPORT: Messenger System Fix 2025-018

## 📅 Дата: 18.01.2025
## 🎯 Проблема: Комплексные проблемы системы сообщений Fonana

## 🚨 ПОЛЬЗОВАТЕЛЬСКАЯ ПРОБЛЕМА
**Описание**: "Messages - No conversations yet" - система сообщений не работает
**Симптомы**: 
- Страница `/messages` показывает пустое состояние
- Нет возможности создать разговор
- API может падать с ошибками типов

## 🔍 INITIAL INVESTIGATION

### Context7 Technology Stack Analysis ✅ **STARTED**

#### **Prisma ORM** - КРИТИЧЕСКИЕ НАХОДКИ:
- **Model Conversation**: ❌ Помечена как `@@ignore` в схеме
- **Model Message**: ✅ Активна, но без связи sender
- **Связи**: Отсутствуют critical relations между User ↔ Message ↔ Conversation

#### **Next.js API Routes** - Статус проверяется:
- `/api/conversations` - требует JWT токены
- `/api/conversations/[id]/messages` - содержит Prisma type errors 
- Authentication flow с NextAuth

#### **WebSocket Integration** - Требует исследования:
- JWT token generation для real-time messages
- Message broadcasting между участниками

### Обнаруженные проблемы на первом этапе:
1. **Prisma Schema Inconsistency**: `Conversation` model с `@@ignore`
2. **Missing Relations**: No `sender` relation in Message model  
3. **API Type Errors**: Compilation fails на messages endpoints
4. **Authentication Gap**: JWT tokens не генерируются для API
5. **Frontend Integration**: Messages page может не обрабатывать empty state

## 🎭 PLAYWRIGHT MCP EXPLORATION PLAN

### Phase 1: Messages Page Navigation
1. Navigate to `/messages` 
2. Capture current UI state и error messages
3. Check console для JavaScript errors
4. Analyze network requests to API endpoints

### Phase 2: API Endpoints Testing  
1. Test `/api/conversations` с и без JWT tokens
2. Test conversation creation flow
3. Capture API response structures
4. Identify authentication requirements

### Phase 3: Database State Analysis
1. Check current state of conversations table
2. Verify message records и relationships
3. Test Prisma client availability для different models

### Phase 4: Real-time Features Investigation
1. Check WebSocket connection attempts
2. Verify JWT token availability in browser
3. Test message broadcasting capabilities

## 📚 EXISTING SOLUTION ANALYSIS

### Internal Working Patterns:
- **Main feed**: ✅ Successfully loads posts using proper API patterns
- **Subscription system**: ✅ Works with JWT authentication  
- **User management**: ✅ Proper NextAuth integration
- **File uploads**: ✅ Working avatar/media upload patterns

### Internal Anti-Patterns (Messages specific):
- **Conversation model**: ❌ `@@ignore` prevents Prisma client usage
- **Missing sender relation**: ❌ Manual user lookup required
- **API route compilation**: ❌ TypeScript errors block builds
- **JWT integration**: ❌ Messages system не интегрирован с NextAuth

### External Best Practices Research:
#### **Modern Chat Systems**:
- **Database Design**: User ↔ Conversation ↔ Message with proper relations
- **Real-time Messaging**: WebSocket + JWT authentication patterns
- **Message Threading**: Conversation-based grouping with participants
- **State Management**: Optimistic updates + sync reconciliation

#### **Prisma Chat Patterns**:
- **Many-to-many**: Users ↔ Conversations through junction table
- **Message Relations**: Direct foreign keys to User + Conversation
- **Soft Deletes**: Archive conversations instead of hard delete
- **Indexing Strategy**: Conversation participants + message timestamps

## 🛠️ POTENTIAL APPROACHES (Minimum 3)

### Approach 1: **Database-First Schema Fix**
- **Strategy**: Fix Prisma schema, add proper relations, migrate database
- **Pros**: Solves root cause, enables proper TypeScript types, standard patterns
- **Cons**: Requires database migration, potential data loss risk
- **Implementation**: Schema redesign → migration → API updates → frontend integration

### Approach 2: **API-Layer Workaround with Manual Relations**  
- **Strategy**: Keep current schema, manually handle relations in API layer
- **Pros**: No database changes, faster implementation, lower risk
- **Cons**: Technical debt, manual joins, performance implications
- **Implementation**: Remove @@ignore → manual user lookups → type-safe API layer

### Approach 3: **Complete Messages Rebuild with Modern Architecture**
- **Strategy**: Redesign entire messaging system with proper patterns
- **Pros**: Enterprise-grade solution, scalable, maintainable
- **Cons**: Higher complexity, longer implementation time
- **Implementation**: New schema design → real-time architecture → modern UI patterns

## 🧪 ISOLATED SANDBOX EXPERIMENTS

### Experiment 1: Prisma Schema Validation
```typescript
// Test if removing @@ignore breaks other parts
model Conversation {
  id            String    @id @default(cuid())
  participants  User[]    @relation("UserConversations")  
  messages      Message[]
  lastMessageAt DateTime?
  createdAt     DateTime  @default(now())
  // Remove @@ignore and test impact
}
```

### Experiment 2: Manual Relation Handling
```typescript
// Test manual user lookup pattern
const messages = await prisma.message.findMany({ where: { conversationId } })
const senderIds = [...new Set(messages.map(m => m.senderId))]
const senders = await prisma.user.findMany({ where: { id: { in: senderIds } } })
// Verify performance implications
```

### Experiment 3: JWT Token Availability
```typescript
// Test NextAuth JWT generation for API
import { getToken } from 'next-auth/jwt'
const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
console.log('JWT available for messages:', !!token)
```

## 🌐 BROWSER AUTOMATION FINDINGS
*[Will be populated during Playwright MCP exploration]*

### Navigation Screenshots
- Messages page current state: [pending]
- Console errors: [pending]  
- Network request failures: [pending]
- Database state verification: [pending]

### Performance Metrics
- Page load times: [pending]
- API response times: [pending]
- Error rates: [pending]
- User experience flow: [pending]

## ✅ DISCOVERY CHECKLIST

- [ ] **Context7 выполнен?** - Prisma, Next.js, WebSocket patterns исследованы
- [ ] **Минимум 3 альтернативы?** - Database-first, API-layer, Complete rebuild
- [ ] **Precedents analyzed?** - Working patterns (feed, subscriptions) identified
- [ ] **Browser exploration planned?** - Playwright MCP scenarios defined
- [ ] **Root cause identified?** - Prisma schema inconsistencies + missing relations
- [ ] **Working examples found?** - Successful API patterns for reuse
- [ ] **Anti-patterns documented?** - Current broken messaging implementation

## 🎯 NEXT STEPS

1. **Complete Playwright MCP exploration** - Navigate to messages, capture state
2. **Create ARCHITECTURE_CONTEXT.md** - Map entire messaging system architecture
3. **Select optimal approach** - Choose between 3 strategies based on findings
4. **Proceed with SOLUTION_PLAN.md** - Detail implementation with chosen approach

---
**Created**: 2025-01-18  
**Status**: ⏳ In Progress - Discovery Phase  
**Methodology**: Ideal M7 - Phase 0 (Discovery Report)  
**Problem Category**: Critical Infrastructure - Messaging System 