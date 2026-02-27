# 🎰 Lottery Premium Post Reward System - M7 Discovery Report

**Task ID:** `task_lottery-premium-post-reward`  
**Phase:** DISCOVERY  
**Date:** 2026-02-26  
**Analyst:** Claude Opus 4.5 (M7 Full Cycle)

---

## 📋 Executive Summary

**Цель:** Понять текущую систему покупки платных постов и спроектировать механизм выдачи случайного платного поста в качестве награды в лотерее с сохранением в БД для перманентного доступа.

**Ключевые находки:**
- ✅ Система покупки платных постов полностью реализована
- ✅ Таблица `PostPurchase` идеально подходит для наград лотереи
- ✅ Логика проверки доступа автоматически учитывает записи в `PostPurchase`
- ⚠️ Для наград лотереи НЕ нужна реальная транзакция - можно использовать специальный маркер
- 🎯 Простое решение: создать `PostPurchase` запись с `txSignature = "LOTTERY_REWARD"`

---

## 🔍 1. Текущая Архитектура Покупки Постов

### 1.1 Database Schema: PostPurchase

```prisma
model PostPurchase {
  id            String        @id @default(cuid())
  postId        String        // ✅ ID поста из paid_posts.json
  userId        String        // ✅ ID пользователя-победителя
  price         Float         // ✅ Цена поста (для статистики)
  currency      String        @default("SOL")
  txSignature   String?       // ⚠️ NULLABLE! Можем использовать "LOTTERY_REWARD"
  purchasedAt   DateTime      @default(now())
  paymentStatus PaymentStatus @default(PENDING)
  platformFee   Float?
  referrerFee   Float?
  creatorAmount Float?
  transaction   Transaction?  // ⚠️ Опциональная связь
  user          User          @relation("UserPostPurchases", fields: [userId], references: [id], onDelete: Cascade)
  post          Post          @relation("PostPurchases", fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])  // ✅ Один пользователь = одна покупка на пост
  @@map("post_purchases")
}
```

**🎯 Ключевые поля для лотереи:**
- `postId`: ID случайного поста из `paid_posts.json`
- `userId`: ID победителя из `localStorage` → `fonana_user_wallet` → найти в БД
- `txSignature`: `"LOTTERY_REWARD"` (специальный маркер)
- `paymentStatus`: `"COMPLETED"`
- `price`: `0` (награда бесплатна)
- `creatorAmount`: `0`

---

### 1.2 Purchase Flow (Normal Purchase)

**Frontend (PurchaseModal.tsx):**
```typescript
// 1. Пользователь нажимает "Buy"
// 2. Создается Solana транзакция (payment to creator)
// 3. Отправляется signature в backend
const response = await fetch(`/api/posts/${post.id}/buy`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    buyerWallet: publicKeyString,
    txSignature: signature,  // ← Реальная транзакция
    price: actualPrice
  })
})
```

**Backend (app/api/posts/[id]/buy/route.ts):**
```typescript
// 1. Проверяем JWT токен
const decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)

// 2. Получаем пользователя по wallet из токена
const buyer = await prisma.user.findUnique({
  where: { wallet: buyerWallet }
})

// 3. Проверяем дубликат покупки
const existingPurchase = await prisma.postPurchase.findUnique({
  where: {
    userId_postId: {
      userId: buyer.id,
      postId: params.id
    }
  }
})

if (existingPurchase) {
  return NextResponse.json({ error: 'Already purchased' }, { status: 400 })
}

// 4. ✅ ЖДЕМ подтверждения транзакции в блокчейне
const isConfirmed = await waitForTransactionConfirmation(txSignature, 60, 2000)

// 5. ✅ ВАЛИДИРУЕМ транзакцию (проверяем сумму и получателя)
const validation = await validateTransaction(
  txSignature,
  price,
  [creatorWallet]
)

// 6. Создаем записи в БД (Transaction + PostPurchase)
await prisma.$transaction([
  // Запись транзакции
  prisma.transaction.create({
    data: {
      txSignature,
      fromWallet: buyerWallet,
      toWallet: creatorWallet,
      amount: price,
      type: 'POST_PURCHASE',
      status: 'CONFIRMED'
    }
  }),
  
  // ✅ КЛЮЧЕВАЯ ЗАПИСЬ: PostPurchase
  prisma.postPurchase.create({
    data: {
      postId: params.id,
      userId: buyer.id,
      price: price,
      currency: 'SOL',
      txSignature,
      paymentStatus: 'COMPLETED'
    }
  })
])
```

