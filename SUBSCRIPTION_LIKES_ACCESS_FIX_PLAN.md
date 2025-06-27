# План быстрого исправления критических проблем

## Шаг 1: Создание централизованных констант тиров

### Создать файл `lib/constants/tiers.ts`:
```typescript
/**
 * Централизованная иерархия тиров подписок
 * Используется для проверки доступа к контенту
 */
export const TIER_HIERARCHY = {
  free: 1,
  basic: 2,
  premium: 3,
  vip: 4
} as const

export type TierName = keyof typeof TIER_HIERARCHY

// Визуальные константы для UI
export const TIER_INFO = {
  free: {
    name: 'Free',
    icon: '✨',
    gradient: 'from-gray-400 to-gray-600',
    color: 'gray'
  },
  basic: {
    name: 'Basic',
    icon: '⭐',
    gradient: 'from-gray-400 to-gray-600',
    color: 'gray'
  },
  premium: {
    name: 'Premium',
    icon: '💎',
    gradient: 'from-purple-500 to-pink-500',
    color: 'purple'
  },
  vip: {
    name: 'VIP',
    icon: '👑',
    gradient: 'from-yellow-400 to-orange-500',
    color: 'yellow'
  }
} as const

// Дефолтные цены (могут быть переопределены создателями)
export const DEFAULT_TIER_PRICES = {
  basic: 0.05,
  premium: 0.15,
  vip: 0.35
} as const
```

---

## Шаг 2: Создание утилит проверки доступа

### Создать файл `lib/utils/access.ts`:
```typescript
import { TIER_HIERARCHY, TierName } from '@/lib/constants/tiers'

/**
 * Нормализует название тира к нижнему регистру
 */
export function normalizeTierName(tier: string | null | undefined): TierName | null {
  if (!tier) return null
  const normalized = tier.toLowerCase()
  return normalized in TIER_HIERARCHY ? normalized as TierName : null
}

/**
 * Проверяет, достаточен ли уровень подписки пользователя для доступа к контенту
 */
export function hasAccessToTier(
  userTier: string | null | undefined, 
  requiredTier: string | null | undefined
): boolean {
  // Если тир не требуется, доступ есть у всех
  if (!requiredTier) return true
  
  // Если у пользователя нет подписки, доступа нет
  if (!userTier) return false
  
  const normalizedUserTier = normalizeTierName(userTier)
  const normalizedRequiredTier = normalizeTierName(requiredTier)
  
  if (!normalizedUserTier || !normalizedRequiredTier) return false
  
  const userLevel = TIER_HIERARCHY[normalizedUserTier]
  const requiredLevel = TIER_HIERARCHY[normalizedRequiredTier]
  
  return userLevel >= requiredLevel
}

/**
 * Определяет тип блокировки контента
 */
export interface ContentAccessStatus {
  hasAccess: boolean
  needsPayment: boolean
  needsSubscription: boolean
  needsTierUpgrade: boolean
  requiredTier: TierName | null
  currentTier: TierName | null
  price?: number
  currency?: string
}

/**
 * Проверяет доступ к посту для пользователя
 */
export function checkPostAccess(
  post: {
    isLocked: boolean
    minSubscriptionTier?: string | null
    isPremium?: boolean
    price?: number
    currency?: string
    creatorId: string
  },
  user?: {
    id: string
  } | null,
  subscription?: {
    plan: string
  } | null,
  hasPurchased: boolean = false
): ContentAccessStatus {
  // Автор всегда имеет доступ к своему контенту
  if (user && post.creatorId === user.id) {
    return {
      hasAccess: true,
      needsPayment: false,
      needsSubscription: false,
      needsTierUpgrade: false,
      requiredTier: null,
      currentTier: null
    }
  }

  // Если контент не заблокирован
  if (!post.isLocked) {
    return {
      hasAccess: true,
      needsPayment: false,
      needsSubscription: false,
      needsTierUpgrade: false,
      requiredTier: null,
      currentTier: null
    }
  }

  const currentTier = normalizeTierName(subscription?.plan)
  
  // Платный контент
  if (post.price && post.price > 0) {
    return {
      hasAccess: hasPurchased,
      needsPayment: !hasPurchased,
      needsSubscription: false,
      needsTierUpgrade: false,
      requiredTier: null,
      currentTier,
      price: post.price,
      currency: post.currency || 'SOL'
    }
  }

  // Контент с требованием тира
  const requiredTier = normalizeTierName(post.minSubscriptionTier) || 
                      (post.isPremium ? 'vip' as TierName : null)

  if (requiredTier) {
    const hasRequiredTier = hasAccessToTier(currentTier, requiredTier)
    
    return {
      hasAccess: hasRequiredTier,
      needsPayment: false,
      needsSubscription: !currentTier,
      needsTierUpgrade: !!currentTier && !hasRequiredTier,
      requiredTier,
      currentTier
    }
  }

  // Обычный заблокированный контент - требует любую подписку
  return {
    hasAccess: !!subscription,
    needsPayment: false,
    needsSubscription: !subscription,
    needsTierUpgrade: false,
    requiredTier: 'basic' as TierName,
    currentTier
  }
}
```

