# Tech Context: Fonana

## Technologies Used

### Frontend Stack
- **Next.js 14.1.0**: React framework with App Router
- **React 18**: UI library with concurrent features
- **TypeScript**: Type safety and developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Query**: Server state management and caching

### Backend Stack
- **PostgreSQL**: Primary database (local instance)
- **Prisma ORM**: Database ORM and type generation
- **NextAuth.js**: Authentication framework
- **Node.js**: WebSocket server runtime

### Blockchain Integration
- **Solana**: Blockchain for payments and authentication
- **@solana/wallet-adapter**: Wallet connection library
- **@solana/web3.js**: Solana blockchain interaction

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Git**: Version control
- **VS Code**: Primary development environment

## Development Setup

### Environment Configuration
```bash
# Database
DATABASE_URL="postgresql://fonana_user:fonana_pass@localhost:5432/fonana"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[secret-key]"

# Solana
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"

# WebSocket
WS_PORT=3002
```

### Database Setup
```bash
# PostgreSQL instance
Host: localhost
Port: 5432
Database: fonana
User: fonana_user
Password: fonana_pass

# Tables: 25 total
# Users: 53 creators loaded
# Posts: 10 posts from production dump
```

### Port Configuration
- **3000**: Next.js development server
- **3002**: WebSocket server
- **5432**: PostgreSQL database

### Scripts and Commands
```bash
# Development
npm run dev          # Start Next.js dev server
npm run ws          # Start WebSocket server
npm run build       # Build for production

# Database
npx prisma generate # Generate Prisma client
npx prisma db pull  # Sync schema with database
npx prisma studio   # Database GUI

# Testing
npm run test        # (Not configured)
npm run lint        # ESLint checking
```

## Technical Constraints

### Database Limitations
- **Schema Mismatch**: Prisma schema doesn't match actual database
- **Missing Fields**: Many expected fields don't exist in database
- **Data Integrity**: Some foreign key relationships broken
- **Migration History**: Complex migration path from Supabase

### Performance Constraints
- **Local Development**: All services running on localhost
- **Single Database Instance**: No read replicas or sharding
- **WebSocket Scaling**: Redis configured but not required
- **Bundle Size**: Large dependency tree affects load times

### Development Constraints
- **No Testing Framework**: Unit/integration tests not configured
- **Manual Database Management**: No automated migrations
- **Error Tracking**: Basic console logging only
- **Monitoring**: No performance monitoring tools

## Dependencies

### Core Dependencies
```json
{
  "next": "14.1.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "@prisma/client": "^5.0.0",
  "next-auth": "^4.0.0",
  "tailwindcss": "^3.0.0"
}
```

### Blockchain Dependencies
```json
{
  "@solana/wallet-adapter-base": "^0.9.0",
  "@solana/wallet-adapter-react": "^0.15.0",
  "@solana/web3.js": "^1.78.0"
}
```

### WebSocket Dependencies
```json
{
  "ws": "^8.0.0",
  "jsonwebtoken": "^9.0.0",
  "redis": "^4.0.0"
}
```

## File Structure

### Key Directories
```
app/                 # Next.js App Router pages
├── api/            # API route handlers
├── [username]/     # Dynamic user profiles  
├── creators/       # Creator discovery page
├── feed/          # Main content feed
└── messages/      # Direct messaging

components/         # React components
├── ui/            # Reusable UI components
├── posts/         # Post-related components
└── *.tsx          # Feature components

lib/               # Utility libraries
├── auth/          # Authentication logic
├── db.ts          # Database connection
├── solana/        # Blockchain integration
└── utils/         # Helper functions

prisma/            # Database schema and migrations
services/          # Business logic layer
types/             # TypeScript type definitions
websocket-server/  # Real-time messaging server
```

### Configuration Files
- **prisma/schema.prisma**: Database schema definition
- **tailwind.config.js**: CSS framework configuration
- **next.config.js**: Next.js build configuration
- **tsconfig.json**: TypeScript compiler options
- **.env.local**: Environment variables

## Known Technical Issues

### Critical Issues ⚠️
1. **Schema Drift**: Prisma schema out of sync with database
2. **Type Safety**: TypeScript interfaces don't match data reality
3. **WebSocket Auth**: JWT integration not working properly
4. **API Inconsistency**: Some endpoints use simplified data structures

### Development Issues
1. **No Hot Reload**: Database schema changes require manual steps
2. **Error Handling**: Poor error messages and debugging experience
3. **State Management**: Inconsistent patterns across components
4. **Build Process**: Long build times due to large dependency tree

### Production Readiness Issues
1. **No CI/CD**: Manual deployment process
2. **No Testing**: No automated test coverage
3. **No Monitoring**: No error tracking or performance monitoring
4. **Security**: Missing security headers and rate limiting

## Integration Points

### External Services
- **Solana Devnet**: Blockchain transactions and wallet auth
- **NextAuth Providers**: Wallet adapter integration
- **PostgreSQL**: Local database instance

### Internal Services
- **Next.js API Routes**: RESTful endpoints
- **WebSocket Server**: Real-time communication
- **Prisma Client**: Database ORM layer
- **PostNormalizer**: Data transformation service

## Deployment Considerations

### Current Environment
- **Development Only**: All services running locally
- **Database**: Local PostgreSQL instance
- **Storage**: Local file system for uploads
- **CDN**: No CDN configuration

### Production Requirements
- **Database Hosting**: Managed PostgreSQL service needed
- **File Storage**: S3 or similar for user uploads
- **CDN**: Image and asset optimization
- **WebSocket Scaling**: Redis cluster for horizontal scaling
- **Monitoring**: Error tracking and performance monitoring
- **Security**: Rate limiting, DDOS protection, security headers 