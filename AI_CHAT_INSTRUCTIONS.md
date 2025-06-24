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
PM2 manages the app with ecosystem.config.js
```

## ⚠️ CRITICAL: Preventing Duplicate Processes

### Problem
Sometimes systemd and PM2 can run the app simultaneously on different ports (3000/3001), causing conflicts.

### Prevention
1. **Before EVERY deployment**: Check for duplicates
   ```bash
   ssh -p 43988 root@69.10.59.234 "ps aux | grep -E 'node|next' | grep -v grep"
   ```

2. **If duplicates found**: Run cleanup
   ```bash
   ./scripts/disable-systemd-service.sh
   ```

3. **Use ONLY PM2**: Never use systemd service for this project

### Quick Fix
```bash
# Kill all node processes and restart
ssh -p 43988 root@69.10.59.234 "pkill -f node && cd /var/www/fonana && pm2 start ecosystem.config.js"
```

## 📋 Version Management

### Automatic Versioning
- Version format: `YYYYMMDD-HHMMSS-<commit-hash>`
- Auto-generated on each deployment
- Displayed in footer (bottom-right corner)
- File: `lib/version.ts` (gitignored)

### Check Current Version
```bash
# On production
ssh -p 43988 root@69.10.59.234 "cat /var/www/fonana/lib/version.ts"

# In browser
Look at bottom-right corner of any page
```

## 💱 Dynamic SOL/USD Exchange Rate System

### Overview
- Real-time SOL/USD rate from CoinGecko API
- 5-minute cache for performance
- Fallback rate: 135 USD
- Auto-updates across all components

### API Endpoint
```bash
GET /api/pricing
Response: {
  "success": true,
  "rate": 134.66,
  "lastUpdate": "2025-06-23T17:29:22.593Z",
  "data": {
    "prices": {
      "SOL_USD": 134.66,
      "BTC_USD": 50000,
      "ETH_USD": 3000,
      "timestamp": 1750699762593,
      "source": "coingecko"
    }
  }
}
```

### Usage in Components
```typescript
import { useSolRate } from '@/lib/hooks/useSolRate'

function MyComponent() {
  const { rate: solRate, isLoading } = useSolRate()
  
  return (
    <div>
      <span>0.1 SOL</span>
      <span>(≈ ${(0.1 * solRate).toFixed(2)} USD)</span>
    </div>
  )
}
```

## Database Models (Key Tables)
- **User** - Пользователи
- **Post** - Посты
- **Subscription** - Подписки  
- **Message** - Личные сообщения
- **Comment** - Комментарии
- **FlashSale** - Flash-распродажи
- **Transaction** - Все транзакции (Solana + внутренние)
- **Notification** - Уведомления системы
- **CreatorTierSettings** - Настройки тарифов создателей (renamed to tierSettings in relation)
- **PostPurchase** - Покупки постов
- **MessagePurchase** - Покупки PPV сообщений

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
  
  // Relations
  tierSettings   CreatorTierSettings?  // One-to-one relation
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
  plan         String   // 'basic' | 'premium' | 'vip' | 'Free'
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
- User → CreatorTierSettings (1:1) - Настройки тиров создателя
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
  
  // Relations
  creator     User     @relation(fields: [creatorId], references: [id])
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
- **PostCard.tsx** - Главная карточка поста (с поддержкой Flash Sales и USD)
- **CreatePostModal.tsx** - Создание постов с ценами и тирами
- **SubscribeModal.tsx** - Подписки с динамическими ценами
- **EditPostModal.tsx** - Редактирование постов
- **CreatorsExplorer.tsx** - Обзор создателей
- **PurchaseModal.tsx** - Покупка контента с USD отображением
- **SellablePostModal.tsx** - Создание продаваемых постов/аукционов
- **FlashSalesList.tsx** - Управление Flash Sales
- **FlashSale.tsx** - Компонент Flash Sale с таймером
- **ImageCropModal.tsx** - Кроп изображений
- **OptimizedImage.tsx** - Оптимизация изображений  
- **SolanaRateDisplay.tsx** - Отображение курса SOL/USD в navbar
- **SearchBar.tsx** - Универсальный компонент поиска с автокомплитом и фильтрами

## API Endpoints Structure
- `/api/posts` - CRUD постов
- `/api/messages` - Личные сообщения + PPV
- `/api/subscriptions` - Подписки
- `/api/conversations` - Диалоги
- `/api/tips` - Чаевые
- `/api/flash-sales` - Flash-распродажи
- `/api/upload` - Загрузка медиа
- `/api/search` - Поиск по создателям и постам с фильтрами
- `/api/search/autocomplete` - Автокомплит для поиска
- `/api/user` - Профиль пользователя
- `/api/creators` - Создатели
- `/api/admin` - Админ функции
- `/api/pricing` - Динамический курс SOL/USD

## 🚀 DevOps Infrastructure (NEW - January 2025)

### CI/CD Pipeline
- **GitHub Actions**: Automatic testing on every push
- **Workflow**: `.github/workflows/test.yml`
- **Status**: https://github.com/DukeDeSouth/Fonana/actions
- **Tests**: Type checking, linting, build verification
- **Note**: Created via GitHub web UI due to OAuth restrictions

### Monitoring & Logging
- **Log Rotation**: Configured with logrotate (7-day retention)
- **Status Script**: `./scripts/devops-status.sh` - comprehensive system check
- **Log Monitor**: `/var/www/fonana/scripts/log-monitor.sh` on server
- **No Password Required**: SSH key authentication is configured

### Security Improvements
- **SSH Keys**: ✅ CONFIGURED - No password required for SSH access
- **SSH Key Setup**: `./scripts/setup-ssh-key-auth.sh` (already executed)
- **Deploy User**: `./scripts/setup-deploy-user.sh` (for future implementation)
- **Docker**: `docker-compose.dev.yml` (local development only)

### Deploy Process Issues & Solutions
- **Issue**: Deploy script sometimes exits early after killing processes
- **Solution**: Complete deployment manually:
  ```bash
  ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && git pull && npm run build && pm2 start ecosystem.config.js && nginx -s reload"
  ```

### DevOps Scripts
```bash
# Check overall system status
./scripts/devops-status.sh

