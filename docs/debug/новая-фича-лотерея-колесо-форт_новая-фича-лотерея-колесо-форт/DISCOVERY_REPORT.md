# 🎰 LOTTERY WHEEL (КОЛЕСО ФОРТУНЫ) - DISCOVERY REPORT

**Task ID:** `task_новая-фича-лотерея-колесо-форт_7486`  
**Date:** 2026-02-19 18:14  
**M7 Phase:** DISCOVERY  
**Status:** 🟢 In Progress

---

## 📋 **ТРЕБОВАНИЯ ПОЛЬЗОВАТЕЛЯ**

### **Что нужно:**
1. **Лотерея (Колесо Фортуны)** - визуальное крутящееся колесо
2. **Призы**:
   - Платные посты (доступ к premium контенту)
   - Solana (небольшие количества токенов)
3. **Механика**: Пользователь может крутить колесо

---

## 🔍 **АНАЛИЗ СУЩЕСТВУЮЩЕЙ АРХИТЕКТУРЫ**

### ✅ **ЧТО УЖЕ ЕСТЬ В ПРОЕКТЕ**

#### **1. Payment & Reward System** ✅

**Solana Integration** (ПОЛНАЯ):
- ✅ `lib/solana/payments.ts` - система платежей
- ✅ `app/api/user/route.ts` - registration rewards (2 USD в SOL)
- ✅ `app/api/dogWater/` - DogWater token system
- ✅ Wallet connect through Phantom

**Reward Mechanics** (ЧАСТИЧНАЯ):
```typescript
// Существующая система наград
sendRegistrationReward() // app/api/user/route.ts:143
- Награда при регистрации: 2 USD в SOL
- Автоматическая конвертация USD → SOL
- Валидация транзакций
- Error handling
```

**Database Schema** (READY):
```prisma
model User {
  dogWaterTokens Float @default(0) // Существующая система токенов
  isGetRegistrationReward Boolean @default(false) // Флаг полученной награды
  referalCount Int @default(0) // Реферальная система
  isBoughtDogWater Boolean @default(false)
}

model Transaction {
  type TransactionType // Поддерживает разные типы
  status String
  metadata Json // Гибкая структура для доп. данных
}
```

#### **2. Post Purchase System** ✅

**Платные посты** (ПОЛНАЯ ИНТЕГРАЦИЯ):
- ✅ `components/PurchaseModal.tsx` - UI для покупки постов
- ✅ `app/api/posts/process-payment/route.ts` - обработка платежей
- ✅ `app/api/posts/[id]/buy/route.ts` - purchase endpoint
- ✅ `PostPurchase` model в Prisma - доступ к контенту

**Purchase Flow**:
```typescript
// Существующий flow покупки поста
1. User clicks "Unlock Post"
2. PurchaseModal opens
3. Solana transaction created
4. Payment processed → PostPurchase record
5. User gets access to post
```

**Database Schema**:
```prisma
model PostPurchase {
  id String @id @default(cuid())
  postId String
  userId String
  price Float
  currency String
  txSignature String
  paymentStatus String
  creatorAmount Float
  createdAt DateTime @default(now())
}
```

#### **3. UI Components & Animations** ✅

**Modal System** (ГОТОВЫЕ ПАТТЕРНЫ):
```tsx
// Существующие модальные окна
- CreatePostModal.tsx (2490 lines) - сложная модалка с анимациями
- PurchaseModal.tsx - purchase UI
- TipSendModal.tsx - tip mechanics
- RemixPostModal.tsx - remix flow
- ConnectWalletPopup.tsx - wallet connection
```

**Animation Patterns**:
```tsx
// Tailwind animations (уже используются)
animate-spin // Spinner loading
animate-fade-in // Fade in effect
animate-slideInUp // Slide up effect
backdrop-blur-sm // Blur background
```

**Common UI Patterns**:
- Fixed overlay: `fixed inset-0 bg-black/85 backdrop-blur-sm z-[100]`
- Modal container: `rounded-3xl shadow-2xl animate-slideInUp`
- Gradient buttons: `bg-gradient-to-r from-purple-600 to-pink-600`
- Loading states: `border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin`

