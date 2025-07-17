# System Patterns: Fonana

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   Next.js       │◄──►│   API Routes    │◄──►│   PostgreSQL    │
│   (Port 3000)   │    │   Prisma ORM    │    │   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       
         │              ┌─────────────────┐              
         └──────────────►│   WebSocket     │              
                        │   Server        │              
                        │   (Port 3002)   │              
                        └─────────────────┘              
```

### Database Architecture

#### Core Tables Structure
- **users**: Creator and subscriber profiles
- **posts**: Content with monetization tiers
- **subscriptions**: Creator-subscriber relationships
- **transactions**: Payment records
- **notifications**: Real-time user alerts
- **messages/conversations**: Direct messaging

#### Critical Schema Issues ⚠️
- **Missing Fields**: Database lacks fields expected by frontend
- **Type Mismatches**: TypeScript interfaces don't match database schema
- **Orphaned References**: Some foreign keys reference non-existent fields

## Key Technical Decisions

### 1. Data Normalization Pattern
**Problem**: Frontend expects fields not in database
**Solution**: PostNormalizer service creates fallback values
**Location**: `services/posts/normalizer.ts`

```typescript
// Normalizes database user to expected creator format
normalizeCreator(user) {
  return {
    name: user.fullName || user.nickname || 'Unknown',
    username: user.nickname || user.wallet.slice(0,6),
    // ... fallback mappings
  }
}
```

**Issues**: Creates fragile abstraction layer that masks architectural problems

### 2. API Simplification Pattern
**Problem**: Complex Prisma queries fail due to schema mismatches
**Solution**: Simplified API routes that avoid problematic joins
**Implementation**: 
- Original: `route.ts` (complex, broken)
- Simplified: `route-simple.ts` (working but limited)

### 3. Authentication Flow
**Pattern**: NextAuth.js + Solana wallet integration
**Flow**:
1. User connects Solana wallet
2. Wallet signature validates ownership
3. NextAuth creates session
4. JWT token used for WebSocket authentication

### 4. Real-time Communication
**Pattern**: WebSocket server with channel-based messaging
**Implementation**:
- Separate Node.js server (port 3002)
- Redis for scaling (configured but not required)
- JWT authentication for connections
- Event-driven message routing

## Design Patterns in Use

### Component Architecture
- **Page Components**: Server-side rendering entry points
- **Client Components**: Interactive UI with state management
- **UI Components**: Reusable design system components
- **Service Layer**: Data transformation and API calls

### State Management
- **Zustand Store**: Global application state
- **React Query**: Server state and caching
- **Local State**: Component-specific state with useState/useReducer

### Data Flow Pattern
```
Database → API Route → Normalizer → Frontend Component
    ↑                                        ↓
    └─────── WebSocket Events ←──────────────┘
```

## Component Relationships

### Critical Dependencies
- **CreatorsExplorer** depends on normalized creator data
- **FeedPageClient** requires UnifiedPost interface
- **PostNormalizer** bridges database/frontend gap
- **WebSocket client** needs JWT from NextAuth

### Problem Areas ⚠️
- **CreatorsExplorer.tsx**: Hardcoded field expectations
- **TypeScript interfaces**: Don't match database reality
- **API responses**: Inconsistent data structure
- **Authentication flow**: WebSocket JWT integration broken

## Error Handling Patterns

### Current Approach
- Try/catch in API routes
- Error boundaries in React components
- Console logging for debugging
- Graceful degradation for missing data

### Missing Patterns ⚠️
- No systematic error tracking
- Inconsistent error response formats
- Poor error user experience
- No retry mechanisms for failed operations

## Performance Considerations

### Optimizations in Place
- Prisma query optimization
- React component memoization
- Efficient WebSocket connection management
- Tailwind CSS for minimal bundle size

### Performance Issues ⚠️
- N+1 queries in some API endpoints
- Large bundle size from multiple dependencies
- Inefficient re-renders in some components
- WebSocket connection overhead

## Security Patterns

### Current Implementation
- Solana wallet signature verification
- NextAuth session management
- JWT tokens for WebSocket auth
- CORS configuration

### Security Gaps ⚠️
- No rate limiting on API endpoints
- Insufficient input validation
- Missing CSRF protection
- WebSocket authentication bypass possible

## Testing Strategy

### Current Testing
- Manual testing via browser
- API testing via direct calls
- Database verification via psql

### Missing Testing ⚠️
- No automated unit tests
- No integration tests
- No end-to-end testing
- No performance testing 