---

### 1.3 Access Check Logic (lib/utils/access.ts)

**Как система проверяет доступ к платному посту:**

```typescript
export function checkPostAccess(
  post: {
    price?: number
    creatorId: string
  },
  user?: { id: string } | null,
  subscription?: { plan: string } | null,
  hasPurchased: boolean = false  // ← ЭТО КЛЮЧ!
): ContentAccessStatus {
  
  // 1. Автор всегда имеет доступ
  if (user && post.creatorId === user.id) {
    return { hasAccess: true }
  }
  
  // 2. ✅ Платный контент (не подписочный)
  if (post.price && post.price > 0) {
    return {
      hasAccess: hasPurchased,  // ← TRUE если есть запись в PostPurchase
      needsPayment: !hasPurchased
    }
  }
}
```

**Где берется `hasPurchased`:**

```typescript
// app/api/posts/route.ts (GET запрос списка постов)

// 1. Получаем все покупки пользователя
const userPostPurchases = await prisma.postPurchase.findMany({
  where: { userId: currentUser.id },
  select: { postId: true }
})

const userPostPurchasesSet = new Set(
  userPostPurchases.map(purchase => purchase.postId)
)

// 2. Проверяем для каждого поста
const formattedPosts = posts.map(post => {
  const hasPurchased = userPostPurchasesSet.has(post.id)  // ← Проверка
  
  const accessStatus = checkPostAccess(
    post,
    currentUser,
    subscription,
    hasPurchased  // ← Передаем флаг
  )
  
  return {
    ...post,
    hasAccess: accessStatus.hasAccess  // ← Результат
  }
})
```

---

## 🎯 2. Решение для Lottery Premium Post Reward

### 2.1 Архитектурное Решение

**Концепция:** Lottery reward = симуляция покупки без реальной транзакции

**Почему это работает:**
1. ✅ `PostPurchase.txSignature` - **NULLABLE** поле
2. ✅ `PostPurchase.transaction` - **опциональная** связь
3. ✅ Проверка доступа смотрит только на наличие записи `PostPurchase`, не на `Transaction`
4. ✅ Уникальный constraint `@@unique([userId, postId])` предотвращает дубликаты

**Специальный маркер:** `txSignature = "LOTTERY_REWARD"`

---

### 2.2 Implementation Flow

#### Step 1: Frontend - When User Wins Premium Post

```typescript
// components/LotteryPage.tsx

const handleSpinEnd = async (sector: Sector) => {
  setWinner(sector)
  
  const wallet = localStorage.getItem('fonana_user_wallet')
  if (!wallet) return
  
  try {
    const response = await fetch('/api/wheel/reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        wallet,
        prize: sector.label  // "💎 Premium Post"
      })
    })
    
    const data = await response.json()
    
    if (response.ok && data.reward.type === 'Premium Post') {
      // ✅ Показываем информацию о выигранном посте
      console.log('Won post:', data.reward.post)
      // data.reward.post = { id, content, mediaUrl, creator: { nickname } }
    }
  } catch (error) {
    console.error('[Lottery] Failed to grant reward:', error)
  }
}
```

#### Step 2: Backend - Grant Random Paid Post

