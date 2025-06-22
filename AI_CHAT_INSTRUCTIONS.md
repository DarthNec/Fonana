# Fonana Project - AI Assistant Instructions

## Project Context
- **Repository**: https://github.com/DukeDeSouth/Fonana (private)
- **Production**: 69.10.59.234:43988 (SSH)
- **Deploy Script**: `./deploy-to-production.sh`
- **Server Path**: `/var/www/fonana`
- **Language**: English UI, Russian comments OK

## Quick Start
```
Project: Fonana (Next.js + Solana)
Private repo: DukeDeSouth/Fonana
Server has Deploy Key, use ./deploy-to-production.sh
Production DB has real users and posts
```

## Database Models (Key Tables)
- **User** - Пользователи (32 на проде)
- **Post** - Посты (119 на проде) 
- **Subscription** - Подписки (64 на проде)
- **Message** - Личные сообщения (87 на проде)
- **Comment** - Комментарии (16 на проде)
- **FlashSale** - Flash-распродажи (7 на проде)
- **Transaction** - Все транзакции (Solana + внутренние)
- **Notification** - Уведомления системы
- **CreatorTierSettings** - Настройки тарифов создателей

## Full Database Schema

### User Model
```prisma
model User {
  id             String         @id @default(cuid())
  email          String?        @unique
  emailVerified  DateTime?      
  name           String?
  image          String?
  nickname       String?        @unique  // Уникальный username
  fullName       String?
  bio            String?
  avatar         String?
  backgroundImage String?
  website        String?
  twitter        String?
  telegram       String?
  location       String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  isVerified     Boolean        @default(false)
  isCreator      Boolean        @default(false)
  followersCount Int            @default(0)
  followingCount Int            @default(0)
  postsCount     Int            @default(0)
  
  // Wallets
  wallet         String?        @unique
  solanaWallet   String?        @unique
  
  // Referral system
  referrerId     String?
  referrer       User?          @relation("Referrals")
  referrals      User[]         @relation("Referrals")
}
```

### Post Model  
```prisma
model Post {
  id            String    @id @default(cuid())
  creatorId     String
  title         String
  content       String
  type          String    // 'image' | 'video' | 'audio'
  category      String?
  thumbnail     String?
  mediaUrl      String?
  isLocked      Boolean   @default(false)
  isPremium     Boolean   @default(false)
  price         Float?
  currency      String    @default("SOL")
  minSubscriptionTier String?  // 'basic' | 'premium' | 'vip'
  imageAspectRatio String?     // 'vertical' | 'square' | 'horizontal'
  likesCount    Int       @default(0)
  commentsCount Int       @default(0)
  viewsCount    Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Sellable post fields (NFT-like)
  isSellable        Boolean   @default(false)
  sellType          SellType?  // FIXED_PRICE | AUCTION
  quantity          Int?      @default(1)
  auctionStartPrice Float?
  auctionStepPrice  Float?
  auctionDepositAmount Float?  @default(0.01)
  auctionStartAt    DateTime?
  auctionEndAt      DateTime?
  auctionStatus     AuctionStatus @default(DRAFT)
  
  // Sold post fields
  soldAt            DateTime?
  soldToId          String?
  soldPrice         Float?
  sellerConfirmedAt DateTime?
}
```

### Message Model (Direct Messages)
```prisma
model Message {
  id             String       @id @default(cuid())
  conversationId String
  senderId       String
  content        String?      @db.Text
  mediaUrl       String?
  mediaType      String?      // 'image' | 'video' | 'audio'
  isPaid         Boolean      @default(false)  // PPV сообщения
  price          Float?       // Цена для PPV
  isRead         Boolean      @default(false)
  metadata       Json?        // Для tips: { type: 'tip', amount: number }
  createdAt      DateTime     @default(now())
}
```

### Subscription Model
```prisma
model Subscription {
  id           String   @id @default(cuid())
  userId       String
  creatorId    String
  plan         String   // 'basic' | 'premium' | 'vip'
  price        Float
  currency     String   @default("SOL")
  subscribedAt DateTime @default(now())
  validUntil   DateTime
  isActive     Boolean  @default(true)
  txSignature  String?
  
  // Payment details
  paymentStatus    PaymentStatus @default(PENDING)
  paymentAmount    Float?
  platformFee      Float?       // 5% комиссия платформы
  referrerFee      Float?       // 5% реферальная
  creatorAmount    Float?       // 90% создателю
}
```

