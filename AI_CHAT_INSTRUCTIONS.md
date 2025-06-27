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
Unified Post System completed with modular architecture
UserContext migration completed - centralized user state management
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
  isPremium     Boolean   @default(false)  // DEPRECATED: Use minSubscriptionTier instead
  price         Float?
  currency      String    @default("SOL")
  minSubscriptionTier String?  // 'basic' | 'premium' | 'vip' - Primary access control field
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
- Transaction → Subscription/PostPurchase (1:1) - Связь с покупками

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

### 🔥 User State Management (COMPLETED - June 27, 2025)
- **Core**: `lib/contexts/UserContext.tsx` - единая точка управления состоянием пользователя
- **MIGRATION COMPLETED**: 100% компонентов мигрированы на централизованный UserContext
- **Features**:
  - Централизованное управление состоянием пользователя
  - Автоматическая загрузка данных при подключении кошелька
  - Кеширование с TTL на 7 дней (управляется ТОЛЬКО внутри UserContext)
  - Автоматическая повторная загрузка при ошибках (retry через 2 сек)
  - Синхронизация состояния между всеми компонентами
  - API fallback для асинхронных операций
  - Интеграция с централизованной логикой доступа через `checkPostAccess()` из `lib/utils/access.ts`

#### Usage Guidelines
```typescript
// ✅ ПРАВИЛЬНО - использование UserContext
import { useUserContext } from '@/lib/contexts/UserContext'

function MyComponent() {
  const { user, isLoading, error, refreshUser } = useUserContext()
  
  // Access user data
  if (user) {
    console.log(user.id, user.wallet, user.nickname)
    // Use user.id for API calls
    // Use user.wallet for blockchain operations
    // Use user.nickname for display
  }
  
  // Handle loading state
  if (isLoading) return <div>Loading...</div>
  
  // Handle errors
  if (error) return <div>Error: {error}</div>
  
  // Force refresh if needed
  const handleRefresh = () => refreshUser()
}

// ❌ НЕПРАВИЛЬНО - прямой доступ к localStorage
const wallet = localStorage.getItem('fonana_user_wallet') // НЕ ДЕЛАЙТЕ ТАК!

// ❌ НЕПРАВИЛЬНО - использование устаревших хуков
import { useUser } from '@/lib/hooks/useUser' // УДАЛЕН!
```

#### Key Points
- **Single Source of Truth**: UserContext управляет всем состоянием пользователя
- **No Direct localStorage Access**: ЗАПРЕЩЕНО читать/писать localStorage напрямую
- **Automatic Session Management**: Сессии автоматически сохраняются и восстанавливаются
  - **Error Recovery**: Автоматический retry при ошибках загрузки
  - **Type Safety**: Полная типизация всех данных пользователя

### 🚀 Creator Data Management (COMPLETED - December 2024)
- **Core**: `lib/contexts/CreatorContext.tsx` - централизованное управление данными создателя
- **Hook**: `lib/hooks/useCreatorData.ts` - экспорт хука для удобства
- **Status**: ✅ ЗАВЕРШЕНО + v2 улучшения (29.12.2024)
- **Features**:
  - Централизованное управление данными создателя по ID
  - Кеширование данных с TTL на 7 дней
  - Автоматическая повторная загрузка при ошибках
  - Поддержка tierSettings, flashSales, earnings
  - Интеграция с компонентами RevenueChart и FlashSalesList
  
#### v2 Улучшения (COMPLETED - December 29, 2024)
- **Оптимистичные обновления**: 
  - `updateCreatorLocally()` - мгновенное применение изменений
  - `revertCreator()` - откат при ошибках
  - Синхронизация с сервером после успеха
- **WebSocket интеграция**:
  - Real-time обновления данных создателя
  - Автоматическое переподключение
  - События: профиль, подписки, earnings, flash sales
- **Синхронизация между вкладками**:
  - BroadcastChannel API для современных браузеров
  - Fallback на localStorage events
  - Мгновенная синхронизация во всех вкладках
- **Улучшенная обработка ошибок**:
  - Категоризация ошибок (401/403/404/500)
  - Ограниченные retry с экспоненциальной задержкой
  - Понятные сообщения для пользователя

#### Usage Guidelines
```typescript
// На странице создателя - оберните в провайдер
import { CreatorDataProvider } from '@/lib/contexts/CreatorContext'

export default function CreatorPage() {
  const params = useParams()
  const creatorId = params.id as string

  return (
    <CreatorDataProvider creatorId={creatorId}>
      <CreatorPageContent />
    </CreatorDataProvider>
  )
}

// Внутри компонентов - используйте хук
import { useCreatorData } from '@/lib/hooks/useCreatorData'

function MyComponent() {
  const { 
    creator, 
    isLoading, 
    error, 
    refreshCreator,
    updateCreatorLocally,
    revertCreator 
  } = useCreatorData()
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!creator) return <div>Creator not found</div>
  
  // Оптимистичное обновление
  const handleUpdate = async (data) => {
    updateCreatorLocally(data) // Мгновенное UI обновление
    try {
      await updateAPI(data)
      await refreshCreator() // Синхронизация с сервером
    } catch (err) {
      revertCreator() // Откат при ошибке
    }
  }
  
  return (
    <div>
      <h1>{creator.nickname}</h1>
      <p>{creator.bio}</p>
      <button onClick={refreshCreator}>Refresh</button>
    </div>
  )
}
```