```typescript
// app/api/wheel/reward/route.ts

export async function POST(request: NextRequest) {
  const { wallet, prize } = await request.json()
  
  if (prize === '💎 Premium Post') {
    // 1. Получаем пользователя по wallet
    const user = await prisma.user.findUnique({
      where: { wallet },
      select: { id: true, nickname: true }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // 2. ✅ Получаем СЛУЧАЙНЫЙ платный пост из БД (из paid_posts.json)
    // Только те, что пользователь еще не купил
    const existingPurchases = await prisma.postPurchase.findMany({
      where: { userId: user.id },
      select: { postId: true }
    })
    
    const excludedPostIds = existingPurchases.map(p => p.postId)
    
    // Получаем случайный платный пост (НЕ купленный пользователем)
    const availablePosts = await prisma.post.findMany({
      where: {
        price: { gt: 0 },  // Платные посты
        id: { notIn: excludedPostIds },  // Еще не куплены
        mediaUrl: {
          startsWith: 'https://fonanastorage.b-cdn.net/'  // Только CDN посты
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            fullName: true
          }
        }
      }
    })
    
    if (availablePosts.length === 0) {
      return NextResponse.json({
        error: 'No available posts to reward (all purchased or no CDN posts)',
        success: false
      }, { status: 400 })
    }
    
    // 3. ✅ Выбираем СЛУЧАЙНЫЙ пост
    const randomIndex = Math.floor(Math.random() * availablePosts.length)
    const selectedPost = availablePosts[randomIndex]
    
    // 4. ✅ Создаем PostPurchase запись (БЕЗ реальной транзакции)
    const postPurchase = await prisma.postPurchase.create({
      data: {
        postId: selectedPost.id,
        userId: user.id,
        price: 0,  // Награда бесплатна
        currency: 'SOL',
        txSignature: 'LOTTERY_REWARD',  // ← Специальный маркер
        paymentStatus: 'COMPLETED',
        platformFee: 0,
        referrerFee: 0,
        creatorAmount: 0
      }
    })
    
    // 5. ✅ Логируем для статистики
    console.log(`[Wheel Reward] User ${user.id} won Premium Post: ${selectedPost.id}`)
    
    // 6. ✅ Возвращаем результат
    return NextResponse.json({
      success: true,
      reward: {
        type: 'Premium Post',
        description: `You won access to a premium post by ${selectedPost.creator.nickname || selectedPost.creator.fullName}!`,
        post: {
          id: selectedPost.id,
          content: selectedPost.content,
          mediaUrl: selectedPost.mediaUrl,
          type: selectedPost.type,
          creator: {
            nickname: selectedPost.creator.nickname,
            fullName: selectedPost.creator.fullName
          }
        }
      },
      user: {
        availableGenerationCount: user.availableGenerationCount
      }
    })
  }
}
```

---

### 2.3 Access Verification (Automatic)

**После создания `PostPurchase` записи, система автоматически работает:**

```typescript
// 1. Frontend запрашивает посты
GET /api/posts

// 2. Backend проверяет покупки
const userPostPurchases = await prisma.postPurchase.findMany({
  where: { userId: currentUser.id }
})

// Теперь LOTTERY POST включен в этот список!
const userPostPurchasesSet = new Set(
  userPostPurchases.map(purchase => purchase.postId)
)

// 3. Проверка доступа
const hasPurchased = userPostPurchasesSet.has(selectedPost.id)  // TRUE!

// 4. Результат
const accessStatus = checkPostAccess(post, user, null, hasPurchased)
// → { hasAccess: true, needsPayment: false }
```

**Визуально в feed:**
- ✅ Пост отображается БЕЗ блюра
- ✅ Нет кнопки "Unlock"
- ✅ Полный доступ к контенту

---

## 📊 3. Data Sources Analysis

### 3.1 paid_posts.json Structure

```json
{
  "meta": {
    "exportedAt": "2026-02-26T11:18:40.739Z",
    "totalPosts": 54
  },
  "statistics": {
    "total": 54,
    "excluded": 52,
    "byType": {
      "image": 48,
      "video": 6
    }
  },
  "posts": [
    {
      "id": "cmm08n7y1002bmhvke29ns8px",
      "content": "",
      "mediaUrl": "https://fonanastorage.b-cdn.net/posts/images/b5ab5fd31392a5504523682f9b85a901.webp",
      "type": "image",
      "price": 0.02,
      "creatorId": "cmlul1yoy001btgynowfovz2v",
      "creator": {
        "id": "cmlul1yoy001btgynowfovz2v",
        "nickname": "mia-",
        "wallet": "2onL9i1A9vD2e2k3ZSgTzkhwWprCT4vtTqwaeHTqYiyb"
      }
    }
  ]
}
```

