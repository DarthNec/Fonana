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