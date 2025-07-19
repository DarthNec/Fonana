# ARCHITECTURE CONTEXT: Multiple Critical Platform Issues 2025-018

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

### Component Dependency Flow
```
User Authentication (Solana Wallet) 
    ↓
NextAuth Session Management
    ↓
JWT Token Generation (❌ BROKEN)
    ↓
API Authentication Layer
    ↓
Database Operations (PostgreSQL + Prisma)
    ↓
Frontend Components (React/Next.js)
```

## 🔍 AFFECTED COMPONENT ANALYSIS

### 1. Avatar System (`components/Avatar.tsx`)
**Dependencies:**
- `useState`, `useEffect` from React
- User data from `useAppStore` 
- DiceBear fallback generator
- `/media/avatars/` directory structure

**Current Issues:**
- Fallback logic preventing real avatar display
- Validation checks too restrictive
- Cache busting not working effectively

**Data Flow:**
```
useUser() → Avatar component → src validation → DiceBear fallback
```

### 2. Dashboard Components (`components/DashboardPageClient.tsx`)
**Dependencies:**
- Router (`useRouter` from `next/navigation`)
- Authentication state (`useUser`)
- Heroicons v2 (❌ BREAKING CHANGES)
- Toast notifications (`use-toast`)

**Current Issues:**
- Quick Actions routing not implemented
- Analytics page crashes on navigation
- Heroicons import errors causing compilation failures

**Data Flow:**
```
User state → Dashboard sections → Quick Actions → Route navigation
```

### 3. Media Gallery System (❌ **NOT IMPLEMENTED**)
**Expected Dependencies:**
- Creator page integration
- Post filtering by media type
- Modal navigation system
- Image optimization (`next/image`)

**Missing Components:**
- `PostGallery.tsx` for grid layout
- `MediaViewerModal.tsx` for modal navigation
- Integration with existing `PostsContainer.tsx`

### 4. Analytics System (`app/dashboard/analytics/page.tsx`)
**Dependencies:**
- Heroicons v2 (❌ BROKEN IMPORTS)
- Authentication (`useUser`)
- Router (`useRouter`)
- Simulated data generation

**Critical Errors:**
- `TrendingUpIcon`/`TrendingDownIcon` не экспортируются
- Должны быть `ArrowTrendingUpIcon`/`ArrowTrendingDownIcon`

### 5. Messages System (`app/messages/`)
**Dependencies:**
- JWT tokens (❌ NOT GENERATED)
- WebSocket connection (`ws://localhost:3002`)
- Conversations API (`/api/conversations`)
- Real-time communication

**Architecture Gap:**
```
NextAuth Session → (❌ MISSING) JWT Generation → API Authentication → Messages
```

## 🔄 DATA FLOW PATTERNS

### Authentication Flow (❌ BROKEN)
```
1. Solana Wallet Connect
2. NextAuth Session Creation  
3. (❌ MISSING) JWT Token Generation
4. API Request Authentication
5. Database Operations
```

### Avatar Upload Flow (❌ BROKEN)
```
1. File Selection
2. API Call `/api/upload/avatar` 
3. (❌ WRONG PATH) Save to `/public/avatars/`
4. Database Update
5. Frontend Re-render
```

### Media Gallery Flow (❌ NOT IMPLEMENTED)
```
1. Creator Page Load
2. Filter Posts by Type
3. Grid Layout Render
4. Modal Navigation
5. Image Optimization
```

## 🗃️ DATABASE SCHEMA DEPENDENCIES

### Key Tables:
- `users` (avatar, nickname, fullName)
- `posts` (type, mediaUrl, thumbnail)
- `conversations` (for messages)
- `subscriptions` (for tier management)

### Schema Mismatches:
- Frontend expects `name`, `username` fields
- Database has `nickname`, `fullName`
- PostNormalizer service bridges gaps

## 🔧 INTEGRATION POINTS

### API Layer:
- `/api/user` - User data retrieval
- `/api/upload/avatar` - Avatar upload (❌ wrong path)
- `/api/upload/background` - Background upload  
- `/api/conversations` - Messages (❌ requires JWT)
- `/api/creators` - Creator data (✅ working)
- `/api/posts` - Post data (✅ working)

### External Services:
- **Solana Wallet (Phantom)** - Authentication
- **PostgreSQL** - Data storage
- **DiceBear** - Avatar fallback generation
- **WebSocket Server** - Real-time communication (❌ not connected)

## 📦 PACKAGE DEPENDENCIES

### Critical Dependencies:
```json
{
  "next": "14.1.0",
  "@heroicons/react": "^2.x", 
  "next-auth": "^4.x",
  "prisma": "^5.x",
  "@solana/wallet-adapter-react": "^0.x"
}
```

### Version Conflicts:
- Heroicons v1 syntax in codebase 
- Heroicons v2 installed in package.json
- Migration script needed for icon names

## 🌐 NETWORK ARCHITECTURE

### Frontend (Next.js App):
- Port: 3000
- SSR + Client-side routing
- API routes for backend communication

### WebSocket Server:
- Port: 3002
- Real-time communication
- JWT authentication required (❌ not working)

### Database:
- PostgreSQL: `localhost:5432`
- Connection: `fonana_user:fonana_pass@localhost:5432/fonana`

## 🔗 SERVICE INTEGRATIONS

### Authentication Chain:
```
Phantom Wallet → NextAuth → (❌ JWT Missing) → API Auth → Database
```

### File Upload Chain:
```
Frontend Upload → API Route → (❌ Wrong Path) File System → Database Update
```

### Real-time Communication:
```
Frontend → (❌ No JWT) WebSocket → Database Events → Broadcast
```

## ⚠️ ARCHITECTURAL RISKS

### 🔴 **Critical Dependencies:**
1. **JWT Token Generation** - Blocks messages, some API calls
2. **Heroicons Migration** - Blocks analytics compilation
3. **File Upload Paths** - Avatar/background uploads fail

### 🟡 **Major Dependencies:**
1. **Media Gallery System** - Complete redesign needed
2. **Dashboard UX Quality** - User experience degraded
3. **WebSocket Stability** - Real-time features disabled

### 🟢 **Minor Dependencies:**
1. **Navigation Polish** - Quick Actions implementation
2. **Error Handling** - Better user feedback
3. **Performance Optimization** - Loading states

## 🔍 COMPONENT RELATIONSHIP MAP

```
NextAuth Session
    ├── Navbar.tsx (❌ Avatar display)
    ├── DashboardPageClient.tsx (❌ Quick Actions)
    │   ├── UserSubscriptions.tsx (✅ Working)
    │   ├── SubscriptionTiersSettings.tsx (✅ Working)
    │   └── Analytics Link (❌ Heroicons error)
    ├── MessagesPageClient.tsx (❌ No JWT)
    └── CreatorPageClient.tsx (❌ Media gallery missing)
```

## ✅ ARCHITECTURE CHECKLIST

- [x] **Все связи учтены?** - Маппинг зависимостей завершен
- [x] **Есть ли скрытые зависимости?** - JWT token gap выявлен
- [x] **Database schema documented?** - Несоответствия выявлены  
- [x] **API endpoints mapped?** - Рабочие и проблемные определены
- [x] **Package versions analyzed?** - Heroicons v1→v2 conflict найден
- [x] **Integration points identified?** - Auth chain gap обнаружен
- [x] **Service dependencies clear?** - WebSocket auth issue понятен

---
**Created**: 2025-01-18
**Status**: ✅ Complete - Architecture Analysis  
**Methodology**: Ideal M7 - Phase 1 (Architecture Context) 