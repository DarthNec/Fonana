Они# FONANA TECHNICAL ARCHITECTURE MAP FOR AI

## DATABASE SCHEMA

### PostgreSQL Connection
```
host: localhost
port: 5432
database: fonana
user: fonana_user
password: fonana_pass
```

### Tables with ALL Fields

#### users
```sql
id: String @id @default(cuid())
wallet: String @unique
nickname: String? @unique
fullName: String?
bio: String?
avatar: String?
website: String?
twitter: String?
telegram: String?
location: String?
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt
isVerified: Boolean @default(false)
isCreator: Boolean @default(false)
followersCount: Int @default(0)
followingCount: Int @default(0)
postsCount: Int @default(0)

-- MISSING IN DB BUT EXPECTED BY FRONTEND:
-- name: String
-- username: String  
-- backgroundImage: String
-- description: String
-- subscribers: Int
-- tags: String[]
-- monthlyEarnings: Float
```

#### posts
```sql
id: String @id @default(cuid())
creatorId: String
title: String
content: String
type: PostType (text|image|video|audio)
category: String
thumbnail: String?
mediaUrl: String?
isLocked: Boolean @default(false)
isPremium: Boolean @default(false)
price: Float?
currency: String @default("SOL")
likesCount: Int @default(0)
commentsCount: Int @default(0)
viewsCount: Int @default(0)
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt
aspectRatio: Float?
quantity: Int?
sold: Int @default(0)
metadata: Json?

-- Relations:
creator: User @relation(fields: [creatorId], references: [id])
```

#### Conversation
```sql
id: String @id @default(cuid())
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt
metadata: Json?

-- Relations:
participants: User[] @relation("UserConversations")
messages: Message[]
```

#### Message
```sql
id: String @id @default(cuid())
content: String
senderId: String
conversationId: String
attachments: String[]
readBy: String[]
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt
metadata: Json?

-- Relations:
sender: User @relation(fields: [senderId], references: [id])
conversation: Conversation @relation(fields: [conversationId], references: [id])
```

#### subscriptions
```sql
id: String @id @default(cuid())
userId: String
creatorId: String
tierId: String?
startDate: DateTime @default(now())
endDate: DateTime?
status: SubscriptionStatus (active|expired|cancelled)
autoRenew: Boolean @default(true)
price: Float
currency: String @default("SOL")
transactionHash: String?
metadata: Json?
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt

-- Relations:
user: User @relation("UserSubscriptions", fields: [userId], references: [id])
creator: User @relation("CreatorSubscriptions", fields: [creatorId], references: [id])
```

#### comments
```sql
id: String @id @default(cuid())
content: String
authorId: String
postId: String
parentId: String?
likesCount: Int @default(0)
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt

-- Relations:
author: User @relation(fields: [authorId], references: [id])
post: Post @relation(fields: [postId], references: [id])
parent: Comment? @relation("CommentReplies", fields: [parentId], references: [id])
```

#### likes
```sql
id: String @id @default(cuid())
userId: String
postId: String?
commentId: String?
createdAt: DateTime @default(now())

-- Relations:
user: User @relation(fields: [userId], references: [id])
post: Post? @relation(fields: [postId], references: [id])
comment: Comment? @relation(fields: [commentId], references: [id])
```

#### notifications
```sql
id: String @id @default(cuid())
userId: String
type: NotificationType
title: String
content: String
data: Json?
isRead: Boolean @default(false)
createdAt: DateTime @default(now())

-- Relations:
user: User @relation(fields: [userId], references: [id])
```

#### transactions
```sql
id: String @id @default(cuid())
fromUserId: String?
toUserId: String
amount: Float
currency: String @default("SOL")
type: TransactionType
status: TransactionStatus
transactionHash: String?
metadata: Json?
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt

-- Relations:
fromUser: User? @relation("SentTransactions", fields: [fromUserId], references: [id])
toUser: User @relation("ReceivedTransactions", fields: [toUserId], references: [id])
```

#### post_purchases
```sql
id: String @id @default(cuid())
postId: String
buyerId: String
price: Float
currency: String @default("SOL")
transactionHash: String?
createdAt: DateTime @default(now())

-- Relations:
post: Post @relation(fields: [postId], references: [id])
buyer: User @relation(fields: [buyerId], references: [id])
transaction: Transaction? @relation(fields: [transactionHash], references: [transactionHash])
```

