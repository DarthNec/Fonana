# Fonana Project - AI Assistant Instructions v2

## Project Context
- **Repository**: https://github.com/DukeDeSouth/Fonana (private)
- **Production**: 69.10.59.234:43988 (SSH)
- **Deploy Script**: `./deploy-to-production.sh`
- **Server Path**: `/var/www/fonana`
- **Language**: English UI, Russian comments OK
- **Status**: ✅ STABILIZED после фикса React #310 и tier access errors (01.07.2025)

## Quick Start
```
Project: Fonana (Next.js + Solana)
Private repo: DukeDeSouth/Fonana
Server has Deploy Key, use ./deploy-to-production.sh
Production DB has real users and posts
PM2 manages the app with ecosystem.config.js
Unified Post System completed with modular architecture
UserContext migration completed - centralized user state management
Service Worker simplified - no auto-updates, cache-only
WebSocket server running on port 3002 with JWT auth
Tier system stabilized with safe access patterns
```

## 🚨 CRITICAL: React Hooks & Tier Access Rules

### React Error #310 Prevention (CRITICAL)
- **Причина**: Нарушение правил хуков - callback функции в зависимостях useEffect
- **Локализация**: `lib/hooks/useRealtimePosts.tsx`, `lib/hooks/useOptimizedRealtimePosts.tsx`
- **Решение**: Убрать callback функции из зависимостей useEffect

### ✅ DO (React Hooks):
```typescript
// ✅ ПРАВИЛЬНО - callback вне зависимостей
const handleSubscriptionUpdated = useCallback((event) => {
  // логика обработки
}, []) // пустой массив зависимостей

useEffect(() => {
  if (!token) return
  // логика эффекта
}, [token]) // только примитивы в зависимостях
```

### ❌ DON'T (React Hooks):
```typescript
// ❌ НЕПРАВИЛЬНО - callback в зависимостях
useEffect(() => {
  // логика
}, [handleSubscriptionUpdated]) // НЕ ДЕЛАЙТЕ ТАК!
```

### Tier Access Safety (CRITICAL)
- **Причина**: `Cannot read properties of undefined (reading 'tier')` при обращении к `post.access.tier`
- **Локализация**: `PostCard`, `TierBadge`, `TierStats`, `PostContent`
- **Решение**: Всегда использовать безопасный доступ с fallback

### ✅ DO (Tier Access):
```typescript
// ✅ ПРАВИЛЬНО - безопасный доступ с проверками
const tier = post?.access?.tier ?? 0
const tierName = post?.access?.tier || 'basic'

// Дополнительная проверка типа
if (!tier || typeof tier !== 'string') return null

// В reduce/filter операциях
const tierStats = posts.reduce((acc, post) => {
  const tier = post?.access?.tier
  if (tier && typeof tier === 'string') {
    acc[tier] = (acc[tier] || 0) + 1
  }
  return acc
}, {} as Record<string, number>)
```

### ❌ DON'T (Tier Access):
```typescript
// ❌ НЕПРАВИЛЬНО - прямой доступ без проверок
const tier = post.access.tier // Может вызвать ошибку!
const tierName = post.access.tier.toLowerCase() // Опасно!

// В reduce без проверок
const tierStats = posts.reduce((acc, post) => {
  acc[post.access.tier]++ // Может упасть!
  return acc
}, {})
```

### Components Requiring Safe Tier Access:
- `components/posts/core/PostCard/index.tsx` - фоновая подсветка
- `components/posts/core/TierBadge/index.tsx` - отображение badge
- `components/posts/core/TierStats/index.tsx` - статистика тиров
- `components/posts/core/PostContent/index.tsx` - условная отрисовка
- `lib/hooks/useRealtimePosts.tsx` - WebSocket обновления
- `lib/hooks/useOptimizedRealtimePosts.tsx` - оптимизированные обновления

## 🚨 CRITICAL: Service Worker & PWA Rules

