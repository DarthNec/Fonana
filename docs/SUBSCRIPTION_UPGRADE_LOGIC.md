# 🎯 Логика апгрейда/даунгрейда подписок

**Дата**: 19.10.2025  
**Файл**: `app/api/subscriptions/mobile/route.ts`  
**Задача**: Реализация умной логики обновления подписок с учетом иерархии тиров

## 📊 Иерархия тиров

```typescript
TIER_HIERARCHY = {
  free: 1,      // Бесплатный
  basic: 2,     // Базовый (0.05 SOL)
  premium: 3,   // Премиум (0.15 SOL)
  vip: 4        // VIP (0.35 SOL)
}
```

## 🔄 Логика работы

### Раньше (❌ Проблема)
```typescript
// Если есть активная подписка - просто возвращаем ее
if (existingSubscription && existingSubscription.isActive) {
  return { success: true, message: 'Active subscription already exists' }
}
```

**Проблема**: Не позволяло апгрейдить подписку с Basic на Premium/VIP

---

### Теперь (✅ Решение)

#### 1. **Сравнение тиров**
```typescript
function isTierUpgradeOrEqual(newTier: string, currentTier: string): boolean {
  const newLevel = TIER_HIERARCHY[newTier.toLowerCase()] || 0
  const currentLevel = TIER_HIERARCHY[currentTier.toLowerCase()] || 0
  return newLevel >= currentLevel
}
```

#### 2. **Детекция типа операции**
```typescript
if (existingSubscription && existingSubscription.isActive) {
  const currentPlan = existingSubscription.plan.toLowerCase()
  const newPlan = plan.toLowerCase()
  
  if (TIER_HIERARCHY[newPlan] > TIER_HIERARCHY[currentPlan]) {
    // ⬆️ АПГРЕЙД: Basic → Premium → VIP
    isUpgrade = true
  } else if (TIER_HIERARCHY[newPlan] === TIER_HIERARCHY[currentPlan]) {
    // 🔄 ПРОДЛЕНИЕ: Basic → Basic
    operationType = 'renewal'
  } else {
    // ⬇️ ДАУНГРЕЙД: VIP → Premium → Basic
    isDowngrade = true
  }
}
```

#### 3. **Всегда обновляем подписку**
- ✅ **Апгрейд** (Basic → Premium): Обновляется план и срок
- ✅ **Продление** (Basic → Basic): Обновляется срок на +1 месяц
- ✅ **Даунгрейд** (Premium → Basic): Обновляется план (логируется warning)
- ✅ **Новая подписка**: Создается новая запись

## 🔔 Уведомления креатора

### Типы уведомлений:

#### 1. **NEW_SUBSCRIBER** (Новый подписчик)
```
"Пользователь подписался на план Basic"
```

#### 2. **SUBSCRIPTION_UPGRADE** 🎉 (Апгрейд)
```
"Пользователь повысил подписку с Basic до Premium"
```

#### 3. **SUBSCRIPTION_RENEWAL** 🔄 (Продление)
```
"Пользователь продлил подписку Premium"
```

#### 4. **SUBSCRIPTION_DOWNGRADE** ⬇️ (Даунгрейд)
```
"Пользователь изменил подписку с VIP на Premium"
```

## 📝 Метаданные транзакции

Каждая транзакция теперь содержит:
```typescript
{
  plan: 'premium',
  creatorId: '...',
  hasReferrer: true,
  source: 'mobile',
  isUpgrade: true,           // Новое
  isDowngrade: false,        // Новое
  previousPlan: 'basic'      // Новое
}
```

## 🔍 Логирование

### Успешная операция:
```
[PAYMENT] Subscription upgrade detected { 
  userId: 'abc12...', 
  creatorId: 'xyz78...', 
  from: 'basic', 
  to: 'premium' 
}

[PAYMENT] Subscription upgrade processed in 245ms (mobile)
```

### Payment log содержит:
```typescript
paymentLogger.payment('completed', {
  userId: user.id,
  creatorId: creatorId,
  amount: 0.15,
  currency: 'SOL',
  signature: 'tx_hash...',
  hasReferrer: true,
  operationType: 'upgrade',      // Новое
  previousPlan: 'basic',         // Новое
  newPlan: 'premium'             // Новое
})
```

## 📊 API Response

### Новый формат ответа:
```json
{
  "success": true,
  "subscription": { ... },
  "transaction": { ... },
  "operationType": "upgrade",
  "isUpgrade": true,
  "isDowngrade": false
}
```

Клиент может использовать эти флаги для показа специальных UI уведомлений.

## 🎯 Сценарии использования

### Сценарий 1: Апгрейд Basic → Premium
```
1. User имеет активную подписку Basic (validUntil: 2025-11-01)
2. User покупает Premium
3. ✅ План обновляется на Premium
4. ✅ Срок продлевается на +1 месяц (validUntil: 2025-12-19)
5. ✅ Creator получает уведомление "Апгрейд подписки! 🎉"
6. ✅ Записывается транзакция с isUpgrade: true
```

### Сценарий 2: Продление Basic → Basic
```
1. User имеет активную подписку Basic (validUntil: 2025-11-01)
2. User покупает Basic снова
3. ✅ План остается Basic
4. ✅ Срок продлевается на +1 месяц (validUntil: 2025-12-19)
5. ✅ Creator получает уведомление "Продление подписки"
```

### Сценарий 3: Даунгрейд VIP → Basic
```
1. User имеет активную подписку VIP (validUntil: 2025-11-01)
2. User покупает Basic
3. ⚠️ План понижается до Basic (логируется warning)
4. ✅ Срок обновляется (validUntil: 2025-12-19)
5. ⚠️ Creator получает уведомление "Изменение подписки"
```

## 🛡️ Защита данных

### WebSocket уведомления содержат:
```typescript
{
  type: 'SUBSCRIPTION_UPGRADE',
  title: 'Апгрейд подписки! 🎉',
  message: 'Пользователь повысил подписку с basic до premium',
  metadata: {
    userId: '...',
    plan: 'premium',
    source: 'mobile',
    isUpgrade: true,
    isDowngrade: false,
    previousPlan: 'basic'
  }
}
```

## 🔧 Технические детали

### Обновленные файлы:
1. **`app/api/subscriptions/mobile/route.ts`**
   - Добавлена функция `isTierUpgradeOrEqual()`
   - Обновлена логика проверки существующей подписки
   - Расширены метаданные транзакций
   - Улучшены уведомления

2. **`lib/utils/logger.ts`**
   - Расширен тип `payment()` метода
   - Добавлены поля: `operationType`, `previousPlan`, `newPlan`

### Зависимости:
```typescript
import { TIER_HIERARCHY, type TierName } from '@/lib/constants/tiers'
```

## 📈 Метрики и аналитика

Теперь можно отслеживать:
- **Количество апгрейдов** (Basic → Premium → VIP)
- **Количество даунгрейдов** (обратное движение)
- **Retention rate** (продления подписок)
- **Average Revenue Per User (ARPU)** с учетом tier переходов

## ✅ Тестирование

### Checklist для QA:
- [ ] Апгрейд Basic → Premium работает
- [ ] Апгрейд Premium → VIP работает
- [ ] Продление Basic → Basic продлевает срок
- [ ] Даунгрейд VIP → Basic обрабатывается
- [ ] Creator получает правильные уведомления
- [ ] Метаданные транзакций корректны
- [ ] Логи содержат operationType
- [ ] WebSocket события отправляются