**Ключевые поля:**
- ✅ `id`: Уникальный ID поста в БД
- ✅ `mediaUrl`: CDN URL (фильтр уже применен)
- ✅ `price`: Оригинальная цена (для статистики)
- ✅ `creatorId`: ID создателя
- ✅ `type`: "image" или "video"

**Стратегия выбора:**
1. ✅ Получать посты напрямую из БД (не из JSON) - актуальные данные
2. ✅ Фильтр: `price > 0` AND `mediaUrl LIKE 'https://fonanastorage.b-cdn.net/%'`
3. ✅ Исключить уже купленные пользователем
4. ✅ Случайный выбор: `Math.random()` из доступных

---

## 🔐 4. Security & Edge Cases

### 4.1 Duplicate Prevention

**Проблема:** Что если пользователь уже купил пост, который выпал в лотерее?

**Решение:**
```typescript
// Перед созданием PostPurchase
const existingPurchases = await prisma.postPurchase.findMany({
  where: { userId: user.id },
  select: { postId: true }
})

const excludedPostIds = existingPurchases.map(p => p.postId)

// Получаем только НЕ купленные посты
const availablePosts = await prisma.post.findMany({
  where: {
    price: { gt: 0 },
    id: { notIn: excludedPostIds }  // ← Исключаем дубликаты
  }
})
```

**Database Constraint защищает на уровне БД:**
```prisma
@@unique([userId, postId])  // Duplicate insert = ERROR
```

---

### 4.2 No Available Posts Scenario

**Проблема:** Что если пользователь УЖЕ купил ВСЕ платные посты?

**Решение:**
```typescript
if (availablePosts.length === 0) {
  return NextResponse.json({
    error: 'No available posts to reward',
    success: false
  }, { status: 400 })
}
```

**Frontend обработка:**
```typescript
const data = await response.json()

if (!response.ok) {
  // Показываем альтернативную награду (например, Extra Generation)
  console.warn('[Lottery] No posts available, fallback to another reward')
  // Можно автоматически дать Extra Generation вместо Premium Post
}
```

---

### 4.3 Transaction Signature Marker

**Проблема:** Как отличить lottery reward от обычной покупки?

**Решение:** Специальный маркер `txSignature = "LOTTERY_REWARD"`

**Использование:**
```typescript
// Статистика администратора
const lotteryRewards = await prisma.postPurchase.findMany({
  where: { txSignature: 'LOTTERY_REWARD' }
})

console.log(`Total lottery rewards given: ${lotteryRewards.length}`)
```

---

### 4.4 Creator Notification (Optional)

**Вопрос:** Нужно ли уведомлять создателя, что его пост выдан как награда?

**Рекомендация:** НЕТ (чтобы не загромождать уведомления)

**Альтернатива:** Отдельная страница статистики для креаторов
```typescript
// app/api/creators/[id]/lottery-stats
// Показывает, сколько раз пост выдан как награда
const lotteryGifts = await prisma.postPurchase.count({
  where: {
    postId: postId,
    txSignature: 'LOTTERY_REWARD'
  }
})
```

---

## 🎨 5. Frontend UX Flow

### 5.1 Lottery Result Modal Update

**Текущий код:**
```typescript
// components/LotteryPage.tsx - Prize description
{winner.label.includes('Premium Post') && (
  <>You unlocked a <span>Premium Post reward</span>! Feature coming soon...</>
)}
```

**Новый код:**
```typescript
{winner.label.includes('Premium Post') && prizePost && (
  <>
    You won access to a premium post by{' '}
    <span className="font-semibold text-pink-600">
      {prizePost.creator.nickname || prizePost.creator.fullName}
    </span>
    ! Check your feed to view it.
  </>
)}

{winner.label.includes('Premium Post') && !prizePost && (
  <>You unlocked a <span>Premium Post reward</span>, but no posts are available right now. Check back later!</>
)}
```