#### follows
```sql
id: String @id @default(cuid())
followerId: String
followingId: String
createdAt: DateTime @default(now())

@@unique([followerId, followingId])

-- Relations:
follower: User @relation("UserFollowers", fields: [followerId], references: [id])
following: User @relation("UserFollowing", fields: [followingId], references: [id])
```

#### user_settings
```sql
id: String @id @default(cuid())
userId: String @unique
emailNotifications: Boolean @default(true)
pushNotifications: Boolean @default(true)
theme: String @default("light")
language: String @default("en")
privacy: Json?
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt

-- Relations:
user: User @relation(fields: [userId], references: [id])
```

#### creator_tier_settings
```sql
id: String @id @default(cuid())
creatorId: String
tierName: String
price: Float
currency: String @default("SOL")
benefits: String[]
maxSubscribers: Int?
isActive: Boolean @default(true)
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt

-- Relations:
creator: User @relation(fields: [creatorId], references: [id])
subscriptions: Subscription[]
```

#### flash_sales
```sql
id: String @id @default(cuid())
creatorId: String
title: String
description: String?
discountPercentage: Float
startDate: DateTime
endDate: DateTime
maxRedemptions: Int?
redemptionsCount: Int @default(0)
isActive: Boolean @default(true)
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt

-- Relations:
creator: User @relation(fields: [creatorId], references: [id])
redemptions: FlashSaleRedemption[]
```

#### tags
```sql
id: String @id @default(cuid())
name: String @unique
slug: String @unique
createdAt: DateTime @default(now())

-- Relations:
posts: PostTag[]
```

#### post_tags
```sql
id: String @id @default(cuid())
postId: String
tagId: String

@@unique([postId, tagId])

-- Relations:
post: Post @relation(fields: [postId], references: [id])
tag: Tag @relation(fields: [tagId], references: [id])
```

#### MessagePurchase
```sql
id: String @id @default(cuid())
messageId: String
buyerId: String
price: Float
currency: String @default("SOL")
transactionHash: String?
createdAt: DateTime @default(now())

-- Relations:
message: Message @relation(fields: [messageId], references: [id])
buyer: User @relation(fields: [buyerId], references: [id])
```

#### _UserConversations
```sql
A: String
B: String

@@unique([A, B])
@@index([B])

-- Prisma many-to-many join table
```

### Database Stats
- Total Users: 54
- Creators: 52
- Posts: 279
- Comments: 44
- Likes: 8
- Conversations: 0
- Messages: 6
- Notifications: 85
- Subscriptions: 1

## API ENDPOINTS

### /api/creators
```typescript
GET /api/creators
Query: ?page=1&limit=20&search=xxx&category=xxx
Response: {
  creators: Array<{
    id: string
    wallet: string
    nickname: string
    fullName: string
    bio: string
    avatar: string
    website: string
    twitter: string
    telegram: string
    location: string
    createdAt: string
    updatedAt: string
    isVerified: boolean
    isCreator: boolean
    followersCount: number
    followingCount: number
    postsCount: number
  }>
  totalCount: number
}
Status: 200 OK

GET /api/creators/:id
Response: Creator & { posts: Post[], subscriptions: number }

GET /api/creators/recommendations
Headers: { Authorization: "Bearer <JWT>" }
Response: { recommendations: Creator[] }

GET /api/creators/analytics
Headers: { Authorization: "Bearer <JWT>" }
Response: { views: number, subscribers: number, revenue: number }
```