### Current Architecture (POST-FIX)
- **Service Worker**: `public/sw.js` - УПРОЩЕННАЯ ВЕРСИЯ v7-simple-cache-only
- **Registration**: `components/ServiceWorkerRegistration.tsx` - только регистрация
- **NO Auto-updates**: Убраны все автоматические обновления и force-refresh
- **Cache Strategy**: Cache-first для статических ресурсов
- **Version**: v7-simple-cache-only (кеширование без автообновлений)

### ✅ DO:
1. **Использовать только один Service Worker**: `public/sw.js`
2. **Регистрировать через компонент**: `ServiceWorkerRegistration.tsx`
3. **Обновлять версию в deploy скрипте**: `SW_VERSION="v7-simple-$(date +%Y%m%d)"`
4. **Тестировать через**: `/test/sw-check-v5` и `/test/service-worker`

### ❌ DON'T:
1. **НЕ создавать дополнительные SW файлы** (force-update-sw.js, sw-manager.js)
2. **НЕ добавлять автоматические обновления** без явной команды
3. **НЕ использовать skipWaiting()** автоматически
4. **НЕ добавлять ?v=timestamp** к статическим файлам
5. **НЕ создавать бесконечные циклы обновлений**

### PWA Update Process
```bash
# 1. Обновить версию в deploy скрипте
SW_VERSION="v7-simple-$(date +%Y%m%d)"
sed -i "s|const SW_VERSION = '.*'|const SW_VERSION = '$SW_VERSION'|g" public/sw.js

# 2. Проверить MIME type статических файлов
curl -I https://fonana.me/sw.js
# Должно быть: Content-Type: application/javascript

# 3. Тестировать обновления
# Открыть /test/sw-check-v5 и проверить версию
```

## 🔧 WebSocket Server Architecture

### Current Setup
- **Port**: 3002 (WebSocket) + 3000 (Next.js)
- **Process**: fonana-ws (PM2 managed)
- **Path**: `/var/www/fonana/websocket-server/`
- **Authentication**: JWT tokens ОБЯЗАТЕЛЬНО
- **Redis**: Не используется (single server mode)

### Configuration
```javascript
// ecosystem.config.js
{
  name: 'fonana-ws',
  script: './websocket-server/index.js',
  instances: 1,
  env: {
    NODE_ENV: 'production',
    PORT: 3002
  },
  env_file: './.env'
}
```

### Nginx Configuration
```nginx
# WebSocket proxy
location /ws {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
    proxy_buffering off;
}
```

### JWT Authentication (CRITICAL)
- **Требование**: Все WebSocket подключения требуют JWT токен
- **Формат**: `wss://fonana.me/ws?token=JWT_TOKEN`
- **Проверка**: Токен проверяется через NEXTAUTH_SECRET
- **Без токена**: Соединение закрывается с кодом 1008

### Monitoring
```bash
# Проверка статуса WebSocket сервера
ssh -p 43988 root@69.10.59.234 "pm2 status fonana-ws"

# Просмотр логов (без зависания!)
ssh -p 43988 root@69.10.59.234 "pm2 logs fonana-ws --lines 100 --nostream > /tmp/ws-logs.txt && cat /tmp/ws-logs.txt"

# Перезапуск при проблемах
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana-ws"
```

## 🚀 Deployment Process

### Standard Deployment
```bash
# 1. Локальная подготовка
npm run build  # Проверить сборку
git add -A
git commit -m "feat: description"
git push origin main

# 2. Деплой на продакшн
./deploy-to-production.sh

# 3. Проверка после деплоя
ssh -p 43988 root@69.10.59.234 "pm2 status"
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana"
```

### Deployment Script Features
- **Единое SSH соединение**: Все команды в одной сессии
- **Безопасная остановка**: PM2 stop → graceful kill → force kill
- **Автоматическое версионирование**: `YYYYMMDD-HHMMSS-commit`
- **Service Worker обновление**: Автоматическое обновление версии
- **Проверка MIME types**: Убедиться что статика отдается правильно