# Set up SSH keys for passwordless access
./scripts/setup-ssh-key-auth.sh

# Deploy to production
./deploy-to-production.sh
```

## Quick Commands

### Status:
```bash
# Quick status check (no password required!)
ssh -p 43988 root@69.10.59.234 "pm2 status"

# Comprehensive status (recommended)
./scripts/devops-status.sh

# Check CI/CD status
open https://github.com/DukeDeSouth/Fonana/actions
```

### Logs:
⚠️ **ВАЖНО**: НЕ читайте логи напрямую через SSH - они зависают! Сначала скачайте:
```bash
# Скачать логи в файл
ssh -p 43988 root@69.10.59.234 "pm2 logs fonana --lines 100 --nostream > /tmp/fonana-logs.txt && cat /tmp/fonana-logs.txt"

# Или для ошибок
ssh -p 43988 root@69.10.59.234 "tail -n 100 /root/.pm2/logs/fonana-error.log > /tmp/fonana-error.txt && cat /tmp/fonana-error.txt"

# НЕ ИСПОЛЬЗУЙТЕ: ssh ... "pm2 logs fonana --lines 50" - это зависнет!
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

### 5. Build Warnings - Dynamic Server Usage
**Warning**: "Page couldn't be rendered statically because it used `headers` or `searchParams`"
- **Occurs in**: `/api/admin/users`, `/api/search`, `/api/search/autocomplete`
- **Impact**: None - these are API routes that should be dynamic
- **Solution**: These warnings are expected and can be ignored

### 5. Subscription Plan Mismatch
**Problem**: System was auto-correcting subscription plans based on price, causing Premium subscriptions to save as Basic/Free.

**Solution**:
```bash
# Fix existing wrong subscriptions
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/fix-wrong-subscription-plans.js"

# Check specific creator's subscriptions
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/check-custom-tier-settings.js"
```

## Diagnostic Scripts (Available)
```bash
# General health check
node scripts/health-check.js

# Subscription system checks
node scripts/check-custom-tier-settings.js
node scripts/analyze-subscription-bugs.js
node scripts/fix-wrong-subscription-plans.js
node scripts/check-dogwater-premium-issue.js

# Feature checks
node scripts/check-flash-sales.js
node scripts/check-backgrounds.js
node scripts/check-creator-earnings.js
node scripts/check-transaction.js
node scripts/test-dynamic-pricing.js

# Test specific functionality  
node scripts/test-sellable-posts.js
node scripts/test-tier-access.js
node scripts/test-solana-transaction.js
node scripts/test-search.js

# Transaction debugging
node scripts/check-failed-transactions.js
node scripts/fix-missing-transaction.js
node scripts/check-price-discrepancy.js
```

## Recent Updates & Fixes

