# Полное исправление системы тиров подписок

## Проблема
1. Посты с требованием VIP/Premium тира показывались как "Subscribers Only"
2. Не было визуальной индикации требуемого тира
3. CreatePostModal отправлял неправильное поле для тиров

## Решение

### 1. Исправлена логика PostCard (`components/PostCard.tsx`)
- Добавлена отдельная проверка для `isTierContent`
- Исправлена функция `getTierInfo` для работы без подписки
- Добавлены иконки тиров: ⭐ Basic, 💎 Premium, 👑 VIP
- Обновлен UI для показа:
  - "👑 VIP Content" вместо "Subscribers Only"
  - "This content requires 👑 VIP subscription"
  - Кнопка "Subscribe to VIP" вместо просто "Subscribe"

### 2. Исправлен CreatePostModal (`components/CreatePostModal.tsx`)
- Теперь отправляет `minSubscriptionTier` вместо `tier`
- Правильно мапит:
  - 'vip' → 'vip'
  - 'premium' → 'premium'
  - 'subscribers' → 'basic'

### 3. Обновлен API (`app/api/posts/route.ts`)
- Принимает `minSubscriptionTier` от клиента
- Мапит обратно на `tier` для функции `createPost`
- Передает `requiredTier` и `userTier` на фронтенд

### 4. Content Type Badge
- Обновлен для показа правильных цветов и иконок:
  - VIP: золотой цвет, иконка 👑
  - Premium: фиолетовый цвет, иконка 💎
  - Basic: синий цвет, иконка ⭐

## Результат
Теперь пользователи видят:
- Правильную индикацию требуемого тира
- Понятные сообщения о необходимой подписке
- Корректные кнопки для оформления нужного тира

## Примеры:
- VIP пост показывает: "👑 VIP Content" с сообщением "This content requires 👑 VIP subscription"
- Premium пост показывает: "💎 Premium Content" с сообщением о необходимости Premium подписки
- Если есть Basic подписка, но нужен Premium: "You have ⭐ Basic subscription. Upgrade to 💎 Premium to access this content."

Система работает для всех пользователей и правильно отображает требования к доступу. 

# Комплексное решение проблемы с тирами подписок

## Проблема

При попытке подписаться на создателя без кастомных настроек тиров происходит следующее:
1. Пользователь выбирает Premium или VIP тир
2. Оплачивает соответствующую сумму (0.15 или 0.35 SOL)
3. Но в базу сохраняется Basic тир за 0.05 SOL

## Причина

**КЛЮЧЕВАЯ ПРОБЛЕМА**: Нет валидации соответствия плана и цены при сохранении подписки!

В `app/api/subscriptions/process-payment/route.ts` есть только предупреждение о несоответствии цены, но подписка все равно создается с переданным планом.

## Решение

### 1. Исправить валидацию плана и цены

```typescript
// app/api/subscriptions/process-payment/route.ts

// После строки 75, заменить текущую проверку на:
const tierPrices: Record<string, number> = {
  'basic': 0.05,
  'premium': 0.15,
  'vip': 0.35
}

// Нормализуем план к нижнему регистру для проверки
const normalizedPlan = plan.toLowerCase()

// Если нет Flash Sale, проверяем соответствие цены плану
if (!flashSaleId && tierPrices[normalizedPlan]) {
  const expectedPrice = tierPrices[normalizedPlan]
  
  // Если цена не соответствует плану, определяем правильный план по цене
  if (Math.abs(price - expectedPrice) > 0.001) {
    // Находим план, соответствующий оплаченной цене
    const actualPlan = Object.entries(tierPrices).find(([_, p]) => 
      Math.abs(price - p) < 0.001
    )
    
    if (actualPlan) {
      // Используем план, соответствующий оплаченной цене
      plan = actualPlan[0].charAt(0).toUpperCase() + actualPlan[0].slice(1) // 'basic' -> 'Basic'
      
      paymentLogger.warn('Plan adjusted based on price', {
        requestedPlan: body.plan,
        adjustedPlan: plan,
        price
      })
    } else {
      // Если цена не соответствует ни одному стандартному плану
      paymentLogger.error('Price does not match any standard tier', {
        price,
        requestedPlan: plan
      })
      
      return NextResponse.json(
        { error: 'Invalid subscription price for the selected plan' },
        { status: 400 }
      )
    }
  }
}
```

### 2. Стандартизировать формат планов

Всегда сохранять планы в едином формате с заглавной буквы:

```typescript
// Перед сохранением в БД нормализуем план
const normalizedPlanName = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase()
// 'BASIC' -> 'Basic', 'premium' -> 'Premium', 'VIP' -> 'Vip'
```

### 3. Исправить проверки на frontend

В `app/creator/[id]/page.tsx` уже исправлено использование toLowerCase() для сравнений.

### 4. Добавить логирование для отладки

В SubscribeModal добавить детальное логирование:

```typescript
console.log('[SubscribeModal] Subscription attempt:', {
  selectedTier: selectedTier,
  selectedPlan: selectedSubscription.name,
  price: selectedSubscription.price,
  finalPrice: finalPrice,
  creatorHasCustomTiers: !!tierSettings
})
```

## Проверка решения

После внедрения исправлений:
1. Если пользователь выбрал Premium (0.15 SOL) но система получила Basic цену (0.05 SOL), план автоматически скорректируется на Basic
2. Если цена не соответствует ни одному стандартному тиру - транзакция будет отклонена
3. Все сравнения планов будут работать корректно независимо от регистра

## Дополнительные улучшения

1. **Добавить проверку на frontend** перед отправкой транзакции
2. **Показывать предупреждение** если выбранный план не соответствует отправляемой сумме
3. **Логировать все несоответствия** для анализа 