### Critical Checks After Deployment
```bash
# 1. PM2 статус
ssh -p 43988 root@69.10.59.234 "pm2 status"

# 2. Порты
ssh -p 43988 root@69.10.59.234 "lsof -i :3000 -i :3002"

# 3. MIME type для статических файлов
curl -I https://fonana.me/sw.js
# Должно быть: Content-Type: application/javascript

# 4. WebSocket подключение
curl -I https://fonana.me/ws
# Должно быть: 101 Switching Protocols

# 5. Приложение работает
curl -I https://fonana.me
# Должно быть: 200 OK
```

## 📋 Database Models (Key Tables)
- **User** - Пользователи с wallet и referral системой
- **Post** - Посты с minSubscriptionTier (основное поле доступа)
- **Subscription** - Подписки с paymentStatus (PENDING/COMPLETED)
- **Message** - Личные сообщения + PPV
- **Comment** - Комментарии к постам
- **FlashSale** - Flash-распродажи
- **Transaction** - Все транзакции (Solana + внутренние)
- **Notification** - Уведомления системы
- **CreatorTierSettings** - Настройки тарифов создателей
- **PostPurchase** - Покупки постов
- **MessagePurchase** - Покупки PPV сообщений

## 🔐 Access Control System

### Centralized Architecture
- **Core**: `lib/utils/access.ts` - централизованные утилиты
- **Constants**: `lib/constants/tiers.ts` - TIER_HIERARCHY и DEFAULT_TIER_PRICES
- **Visual**: `lib/constants/tier-styles.ts` - TIER_VISUAL_DETAILS
- **Main Field**: `minSubscriptionTier` (НЕ `isPremium`!)

### Key Functions
```typescript
import { checkPostAccess, hasAccessToTier, normalizeTierName } from '@/lib/utils/access'

// Проверка доступа к посту
const accessResult = checkPostAccess(post, userId, userSubscriptions)
if (!accessResult.hasAccess) {
  console.log(`Access denied: ${accessResult.reason}`)
}

// Проверка иерархии тиров
const canAccess = hasAccessToTier('premium', 'basic') // true

// Нормализация названий тиров
const normalized = normalizeTierName('Premium') // 'premium'
```

### Tier Hierarchy
```typescript
const TIER_HIERARCHY = {
  'free': 1,
  'basic': 2, 
  'premium': 3,
  'vip': 4
}
```

### Payment Validation (CRITICAL)
- **Проверять ОБА флага**: `isActive` И `paymentStatus === 'COMPLETED'`
- **НЕ создавать платные подписки** через `/api/subscriptions` POST
- **Использовать ТОЛЬКО** `/api/subscriptions/process-payment` для платных
- **НЕ корректировать план автоматически** по цене

## 🎨 UI Kit Components (FINALIZED)
- **Core**: `components/ui/` и `components/posts/core/PostCard` — централизованная библиотека
- **Status**: ✅ ПОЛНОСТЬЮ ЗАВЕРШЕНО — UI Kit + Mobile-First + ЕДИНЫЙ PostCard + УНИФИЦИРОВАННОЕ МЕНЮ
- **Components**: Button, Input, Modal, Card, FloatingActionButton, BottomSheet, **PostCard**
- **PostCard**: Используется во всех разделах (фид, профиль, поиск, дашборд, черновики). Нет локальных вариаций типа `ProfilePostCard`, `MyPostCard`, `SearchPostCard` и т.п. Меню управления (⋯) всегда отображается для своих постов в правом верхнем углу, стиль карточки стандартизирован.
- **Menu Unification**: Меню управления постами теперь отображается единообразно на всех страницах для авторов своих постов, независимо от варианта карточки или флага showCreator.
- **Mobile-First**: Edge-to-edge дизайн, touch-оптимизированные элементы