### Transaction Model
```prisma
model Transaction {
  id              String   @id @default(cuid())
  subscriptionId  String?
  postPurchaseId  String?  @unique
  
  // Transaction details
  txSignature     String   @unique  // Solana signature
  fromWallet      String
  toWallet        String
  amount          Float
  currency        String   @default("SOL")
  type            TransactionType
  status          TransactionStatus @default(PENDING)
  
  // Fee distribution
  platformFee     Float?
  referrerFee     Float?
  referrerWallet  String?
  
  metadata        Json?
  errorMessage    String?
  confirmedAt     DateTime?
  createdAt       DateTime @default(now())
}
```

### FlashSale Model
```prisma
model FlashSale {
  id              String   @id @default(cuid())
  creatorId       String?  // null = platform-wide sale
  postId          String?  // specific post sale
  subscriptionPlan String? // 'basic' | 'premium' | 'vip'
  
  discount        Float    // Percentage discount (10-90)
  maxRedemptions  Int?     // Max number of uses
  usedCount       Int      @default(0)
  
  startAt         DateTime @default(now())
  endAt           DateTime
  
  isActive        Boolean  @default(true)
}
```

### Enums
```prisma
enum TransactionType {
  SUBSCRIPTION
  POST_PURCHASE
  PLATFORM_FEE
  REFERRER_FEE
  WITHDRAWAL
  REFUND
  MESSAGE_PURCHASE  // PPV messages
  TIP              // Tips in messages
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}

enum NotificationType {
  LIKE_POST
  LIKE_COMMENT
  COMMENT_POST
  REPLY_COMMENT
  NEW_SUBSCRIBER
  POST_PURCHASE
  NEW_POST_FROM_SUBSCRIPTION
  AUCTION_NEW_BID
  AUCTION_WON
  AUCTION_PAYMENT_REMINDER
  AUCTION_DEPOSIT_REFUNDED
  TIP_RECEIVED
  NEW_MESSAGE
}

enum SellType {
  FIXED_PRICE
  AUCTION
}

enum AuctionStatus {
  DRAFT       // Черновик
  SCHEDULED   // Запланирован
  ACTIVE      // Идет аукцион
  ENDED       // Завершен, ждет оплаты
  SOLD        // Продан
  CANCELLED   // Отменен
  EXPIRED     // Истек без оплаты
}
```

## Key Database Relationships
- User → Posts (1:many) - Создатель и его посты
- User → Subscriptions (many:many) - Подписки пользователей
- User → Messages (1:many) - Отправленные сообщения
- Post → Comments (1:many) - Комментарии к посту
- Post → Likes (1:many) - Лайки поста
- Post → PostPurchases (1:many) - Покупки поста
- Conversation → Messages (1:many) - Сообщения в диалоге
- Message → MessagePurchases (1:many) - Покупки PPV сообщений

## Other Important Models

### Comment Model
```prisma
model Comment {
  id          String    @id @default(cuid())
  postId      String
  userId      String
  content     String
  isAnonymous Boolean   @default(false)
  likesCount  Int       @default(0)
  parentId    String?   // For replies
  createdAt   DateTime  @default(now())
}
```

### Notification Model
```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  message   String
  isRead    Boolean  @default(false)
  metadata  Json?    // { postId?, commentId?, senderId?, amount? }
  createdAt DateTime @default(now())
}
```

### CreatorTierSettings Model
```prisma
model CreatorTierSettings {
  id          String   @id @default(cuid())
  creatorId   String   @unique
  
  // JSON structure: { enabled, price, description, features[] }
  basicTier   Json?    
  premiumTier Json?    
  vipTier     Json?    
}
```

## Common Prisma Queries

### Get user with subscriptions
```javascript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    subscriptions: {
      where: { isActive: true }
    },
    subscribers: {
      where: { isActive: true }
    }
  }
});
```

### Get posts with tier access check
```javascript
const posts = await prisma.post.findMany({
  where: {
    creatorId,
    OR: [
      { minSubscriptionTier: null },
      { minSubscriptionTier: { in: ['basic', 'premium'] } }
    ]
  },
  include: {
    creator: true,
    _count: {
      select: { likes: true, comments: true }
    }
  }
});
```

