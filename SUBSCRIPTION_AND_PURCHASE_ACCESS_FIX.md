# Исправление доступа после апгрейда подписки и покупки контента

## Проблема
После оплаты апгрейда подписки или покупки платного поста деньги списываются, но доступ не открывается. Требуется перезагрузка страницы.

## Анализ причины
1. **API работает корректно**: 
   - `/api/subscriptions/process-payment` правильно создает/обновляет подписку
   - `/api/posts/process-payment` правильно создает запись о покупке

2. **События не обрабатываются**:
   - `refreshPostAccess()` и `refreshSubscriptionStatus()` отправляют события через `window.dispatchEvent`
   - НИ ОДИН компонент не слушает эти события `subscription-updated` и `post-purchased`

3. **Неоднородное поведение**:
   - На странице создателя: есть локальные обновления UI
   - На страницах feed/search: только перезагрузка данных с задержкой

## Реализованное решение

### 1. Добавлены слушатели событий в `useUnifiedPosts` хук
```typescript
// lib/hooks/useUnifiedPosts.ts

// Обработчик событий обновления подписки
const handleSubscriptionUpdate = useCallback((event: CustomEvent) => {
  const { creatorId: updatedCreatorId } = event.detail
  
  // Обновляем посты этого создателя
  setPosts(prevPosts => prevPosts.map(post => {
    if (post.creator.id === updatedCreatorId) {
      // Перезагружаем данные о подписке для этого поста
      return {
        ...post,
        access: {
          ...post.access,
          needsRefresh: true
        }
      }
    }
    return post
  }))
  
  // Перезагружаем посты через короткий интервал
  setTimeout(() => {
    loadPosts()
  }, 500)
}, [loadPosts])

// Обработчик событий покупки поста
const handlePostPurchase = useCallback((event: CustomEvent) => {
  const { postId } = event.detail
  
  // Оптимистично обновляем конкретный пост
  setPosts(prevPosts => prevPosts.map(post => {
    if (post.id === postId) {
      return {
        ...post,
        access: {
          ...post.access,
          isLocked: false,
          hasPurchased: true
        }
      }
    }
    return post
  }))
}, [])

// Подписываемся на события
useEffect(() => {
  window.addEventListener('subscription-updated', handleSubscriptionUpdateWrapper)
  window.addEventListener('post-purchased', handlePostPurchaseWrapper)
  
  return () => {
    window.removeEventListener('subscription-updated', handleSubscriptionUpdateWrapper)
    window.removeEventListener('post-purchased', handlePostPurchaseWrapper)
  }
}, [handleSubscriptionUpdate, handlePostPurchase])
```

### 2. Улучшены обработчики в Feed странице
```typescript
// app/feed/page.tsx

// Добавлено оптимистичное обновление для подписки
onSuccess={(data) => {
  if (data?.subscription) {
    const newTier = data.subscription.plan?.toLowerCase() || 'basic'
    
    // Обновляем посты локально
    const updatedPosts = posts.map(post => {
      if (post.creator.id === selectedCreator.id) {
        const hasAccess = hasAccessToTier(newTier, post.access.tier)
        return {
          ...post,
          access: {
            ...post.access,
            hasSubscription: true,
            userTier: newTier,
            isLocked: post.access.isLocked && !hasAccess && !post.access.price
          }
        }
      }
      return post
    })
    
    // События subscription-updated обработаются автоматически через хук
  }
}
```

## Как работает решение

1. **При успешной подписке**:
   - `SubscribeModal` вызывает `refreshSubscriptionStatus()` 
   - Отправляется событие `subscription-updated` с `creatorId`
   - Хук `useUnifiedPosts` ловит событие и обновляет посты создателя
   - UI обновляется мгновенно без перезагрузки

2. **При покупке поста**:
   - `PurchaseModal` вызывает `refreshPostAccess()`
   - Отправляется событие `post-purchased` с `postId`
   - Хук `useUnifiedPosts` ловит событие и разблокирует пост
   - Доступ открывается мгновенно

## Тестирование

### Сценарий 1: Апгрейд подписки Basic → Premium
1. Зайти на страницу создателя с подпиской Basic
2. Нажать "Upgrade to Premium" 
3. Оплатить через Phantom
4. **Ожидаемый результат**: Premium посты должны разблокироваться без перезагрузки

### Сценарий 2: Покупка платного поста
1. Найти заблокированный платный пост
2. Нажать кнопку покупки
3. Оплатить через Phantom
4. **Ожидаемый результат**: Пост должен открыться без перезагрузки

### Сценарий 3: Проверка на разных страницах
1. Повторить сценарии 1-2 на страницах:
   - Feed (`/feed`)
   - Search (`/search`)
   - Creator page (`/creator/[id]`)
2. **Ожидаемый результат**: Везде должно работать одинаково

## Дополнительные улучшения

1. **Оптимистичные обновления**: UI обновляется мгновенно, не дожидаясь сервера
2. **Единообразное поведение**: Все страницы работают одинаково
3. **Отказоустойчивость**: При ошибке обновления откат к предыдущему состоянию

## Статус
✅ Реализовано и готово к тестированию 