---

## Шаг 3: Замена в API endpoint posts

### Обновить `app/api/posts/route.ts`:
```typescript
// Добавить импорты в начало файла
import { hasAccessToTier, checkPostAccess, normalizeTierName } from '@/lib/utils/access'
import { TIER_HIERARCHY } from '@/lib/constants/tiers'

// Удалить локальные TIER_HIERARCHY и hasAccessToTier функции (строки 31-45)

// Заменить логику проверки доступа (строки 170-208) на:
const accessStatus = checkPostAccess(
  post,
  currentUser,
  userSubscriptionsMap.has(post.creatorId) 
    ? { plan: userSubscriptionsMap.get(post.creatorId)! } 
    : null,
  hasPurchased
)

const shouldHideContent = !accessStatus.hasAccess
```

---

## Шаг 4: Замена в странице создателя

### Обновить `app/creator/[id]/page.tsx`:
```typescript
// Добавить импорт в начало файла
import { hasAccessToTier, normalizeTierName } from '@/lib/utils/access'
import { TIER_HIERARCHY } from '@/lib/constants/tiers'

// Удалить локальную функцию checkTierAccess (строки 241-254)

// Заменить использование checkTierAccess на hasAccessToTier:
const updatePostsAfterSubscription = (tier: string) => {
  setPosts(prevPosts => prevPosts.map(post => {
    const hasAccess = hasAccessToTier(tier, post.requiredTier)
    return {
      ...post,
      isSubscribed: true,
      userTier: tier,
      shouldHideContent: post.isLocked && !hasAccess && !post.price
    }
  }))
}
```

---

## Шаг 5: Оптимистичные обновления для лайков

### Обновить `components/posts/core/PostActions/index.tsx`:
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { UnifiedPost, PostAction, PostCardVariant } from '@/types/posts'
import { cn } from '@/lib/utils'

export interface PostActionsProps {
  post: UnifiedPost
  onAction?: (action: PostAction) => void
  variant?: PostCardVariant
  className?: string
}