### Usage
```typescript
import { PostCard } from '@/components/posts/core/PostCard'

<PostCard
  post={post}
  variant="full" // или compact, minimal
  showCreator={true}
  onAction={handlePostAction}
/>
```

## 🔄 User State Management (COMPLETED)
- **Core**: `lib/contexts/UserContext.tsx` - единая точка управления
- **Status**: ✅ 100% компонентов мигрированы
- **Features**: Кеширование 7 дней, retry механизм, API fallback
- **NO Direct localStorage**: ЗАПРЕЩЕНО читать/писать localStorage напрямую

### Usage Guidelines
```typescript
// ✅ ПРАВИЛЬНО - использование UserContext
import { useUserContext } from '@/lib/contexts/UserContext'

function MyComponent() {
  const { user, isLoading, error, refreshUser } = useUserContext()
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!user) return <div>Not authenticated</div>
  
  return <div>Welcome, {user.nickname}!</div>
}

// ❌ НЕПРАВИЛЬНО - прямой доступ к localStorage
const wallet = localStorage.getItem('fonana_user_wallet') // НЕ ДЕЛАЙТЕ ТАК!
```

## 🔥 Creator Data Management (COMPLETED)
- **Core**: `lib/contexts/CreatorContext.tsx` - централизованное управление
- **Hook**: `lib/hooks/useCreatorData.ts` - экспорт для удобства
- **Features**: Кеширование, WebSocket обновления, оптимистичные обновления
- **Real-time**: Автоматическое обновление доступа через WebSocket события

### Usage
```typescript
// На странице создателя
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

// Внутри компонентов
import { useCreatorData } from '@/lib/hooks/useCreatorData'

function MyComponent() {
  const { creator, isLoading, error, refreshCreator } = useCreatorData()
  // ...
}
```

## 📊 Dynamic Pricing System
- **Core**: `lib/pricing/` - динамический курс SOL/USD
- **API**: `/api/pricing` - реальный курс от CoinGecko
- **Cache**: 5 минут для производительности
- **Fallback**: 135 USD если API недоступен

### Usage
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

## 🔧 Development Guidelines

### Before Making Changes
```bash
# 1. Проверить текущий статус
./scripts/devops-status.sh

# 2. Проверить логи (без зависания!)
ssh -p 43988 root@69.10.59.234 "tail -n 20 /root/.pm2/logs/fonana-error.log > /tmp/quick-check.txt && cat /tmp/quick-check.txt"

# 3. Локальная сборка
npm run build

# 4. Проверить git статус
git status
```

### Adding Features Without Breaking
1. **Любая правка UI** должна сопровождаться smoke-тестом
2. **Любой новый модуль** должен регистрироваться централизованно
3. **НЕ добавлять скрытые** `fetch`, `eventListener` или `localStorage`-проверки без обсуждения
4. **Обязателен флаг в state**, если фича должна запоминаться

### Logging Standards
```typescript
// Все ключевые действия с версией
console.log('[MODULE][ACTION][vX]', data)

// Примеры
console.log('[UserContext][LoadUser][v2]', { userId, wallet })
console.log('[WebSocket][Connect][v1]', { userId, channels })
console.log('[ServiceWorker][Install][v7]', { version, cacheName })
```

### Error Handling
```typescript
// Все runtime-ошибки типа React Error #300
// расшифровывать в dev и описывать причину

try {
  // код
} catch (error) {
  console.error('[Module][Action][vX] Error:', error)
  // Fallback или retry логика
}
```

## 🚨 Common Issues & Solutions

### 1. React Error #310 (CRITICAL)
```bash
# Проблема: React Error #310 - нарушение правил хуков
# Ошибка: "Invalid hook call. Hooks can only be called inside of the body of a function component"

# Причина: callback функции в зависимостях useEffect
useEffect(() => {
  // логика
}, [handleSubscriptionUpdated]) // ❌ НЕПРАВИЛЬНО

# Решение: Убрать callback из зависимостей
const handleSubscriptionUpdated = useCallback((event) => {
  // логика обработки
}, []) // ✅ пустой массив

useEffect(() => {
  if (!token) return
  // логика эффекта
}, [token]) // ✅ только примитивы
```