### /api/posts
```typescript
GET /api/posts?page=1&limit=20&category=All&sort=latest
Response: {
  posts: Array<{
    id: string
    creatorId: string
    title: string
    content: string
    type: 'text' | 'image' | 'video' | 'audio'
    category: string
    thumbnail: string | null
    mediaUrl: string | null
    isLocked: boolean
    isPremium: boolean
    price: number | null
    currency: string
    likesCount: number
    commentsCount: number
    viewsCount: number
    createdAt: string
    updatedAt: string
    creator: {
      id: string
      nickname: string
      fullName: string
      avatar: string
      isCreator: boolean
    }
  }>
  totalCount: number
  currentPage: number
  totalPages: number
}
Status: 200 OK

POST /api/posts
Headers: { Authorization: "Bearer <JWT>" }
Body: {
  title: string
  content: string
  type: string
  category: string
  mediaUrl?: string
  thumbnail?: string
  isLocked?: boolean
  isPremium?: boolean
  price?: number
  quantity?: number
}
Response: Post

GET /api/posts/:id
Response: Post & { 
  hasAccess: boolean,
  isOwner: boolean,
  isPurchased: boolean
}

PUT /api/posts/:id
Headers: { Authorization: "Bearer <JWT>" }
Body: Partial<Post>
Response: Post

DELETE /api/posts/:id
Headers: { Authorization: "Bearer <JWT>" }
Response: { success: boolean }

POST /api/posts/:id/like
Headers: { Authorization: "Bearer <JWT>" }
Response: { liked: boolean, likesCount: number }

DELETE /api/posts/:id/like
Headers: { Authorization: "Bearer <JWT>" }
Response: { liked: boolean, likesCount: number }

POST /api/posts/:id/purchase
Headers: { Authorization: "Bearer <JWT>" }
Body: { transactionHash: string }
Response: { success: boolean, post: Post }

GET /api/posts/:id/comments
Response: { comments: Comment[] }

POST /api/posts/:id/view
Headers: { Authorization: "Bearer <JWT>" }
Response: { viewsCount: number }
```

### /api/conversations
```typescript
GET /api/conversations
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
Response: {
  conversations: Array<{
    id: string
    participants: User[]
    lastMessage: Message
    unreadCount: number
  }>
} | { error: "No token provided" } | { error: "Invalid token" }

POST /api/conversations
Headers: { Authorization: "Bearer <JWT>" }
Body: { participantIds: string[] }
Response: Conversation

GET /api/conversations/:id
Headers: { Authorization: "Bearer <JWT>" }
Response: Conversation & { messages: Message[] }

DELETE /api/conversations/:id
Headers: { Authorization: "Bearer <JWT>" }
Response: { success: boolean }
```

### /api/user
```typescript
GET /api/user
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
Response: User | { error: string }

PUT /api/user
Headers: { Authorization: "Bearer <JWT>" }
Body: {
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  website?: string
  twitter?: string
  telegram?: string
  location?: string
}
Response: User

DELETE /api/user
Headers: { Authorization: "Bearer <JWT>" }
Response: { success: boolean }

GET /api/user/stats
Headers: { Authorization: "Bearer <JWT>" }
Response: {
  totalPosts: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalRevenue: number
  subscribers: number
}

GET /api/user/subscriptions
Headers: { Authorization: "Bearer <JWT>" }
Response: { subscriptions: Subscription[] }

GET /api/user/purchases
Headers: { Authorization: "Bearer <JWT>" }
Response: { purchases: PostPurchase[] }

GET /api/user/notifications
Headers: { Authorization: "Bearer <JWT>" }
Response: { notifications: Notification[] }

PUT /api/user/notifications/:id/read
Headers: { Authorization: "Bearer <JWT>" }
Response: { success: boolean }

GET /api/user/settings
Headers: { Authorization: "Bearer <JWT>" }
Response: UserSettings

PUT /api/user/settings
Headers: { Authorization: "Bearer <JWT>" }
Body: Partial<UserSettings>
Response: UserSettings
```

### /api/messages/[id]
```typescript
GET /api/messages/:conversationId
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
Query: ?page=1&limit=50
Response: { messages: Message[], hasMore: boolean }

POST /api/messages/:conversationId
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
Body: { 
  content: string,
  attachments?: string[]
}
Response: Message

PUT /api/messages/:conversationId/:messageId
Headers: { Authorization: "Bearer <JWT>" }
Body: { content: string }
Response: Message

DELETE /api/messages/:conversationId/:messageId
Headers: { Authorization: "Bearer <JWT>" }
Response: { success: boolean }

POST /api/messages/:conversationId/read
Headers: { Authorization: "Bearer <JWT>" }
Body: { messageIds: string[] }
Response: { success: boolean }
```

### /api/subscriptions
```typescript
GET /api/subscriptions/check?creatorId=xxx
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
Response: { isSubscribed: boolean, subscription?: Subscription }

POST /api/subscriptions/subscribe
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
Body: {
  creatorId: string
  tierId?: string
  transactionHash: string
}
Response: Subscription

POST /api/subscriptions/cancel
Headers: { Authorization: "Bearer <JWT_TOKEN>" }
Body: { subscriptionId: string }
Response: { success: boolean }

GET /api/subscriptions/active
Headers: { Authorization: "Bearer <JWT>" }
Response: { subscriptions: Subscription[] }

GET /api/subscriptions/history
Headers: { Authorization: "Bearer <JWT>" }
Response: { subscriptions: Subscription[] }
```