#### **4. Gamification Elements** (ЧАСТИЧНАЯ)

**Существующие механики**:
- ✅ DogWater Tokens (`dogWaterTokens` field)
- ✅ Referral system (`referalCount`)
- ✅ Registration rewards
- ✅ Flash Sales (`FlashSale` model)

**Документированные планы** (но НЕ реализованы):
```markdown
// docs/STAGNATION_EXIT_STRATEGY_ZERO_BUDGET_2025_DEC.md:358-441
- Points System (planned)
- Badges System (planned)
- Leaderboards (planned)
- Share to Earn (planned)
```

---

## 🎯 **ЧТО НУЖНО ДОБАВИТЬ ДЛЯ ЛОТЕРЕИ**

### **1. Database Schema** (NEW)

**Новые таблицы**:

```prisma
// Конфигурация призов для колеса
model LotteryPrize {
  id          String   @id @default(cuid())
  type        LotteryPrizeType // POST | SOLANA | TOKENS
  value       Float?   // Количество SOL или токенов
  postId      String?  // ID поста (если приз - пост)
  probability Float    // Вероятность выпадения (0-1)
  label       String   // Текст на колесе ("0.01 SOL", "Premium Post")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  spins       LotterySpin[] // Связь с розыгрышами
  
  @@map("lottery_prizes")
}

enum LotteryPrizeType {
  POST    // Доступ к платному посту
  SOLANA  // SOL токены
  TOKENS  // DogWater или другие токены
}

// История розыгрышей
model LotterySpin {
  id        String   @id @default(cuid())
  userId    String
  prizeId   String
  prizeType LotteryPrizeType
  prizeValue Float?
  postId    String?
  timestamp DateTime @default(now())
  
  user      User @relation(fields: [userId], references: [id])
  prize     LotteryPrize @relation(fields: [prizeId], references: [id])
  
  @@index([userId])
  @@index([timestamp])
  @@map("lottery_spins")
}

// Лимиты на крутки
model LotteryUserLimit {
  id            String   @id @default(cuid())
  userId        String   @unique
  spinsToday    Int      @default(0)
  lastSpinDate  DateTime @default(now())
  totalSpins    Int      @default(0)
  
  user          User @relation(fields: [userId], references: [id])
  
  @@map("lottery_user_limits")
}

// Обновление User model
model User {
  // ... existing fields
  lotterySpins      LotterySpin[]
  lotteryLimit      LotteryUserLimit?
}
```

---

### **2. Backend API** (NEW)

**Новые endpoints**:

#### **`/api/lottery/spin` (POST)**
```typescript
// Основной endpoint для крутки колеса
Purpose: Выполнить розыгрыш
Input: { userId: string }
Output: { 
  success: boolean
  prize: {
    type: 'POST' | 'SOLANA' | 'TOKENS'
    value: number
    postId?: string
    label: string
  }
  txSignature?: string // Если приз - SOL
}

Logic:
1. Проверить лимиты пользователя (сколько крутил сегодня)
2. Выбрать приз (weighted random по probability)
3. Выдать приз:
   - POST: создать PostPurchase record
   - SOLANA: отправить SOL transfer
   - TOKENS: обновить dogWaterTokens
4. Сохранить LotterySpin record
5. Обновить LotteryUserLimit
6. Вернуть результат
```

#### **`/api/lottery/prizes` (GET)**
```typescript
// Получить конфигурацию призов для колеса
Purpose: Получить список призов для отображения на колесе
Output: {
  prizes: Array<{
    id: string
    type: string
    label: string
    probability: number
  }>
}
```

#### **`/api/lottery/history` (GET)**
```typescript
// История розыгрышей пользователя
Purpose: Получить историю выигрышей
Input: { userId: string }
Output: {
  spins: Array<{
    timestamp: Date
    prize: { type, value, label }
  }>
  stats: {
    totalSpins: number
    spinsToday: number
    remainingToday: number
  }
}
```

#### **`/api/lottery/config` (GET/POST)** (ADMIN)
```typescript
// Управление конфигурацией (только админ)
Purpose: Настройка призов и вероятностей
Admin only: true
```