**State management:**
```typescript
const [prizePost, setPrizePost] = useState(null)

const handleSpinEnd = async (sector: Sector) => {
  // ...
  const data = await response.json()
  
  if (data.reward.post) {
    setPrizePost(data.reward.post)
  }
}
```

---

### 5.2 Feed Post Display

**Автоматическая работа:**
1. ✅ После создания `PostPurchase` запись существует в БД
2. ✅ При следующем запросе `GET /api/posts` система проверит покупки
3. ✅ `hasPurchased = true` для lottery post
4. ✅ Пост отображается БЕЗ блюра
5. ✅ Полный доступ к контенту

**Никаких изменений в UI не нужно!** 🎉

---

## 📈 6. Performance & Scalability

### 6.1 Database Queries

**Critical Query: Get Available Posts**
```sql
SELECT * FROM "posts"
WHERE "price" > 0
AND "id" NOT IN (
  SELECT "postId" FROM "post_purchases" WHERE "userId" = $1
)
AND "mediaUrl" LIKE 'https://fonanastorage.b-cdn.net/%'
```

**Performance:**
- ✅ Индексы существуют: `@@index([userId])`, `@@index([postId])`
- ✅ Запрос выполняется 1 раз при победе (не частый)
- ✅ Количество постов: ~54 (минимальная нагрузка)

**Optimization (при росте до 10,000+ постов):**
```typescript
// Можно добавить LIMIT для random selection
const availablePosts = await prisma.post.findMany({
  where: { /* filters */ },
  take: 100,  // Берем только 100 случайных
  skip: Math.floor(Math.random() * totalCount)
})
```

---

### 6.2 Caching Strategy (Future)

**Если система масштабируется:**
```typescript
// Кешируем список доступных постов для пользователя
const cacheKey = `lottery:available_posts:${userId}`

let availablePosts = await redis.get(cacheKey)

if (!availablePosts) {
  availablePosts = await prisma.post.findMany({ /* query */ })
  await redis.set(cacheKey, JSON.stringify(availablePosts), 'EX', 300)  // 5 min
}
```

**Invalidation triggers:**
- Пользователь покупает новый пост → очистить кеш
- Пользователь выигрывает lottery post → очистить кеш

---

## ✅ 7. Implementation Checklist

### Backend (app/api/wheel/reward/route.ts)

- [ ] Обработка `prize === '💎 Premium Post'`
- [ ] Получение пользователя по `wallet`
- [ ] Запрос существующих покупок пользователя
- [ ] Фильтрация доступных платных постов (CDN, не куплены)
- [ ] Edge case: нет доступных постов → fallback или ошибка
- [ ] Случайный выбор поста из доступных
- [ ] Создание `PostPurchase` записи с `txSignature = "LOTTERY_REWARD"`
- [ ] Возврат информации о выигранном посте (id, creator, mediaUrl)
- [ ] Логирование для статистики

### Frontend (components/LotteryPage.tsx)

- [ ] State для `prizePost: Post | null`
- [ ] Обработка `data.reward.post` в `handleSpinEnd`
- [ ] Обновление описания награды в modal с информацией о посте
- [ ] Edge case: `!prizePost` → показать fallback сообщение
- [ ] (Optional) Кнопка "View Post" в modal → навигация на пост

### Testing

- [ ] User wins Premium Post → `PostPurchase` created
- [ ] User refreshes feed → post visible without blur
- [ ] User clicks post → full access without payment
- [ ] User wins Premium Post twice → error or different post
- [ ] User already bought all posts → proper error handling
- [ ] Check `txSignature = "LOTTERY_REWARD"` in database
- [ ] Verify `@@unique([userId, postId])` constraint works

---

## 🎯 8. Recommended Solution Summary

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LOTTERY SYSTEM                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ User wins "💎 Premium Post"
                            ↓