### /api/comments/[id]
```typescript
GET /api/comments/:postId
Query: ?page=1&limit=20&sort=latest
Response: { 
  comments: Comment[],
  totalCount: number
}

POST /api/comments/:postId
Headers: { Authorization: "Bearer <JWT>" }
Body: { 
  content: string,
  parentId?: string
}
Response: Comment

PUT /api/comments/:postId/:commentId
Headers: { Authorization: "Bearer <JWT>" }
Body: { content: string }
Response: Comment

DELETE /api/comments/:postId/:commentId
Headers: { Authorization: "Bearer <JWT>" }
Response: { success: boolean }

POST /api/comments/:postId/:commentId/like
Headers: { Authorization: "Bearer <JWT>" }
Response: { liked: boolean, likesCount: number }
```

### /api/posts/[id]
```typescript
// Covered above in /api/posts section
```

### /api/upload
```typescript
POST /api/upload/image
Headers: { 
  "Content-Type": "multipart/form-data",
  "Authorization": "Bearer <JWT>"
}
Body: FormData with 'file' field
Response: { url: string, thumbnail?: string }

POST /api/upload/video
Headers: { 
  "Content-Type": "multipart/form-data",
  "Authorization": "Bearer <JWT>"
}
Body: FormData with 'file' field
Response: { url: string, thumbnail: string }

POST /api/upload/avatar
Headers: { 
  "Content-Type": "multipart/form-data",
  "Authorization": "Bearer <JWT>"
}
Body: FormData with 'file' field
Response: { url: string }

DELETE /api/upload
Headers: { Authorization: "Bearer <JWT>" }
Body: { url: string }
Response: { success: boolean }
```

### /api/search
```typescript
GET /api/search/posts?q=xxx
Query: ?q=xxx&category=xxx&type=xxx&minPrice=0&maxPrice=100
Response: { posts: Post[] }

GET /api/search/creators?q=xxx
Query: ?q=xxx&verified=true
Response: { creators: User[] }

GET /api/search/tags?q=xxx
Response: { tags: Tag[] }

GET /api/search/all?q=xxx
Response: {
  posts: Post[],
  creators: User[],
  tags: Tag[]
}
```

### /api/auth/wallet
```typescript
POST /api/auth/wallet/verify
Body: { 
  publicKey: string,
  signature: string,
  message: string
}
Response: { 
  token: string,
  user: User
}

POST /api/auth/wallet/connect
Body: { publicKey: string }
Response: { 
  message: string,
  nonce: string
}

POST /api/auth/wallet/disconnect
Headers: { Authorization: "Bearer <JWT>" }
Response: { success: boolean }
```

### /api/pricing
```typescript
GET /api/pricing
Response: { 
  SOL_PRICE: number,
  updatedAt: string
}

GET /api/pricing/history
Query: ?days=7
Response: {
  history: Array<{
    date: string,
    price: number
  }>
}
```

### /api/version
```typescript
GET /api/version
Response: { 
  version: string,
  buildId: string,
  timestamp: string
}
```

### /api/flash-sales
```typescript
GET /api/flash-sales
Response: { flashSales: FlashSale[] }

POST /api/flash-sales
Headers: { Authorization: "Bearer <JWT>" }
Body: {
  title: string
  description?: string
  discountPercentage: number
  startDate: string
  endDate: string
  maxRedemptions?: number
}
Response: FlashSale

POST /api/flash-sales/apply
Headers: { Authorization: "Bearer <JWT>" }
Body: { flashSaleId: string }
Response: { success: boolean, discount: number }
```

### /api/tips
```typescript
POST /api/tips
Headers: { Authorization: "Bearer <JWT>" }
Body: {
  creatorId: string
  amount: number
  transactionHash: string
  message?: string
}
Response: Transaction
```

