# Полное решение проблем с системой подписок

## Выявленные проблемы

### 1. Неправильное сохранение плана подписки
**Симптомы:**
- Пользователи платят за Premium (0.2 SOL), но получают Basic или Free план
- В БД есть записи с планом "Free" и ценой 0.15 SOL (EasySloth, CryptoBob)
- После оплаты UI показывает Premium на секунду, затем сбрасывается

**Причина:**
Система пытается "исправить" план по цене, но делает это неправильно для кастомных цен.

### 2. Проблема с отображением после подписки
После успешной подписки страница перезагружается и показывает старые данные из кэша.

## Решение

### 1. Исправить логику определения плана в process-payment

```typescript
// app/api/subscriptions/process-payment/route.ts

// ВАЖНО: Не корректируем план автоматически!
// Если цена соответствует любому тиру создателя - сохраняем тот план, который был запрошен

if (!flashSaleId) {
  const requestedTierPrice = tierPrices[normalizedPlan]
  
  // Проверяем, соответствует ли оплаченная цена ЛЮБОМУ из тиров создателя
  const paidTierExists = Object.values(tierPrices).some(tierPrice => 
    Math.abs(price - tierPrice) < 0.001
  )
  
  if (!paidTierExists) {
    // Цена не соответствует ни одному тиру
    paymentLogger.error('Price does not match any tier', {
      price,
      requestedPlan: plan,
      availableTiers: tierPrices,
      hasCustomTiers: !!creatorTierSettings
    })
    
    return NextResponse.json(
      { error: `Invalid subscription price ${price} SOL. Available tiers: Basic ${tierPrices.basic} SOL, Premium ${tierPrices.premium} SOL, VIP ${tierPrices.vip} SOL` },
      { status: 400 }
    )
  }
  
  // Если цена валидна, но не соответствует запрошенному плану - это предупреждение, не ошибка
  if (requestedTierPrice && Math.abs(price - requestedTierPrice) > 0.001) {
    paymentLogger.warn('Price mismatch for requested plan', {
      requestedPlan: plan,
      requestedPrice: requestedTierPrice,
      actualPrice: price,
      customTiers: !!creatorTierSettings
    })
  }
  
  // СОХРАНЯЕМ ЗАПРОШЕННЫЙ ПЛАН, А НЕ КОРРЕКТИРУЕМ ЕГО!
}
```

### 2. Исправить callback после подписки

```typescript
// components/SubscribeModal.tsx

// В handleSubscribe после успешного ответа:
if (onSuccess) {
  onSuccess({
    subscription: {
      id: data.subscription.id,
      plan: selectedSubscription.name, // Важно: используем название из UI
      creatorId: creator.id,
      isActive: true,
      price: finalPrice,
      tier: selectedSubscription.name
    }
  })
}
```

### 3. Улучшить обновление страницы создателя

```typescript
// app/creator/[id]/page.tsx

// В callback onSuccess для SubscribeModal:
onSuccess={(data) => {
  setShowSubscribeModal(false)
  if (data?.subscription) {
    // Немедленно обновляем состояние
    setIsSubscribed(true)
    setCurrentSubscriptionTier(data.subscription.plan)
    
    // Обновляем посты
    updatePostsAfterSubscription(data.subscription.plan)
    
    // Перезагружаем данные с небольшой задержкой
    setTimeout(() => {
      loadCreatorData()
    }, 2000)
  }
}}
```

### 4. Исправить существующие неправильные подписки

```sql
-- Найти подписки с планом Free и ненулевой ценой
SELECT * FROM subscriptions 
WHERE plan = 'Free' AND price > 0;

-- Исправить их на правильный план
UPDATE subscriptions 
SET plan = CASE 
  WHEN price = 0.05 THEN 'Basic'
  WHEN price = 0.15 THEN 'Premium'  
  WHEN price = 0.2 THEN 'Premium'   -- Кастомная цена Dogwater
  WHEN price = 0.35 THEN 'VIP'
  WHEN price = 0.4 THEN 'VIP'       -- Кастомная цена Dogwater
  ELSE plan
END
WHERE plan = 'Free' AND price > 0;
```

## Проверка версии

Добавить в layout.tsx отображение версии для отладки:
```typescript
<div className="fixed bottom-2 left-2 text-xs text-gray-400">
  v{APP_VERSION} | Cache: {new Date().toISOString()}
</div>
```

## Итоговые изменения

1. **НЕ корректировать план автоматически** - если цена валидна для любого тира, сохранять запрошенный план
2. **Оптимистичное обновление UI** - сразу показывать новый статус
3. **Отложенная перезагрузка данных** - дать время БД обновиться
4. **Исправить существующие неправильные записи** в БД 