### DevOps Infrastructure (January 2025)
- **CI/CD**: GitHub Actions workflow for automated testing
- **Monitoring**: Comprehensive status check script
- **Logging**: Automated log rotation with 7-day retention
- **Security**: SSH key setup script for passwordless access
- **Metadata Fix**: Added metadataBase to fix social media preview warnings
- **Fixed Issues**:
  - ✅ SSH passwordless access configured
  - ✅ Metadata warning resolved (added metadataBase: https://fonana.me)
  - ✅ Log rotation preventing disk overflow
  - ✅ CI/CD pipeline testing every commit

### Search Functionality (June 24, 2025)
- **Added**: Full-text search with autocomplete
- **Features**: 
  - Search creators by nickname, name, bio
  - Search posts by title and content
  - Advanced filters (category, price, content type, tier)
  - Autocomplete suggestions with debounce
  - Integrated into Navbar, Feed, and Creators pages
- **Endpoints**: `/api/search` and `/api/search/autocomplete`
- **Test**: `node scripts/test-search.js`

### Subscription System Fix (June 23, 2025)
- **Issue**: Plans were auto-corrected based on price, breaking custom tier pricing
- **Fix**: Removed automatic plan correction in `process-payment`
- **Result**: Now saves the exact plan requested by user
- **Scripts**: 
  - `fix-wrong-subscription-plans.js` - Fix existing wrong plans
  - `check-custom-tier-settings.js` - Verify creator settings
  - `analyze-subscription-display-issue.js` - Debug display issues

## Current Features Status

✅ **COMPLETED & WORKING:**
- Personal Messages + PPV (Pay-per-view)
- Tips система
- Flash Sales with countdown timers
- Subscription tiers (3 levels) - настраиваемые создателями
- Post creation/editing with image crop
- Solana wallet integration
- Notification system with sounds
- Comment system with replies
- Creator earnings dashboard
- Dynamic SOL/USD exchange rate
- Sellable posts (fixed price & auctions)
- Referral system (5% commission)
- Custom tier pricing per creator
- Search system with autocomplete and filters
- Search by creators (nickname, name, bio)
- Search by posts (title, content)
- Advanced filters (category, price, content type, tier)

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
├── create/        # Content creation
├── dashboard/     # Creator dashboard
├── search/        # Search results page
└── test/          # Test pages

components/        # React components
lib/              # Utilities & configs
├── hooks/        # React hooks
├── pricing/      # Pricing system
└── solana/       # Blockchain integration
prisma/           # Database schema
scripts/          # Diagnostic & fix tools
public/           # Static assets
```

## Technical Stack
- Next.js 14 + TypeScript
- PostgreSQL + Prisma ORM
- Solana Web3 integration
- PM2 process manager (ecosystem.config.js)
- Port 3000 (default)
- Tailwind CSS

## Solana Configuration
- **Platform Wallet**: `npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4`
- **RPC Endpoint**: `https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/`
- **WSS Endpoint**: `wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/`

## Development Guidelines
1. **Analyze First**: Check both local and server states before changes
2. **Preserve Integrity**: Understand existing routes, data flows, and dependencies
3. **Test Locally**: Run changes on localhost:3000 before deploying
4. **Deploy Safely**: Use the deploy script, don't break production data
5. **Check Logs**: Always check pm2 logs after deployment
6. **Use Scripts**: Leverage existing diagnostic scripts before implementing new ones

## Before Making Changes - ALWAYS CHECK:
```bash
# 1. Current status (no password needed!)
ssh -p 43988 root@69.10.59.234 "pm2 status"

# 2. Check last errors (без зависания!)
ssh -p 43988 root@69.10.59.234 "tail -n 20 /root/.pm2/logs/fonana-error.log > /tmp/quick-check.txt && cat /tmp/quick-check.txt"

# 3. Database health  
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/health-check.js"

# 4. Recent changes
git log --oneline -10

# 5. BEST OPTION - Full system check
./scripts/devops-status.sh
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
- ❌ Auto-correct subscription plans based on price (это было причиной багов!)

## Important Constants & Configuration

### Platform Fees
- **Platform Fee**: 5% от всех транзакций
- **Referrer Fee**: 5% от реферальных транзакций
- **Creator Earnings**: 90% (95% если нет реферера)

### Subscription Tiers
- Цены и описания настраиваются каждым создателем индивидуально
- Три уровня: Basic, Premium, VIP
- Хранятся в CreatorTierSettings (relation name: tierSettings)
- **НЕ корректировать план автоматически по цене!**

### Image Aspect Ratios
- **vertical**: 3:4 (aspect-3/4)
- **square**: 1:1 (aspect-square)
- **horizontal**: 16:9 (aspect-video)

### File Upload Limits
- **Images**: 10MB max
- **Videos**: 100MB max
- **Supported formats**: jpg, jpeg, png, gif, mp4, webm

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

### Dynamic Pricing Settings
- **Exchange Rate Cache**: 5 minutes
- **Fallback Rate**: 135 USD/SOL
- **Price Sources**: CoinGecko (primary)

### Environment Variables (Required)
```bash
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://fonana.me
NEXTAUTH_SECRET=...
GITHUB_ID=...
GITHUB_SECRET=...
``` 