### /api/admin/*
```typescript
GET /api/admin/users
Headers: { Authorization: "Bearer <ADMIN_JWT>" }
Response: { users: User[] }

PUT /api/admin/users/:id
Headers: { Authorization: "Bearer <ADMIN_JWT>" }
Body: Partial<User>
Response: User

GET /api/admin/referrals
Headers: { Authorization: "Bearer <ADMIN_JWT>" }
Response: { referrals: any[] }

PUT /api/admin/update-referrer
Headers: { Authorization: "Bearer <ADMIN_JWT>" }
Body: { userId: string, referrerId: string }
Response: { success: boolean }
```

## COMPONENT DEPENDENCY TREE

### Pages
```
app/
├── page.tsx -> ClientShell -> HomePageClient -> CreatorsGrid (WORKS ✅)
├── creators/page.tsx -> ClientShell -> CreatorsExplorer (BROKEN: infinite loading) <!-- LEGACY ISSUE -->
├── feed/page.tsx -> ClientShell -> FeedPageClient (BROKEN: no posts shown) <!-- LEGACY ISSUE -->
├── messages/[id]/page.tsx -> ClientShell -> MessagesPageClient
├── profile/page.tsx -> ClientShell -> ProfilePageClient
├── [username]/page.tsx -> CreatorProfilePage
├── post/[id]/page.tsx -> PostPageClient
├── dashboard/
│   ├── page.tsx -> ClientShell -> DashboardPageClient (ENTERPRISE QUALITY ✅ 2025-018)
│   └── ai-training/
│       └── page.tsx -> AI Portrait Training Page (NEW ✅ 2025-018)
└── test/
    └── tier-settings-design/
        └── page.tsx -> SubscriptionTiersSettings Test Page (NEW ✅ 2025-018)
```

### Core Components
```
components/
├── AppProvider.tsx (provides user context)
├── WalletProvider.tsx (Solana wallet)
├── ThemeProvider.tsx
├── ClientShell.tsx (wrapper with auth)
├── Navbar.tsx (UPDATED ✅ 2025-018: real avatar + profile navigation fix)
├── BottomNav.tsx
├── DashboardPageClient.tsx (ENTERPRISE QUALITY ✅ 2025-018: 7 UX improvements)
├── CreatorsExplorer.tsx (BROKEN) <!-- LEGACY ISSUE -->
├── FeedPageClient.tsx (BROKEN) <!-- LEGACY ISSUE -->
├── CreatorsGrid.tsx (WORKS ✅)
├── PostCard.tsx
├── Avatar.tsx (FIXED ✅ 2025-018: removed /avatars/ path restriction)
├── SubscribeModal.tsx
├── PurchaseModal.tsx
├── CreatePostModal.tsx
├── UserSubscriptions.tsx (REDESIGNED ✅ 2025-018: individual toggles + compact design)
└── SubscriptionTiersSettings.tsx (REDESIGNED ✅ 2025-018: vertical cards + click-to-expand)
```

### Hooks
```
lib/hooks/
├── useOptimizedPosts.ts (SUSPECT: may cause feed issues)
├── useOptimizedRealtimePosts.ts
├── useWallet.ts
├── useUser.ts
├── useTheme.ts
└── use-toast.ts
```

### Services
```
lib/services/
├── AuthService.ts
├── ConversationsService.ts
├── UnreadMessagesService.ts (polling disabled)
├── NotificationService.ts
├── WebSocketService.ts (auto-connect disabled)
├── websocket.ts
└── PricingService.ts
```

## TYPE MISMATCHES

### Frontend Expects vs Database Has
```typescript
// Frontend PostCreator interface
interface PostCreator {
  id: string
  name: string // ❌ NOT IN DB
  username: string // ❌ NOT IN DB  
  nickname?: string // ✅
  avatar: string // ✅
  isVerified: boolean // ✅
}

// Frontend Creator interface
interface Creator {
  id: string
  name: string // ❌ uses fullName fallback
  username: string // ❌ uses nickname fallback
  avatar: string // ✅
  backgroundImage: string // ❌ NOT IN DB
  description: string // ❌ uses bio fallback
  isVerified: boolean // ✅
  subscribers: number // ❌ NOT IN DB
  tags: string[] // ❌ NOT IN DB
  monthlyEarnings: number // ❌ NOT IN DB
  posts: number // ❌ uses postsCount
}
```