export function PostActions({
  post,
  onAction,
  variant = 'full',
  className
}: PostActionsProps) {
  // Оптимистичные состояния
  const [optimisticLikes, setOptimisticLikes] = useState(post.engagement.likes)
  const [optimisticIsLiked, setOptimisticIsLiked] = useState(post.engagement.isLiked)
  const [isProcessing, setIsProcessing] = useState(false)

  // Синхронизация с props при изменениях
  useEffect(() => {
    setOptimisticLikes(post.engagement.likes)
    setOptimisticIsLiked(post.engagement.isLiked)
  }, [post.engagement.likes, post.engagement.isLiked])

  const handleLike = async () => {
    if (isProcessing) return
    
    // Оптимистичное обновление
    const newIsLiked = !optimisticIsLiked
    setOptimisticIsLiked(newIsLiked)
    setOptimisticLikes(newIsLiked ? optimisticLikes + 1 : optimisticLikes - 1)
    setIsProcessing(true)
    
    try {
      if (onAction) {
        await onAction({ 
          type: newIsLiked ? 'like' : 'unlike', 
          postId: post.id 
        })
      }
    } catch (error) {
      // Откат при ошибке
      console.error('Failed to update like:', error)
      setOptimisticIsLiked(post.engagement.isLiked)
      setOptimisticLikes(post.engagement.likes)
    } finally {
      setIsProcessing(false)
    }
  }

  // ... остальной код компонента без изменений, но использовать optimisticLikes и optimisticIsLiked
```

---

## Шаг 6: Нормализация подписок

### Создать файл `lib/utils/subscriptions.ts`:
```typescript
import { TierName, normalizeTierName } from '@/lib/constants/tiers'

/**
 * Форматирует имя плана для отображения
 */
export function formatPlanName(plan: string | null | undefined): string {
  if (!plan) return 'Free'
  
  const normalized = normalizeTierName(plan)
  if (!normalized) return plan
  
  // Capitalize first letter
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

/**
 * Проверяет, является ли план платным
 */
export function isPaidPlan(plan: string | null | undefined): boolean {
  const normalized = normalizeTierName(plan)
  return normalized !== null && normalized !== 'free'
}
```

### Обновить все места загрузки подписок:
```typescript
// Пример использования в API
const subscription = await prisma.subscription.findUnique({...})
if (subscription) {
  subscription.plan = normalizeTierName(subscription.plan) || subscription.plan
}
```

---

## Тестирование

### Создать тестовую страницу `/app/test/access-logic/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { hasAccessToTier, checkPostAccess } from '@/lib/utils/access'
import { TIER_HIERARCHY, TIER_INFO } from '@/lib/constants/tiers'

export default function AccessLogicTest() {
  const [userTier, setUserTier] = useState<string>('basic')
  const [requiredTier, setRequiredTier] = useState<string>('premium')
  
  const testCases = [
    { user: null, required: 'basic', expected: false },
    { user: 'basic', required: 'basic', expected: true },
    { user: 'basic', required: 'premium', expected: false },
    { user: 'premium', required: 'basic', expected: true },
    { user: 'vip', required: 'premium', expected: true },
  ]

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Access Logic Test</h1>
      
      {/* Тестирование иерархии */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tier Hierarchy</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(TIER_HIERARCHY, null, 2)}
        </pre>
      </section>

      {/* Интерактивный тест */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Interactive Test</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2">User Tier:</label>
            <select 
              value={userTier} 
              onChange={(e) => setUserTier(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">None</option>
              {Object.keys(TIER_HIERARCHY).map(tier => (
                <option key={tier} value={tier}>{tier}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2">Required Tier:</label>
            <select 
              value={requiredTier} 
              onChange={(e) => setRequiredTier(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {Object.keys(TIER_HIERARCHY).map(tier => (
                <option key={tier} value={tier}>{tier}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4 bg-gray-100 rounded">
          <p>Has Access: <strong>{hasAccessToTier(userTier || null, requiredTier).toString()}</strong></p>
        </div>
      </section>

      {/* Автоматические тесты */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Automated Tests</h2>
        <div className="space-y-2">
          {testCases.map((test, i) => {
            const result = hasAccessToTier(test.user, test.required)
            const passed = result === test.expected
            return (
              <div key={i} className={`p-2 rounded ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
                User: {test.user || 'none'} | Required: {test.required} | 
                Expected: {test.expected.toString()} | Result: {result.toString()} | 
                {passed ? '✅ PASS' : '❌ FAIL'}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
```

---

## Команды для быстрого внедрения

```bash
# 1. Создать файлы
mkdir -p lib/constants lib/utils
touch lib/constants/tiers.ts
touch lib/utils/access.ts
touch lib/utils/subscriptions.ts
touch app/test/access-logic/page.tsx

# 2. Скопировать код из этого документа в соответствующие файлы

# 3. Протестировать локально
npm run dev
# Открыть http://localhost:3000/test/access-logic

# 4. Запустить тесты
npm test

# 5. Деплой
./deploy-to-production.sh
```

---

**Важно**: После внедрения обязательно протестировать:
1. ✅ Доступ к постам с разными тирами
2. ✅ Оптимистичные лайки
3. ✅ Оформление подписок
4. ✅ Апгрейд подписок

---

**Время внедрения**: ~2-3 часа
**Риски**: Минимальные, так как создаются новые файлы, старая логика сохраняется 