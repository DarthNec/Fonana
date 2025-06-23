# Быстрые исправления UI подписок и покупок

## 1. Оптимистичное обновление PurchaseModal

**Файл:** `components/PurchaseModal.tsx`

**Проблема:** После покупки поста UI не обновляется

**Решение:**
```typescript
// После успешной покупки (строка ~250):
toast.success('Пост успешно куплен!')

if (onSuccess) {
  // Передаем информацию о покупке для оптимистичного обновления
  onSuccess({
    postId: post.id,
    purchased: true
  })
}

// Убираем onClose() здесь - пусть вызывается в onSuccess
```

## 2. Точечное обновление постов в Feed

**Файл:** `app/feed/page.tsx`

**Проблема:** Полная перезагрузка постов сбрасывает скролл

**Решение:**
```typescript
// Добавить функцию для точечного обновления:
const updatePostPurchaseStatus = (postId: string, purchased: boolean) => {
  setPosts(prevPosts => prevPosts.map(post => 
    post.id === postId 
      ? { ...post, hasPurchased: purchased, shouldHideContent: false }
      : post
  ))
}

// Изменить handlePurchaseClick:
const handlePurchaseSuccess = (purchaseData: any) => {
  setShowPurchaseModal(false)
  
  // Оптимистичное обновление
  if (purchaseData.postId) {
    updatePostPurchaseStatus(purchaseData.postId, true)
  }
  
  // Затем проверяем с сервера (без полной перезагрузки)
  setTimeout(() => {
    fetch(`/api/posts/${purchaseData.postId}?userId=${user?.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.post) {
          setPosts(prevPosts => prevPosts.map(post => 
            post.id === purchaseData.postId ? { ...data.post } : post
          ))
        }
      })
  }, 1000)
}
```

## 3. Оптимистичное обновление подписок на странице создателя

**Файл:** `app/creator/[id]/page.tsx`

**Проблема:** Статус подписки не обновляется сразу

**Решение:**
```typescript
// Изменить onSuccess callback для SubscribeModal (строка ~705):
onSuccess={(subscriptionData) => {
  setShowSubscribeModal(false)
  
  // Оптимистичное обновление UI
  setIsSubscribed(true)
  setCurrentSubscriptionTier(subscriptionData.subscription.plan)
  
  // Обновляем видимость постов
  setPosts(prevPosts => prevPosts.map(post => {
    const hasAccess = checkTierAccess(post.requiredTier, subscriptionData.subscription.plan)
    return {
      ...post,
      shouldHideContent: post.isLocked && !hasAccess,
      userTier: subscriptionData.subscription.plan
    }
  }))
  
  // Проверяем с сервера через небольшую задержку
  setTimeout(() => {
    loadCreatorData()
  }, 2000)
}

// Добавить функцию проверки доступа:
const checkTierAccess = (requiredTier: string | null, userTier: string): boolean => {
  if (!requiredTier) return true
  
  const tierHierarchy = {
    'basic': 1,
    'premium': 2,
    'vip': 3
  }
  
  const userLevel = tierHierarchy[userTier.toLowerCase()] || 0
  const requiredLevel = tierHierarchy[requiredTier.toLowerCase()] || 0
  
  return userLevel >= requiredLevel
}
```

## 4. Убрать window.location.reload из SubscribeModal

**Файл:** `components/SubscribeModal.tsx`

**Проблема:** Полная перезагрузка страницы - плохой UX

**Решение:**
```typescript
// Строка ~445, заменить:
// setTimeout(() => {
//   window.location.reload()
// }, 1500)

// На:
if (onSuccess) {
  onSuccess({
    subscription: {
      id: data.subscription.id,
      plan: selectedSubscription.name,
      creatorId: creator.id,
      isActive: true
    }
  })
}
onClose()
```

## 5. Добавить сохранение позиции скролла

**Файл:** `app/feed/page.tsx`

**Проблема:** Теряется позиция при обновлении

**Решение:**
```typescript
// Перед любым обновлением постов:
const scrollPositionRef = useRef(0)

const loadPosts = async () => {
  // Сохраняем позицию
  scrollPositionRef.current = window.scrollY
  
  // ... загрузка постов ...
  
  // После загрузки восстанавливаем позицию
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollPositionRef.current)
  })
}
```

## 6. Добавить локальный кеш подписок

**Файл:** Создать `lib/hooks/useSubscriptionCache.ts`

```typescript
import { useState, useEffect } from 'react'

interface SubscriptionCache {
  [creatorId: string]: {
    isSubscribed: boolean
    tier: string | null
    timestamp: number
  }
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 минут

export function useSubscriptionCache() {
  const [cache, setCache] = useState<SubscriptionCache>({})
  
  const getSubscription = (creatorId: string) => {
    const cached = cache[creatorId]
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      // Кеш устарел
      return null
    }
    
    return cached
  }
  
  const setSubscription = (creatorId: string, isSubscribed: boolean, tier: string | null) => {
    setCache(prev => ({
      ...prev,
      [creatorId]: {
        isSubscribed,
        tier,
        timestamp: Date.now()
      }
    }))
  }
  
  const clearCache = () => {
    setCache({})
  }
  
  return { getSubscription, setSubscription, clearCache }
}
```

## Порядок внедрения

1. **Сначала** - убрать `window.location.reload()` из SubscribeModal
2. **Затем** - добавить оптимистичные обновления в модалки
3. **После** - реализовать точечные обновления постов
4. **В конце** - добавить кеширование для производительности

## Тестирование

После каждого изменения проверить:
1. Подписка обновляет UI без перезагрузки
2. Покупка поста не сбрасывает скролл
3. Статус подписки отображается корректно
4. Кнопки апгрейда скрываются после покупки 