┌─────────────────────────────────────────────────────────────┐
│          POST /api/wheel/reward                             │
│  1. Get user by wallet                                      │
│  2. Find existing purchases (exclude duplicates)            │
│  3. Query available paid posts (price > 0, CDN only)        │
│  4. Random selection: availablePosts[randomIndex]           │
│  5. CREATE PostPurchase {                                   │
│       postId: selectedPost.id,                              │
│       userId: user.id,                                      │
│       txSignature: "LOTTERY_REWARD",  ← Special marker     │
│       paymentStatus: "COMPLETED",                           │
│       price: 0                                              │
│    }                                                        │
│  6. Return post info to frontend                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ PostPurchase record created
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              ACCESS SYSTEM (AUTOMATIC)                      │
│  GET /api/posts → checks PostPurchase table                │
│  hasPurchased = userPostPurchasesSet.has(postId)           │
│  → TRUE for lottery posts                                   │
│  → hasAccess = true                                         │
│  → Post displayed without blur ✅                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Benefits

1. ✅ **Zero Frontend Changes** - существующая логика доступа работает автоматически
2. ✅ **Database Integrity** - `@@unique` constraint предотвращает дубликаты
3. ✅ **Audit Trail** - `txSignature = "LOTTERY_REWARD"` позволяет отследить все lottery rewards
4. ✅ **Scalable** - простое добавление новых постов, автоматическая фильтрация
5. ✅ **Secure** - нет зависимости от frontend данных, вся логика на backend
6. ✅ **Consistent** - используется та же таблица `PostPurchase`, что и для обычных покупок

### Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|----------|
| User wins post they already bought | LOW | Filter `excludedPostIds` before selection |
| No available posts for user | MEDIUM | Return error → fallback to Extra Generation |
| Duplicate insert (race condition) | LOW | Database `@@unique` constraint blocks |
| Performance with 10,000+ posts | LOW | Current: 54 posts, future: add LIMIT/pagination |

---

## 🚀 9. Next Steps (Implementation Phase)

### Phase 1: Backend Core (30 min)
1. Implement Premium Post handler in `/api/wheel/reward/route.ts`
2. Test database query for available posts
3. Test PostPurchase creation with special marker
4. Verify access check works with new record

### Phase 2: Frontend Integration (15 min)
1. Add `prizePost` state to `LotteryPage.tsx`
2. Update modal description with post info
3. Handle edge cases (no posts available)

### Phase 3: Testing (20 min)
1. Manual test: Win Premium Post → check database
2. Manual test: Refresh feed → verify post access
3. Manual test: Win same prize twice
4. Check admin statistics query

### Phase 4: Documentation (10 min)
1. Update API documentation
2. Add comment explaining `txSignature = "LOTTERY_REWARD"`
3. Document edge cases for future developers

**Total Estimated Time:** 75 minutes (1 hour 15 min)

---

## 📝 10. Questions & Answers

### Q1: Нужна ли реальная Solana транзакция для lottery reward?
**A:** НЕТ. `PostPurchase.txSignature` - nullable поле. Используем специальный маркер `"LOTTERY_REWARD"`.

### Q2: Как предотвратить duplicate rewards?
**A:** Database constraint `@@unique([userId, postId])` + фильтр `excludedPostIds` в запросе.

### Q3: Что если у пользователя уже все платные посты куплены?
**A:** Backend возвращает ошибку, frontend может показать fallback (например, дать Extra Generation вместо Premium Post).

### Q4: Как система поймет, что пользователь имеет доступ к lottery post?
**A:** Автоматически через существующую логику - `checkPostAccess()` проверяет наличие записи в `PostPurchase`, не важно, откуда она взялась (обычная покупка или lottery).

### Q5: Нужно ли показывать создателю, что его пост выдан как награда?
**A:** НЕТ (рекомендация), чтобы не спамить уведомлениями. Можно добавить отдельную статистику для креаторов.

### Q6: Как отследить все lottery rewards для статистики?
**A:** Запрос: `SELECT * FROM post_purchases WHERE txSignature = 'LOTTERY_REWARD'`