### 2. Tier Access Errors (CRITICAL)
```bash
# Проблема: "Cannot read properties of undefined (reading 'tier')"
# Локализация: My Posts, PostCard, TierBadge, TierStats

# Причина: Прямой доступ к post.access.tier без проверок
const tier = post.access.tier // ❌ НЕПРАВИЛЬНО

# Решение: Безопасный доступ с fallback
const tier = post?.access?.tier ?? 0 // ✅ ПРАВИЛЬНО
const tierName = post?.access?.tier || 'basic'

# Дополнительная проверка типа
if (!tier || typeof tier !== 'string') return null
```

### 3. Service Worker MIME Type Issues
```bash
# Проблема: Content-Type: text/html вместо application/javascript
curl -I https://fonana.me/sw.js

# Решение: Добавить исключения в роутинг
# app/[username]/page.tsx
const excludedFiles = ['sw.js', 'manifest.json', 'force-update-sw.js']
if (excludedFiles.includes(username)) {
  notFound()
  return
}
```

### 2. WebSocket Connection Issues
```bash
# Проверка JWT токена
const token = localStorage.getItem('fonana_jwt_token')
if (!token) {
  console.error('[WebSocket] No JWT token available')
  return
}

# Проверка сервера
ssh -p 43988 root@69.10.59.234 "pm2 status fonana-ws"
```

### 3. Subscription Display Issues
```bash
# Проверка нормализации планов
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/diagnose-subscription-display-issue.js"

# Исправление
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/fix-subscription-display-issue.js"
```

### 4. Prisma Version Mismatch
```bash
# Проверка версий
npm list prisma @prisma/client

# Исправление
rm -rf node_modules package-lock.json
npm install
npx prisma generate
```

### 5. Port Conflicts
```bash
# Проверка занятых портов
ssh -p 43988 root@69.10.59.234 "lsof -i :3000 -i :3002"

# Перезапуск через PM2 (НЕ убивать процессы вручную!)
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana fonana-ws"
```

### 6. Likes System "Connect Wallet" Error (CRITICAL)
```bash
# Проблема: "Пожалуйста, подключите кошелек" на странице поста при подключенном кошельке
# Локализация: app/post/[id]/page.tsx

# Причина: Задержка между подключением кошелька и загрузкой UserContext
# UserContext загружает пользователя только при connected && publicKey
# В это время user остается null, функции handleLike показывают ошибку

# Решение: Многоуровневая fallback логика
# 1. Периодическая проверка localStorage каждые 500ms до 5 секунд
# 2. Рекурсивные вызовы функций после восстановления пользователя
# 3. Graceful fallback на toast ошибку если кеш недоступен

# ✅ ПРАВИЛЬНО - fallback логика
useEffect(() => {
  if (!contextUser && !user) {
    const checkInterval = setInterval(() => {
      // проверка localStorage с TTL
      const cachedUserData = localStorage.getItem('fonana_user_data')
      if (cachedUserData && isValidCache()) {
        setUser(JSON.parse(cachedUserData))
        clearInterval(checkInterval)
      }
    }, 500)
    
    setTimeout(() => clearInterval(checkInterval), 5000)
  }
}, [contextUser, user])

# ✅ ПРАВИЛЬНО - рекурсивный вызов в handleLike
const handleLike = async () => {
  if (!user) {
    // попытка восстановить пользователя из кеша
    const cachedUser = getCachedUser()
    if (cachedUser) {
      setUser(cachedUser)
      setTimeout(() => handleLike(), 100) // рекурсивный вызов
      return
    }
    toast.error('Пожалуйста, подключите кошелек')
    return
  }
  // логика лайка
}
```

## 📝 Testing & Debugging