#### Migrated Components
- ✅ `app/creator/[id]/page.tsx` - основная страница создателя
- ✅ `app/creator/[id]/subscribe/page.tsx` - страница подписки
- ✅ `components/RevenueChart.tsx` - график доходов (удален prop creatorId)
- ✅ `components/FlashSalesList.tsx` - список Flash Sales (удален prop creatorId)

#### Key Points
- **Single Source of Truth**: CreatorContext управляет всеми данными создателя
- **Automatic Caching**: Данные кешируются в localStorage на 7 дней
- **Error Recovery**: Автоматический retry через 2 секунды при ошибках (max 3 попытки)
- **Type Safety**: Полная типизация с расширенным интерфейсом CreatorData
- **Test Pages**: 
  - `/test/creator-data` - базовая функциональность
  - `/test/creator-data-v2` - v2 улучшения (оптимистичные обновления, WebSocket, синхронизация)
- **WebSocket Service**: `lib/services/websocket.ts` - управление real-time обновлениями
- **Cross-tab Sync**: Автоматическая синхронизация между вкладками браузера

### Unified Post System (COMPLETED - February 2025)
- **components/posts/layouts/**
  - `PostsContainer.tsx` - Главный контейнер с поддержкой list/grid/masonry
  - `PostGrid.tsx` - Grid layout для Dashboard/Search
  - `PostList.tsx` - List layout для Feed/Profile/Creator
- **components/posts/core/**
  - `PostCard/` - Адаптивная карточка (full/compact/minimal варианты)
  - `PostHeader/` - Информация о создателе с валидацией creator.id
  - `PostContent/` - Отображение медиа контента с проверкой isCreatorPost
  - `PostActions/` - Кнопки действий (лайки, комментарии) с callback обработкой
  - `PostLocked/` - Заблокированный контент с градиентами
  - `PostTierBadge/` - Индикаторы тиров
  - `PostFlashSale/` - Flash Sale компонент
  - `CommentsSection/` - Inline комментарии с анимацией fade-in
- **services/posts/normalizer.ts** - Нормализация данных с защитой от ошибок
- **types/posts/index.ts** - Унифицированные типы (UnifiedPost, PostCreator, etc.)
- **lib/hooks/useUnifiedPosts.ts** - Хук с getUserId через UserContext и API fallback

### Modal Components
- **CreatePostModal.tsx** - Создание постов с ценами и тирами
- **SubscribeModal.tsx** - Подписки с динамическими ценами
- **EditPostModal.tsx** - Редактирование постов
- **PurchaseModal.tsx** - Покупка контента с USD отображением
- **SellablePostModal.tsx** - Создание продаваемых постов/аукционов
- **ImageCropModal.tsx** - Кроп изображений

### Other Key Components
- **CreatorsExplorer.tsx** - Обзор создателей
- **FlashSalesList.tsx** - Управление Flash Sales
- **FlashSale.tsx** - Компонент Flash Sale с таймером
- **OptimizedImage.tsx** - Оптимизация изображений  
- **SolanaRateDisplay.tsx** - Отображение курса SOL/USD в navbar
- **SearchBar.tsx** - Универсальный компонент поиска с автокомплитом и фильтрами
- **RevenueChart.tsx** - Графики доходов создателя с экспортом в CSV и списком подписчиков
- **HybridWalletConnect.tsx** - Гибридная авторизация через Solana с JWT
- **ConnectWalletOnDemand.tsx** - Подключение кошелька по требованию для транзакций

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
- `/api/creators/analytics` - Расширенная аналитика создателя (графики, топ контент, все подписчики)
- `/api/admin` - Админ функции
- `/api/pricing` - Динамический курс SOL/USD
- `/api/auth/wallet` - JWT авторизация через Solana wallet

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

### Deploy Process Issues & Solutions ✅ FIXED (June 26, 2025)
- **Issue**: Deploy script sometimes exits early after killing processes
- **Root Cause**: Multiple SSH connections and aggressive `pkill -f node` breaking SSH session
- **Solution**: Script rewritten to use single SSH connection with safe process termination
- **Changes**:
  - All commands run in one SSH session using heredoc
  - Graceful shutdown: `pm2 stop all` → `kill -TERM` → wait → `kill -9`
  - Only kills processes from `/var/www/fonana` directory
  - Added `set -e` for error handling inside SSH session
- **Documentation**: See `DEPLOY_SCRIPT_SAFE_UPDATE.md`
- **Backup**: Old script saved as `deploy-to-production.sh.backup-20250626-*`

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
# Restart Next.js app
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana"

# Restart WebSocket server
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana-ws"

# Restart all
ssh -p 43988 root@69.10.59.234 "pm2 restart all"
```

### Database Stats:
```bash
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/health-check.js"
```

### Subscription Issues Check:
```bash
# Quick check for payment issues
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/check-pending-subscriptions.js"

# Check specific creator's subscriptions
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/check-fonanadev-all-subscribers.js"

# Check recent payment problems (last 24h)
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/check-recent-payment-issues.js"
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

### 6. Subscription Plan Mismatch
**Problem**: System was auto-correcting subscription plans based on price, causing Premium subscriptions to save as Basic/Free.

**Solution**:
```bash
# Fix existing wrong subscriptions
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/fix-wrong-subscription-plans.js"

# Check specific creator's subscriptions
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/check-custom-tier-settings.js"
```

### 7. Prisma Version Mismatch (CRITICAL)
**Problem**: `Failed to deserialize constructor options... missing field enableTracing`
- **Cause**: Mismatch between @prisma/client and prisma CLI versions
- **Common trigger**: Installing new packages may update one but not the other

**Solution**:
```bash
# 1. Check versions in package.json
grep -E "(prisma|@prisma/client)" package.json

# 2. Ensure both are same major version (e.g., both 5.x)
# Edit package.json, then:
rm -rf node_modules package-lock.json
npm install

# 3. If build fails on server:
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && rm -rf node_modules package-lock.json && npm install && npm run build"
```

### 8. Port Conflicts (Local Development)
**Problem**: "Port 3000 is in use, trying 3001 instead"
- **Cause**: Another process using port 3000
- **Note**: Development will auto-switch to 3001 if needed

### 9. Subscription Payment Status Issue (CRITICAL)
**Problem**: Users purchase subscriptions but don't get access despite payment
- **Symptoms**: 
  - Subscription shows as active but user can't access content
  - PaymentStatus is PENDING despite successful transaction
  - No txSignature in subscription record
- **Cause**: Subscription created without payment validation

**Solution**:
```bash
# 1. Check affected subscriptions
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/check-pending-subscriptions.js"

# 2. Fix pending premium subscriptions
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/fix-pending-premium-subscriptions.js"

# 3. Fix free subscriptions status
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/fix-free-subscriptions-status.js"

# 4. Verify all subscriptions have proper status
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/test-all-subscription-types.js"
```

**Prevention**:
- Never create paid subscriptions via `/api/subscriptions` POST
- Always use `/api/subscriptions/process-payment` for paid subscriptions
- Check both `isActive` AND `paymentStatus === 'COMPLETED'` for access

### 10. Subscription Display Issue (January 2025)
**Problem**: Premium subscriptions displayed as "basic" in UI after successful payment
- **Symptoms**:
  - User pays for Premium, gets charged, but UI shows "basic" tier
  - Posts remain locked despite having Premium access
  - Profile shows wrong subscription tier
- **Cause**: Case mismatch - DB stores "Premium", code checked for "premium"

**Solution**:
```bash
# Check specific user's subscription
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/diagnose-subscription-display-issue.js username creatorname"

# Fix display issues
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/fix-subscription-display-issue.js"
```

**Code Fix**:
- Normalize plans to lowercase when loading: `plan?.toLowerCase()`
- Use `formatPlanName()` function for display
- File: `app/creator/[id]/page.tsx`

## Diagnostic Scripts (Available)
```bash
# General health check
node scripts/health-check.js

# Subscription system checks
node scripts/check-custom-tier-settings.js
node scripts/analyze-subscription-bugs.js
node scripts/fix-wrong-subscription-plans.js
node scripts/check-dogwater-premium-issue.js
node scripts/check-pending-subscriptions.js
node scripts/check-subscriptions-without-status.js
node scripts/test-all-subscription-types.js
node scripts/test-subscription-flow.js
node scripts/fix-pending-premium-subscriptions.js
node scripts/fix-free-subscriptions-status.js
node scripts/fix-subscriptions-without-status.js
node scripts/check-recent-payment-issues.js
node scripts/check-fonanadev-24h.js
node scripts/check-fonanadev-all-subscribers.js
node scripts/diagnose-subscription-display-issue.js
node scripts/check-premium-subscription-issues.js
node scripts/test-subscription-display-flow.js
node scripts/fix-subscription-display-issue.js

# Feature checks
node scripts/check-flash-sales.js
node scripts/check-backgrounds.js
node scripts/check-creator-earnings.js
node scripts/check-transaction.js
node scripts/test-dynamic-pricing.js

# Referral system
node scripts/diagnose-referral-system.js

# Test specific functionality  
node scripts/test-sellable-posts.js
node scripts/test-tier-access.js
node scripts/test-solana-transaction.js
node scripts/test-search.js

# Analytics & Revenue
node scripts/test-creator-analytics.js
node scripts/check-creator-balance.js

# Transaction debugging
node scripts/check-failed-transactions.js
node scripts/fix-missing-transaction.js
node scripts/check-price-discrepancy.js
```

## Recent Updates & Fixes

### Access Control System Refactoring (June 27, 2025) 🚀 COMPLETED
- **Problem**: Дублирующая логика доступа к контенту, локальные константы тиров в компонентах
- **Root Cause**: 
  - Отсутствие централизованной системы контроля доступа
  - Локальные определения TIER_HIERARCHY в разных файлах
  - Использование устаревшего поля isPremium
- **Solution**: Полная централизация логики доступа и визуальных констант
  - Создан `lib/constants/tiers.ts` с TIER_HIERARCHY и DEFAULT_TIER_PRICES
  - Создан `lib/constants/tier-styles.ts` с TIER_VISUAL_DETAILS
  - Создан `lib/utils/access.ts` с утилитами контроля доступа
  - Мигрированы все компоненты на централизованные импорты
  - isPremium оставлен только для обратной совместимости
- **Key Changes**:
  - ✅ Все компоненты используют централизованные константы
  - ✅ Единая логика проверки доступа через checkPostAccess()
  - ✅ Визуальные стили тиров в одном месте
  - ✅ Полная TypeScript типизация
- **Result**: Единообразная, поддерживаемая система контроля доступа
- **Docs**: LEGACY_CODE_AUDIT_REPORT.md

### User State Management Migration (June 27, 2025) 🚀 COMPLETED
- **Problem**: User data loading was inconsistent, multiple components used different methods to get user info
- **Root Cause**: 
  - Asynchronous user data loading created race conditions
  - Multiple components using direct localStorage access
  - Lack of centralized state management
- **Solution**: Complete migration to centralized UserContext
  - Created `lib/contexts/UserContext.tsx` with global state management
  - Features: localStorage caching (7-day TTL), retry mechanism, auto-loading
  - Migrated 100% of components (25 components migrated, 19 didn't need changes)
  - Removed all temporary solutions and deprecated code
- **Key Changes**:
  - ✅ All components now use `useUserContext()` hook
  - ✅ No direct localStorage access anywhere in codebase
  - ✅ Automatic session restoration on page refresh
  - ✅ Built-in error recovery with retry mechanism
- **Result**: Centralized, reliable user state management across entire application
- **Docs**: USER_CONTEXT_MIGRATION_STATUS.md

### Unified Post System - Complete Implementation (February 2025) 🔥 COMPLETED
- **Initial Problems**: Posts displayed inconsistently across pages with 1210-line PostCard component
- **Solution**: Complete post system unification with modular architecture
- **Implementation Phases**:
  1. Created unified types and interfaces
  2. Built container and layout components
  3. Developed modular core components
  4. Migrated all pages to new system
  5. Fixed all edge cases and issues
- **Key Features**:
  - Modular architecture with focused components
  - Three layout variants (list/grid/masonry)
  - Full TypeScript support
  - Inline comments with animations
  - Async user loading with API fallback
- **Test Page**: `/test/unified-posts` - interactive testing of all variants
- **Docs**: UNIFIED_POSTCARD_FIX.md, UNIFIED_POSTCARD_FIX_V2.md, UNIFIED_POSTCARD_FIX_V3.md

### Subscription Display Fix (January 29, 2025)
- **Problem**: Premium subscriptions showed as "basic" in UI after successful payment
- **Root Cause**: Case mismatch - DB stores "Premium" with capital letter, code checked lowercase
- **Solution**:
  - Added plan normalization: `plan?.toLowerCase()` when loading subscription
  - Created `formatPlanName()` function for consistent display
  - Fixed all tier comparison checks to use normalized values
- **Files**: `app/creator/[id]/page.tsx`
- **Scripts**: 
  - `diagnose-subscription-display-issue.js` - analyze subscription formats
  - `fix-subscription-display-issue.js` - fix display issues
- **Docs**: SUBSCRIPTION_DISPLAY_FIX_2025.md

### Referral System Fix (January 27, 2025)
- **Problem**: Welcome popup appeared randomly with wrong values (feed, 404, etc)
- **Root Cause**: Middleware was passing referrer header on EVERY request, causing notification loop
- **Solution**:
  - Header only sent on NEW referral cookie setup
  - Added system paths list to prevent treating `/feed`, `/404` as usernames
  - Enhanced username validation (min 3 chars, must start with letter)
  - Welcome notification shows only once per referrer
- **Diagnostic**: `node scripts/diagnose-referral-system.js`
- **Docs**: REFERRAL_COOKIE_FIX.md

### Direct Messages Fix (January 23, 2025)
- **Problem**: PPV messages weren't working - sent as regular messages without payment
- **Solution**: 
  - Fixed price validation for PPV messages
  - Added Quick Tips bar in chat input for easy tipping
  - Enhanced PPV message design with gradients and animations
  - Added view counters and purchase indicators
  - All monetary features now working correctly
- **Features Added**:
  - Quick Tips buttons (0.01, 0.1, 1, 5 SOL)
  - Custom tip button (gift icon)
  - Improved PPV visual design
  - USD price display everywhere
  - Message animations
- **Docs**: DIRECT_MESSAGES_FIX_2025.md

### Wallet Connection Fixes (December 23, 2024)
- **Problem 1**: Phantom wallet wasn't opening on mobile devices from burger menu
- **Problem 2**: Wallet disconnected on page refresh on desktop
- **Solutions**:
  - Enabled `autoConnect={true}` in WalletProvider with localStorage persistence
  - Fixed mobile wallet connection in burger menu using MobileWalletConnect component
  - Created `useWalletPersistence` hook for automatic reconnection
  - Added `WalletPersistenceProvider` to maintain wallet state across sessions
  - Sessions are valid for 7 days
- **Docs**: WALLET_CONNECTION_FIXES.md
- **Note**: After UserContext migration (June 27, 2025), wallet persistence works in conjunction with UserContext caching

### Browser Detection Fix (December 25, 2024)
- **Problem**: Desktop browsers with Phantom extension were incorrectly detected as embedded wallet browsers
- **Solution**: 
  - Simplified detection to check only `userAgent.includes('phantom') && isMobile`
  - Shows hint only in actual Phantom mobile app
- **Test Page**: `/test/browser-detection` for debugging browser environment
- **Docs**: BROWSER_DETECTION_FIX_2024.md

### Creator Analytics Update (December 24, 2024)
- **Fixed**: Period display bugs (days, weeks, months now show correctly)
- **Added**: Complete subscriber list with spending breakdown
- **Enhanced**: 
  - Detailed spending by category (subscriptions, posts, PPV, tips)
  - Last activity date for each subscriber
  - Pagination for large subscriber lists
  - Toggle between top-10 and all subscribers
- **Improved**: CSV export now includes all subscribers and their detailed spending
- **Optimized**: Database queries with better relations and includes
- **Note**: Withdrawal functionality removed (funds go directly to creators' wallets)

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

### Subscription Payment Issue Resolution (January 22, 2025) 🔴 CRITICAL
- **Problem**: Users were purchasing premium subscriptions, being charged, but not receiving access to content
- **Root Cause**: Found 3 sources creating subscriptions without payment validation:
  1. Unsafe API endpoint `/api/subscriptions` (POST) - created subscriptions without payment verification
  2. Test script `scripts/create-subscriptions.js` - created test subscriptions without payment
  3. Missing validation - system only checked `isActive` flag, not `paymentStatus`
- **Solution**:
  1. **API Protection**: Modified `/api/subscriptions` to only accept free subscriptions
  2. **Access Control**: Added `paymentStatus: 'COMPLETED'` validation to all subscription checks
  3. **Data Cleanup**: Fixed 44 Free and deactivated 18 unpaid Premium subscriptions
- **Prevention**: All paid subscriptions must now use `/api/subscriptions/process-payment`
- **Validation**: Added paymentStatus checks to:
  - `/api/posts/route.ts` - subscription fetching
  - `/api/subscriptions/route.ts` - subscription listing
  - `/api/subscriptions/check/route.ts` - subscription verification
  - `lib/db.ts` - `getUserSubscriptions` and `hasActiveSubscription` functions
- **Scripts Created**:
  - `fix-pending-premium-subscriptions.js` - deactivate/convert unpaid subscriptions
  - `fix-free-subscriptions-status.js` - set COMPLETED status for free subscriptions
  - `fix-subscriptions-without-status.js` - handle old subscriptions missing paymentStatus
  - `check-pending-subscriptions.js` - diagnostic tool
  - `check-subscriptions-without-status.js` - find subscriptions without status
  - `test-all-subscription-types.js` - validate all subscription types
  - `test-subscription-flow.js` - test complete subscription flow
  - `check-recent-payment-issues.js` - check recent payment problems
  - `check-fonanadev-24h.js` - check specific creator's issues
  - `check-fonanadev-all-subscribers.js` - analyze all subscriptions for a creator

## Current Features Status

✅ **COMPLETED & WORKING:**
- **User State Management** - Полная миграция на UserContext завершена (27.06.2025)
- **Unified Post System** - Модульная архитектура с единообразным отображением
- Personal Messages + PPV (Pay-per-view) - Полностью исправлено 23.01.2025
- Tips система с Quick Tips в чате - Улучшено 23.01.2025
- Flash Sales with countdown timers
- Subscription tiers (3 levels) - настраиваемые создателями
- Post creation/editing with image crop
- Solana wallet integration
- Notification system with sounds
- Comment system with inline display - Добавлено 27.02.2025
- Creator earnings dashboard with full analytics
- Dynamic SOL/USD exchange rate
- Sellable posts (fixed price & auctions)
- Referral system (5% commission)
- Custom tier pricing per creator
- Search system with autocomplete and filters
- Search by creators (nickname, name, bio)
- Search by posts (title, content)
- Advanced filters (category, price, content type, tier)
- Creator analytics with revenue charts
- Top posts/subscribers analytics
- Complete subscriber list with spending breakdown
- CSV export of all analytics data
- Hybrid wallet authentication (JWT + Solana)
- Session persistence without constant wallet connection
- Async user loading with API fallback for actions

🔄 **IN DEVELOPMENT:**
- **Creator Data Hook (useCreatorData)** - централизованное управление данными создателей
- Mobile Wallet Adapter (MWA) integration
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
├── constants/    # Centralized constants (tiers, tier-styles)
├── contexts/     # React contexts (UserContext)
├── hooks/        # React hooks
├── pricing/      # Pricing system
├── solana/       # Blockchain integration
└── utils/        # Utility functions (access.ts, subscriptions.ts)
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
- Chart.js + react-chartjs-2 (analytics)
- date-fns (date formatting)

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
7. **User State**: Always use `useUserContext()` for user data access, NEVER access localStorage directly
8. **Type Safety**: Use TypeScript types for all data structures
9. **Error Handling**: Always handle loading and error states in components
10. **Performance**: Use caching and lazy loading where appropriate

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
- ❌ Mix Prisma versions - always keep @prisma/client and prisma CLI in sync
- ❌ Put `prisma` package in dependencies - it belongs in devDependencies only
- ❌ Run production in dev mode unless absolutely necessary
- ❌ Create paid subscriptions via `/api/subscriptions` POST - always use `/api/subscriptions/process-payment`
- ❌ Check only `isActive` for subscription access - must also check `paymentStatus === 'COMPLETED'`
- ❌ Compare subscription plans without normalization - DB stores "Premium", always use `.toLowerCase()` for comparisons
- ❌ Access localStorage directly - use UserContext for all user data
- ❌ Use deprecated hooks like useUser - only use useUserContext
- ❌ Pass user data through props when UserContext is available
- ❌ Use `isPremium` field for access control - use `minSubscriptionTier` instead
- ❌ Define tier hierarchies or visual constants locally - use centralized from `lib/constants/`
- ❌ Hardcode tier prices - use `DEFAULT_TIER_PRICES` from `lib/constants/tiers.ts`
- ❌ Implement custom access logic - use utilities from `lib/utils/access.ts`

## Important Constants & Configuration

### Platform Fees
- **Platform Fee**: 5% от всех транзакций
- **Referrer Fee**: 5% от реферальных транзакций
- **Creator Earnings**: 90% (95% если нет реферера)

### Subscription Tiers & Access Control
- **Цены**: Дефолтные цены определены в `lib/constants/tiers.ts` (DEFAULT_TIER_PRICES)
  - Basic: 0.05 SOL
  - Premium: 0.15 SOL
  - VIP: 0.35 SOL
- **Кастомизация**: Создатели могут переопределить цены через CreatorTierSettings
- **Иерархия доступа**: Определена в `lib/constants/tiers.ts` (TIER_HIERARCHY)
  - free: 1
  - basic: 2
  - premium: 3
  - vip: 4
- **Основное поле доступа**: `minSubscriptionTier` (НЕ `isPremium`!)
- **Логика доступа**: Централизована в `lib/utils/access.ts`
- **НЕ корректировать план автоматически по цене!**
- **НЕ определять логику доступа локально в компонентах!**

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

## PWA Optimizations
- **Service Worker for offline**:
- **Push notifications**:
- **App-like experience**:
- **Install prompts**: 

## Анализ и унификация системы постов в Fonana

### Исходный запрос
Пользователь попросил проанализировать архитектуру постов в приложении Fonana, где посты отображаются по-разному в разных местах (feed, profile, creator pages), и предложить единую унифицированную конструкцию PostCard для оптимизации.

### Реализованное решение

#### Phase 1: Типы и интерфейсы
Созданы файлы:
- `types/posts/index.ts` - унифицированные типы (UnifiedPost, PostCreator, PostContent, PostMedia, PostAccess, PostCommerce, PostEngagement)
- Поддержка всех тиров (free, basic, premium, vip), платных постов, аукционов, Flash Sales

#### Phase 2: Container & Layouts
Созданы:
- `components/posts/layouts/PostsContainer.tsx` - главный контейнер
- `components/posts/layouts/PostGrid.tsx` - grid layout
- `components/posts/layouts/PostList.tsx` - list layout
- `services/posts/normalizer.ts` - нормализация данных
- `components/posts/utils/postHelpers.ts` - утилиты
- `lib/hooks/useUnifiedPosts.ts` - хук для работы с постами
- `lib/utils.ts` - общие утилиты

#### Phase 3: Core Components
Созданы компоненты:
- `PostCard` - адаптивный компонент с вариантами full/compact/minimal
- `PostHeader` - информация о создателе с аватаром и верификацией
- `PostContent` - отображение медиа контента с поддержкой всех типов
- `PostLocked` - заблокированный контент с градиентами по тирам
- `PostActions` - кнопки действий (лайки, комментарии, поделиться)
- `PostTierBadge` - визуальные индикаторы тиров
- `PostFlashSale` - баннер Flash Sale с таймером
- `CommentsSection` - inline комментарии с анимацией

#### Phase 4: Migration ✅ ЗАВЕРШЕНО
Успешно мигрированы все 5 страниц:
- **Feed страница** - использует PostsContainer с layout="list", сохранены все фильтры и модалки
- **Dashboard страница** - использует PostsContainer с layout="grid", сохранена статистика и графики
- **Profile страница** - использует PostsContainer с layout="list" variant="profile"
- **Creator страница** - использует PostsContainer с layout="list" variant="creator"
- **Search страница** - использует PostsContainer с layout="grid" variant="search"

#### Phase 5: Исправления и оптимизация ✅ ЗАВЕРШЕНО
В ходе трех волн исправлений решены все проблемы:
- **Часть 1**: Автор видит свои посты, исправлен My Posts, навигация работает
- **Часть 2**: Валидация creator.id, безопасная нормализация, корректные API вызовы
- **Часть 3**: Async user loading, inline комментарии, плавные анимации

### Ключевые особенности системы
- Полная поддержка всех тиров подписок с иерархией
- Обработка всех типов контента (платные, аукционы, Flash Sales)
- Адаптивный дизайн с mobile-first подходом
- Централизованная нормализация данных через PostNormalizer
- Type-safe архитектура с TypeScript
- Обратная совместимость с существующим API
- Inline комментарии без перезагрузки страницы
- Асинхронная загрузка user с API fallback

### Текущий статус
- ✅ Унификация системы постов ЗАВЕРШЕНА (27 февраля 2025)
- ✅ Все проблемы исправлены в трех итерациях
- ✅ Создана тестовая страница `/test/unified-posts` для проверки всех вариантов
- ✅ Все основные страницы работают с новой архитектурой
- ✅ Система полностью готова к production использованию

### Документация
- UNIFIED_POSTCARD_FIX.md - первая волна исправлений
- UNIFIED_POSTCARD_FIX_V2.md - вторая волна исправлений
- UNIFIED_POSTCARD_FIX_V3.md - третья волна исправлений 

## 🏁 Current System Architecture Status (June 27, 2025)

### ✅ Major Completed Migrations:
1. **Unified Post System** - Modular architecture for consistent post display
2. **User State Management** - Centralized UserContext for all user data
3. **Dynamic Pricing** - Real-time SOL/USD conversion across all components
4. **Subscription System** - Fixed payment validation and tier display
5. **Access Control Refactoring** - Centralized tier logic and visual constants (June 27, 2025)

### 🔧 Architecture Principles:
- **Centralized State**: All user data managed through UserContext
- **Type Safety**: Full TypeScript coverage with strict types
- **Modular Components**: Small, focused components instead of monoliths
- **API Consistency**: Normalized data structures across all endpoints
- **Performance First**: Caching, lazy loading, and optimistic updates
- **Single Source of Truth**: One context, one state, no duplication

### 📝 Key Architectural Decisions:
- **No Direct localStorage Access**: Only UserContext manages localStorage
- **User State Centralization**: User state centralized in one context
- **Automatic Session Management**: Sessions persist and restore automatically
- **Error Recovery**: Failed requests retry automatically with backoff
- **Session Persistence**: 7-day TTL for cached user data
- **Backward Compatibility**: All APIs maintain backward compatibility

### 🚨 Important Notes:
- System is production-ready and stable
- All temporary solutions have been removed
- Code base is clean and maintainable
- Performance optimized with proper caching
- Full TypeScript coverage ensures type safety
- UserContext is the ONLY way to access user data

### 🔄 Real-time WebSocket Layer (COMPLETED - December 29, 2024)
- **Core**: `lib/services/websocket.ts` - расширенный WebSocket сервис
- **Status**: ✅ ЗАВЕРШЕНО (клиентская часть)
- **Server Status**: ✅ РАЗВЕРНУТ В ПРОДАКШН (27 июня 2025)
- **Features**:
  - Real-time уведомления с звуковыми оповещениями
  - Обновления ленты постов (лайки, комментарии, новые посты)
  - Множественные каналы подписки (creator, notifications, feed, post)
  - Throttling для защиты от частых событий
  - Очередь сообщений для offline режима
  - Статистика и мониторинг соединения

#### Server Configuration:
- **Port**: 3002 (WebSocket)
- **Process**: fonana-ws (PM2)
- **Endpoint**: wss://fonana.me/ws
- **Path**: /var/www/fonana/websocket-server/
- **Database**: PostgreSQL (connected)
- **Redis**: Not used (single server mode)

#### Components:
- **NotificationContext** - интегрирован с WebSocket для real-time уведомлений
- **useRealtimePosts** - хук для real-time обновлений постов
- **RealtimePostsContainer** - обертка с баннером новых постов

#### Usage:
```typescript
// Real-time лента постов
import { RealtimePostsContainer } from '@/components/posts/layouts/RealtimePostsContainer'

<RealtimePostsContainer
  posts={posts}
  enableRealtime={true}
  autoUpdateFeed={false}  // true = автообновление, false = накопление с уведомлением
/>

// Real-time хук для кастомных компонентов
import { useRealtimePosts } from '@/lib/hooks/useRealtimePosts'

const { posts, newPostsCount, loadPendingPosts } = useRealtimePosts({ posts })
```

#### WebSocket Events:
- `notification` - новое уведомление
- `post_liked` / `post_unliked` - обновления лайков
- `post_created` / `post_deleted` - управление постами
- `comment_added` / `comment_deleted` - обновления комментариев

#### Key Points:
- **Graceful Degradation**: Fallback на polling при отсутствии WebSocket
- **Optimistic Updates**: Мгновенные UI обновления
- **Cross-tab Sync**: Синхронизация между вкладками
- **Test Page**: `/test/realtime-demo` - полная демонстрация
- **Production**: Развернут на порту 3002, управляется через PM2

#### WebSocket Server Audit (December 30, 2024)
- **Audit Report**: `WEBSOCKET_SERVER_AUDIT_REPORT.md`
- **Overall Readiness**: 30% (client 100% ready, server 0%)
- **Missing Components**:
  - WebSocket server implementation
  - JWT authentication middleware
  - Event routing and broadcasting
  - Redis for pub/sub
- **Recommended Approach**: Separate Node.js WebSocket server on port 3002
- **Implementation Time**: 7-10 days
- **Key Tasks**:
  1. Create WebSocket server with `ws` library
  2. Implement JWT authentication
  3. Add event routing by channels
  4. Integrate with existing APIs
  5. Setup Redis for scaling
  6. Test and deploy

### WebSocket Server Implementation (June 27, 2025) ✅ DEPLOYED
- **Status**: Полностью развернут в продакшн и работает
- **Location**: `websocket-server/` директория
- **Port**: 3002 (WebSocket) + 3000 (Next.js)
- **Features**:
  - JWT аутентификация через NEXTAUTH_SECRET
  - Каналы: notifications, feed, creator, post
  - События: лайки, комментарии, уведомления
  - Heartbeat механизм (30 сек)
  - Redis поддержка (опционально)
- **Setup**: `./scripts/setup-websocket-server.sh`
- **Test**: `cd websocket-server && node test-client.js`
- **Docs**: 
  - `WEBSOCKET_SERVER_IMPLEMENTATION.md` - техническая документация
  - `WEBSOCKET_INTEGRATION_COMPLETED.md` - статус интеграции
- **Integrated APIs**:
  - ✅ `/api/posts` - создание постов, уведомления подписчикам
  - ✅ `/api/posts/[id]/like` - лайки/анлайки с уведомлениями
  - ✅ `/api/posts/[id]/comments` - комментарии с уведомлениями
  - ✅ `/api/subscriptions/process-payment` - новые подписки
  - ✅ `/api/user/notifications` - создание/чтение/очистка уведомлений
  - ✅ `/api/tips` - чаевые с уведомлениями
- **Deployment**: Требуется обновить Nginx и запустить через PM2

### 🎨 Visual Tier Styles (CENTRALIZED - June 27, 2025)
- **Core**: `lib/constants/tier-styles.ts` - централизованные визуальные константы тиров
- **Status**: ✅ ЦЕНТРАЛИЗОВАНО в рамках рефакторинга системы доступа
- **Features**:
  - Единые визуальные стили для всех тиров (free, basic, premium, vip)
  - Цвета, иконки, градиенты, границы, текстовые стили
  - TypeScript типизация с TierVisualDetails интерфейсом
  - Импортируется во все компоненты вместо локальных определений

#### Структура константы TIER_VISUAL_DETAILS:
```typescript
{
  'free': { 
    name: 'Free', 
    color: 'gray', 
    icon: '🔓', 
    gradient: 'from-gray-500/20 to-slate-500/20', 
    border: 'border-gray-500/30', 
    text: 'text-gray-700 dark:text-gray-300', 
    dot: 'bg-gray-500 dark:bg-gray-400' 
  },
  'basic': { 
    name: 'Basic', 
    color: 'blue', 
    icon: '⭐', 
    gradient: 'from-blue-500/20 to-cyan-500/20', 
    border: 'border-blue-500/30', 
    text: 'text-blue-700 dark:text-blue-300', 
    dot: 'bg-blue-500 dark:bg-blue-400' 
  },
  'premium': { 
    name: 'Premium', 
    color: 'purple', 
    icon: '💎', 
    gradient: 'from-purple-500/20 to-pink-500/20', 
    border: 'border-purple-500/30', 
    text: 'text-purple-700 dark:text-purple-300', 
    dot: 'bg-purple-500 dark:bg-purple-400' 
  },
  'vip': { 
    name: 'VIP', 
    color: 'gold', 
    icon: '👑', 
    gradient: 'from-yellow-500/20 to-amber-500/20', 
    border: 'border-yellow-500/30', 
    text: 'text-yellow-700 dark:text-yellow-300', 
    dot: 'bg-yellow-500 dark:bg-yellow-400' 
  }
}
```

#### Usage:
```typescript
import { TIER_VISUAL_DETAILS } from '@/lib/constants/tier-styles'

// Получить визуальные детали для тира
const tierDetail = TIER_VISUAL_DETAILS[tier.toLowerCase()]
if (tierDetail) {
  return (
    <div className={`${tierDetail.gradient} ${tierDetail.border}`}>
      <span className={tierDetail.dot}>{tierDetail.icon}</span>
      <span className={tierDetail.text}>{tierDetail.name}</span>
    </div>
  )
}
```

#### Key Points:
- **Single Source**: Все визуальные константы тиров в одном месте
- **No Local Definitions**: Запрещено определять стили тиров локально
- **Type Safety**: Полная TypeScript типизация
- **Consistency**: Единообразный визуальный стиль во всем приложении

### 🔐 Access Control Utilities (CENTRALIZED - June 27, 2025)
- **Core**: `lib/utils/access.ts` - централизованные утилиты контроля доступа
- **Status**: ✅ ЦЕНТРАЛИЗОВАНО в рамках рефакторинга системы доступа
- **Purpose**: Единая логика проверки доступа к контенту на основе подписок

#### Доступные функции:

##### 1. `normalizeTierName(tier: string | null | undefined): string | null`
- Нормализует название тира к нижнему регистру
- Обрабатывает null/undefined значения
- Используется для сравнения тиров из разных источников

##### 2. `hasAccessToTier(userTier: string | undefined, requiredTier: string | undefined): boolean`
- Проверяет, есть ли у пользователя доступ к контенту требуемого тира
- Использует иерархию тиров из TIER_HIERARCHY
- Возвращает true если userTier >= requiredTier

##### 3. `checkPostAccess(post: any, userId?: string, userSubscriptions?: any[]): AccessCheckResult`
- Комплексная проверка доступа к посту
- Учитывает:
  - Является ли пользователь автором
  - Куплен ли пост
  - Есть ли подписка нужного уровня
  - Активна ли подписка и оплачена ли она
- Возвращает объект с полями:
  - `hasAccess`: boolean - есть ли доступ
  - `reason`: string - причина отказа в доступе
  - `requiredAction`: 'subscribe' | 'upgrade' | 'purchase' | null

##### 4. `mapAccessTypeToTier(accessType?: string): string | undefined`
- Маппинг типов доступа из API на тиры
- Преобразует: FREE → free, BASIC → basic, PREMIUM → premium, VIP → vip
- Используется при обновлении постов

#### Usage Examples:
```typescript
import { checkPostAccess, hasAccessToTier, normalizeTierName } from '@/lib/utils/access'

// Проверка доступа к посту
const accessResult = checkPostAccess(post, userId, userSubscriptions)
if (!accessResult.hasAccess) {
  console.log(`Access denied: ${accessResult.reason}`)
  if (accessResult.requiredAction === 'subscribe') {
    // Показать модалку подписки
  } else if (accessResult.requiredAction === 'purchase') {
    // Показать модалку покупки
  }
}

// Проверка иерархии тиров
const canAccess = hasAccessToTier('premium', 'basic') // true
const needsUpgrade = hasAccessToTier('basic', 'vip') // false

// Нормализация названий тиров
const normalized = normalizeTierName('Premium') // 'premium'
```

#### Key Points:
- **Centralized Logic**: Вся логика доступа в одном месте
- **No Duplication**: Запрещено дублировать проверки доступа
- **Consistent Behavior**: Единообразное поведение во всем приложении
- **Type Safe**: TypeScript типизация для всех функций
- **Payment Validation**: Проверка не только isActive, но и paymentStatus

### Modal Components

// ... existing code ...