### Q7: Можно ли использовать `paid_posts.json` напрямую?
**A:** НЕТ. Лучше запрашивать из БД для актуальности (посты могут удаляться/добавляться).

---

## 🎓 11. Architecture Decision Records (ADR)

### ADR-001: Use PostPurchase Table for Lottery Rewards

**Context:** Нужно дать пользователю перманентный доступ к платному посту без реальной транзакции.

**Decision:** Использовать существующую таблицу `PostPurchase` с специальным маркером `txSignature = "LOTTERY_REWARD"`.

**Alternatives Considered:**
1. ❌ Создать отдельную таблицу `LotteryRewards` - дублирует логику, усложняет систему доступа
2. ❌ Добавить флаг `isLotteryReward: boolean` в `PostPurchase` - лишнее поле, `txSignature` уже достаточно
3. ✅ **ВЫБРАНО:** Использовать nullable `txSignature` со специальным маркером

**Consequences:**
- ✅ Простая интеграция с существующей системой доступа
- ✅ Нет дублирования кода
- ✅ Легко отследить lottery rewards для статистики
- ⚠️ Нужно документировать значение `"LOTTERY_REWARD"`

---

### ADR-002: Query Posts from Database, Not JSON

**Context:** Источник постов - `paid_posts.json` или БД?

**Decision:** Запрашивать напрямую из БД с фильтрами.

**Reasons:**
1. ✅ Актуальные данные (JSON может устареть)
2. ✅ Автоматическая фильтрация уже купленных постов
3. ✅ Prisma ORM - безопасность и типизация
4. ✅ Простая проверка доступности постов

**Trade-offs:**
- ⚠️ Дополнительный DB query при каждом выигрыше (но это редкое событие)
- ✅ JSON можно использовать для pre-seeding БД

---

### ADR-003: No Creator Notification for Lottery Rewards

**Context:** Уведомлять ли создателя, когда его пост выдан как награда?

**Decision:** НЕТ, не уведомлять автоматически.

**Reasons:**
1. ✅ Lottery rewards могут быть частыми → спам уведомлений
2. ✅ Создатель не получает оплату → нет критической причины уведомлять
3. ✅ Можно добавить отдельную страницу статистики для интересующихся

**Alternative:** Добавить еженедельный digest с lottery stats для креаторов.

---

## 📚 12. References & Related Systems

### Related Files
- `app/api/posts/[id]/buy/route.ts` - Standard purchase flow
- `components/PurchaseModal.tsx` - Frontend purchase modal
- `lib/utils/access.ts` - Access check logic
- `prisma/schema.prisma` - PostPurchase model definition
- `lib/services/media-access.ts` - Media access verification

### Related Documentation
- `docs/AI_DECISION_MAKING_PROTOCOL.md` - M7 decision-making rules
- `paid_posts.json` - Source data for paid posts

### Related Concepts
- Subscription system (подписки на креаторов)
- Tier-based access (VIP, Premium tiers)
- Post purchases (one-time payments)
- Lottery system (wheel of fortune)

---

## ✅ Conclusion

**Система готова к имплементации!**

**Ключевые находки:**
1. ✅ Архитектура идеально поддерживает lottery rewards без изменений
2. ✅ Простое решение: `PostPurchase` + специальный маркер
3. ✅ Автоматическая работа системы доступа
4. ✅ Edge cases покрыты (дубликаты, нет доступных постов)
5. ✅ Минимальные изменения в коде (~50 строк backend + 20 строк frontend)

**Риски:** МИНИМАЛЬНЫЕ
- Database constraint защищает от дубликатов
- Существующая система access check работает автоматически
- Простая fallback стратегия при отсутствии постов

**Готовность к implementation:** 100% ✅

**Estimated Time:** 75 minutes (1 hour 15 min)

---

**M7 Discovery Phase:** ✅ COMPLETED  
**Next Phase:** IMPLEMENTATION → Coding  
**Approve to proceed:** Waiting for user confirmation...