### Check if user purchased post
```javascript
const purchase = await prisma.postPurchase.findUnique({
  where: {
    userId_postId: { userId, postId }
  }
});
```

### Get conversation with messages
```javascript
const conversation = await prisma.conversation.findFirst({
  where: {
    participants: {
      some: { id: userId1 }
    },
    AND: {
      participants: {
        some: { id: userId2 }
      }
    }
  },
  include: {
    messages: {
      orderBy: { createdAt: 'desc' },
      take: 50
    }
  }
});
```

### Create transaction with fees
```javascript
const transaction = await prisma.transaction.create({
  data: {
    type: 'SUBSCRIPTION',
    txSignature,
    fromWallet: userWallet,
    toWallet: creatorWallet,
    amount: totalAmount,
    platformFee: totalAmount * 0.05,
    referrerFee: referrer ? totalAmount * 0.05 : 0,
    status: 'PENDING'
  }
});
```

## Key Components
- **PostCard.tsx** (49KB) - Главная карточка поста
- **CreatePostModal.tsx** (41KB) - Создание постов
- **SubscribeModal.tsx** (29KB) - Подписки
- **EditPostModal.tsx** (25KB) - Редактирование постов
- **CreatorsExplorer.tsx** (22KB) - Обзор создателей
- **PurchaseModal.tsx** (19KB) - Покупка контента
- **ImageCropModal.tsx** (8KB) - Кроп изображений
- **OptimizedImage.tsx** (6KB) - Оптимизация изображений

## API Endpoints Structure
- `/api/posts` - CRUD постов
- `/api/messages` - Личные сообщения + PPV
- `/api/subscriptions` - Подписки
- `/api/conversations` - Диалоги
- `/api/tips` - Чаевые
- `/api/flash-sales` - Flash-распродажи
- `/api/upload` - Загрузка медиа
- `/api/user` - Профиль пользователя
- `/api/creators` - Создатели
- `/api/admin` - Админ функции

## Quick Commands

### Status:
```bash
ssh -p 43988 root@69.10.59.234 "pm2 status"
```

### Logs:
```bash
ssh -p 43988 root@69.10.59.234 "pm2 logs fonana --lines 50"
```

### Restart:
```bash
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana"
```

### Database Stats:
```bash
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/health-check.js"
```

## White Screen Fix

**FIRST ALWAYS TRY:**
```bash
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && ./scripts/fix-white-screen.sh"
```

**If still broken:**
```bash
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npm run build && pm2 restart fonana"
```

## Common Issues & Solutions

### 1. Port Already in Use (EADDRINUSE)
```bash
# Kill all node processes
ssh -p 43988 root@69.10.59.234 "pkill -f node"
# Restart
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && pm2 start ecosystem.config.js"
```

### 2. Database Connection Issues  
```bash
# Check Postgres
ssh -p 43988 root@69.10.59.234 "systemctl status postgresql"
# Check migrations
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npx prisma migrate status"
```

### 3. CSS Classes Missing (Tailwind)
- Check `tailwind.config.js` safelist
- Rebuild: `npm run build`
- Common missing: `aspect-3/4`, `aspect-video`, `aspect-square`

### 4. Image Upload Problems
```bash
# Check upload permissions
ssh -p 43988 root@69.10.59.234 "ls -la /var/www/fonana/public/"
# Fix permissions
ssh -p 43988 root@69.10.59.234 "chmod -R 755 /var/www/fonana/public/"
```

## Diagnostic Scripts (Available)
```bash
# General health check
node scripts/health-check.js

# Check specific features
node scripts/check-flash-sales.js
node scripts/check-backgrounds.js
node scripts/check-creator-earnings.js
node scripts/check-transaction.js

# Test specific functionality  
node scripts/test-sellable-posts.js
node scripts/test-tier-access.js
```

## Current Features Status

✅ **COMPLETED & WORKING:**
- Personal Messages + PPV (Pay-per-view)
- Tips система
- Flash Sales
- Subscription tiers (3 levels)
- Post creation/editing with image crop
- Solana wallet integration
- Notification system
- Comment system
- Creator earnings

🔄 **IN DEVELOPMENT:**
- Live streaming (waiting for user base)
- Stories (waiting for user base)
- Advanced search/discovery