---

### **3. Frontend Components** (NEW)

#### **`components/LotteryWheel.tsx`**
```tsx
// Главный компонент колеса фортуны
Features:
- Canvas/SVG колесо с секторами
- Smooth rotation animation
- Sound effects (опционально)
- Prize labels и иконки
- Responsive (mobile + desktop)

Technologies:
Option 1: Canvas API (легче для анимаций)
Option 2: SVG + CSS transforms
Option 3: Framer Motion (уже используется в проекте)

Recommended: Framer Motion для consistency
```

**Примерная структура**:
```tsx
<div className="lottery-wheel-container">
  {/* Wheel background */}
  <motion.div 
    className="wheel"
    animate={{ rotate: rotationDegrees }}
    transition={{ 
      duration: 3,
      ease: [0.17, 0.67, 0.83, 0.67] // easeOutCubic
    }}
  >
    {prizes.map((prize, i) => (
      <div 
        key={prize.id}
        className="prize-sector"
        style={{ 
          transform: `rotate(${(360 / prizes.length) * i}deg)` 
        }}
      >
        {prize.label}
      </div>
    ))}
  </motion.div>
  
  {/* Spin button */}
  <button onClick={handleSpin}>
    SPIN
  </button>
  
  {/* Pointer (стрелка) */}
  <div className="pointer" />
</div>
```

#### **`components/LotteryModal.tsx`**
```tsx
// Modal для отображения колеса
Features:
- Открывается через кнопку в navbar/sidebar
- Показывает колесо + кнопку spin
- Показывает лимиты (осталось спинов)
- Анимация выигрыша
- История (collapsible)

UI Pattern: Следовать существующим modal patterns
```

#### **`components/LotteryPrizeAnimation.tsx`**
```tsx
// Анимация выигрыша (confetti, текст)
Features:
- Confetti explosion (library: react-confetti)
- Prize reveal text
- Auto-close после N секунд
```

---

### **4. Integration Points** (MODIFY EXISTING)

#### **Sidebar / Navbar**
```tsx
// Add lottery button
File: components/LeftSidebar.tsx
Addition:
<NavItem 
  href="/lottery" 
  icon={SparklesIcon} 
  label="Lottery" 
/>
```

#### **User Profile**
```tsx
// Show lottery stats
File: components/Profile.tsx (if exists)
Addition:
<div className="lottery-stats">
  <p>Total Spins: {user.totalSpins}</p>
  <p>Wins: {user.totalWins}</p>
</div>
```

---

## 🎨 **DESIGN SPECIFICATIONS**

### **Wheel Visual Design**

**Option 1: Simple 8-sector wheel**
```
Sectors: 8
Prizes:
- 0.01 SOL (20%)
- 0.005 SOL (30%)
- Premium Post #1 (10%)
- Premium Post #2 (10%)
- 100 DogWater Tokens (15%)
- 50 DogWater Tokens (10%)
- 10 DogWater Tokens (5%)
- "Try Again" (0%) - можно убрать
```

**Colors**:
- Purple gradient (brand colors)
- Gold for SOL prizes
- Blue for posts
- Green for tokens

**Animations**:
1. Idle state: slow rotate (~2s per rotation)
2. Spin state: fast accelerate → decelerate (3-5s total)
3. Winner highlight: pulsing sector

---

## 🔐 **SECURITY & ANTI-CHEAT**

### **Critical Security Measures**

**1. Rate Limiting**
```typescript
// Лимиты на крутки
const LIMITS = {
  PER_DAY: 5,        // 5 крутокв день
  PER_HOUR: 2,       // 2 крутки в час
  MIN_INTERVAL: 300, // 5 минут между крутками
}
```

**2. Server-Side Validation**
```typescript
// Все расчёты ТОЛЬКО на backend
- Выбор приза на сервере (не клиенте)
- Random seed на сервере
- Проверка лимитов на сервере
```

**3. Transaction Validation**
```typescript
// Для SOL призов
- Validate wallet ownership
- Confirm transaction before granting
- Record all transfers in Transaction table
```