### Test Pages
- `/test/sw-check-v5` - Service Worker диагностика
- `/test/service-worker` - Базовое тестирование SW
- `/test/creator-data` - CreatorContext тестирование
- `/test/unified-posts` - Унифицированная система постов
- `/test/realtime-demo` - WebSocket и real-time функции

### Diagnostic Scripts
```bash
# Общая проверка здоровья
node scripts/health-check.js

# Проверка подписок
node scripts/check-pending-subscriptions.js

# Проверка WebSocket
node scripts/test-websocket-final.js

# Проверка реферальной системы
node scripts/diagnose-referral-system.js
```

### Log Analysis
```bash
# Скачивание логов для анализа (НЕ читать напрямую через SSH!)
scp -P 43988 root@69.10.59.234:/root/.pm2/logs/fonana-error.log ./logs/
scp -P 43988 root@69.10.59.234:/root/.pm2/logs/fonana-ws-error.log ./logs/

# Быстрый просмотр через временные файлы
ssh -p 43988 root@69.10.59.234 "pm2 logs fonana --lines 100 --nostream > /tmp/logs.txt && cat /tmp/logs.txt"
```

## 🎯 Quick Commands

### Status Check
```bash
# Быстрая проверка (без пароля!)
ssh -p 43988 root@69.10.59.234 "pm2 status"

# Полная проверка
./scripts/devops-status.sh

# Проверка портов
ssh -p 43988 root@69.10.59.234 "lsof -i :3000,3002"
```

### Restart Services
```bash
# Перезапуск основного приложения
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana"

# Перезапуск WebSocket сервера
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana-ws"

# Перезапуск всех процессов Fonana
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana fonana-ws"
```

### Database Operations
```bash
# Проверка здоровья БД
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/health-check.js"

# Применение миграций
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npx prisma migrate deploy"

# Генерация Prisma клиента
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npx prisma generate"
```

## 🚨 Emergency Procedures

### White Screen Fix
```bash
# Первое что попробовать
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && ./scripts/fix-white-screen.sh"

# Если не помогло
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npm run build && pm2 restart fonana"
```

### Complete System Reset
```bash
# Полный рестарт (крайний случай)
ssh -p 43988 root@69.10.59.234 "pm2 delete all && cd /var/www/fonana && pm2 start ecosystem.config.js"
```

### Database Recovery
```bash
# Проверка подключения к БД
ssh -p 43988 root@69.10.59.234 "systemctl status postgresql"

# Проверка миграций
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npx prisma migrate status"
```

## 📋 Environment Variables (Required)
```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_URL=https://fonana.me
NEXTAUTH_SECRET=...

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_HOST=https://tame-smart-panorama.solana-mainnet.quiknode.pro/...
NEXT_PUBLIC_SOLANA_WS_ENDPOINT=wss://tame-smart-panorama.solana-mainnet.quiknode.pro/...
NEXT_PUBLIC_PLATFORM_WALLET=npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta

# WebSocket
WS_PORT=3002
```

## 🎯 Current Features Status