## Project Structure
```
app/
├── api/           # Backend API routes
├── feed/          # Main feed page
├── creator/[id]/  # Creator profiles
├── messages/      # Direct messages
├── profile/       # User profiles
└── create/        # Content creation

components/        # React components
lib/              # Utilities & configs
prisma/           # Database schema
scripts/          # Diagnostic tools
public/           # Static assets
```

## Technical Stack
- Next.js 14 + TypeScript
- PostgreSQL + Prisma ORM
- Solana Web3 integration
- PM2 process manager
- Port 3000 (default, may auto-increment if busy)

## Solana RPC
- HTTPS: `https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/`
- WSS: `wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/`

## Development Guidelines
1. **Analyze First**: Check both local and server states before changes
2. **Preserve Integrity**: Understand existing routes, data flows, and dependencies
3. **Test Locally**: Run changes on localhost:3000 before deploying
4. **Deploy Safely**: Use the deploy script, don't break production data
5. **Check Logs**: Always check pm2 logs after deployment
6. **Use Scripts**: Leverage existing diagnostic scripts before implementing new ones

## Before Making Changes - ALWAYS CHECK:
```bash
# 1. Current status
ssh -p 43988 root@69.10.59.234 "pm2 status && pm2 logs fonana --lines 10"

# 2. Database health  
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/health-check.js"

# 3. Recent changes
git log --oneline -10
```

## Deploy Process
1. Test locally: `npm run dev`
2. Commit changes: `git add -A && git commit -m "description"`
3. Deploy: `./deploy-to-production.sh`
4. Verify: Check pm2 logs and test functionality
5. Push to GitHub: `git push origin main`

## Task Templates

### For Implementation
"Implement [feature]. Analyze current architecture, check existing similar components, preserve existing systems, test locally, then deploy."

### For Fixes
"Fix [issue]. Check pm2 logs first, determine if it's routing/data/component issue, use diagnostic scripts, test locally, then deploy."

### For Analysis
"Analyze [system/issue]. Check production logs, use health-check script, examine database state, then provide findings."

## Emergency Contacts
- If deployment fails completely: Use `scripts/safe-deploy.sh`
- If database is corrupted: Contact project owner immediately
- If server is down: Check with hosting provider

## DON'T DO:
- ❌ Delete production data without explicit permission
- ❌ Change database schema without migration
- ❌ Deploy without testing locally first
- ❌ Ignore pm2 logs after deployment
- ❌ Remove existing functionality without understanding dependencies 

## Important Constants & Configuration

### Platform Fees
- **Platform Fee**: 5% от всех транзакций
- **Referrer Fee**: 5% от реферальных транзакций
- **Creator Earnings**: 90% (95% если нет реферера)

### Subscription Tiers
```javascript
const DEFAULT_TIERS = {
  basic: { price: 5, description: 'Basic tier' },
  premium: { price: 10, description: 'Premium tier' },
  vip: { price: 20, description: 'VIP tier' }
};
```

### Image Aspect Ratios
- **vertical**: 3:4 (aspect-3/4)
- **square**: 1:1 (aspect-square)
- **horizontal**: 16:9 (aspect-video)

### File Upload Limits
- **Images**: 10MB max
- **Videos**: 100MB max
- **Supported formats**: jpg, jpeg, png, gif, mp4, webm

### Wallet Configuration
- **Platform Wallet**: `HdHRAm5bnhBFwuL46BgrN1BzDETSxtxQffiW7FZGPJjW`
- **Default RPC**: https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/

### Flash Sale Limits
- **Min Discount**: 10%
- **Max Discount**: 90%
- **Default Duration**: 24 hours

### PPV Message Settings
- **Max Price**: 1000 SOL
- **Min Price**: 0.01 SOL
- **Blur Effect**: Applied to isPaid messages

### Notification Settings
- **Sound Files**: 
  - Single: `/sounds/notification-single.mp3`
  - Trill: `/sounds/notification-trill.mp3`
- **Poll Interval**: 10 seconds

### API Rate Limits
- **Posts per request**: 20
- **Messages per request**: 50
- **Comments per request**: 30

### Environment Variables (Required)
```bash
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://fonana.ai
NEXTAUTH_SECRET=...
GITHUB_ID=...
GITHUB_SECRET=...
``` 