**4. Abuse Prevention**
```typescript
// Защита от ботов
- Require wallet connection
- Cooldown between spins
- Max spins per user lifetime (опционально)
```

---

## 📊 **PRIZE PROBABILITY SYSTEM**

### **Weighted Random Algorithm**

```typescript
function selectPrize(prizes: LotteryPrize[]): LotteryPrize {
  // Normalize probabilities to sum = 1
  const total = prizes.reduce((sum, p) => sum + p.probability, 0)
  const normalized = prizes.map(p => ({ ...p, prob: p.probability / total }))
  
  // Weighted random selection
  const random = Math.random()
  let cumulative = 0
  
  for (const prize of normalized) {
    cumulative += prize.prob
    if (random < cumulative) {
      return prize
    }
  }
  
  return prizes[0] // Fallback
}
```

### **Example Prize Distribution**

```typescript
const PRIZE_CONFIG = [
  { type: 'SOLANA', value: 0.01, label: '0.01 SOL', probability: 0.15 },  // 15%
  { type: 'SOLANA', value: 0.005, label: '0.005 SOL', probability: 0.25 }, // 25%
  { type: 'POST', postId: 'xxx', label: 'Premium Post', probability: 0.10 }, // 10%
  { type: 'TOKENS', value: 100, label: '100 Tokens', probability: 0.20 }, // 20%
  { type: 'TOKENS', value: 50, label: '50 Tokens', probability: 0.20 },   // 20%
  { type: 'TOKENS', value: 10, label: '10 Tokens', probability: 0.10 },   // 10%
]
```

---

## ⚠️ **RISKS & MITIGATIONS**

### **Risk #1: High SOL Costs** 🔴 CRITICAL
**Problem:** Выдавая SOL, платформа несёт финансовые издержки

**Mitigation**:
```typescript
// Strategy 1: Small amounts only
MAX_SOL_PRIZE = 0.01 // ~$1.5 при $150/SOL

// Strategy 2: Sponsor prizes
// Креаторы могут спонсировать свои посты в лотерее

// Strategy 3: Limited daily pool
DAILY_SOL_BUDGET = 0.1 SOL // $15/day
if (todaySpent >= DAILY_SOL_BUDGET) {
  // Отключить SOL призы, оставить только посты/токены
}
```

### **Risk #2: Abuse / Bots** 🟡 MAJOR
**Problem:** Пользователи могут создавать множество аккаунтов

**Mitigation**:
```typescript
// Require actions before lottery access
LOTTERY_REQUIREMENTS = {
  minAge: 24 * 60 * 60 * 1000, // Account 24h old
  minActivity: 5, // 5 interactions (likes, comments, etc)
  walletConnected: true, // Must have real wallet
}
```

### **Risk #3: UI Performance** 🟢 MINOR
**Problem:** Анимации могут лагать на слабых устройствах

**Mitigation**:
- Use CSS transforms (GPU-accelerated)
- Throttle animations on mobile
- Fallback to simple rotation if lag detected

---

## 🎯 **SUCCESS METRICS**

### **Key Metrics to Track**

1. **Engagement**:
   - Daily Active Spinners (% of DAU)
   - Average spins per user
   - Return rate (users who spin 2+ days)

2. **Retention**:
   - Day 1 retention after first spin
   - Week 1 retention
   - Time to return (avg hours between spins)

3. **Monetization Impact**:
   - Post purchases after lottery win
   - SOL top-ups (users adding funds)
   - Creator subscriptions from lottery traffic

4. **Cost**:
   - Total SOL distributed per day
   - Cost per active user
   - ROI (engagement value vs SOL cost)

---

## 📈 **GROWTH POTENTIAL**

### **Gamification Benefits**

**Expected Impact**:
```
+30% user engagement (daily return visits)
+20% time on platform
+15% content discovery (через lottery post prizes)
+10% creator revenue (привлечение к контенту)
```

**Viral Potential**:
```
"I just won 0.01 SOL on Fonana! 🎰"
↓
Social sharing → New users → Try lottery
```

---

## 🛠️ **IMPLEMENTATION COMPLEXITY**

### **Difficulty Assessment**