### ✅ COMPLETED & WORKING:
- **Service Worker**: Упрощенная версия v7-simple-cache-only
- **WebSocket Server**: Полностью развернут на порту 3002 с JWT аутентификацией
- **User State Management**: Централизованный UserContext с кешированием
- **Access Control**: Единая система контроля доступа с real-time обновлениями
- **Unified Post System**: Модульная архитектура с единообразным отображением
- **Dynamic Pricing**: Реальный курс SOL/USD с кешированием
- **Subscription System**: Исправлена валидация платежей и отображение тиров
- **Personal Messages + PPV**: Полностью функционально
- **Flash Sales**: С таймерами и ограничениями
- **Referral System**: 5% комиссия с валидацией
- **Search System**: Полнотекстовый поиск с автокомплитом
- **Creator Analytics**: Расширенная аналитика с экспортом
- **Tier System**: Стабилизирован с безопасным доступом post?.access?.tier
- **React Hooks**: Исправлены все нарушения правил хуков (React #310)
- **Post Components**: TierBadge, TierStats, PostCard безопасны к отсутствующим данным

### ⚠️ KNOWN ISSUES:
- Redis не установлен (WebSocket работает в single-server mode)
- WebSocket сервер имел 16 рестартов (стабилизирован после фиксов)

### ✅ RESOLVED ISSUES:
- React Error #310 - устранена полностью (callback функции убраны из зависимостей)
- Tier access errors - устранены полностью (добавлен безопасный доступ)
- My Posts crashes - устранены полностью (безопасные проверки tier)
- WebSocket hook violations - устранены полностью (правильная структура useEffect)
- Likes system "Connect Wallet" error - устранена полностью (многоуровневая fallback логика)

### 📱 PLANNED FEATURES:
- Mobile Wallet Adapter (MWA) integration
- Live streaming (waiting for user base)
- Stories (waiting for user base)
- Push notifications (PWA)

## 🔄 Version History

### v2.2 (01.07.2025) - POST-LIKES-SYSTEM-FIX
- ✅ Устранена ошибка "Подключите кошелек" на странице поста при подключенном кошельке
- ✅ Добавлена многоуровневая fallback логика для получения пользователя из localStorage
- ✅ Реализована периодическая проверка кеша каждые 500ms до 5 секунд
- ✅ Добавлены рекурсивные вызовы функций handleLike и handleAddComment
- ✅ Улучшена обработка ошибок с безопасной проверкой TTL кеша
- ✅ Система лайков стала мгновенно доступной после подключения кошелька

### v2.1 (01.07.2025) - POST-REACT-310-TIER-FIX
- ✅ Устранена React Error #310 - callback функции убраны из зависимостей useEffect
- ✅ Исправлены tier access errors - добавлен безопасный доступ post?.access?.tier
- ✅ Улучшена безопасность TierBadge с проверкой типа данных
- ✅ Стабилизированы WebSocket хуки с безопасными проверками
- ✅ Добавлена условная отрисовка TierBadge в PostContent
- ✅ Исправлены все тестовые и backup файлы

### v2.0 (01.07.2025) - POST-PWA-FIX
- ✅ Устранен бесконечный луп обновлений PWA
- ✅ Service Worker упрощен до cache-only версии
- ✅ Удалены конфликтные скрипты (force-update-sw.js, sw-manager.js)
- ✅ WebSocket сервер стабилизирован
- ✅ Централизованная система доступа
- ✅ UserContext миграция завершена

### v1.0 (Previous)
- Unified Post System
- Creator Data Management
- Dynamic Pricing
- Subscription System fixes

## 📞 Emergency Contacts
- If deployment fails completely: Use `scripts/safe-deploy.sh`
- If database is corrupted: Contact project owner immediately
- If server is down: Check with hosting provider

## 🚨 DON'T DO:
- ❌ Create multiple Service Worker files
- ❌ Add automatic updates without explicit command
- ❌ Use skipWaiting() automatically
- ❌ Access localStorage directly (use UserContext)
- ❌ Create paid subscriptions via `/api/subscriptions` POST
- ❌ Check only `isActive` for subscription access
- ❌ Compare subscription plans without normalization
- ❌ Define tier hierarchies locally
- ❌ Allow anonymous WebSocket connections
- ❌ Manually refresh page after subscription/purchase
- ❌ Create WebSocket connections without JWT token
- ❌ Ignore WebSocket disconnections
- ❌ Store sensitive data in WebSocket messages
- ❌ Test real-time features without checking WebSocket connection first
- ❌ Put callback functions in useEffect dependencies (causes React #310)
- ❌ Access post.access.tier directly without safe checks (causes tier errors)
- ❌ Use post.access.tier in reduce/filter without type checking
- ❌ Assume tier is always a string without validation
- ❌ Create useEffect with complex dependencies that include functions
- ❌ Ignore React hooks rules in WebSocket or real-time components