### Normalizer Mappings
```typescript
// services/posts/normalizer.ts
normalizeCreator(creator: any): PostCreator {
  return {
    id: creator.id,
    name: creator.fullName || creator.name || creator.nickname || 'Unknown',
    username: creator.nickname || creator.username || creator.wallet?.slice(0,6) || 'unknown',
    nickname: creator.nickname,
    avatar: creator.avatar || generateDefaultAvatar(creator.id),
    isVerified: creator.isVerified || false
  }
}
```

## WEBSOCKET ARCHITECTURE

### Server (port 3002)
```javascript
// websocket-server/index.js
- Requires JWT token from NextAuth
- Uses Prisma for DB access
- Events: notification, post_updated, post_created, post_deleted, creator_updated
- Channels: user-specific, creator-specific, global
```

### Client Connection
```typescript
// lib/services/websocket.ts
- Auto-connect DISABLED (emergency stabilization)
- Attempts connection without JWT token
- Causes "Cannot read properties of undefined (reading 'bind')" errors
```

## ENVIRONMENT VARIABLES
```
DATABASE_URL=postgresql://fonana_user:fonana_pass@localhost:5432/fonana
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[required]
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_WS_URL=ws://localhost:3002
SUPABASE_URL=[media storage]
SUPABASE_ANON_KEY=[media storage]
```

## CRITICAL ISSUES MATRIX

### Working ✅
- Main page (/) - shows 52 creators
- API /api/creators - returns 52 creators
- API /api/posts - returns 279 posts  
- CreatorsGrid component
- Database integrity
- Synced post counts

### Broken ❌
- /creators page - infinite "Loading creators..."
- /feed page - shows "No posts yet"
- CreatorsExplorer component
- FeedPageClient component
- WebSocket auto-connect
- JWT token generation

### Root Causes
1. **CreatorsExplorer.tsx**: useEffect loading logic issue
2. **FeedPageClient.tsx**: useOptimizedPosts returns empty array
3. **Type mismatches**: Frontend expects fields not in DB
4. **WebSocket**: No JWT token from NextAuth

## COMPONENT FLOW DIAGRAMS

### Main Page (WORKS)
```
page.tsx 
  -> HomePageClient 
    -> fetch('/api/creators')
    -> CreatorsGrid
      -> creators.map(c => CreatorCard)
      -> render ✅
```

### Creators Page (BROKEN)
```
creators/page.tsx 
  -> CreatorsExplorer
    -> useEffect() -> fetchCreators()
    -> fetch('/api/creators')
    -> ❌ setLoading(false) never called?
    -> stuck showing "Loading creators..."
```

### Feed Page (BROKEN)  
```
feed/page.tsx 
  -> FeedPageClient
    -> useOptimizedPosts({category, sort, userId})
      -> fetch('/api/posts?...')
      -> ❌ returns empty posts array
    -> shows "No posts yet"
```

## DATA FLOW ISSUES

### CreatorsExplorer Issue
```typescript
// Line ~40
useEffect(() => {
  fetchCreators() // Called but loading never set to false?
}, [])

// Line ~140
const fetchCreators = async () => {
  try {
    const response = await fetch('/api/creators')
    const data = await response.json()
    // MAPPING ISSUE?
    const mappedCreators = mapApiCreatorsToComponent(data)
    setCreators(mappedCreators)
    // MISSING: setLoading(false) in error case?
  } catch (error) {
    console.error(error)
    // NO setLoading(false) here!
  }
}
```

### FeedPageClient Issue
```typescript
// Uses useOptimizedPosts hook
const { posts, loading, hasMore, loadMore } = useOptimizedPosts({
  category: selectedCategory,
  sort: selectedSort,
  userId: user?.id
})
// posts always empty array despite API working

// Inside useOptimizedPosts:
// - Filtering logic may exclude all posts
// - Category mismatch ("All" vs null)
// - Sort parameter issue
// - User ID filtering when not logged in
```

## TYPESCRIPT INTERFACES

### types/posts/index.ts
```typescript
export interface UnifiedPost {
  id: string
  title: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio'
  category: string
  creator: PostCreator
  thumbnail?: string
  mediaUrl?: string
  isLocked: boolean
  isPremium: boolean
  price?: number
  currency: string
  likesCount: number
  commentsCount: number
  viewsCount: number
  createdAt: string
  updatedAt: string
  aspectRatio?: number
  quantity?: number
  sold: number
  hasAccess?: boolean
  isOwner?: boolean
  isPurchased?: boolean
}

export interface PostCreator {
  id: string
  name: string
  username: string
  nickname?: string
  avatar: string
  isVerified: boolean
}
```