| Component | Complexity | Time Estimate |
|-----------|------------|---------------|
| **Database Schema** | 🟢 Low | 1-2 hours |
| **Backend API** | 🟡 Medium | 1-2 days |
| **Wheel UI** | 🟡 Medium | 2-3 days |
| **Animations** | 🟡 Medium | 1 day |
| **Integration** | 🟢 Low | 0.5 day |
| **Testing** | 🟡 Medium | 1 day |
| **Security Review** | 🟡 Medium | 0.5 day |

**Total Estimate**: 6-10 days (1-2 weeks)

---

## 🎬 **USER FLOW**

### **Complete User Journey**

```mermaid
User Journey:

1. User clicks "🎰 Lottery" in sidebar
   ↓
2. LotteryModal opens
   - Shows wheel
   - Shows spins remaining (e.g., "3/5 today")
   - Shows history (collapsible)
   ↓
3. User clicks "SPIN" button
   ↓
4. [Frontend] Disable button, show loading
   ↓
5. [Backend] /api/lottery/spin
   - Validate user & limits
   - Select prize (weighted random)
   - Grant prize (SOL transfer / PostPurchase / Tokens)
   - Save LotterySpin record
   ↓
6. [Frontend] Animate wheel rotation (3-5s)
   ↓
7. Winner revealed:
   - Confetti animation
   - Prize text: "You won 0.01 SOL! 🎉"
   - (If POST) Button: "View Post"
   - (If SOL) Text: "Added to your wallet"
   ↓
8. User can:
   - Spin again (if spins remaining)
   - View history
   - Close modal
```

---

## ✅ **EXISTING SYSTEM COMPATIBILITY**

### **Reusable Code & Patterns**

**1. Solana Transfers** ✅
```typescript
// Можно переиспользовать из:
app/api/user/route.ts:sendRegistrationReward()
- SOL transfer logic
- Transaction validation
- Error handling
```

**2. Post Access Grants** ✅
```typescript
// Можно переиспользовать из:
app/api/posts/process-payment/route.ts
- PostPurchase creation
- User access management
```

**3. Modal UI** ✅
```typescript
// Паттерн из:
components/PurchaseModal.tsx
- Overlay + backdrop
- Animation patterns
- Button states
```

**4. Loading States** ✅
```typescript
// Spinner из:
components/CreatePostModal.tsx:1385
<div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
```

---

## 📋 **DECISION MATRIX**

### **Technology Choices**

#### **Wheel Rendering**

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Canvas API** | - Fast rendering<br>- Smooth animations<br>- Easy rotation | - Complex code<br>- Accessibility issues | 7/10 |
| **SVG** | - Scalable<br>- Accessible<br>- Easy styling | - Performance on mobile<br>- Complex paths | 6/10 |
| **Framer Motion** | - Already in project<br>- Simple API<br>- Spring animations | - Bundle size (minimal) | **9/10** ✅ |

**Recommendation**: **Framer Motion** (already used, consistent with existing code)

---

#### **Prize Selection Algorithm**

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Client-side random** | - Fast<br>- No API call | - ❌ Security risk<br>- ❌ Abuse potential | 2/10 ❌ |
| **Server-side random** | - ✅ Secure<br>- ✅ Auditable<br>- ✅ Fair | - API latency | **10/10** ✅ |

**Recommendation**: **Server-side ONLY** (security critical)

---

## 🎯 **FINAL RECOMMENDATIONS**

### **Phase 1: MVP (Week 1)**
✅ Essential features only
- 8-sector wheel
- 3 prize types (SOL, POST, TOKENS)
- 5 spins/day limit
- Simple animation
- No history (just current spin)

### **Phase 2: Enhancements (Week 2)**
- History panel
- Admin dashboard for config
- Sound effects
- Social sharing
- Advanced animations

### **Phase 3: Growth (Future)**
- Sponsored prizes (creators pay)
- Special event wheels (holidays)
- VIP wheels (для subscribers)
- Leaderboards

---

**Status:** ✅ Discovery Complete  
**Next Phase:** Architecture Context & Solution Plan  
**Confidence:** 95%