### types/creators.ts
```typescript
export interface ComponentCreator {
  id: string
  name: string
  username: string  
  avatar: string
  backgroundImage: string
  description: string
  isVerified: boolean
  subscribers: number
  tags: string[]
  monthlyEarnings: number
  posts: number
}

export interface ApiCreator {
  id: string
  wallet: string
  nickname: string | null
  fullName: string | null
  bio: string | null
  avatar: string | null
  website: string | null
  twitter: string | null
  telegram: string | null
  location: string | null
  createdAt: string
  updatedAt: string
  isVerified: boolean
  isCreator: boolean
  followersCount: number
  followingCount: number
  postsCount: number
}

export interface ApiCreatorsResponse {
  creators: ApiCreator[]
  totalCount: number
}
```

### lib/utils/creatorsMapper.ts
```typescript
export function mapApiCreatorsToComponent(
  response: ApiCreatorsResponse
): ComponentCreator[] {
  return response.creators.map(creator => ({
    id: creator.id,
    name: creator.fullName || creator.nickname || 'Unknown',
    username: creator.nickname || creator.wallet.slice(0, 6),
    avatar: creator.avatar || generateDefaultAvatar(creator.id),
    backgroundImage: '', // NOT IN DB
    description: creator.bio || '',
    isVerified: creator.isVerified,
    subscribers: 0, // NOT IN DB - should use followersCount?
    tags: [], // NOT IN DB
    monthlyEarnings: 0, // NOT IN DB
    posts: creator.postsCount
  }))
}
```

## PRISMA SCHEMA RELATIONS
```prisma
model User {
  id String @id @default(cuid())
  wallet String @unique
  nickname String? @unique
  fullName String?
  bio String?
  avatar String?
  website String?
  twitter String?
  telegram String?
  location String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  isVerified Boolean @default(false)
  isCreator Boolean @default(false)
  followersCount Int @default(0)
  followingCount Int @default(0)
  postsCount Int @default(0)
  
  posts Post[] @relation("UserPosts")
  subscriptions Subscription[] @relation("UserSubscriptions")
  creatorSubscriptions Subscription[] @relation("CreatorSubscriptions")
  conversations Conversation[] @relation("UserConversations")
  sentMessages Message[] @relation("UserMessages")
  comments Comment[]
  likes Like[]
  notifications Notification[]
  sentTransactions Transaction[] @relation("SentTransactions")
  receivedTransactions Transaction[] @relation("ReceivedTransactions")
  followers Follow[] @relation("UserFollowers")
  following Follow[] @relation("UserFollowing")
  postPurchases PostPurchase[]
  messagePurchases MessagePurchase[]
  settings UserSettings?
  creatorTiers CreatorTierSettings[]
  flashSales FlashSale[]
  flashSaleRedemptions FlashSaleRedemption[]
}

model Post {
  id String @id @default(cuid())
  creatorId String
  title String
  content String
  type PostType
  category String
  thumbnail String?
  mediaUrl String?
  isLocked Boolean @default(false)
  isPremium Boolean @default(false)
  price Float?
  currency String @default("SOL")
  likesCount Int @default(0)
  commentsCount Int @default(0)
  viewsCount Int @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  aspectRatio Float?
  quantity Int?
  sold Int @default(0)
  metadata Json?
  
  creator User @relation("UserPosts", fields: [creatorId], references: [id])
  comments Comment[]
  likes Like[]
  purchases PostPurchase[]
  tags PostTag[]
}

model Conversation {
  id String @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  metadata Json?
  
  participants User[] @relation("UserConversations")
  messages Message[]
}
```

## QUICK FIX PATHS

### Fix CreatorsExplorer
1. Check fetchCreators error handling
2. Verify setLoading(false) is called
3. Check if API response mapping fails
4. Compare with working main page logic

### Fix FeedPageClient  
1. Debug useOptimizedPosts hook
2. Check if filter logic filters out all posts
3. Verify API response parsing
4. Check category/sort state effects

### Fix Type Mismatches
1. Update TypeScript interfaces to match DB
2. OR add missing fields to DB
3. OR enhance normalizer service
4. Add null safety checks

### Fix WebSocket
1. Integrate NextAuth JWT generation
2. Pass token to WebSocket client
3. OR keep disabled for stability 