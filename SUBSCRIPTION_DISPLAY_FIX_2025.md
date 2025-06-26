# 🐛 Исправление проблемы с отображением подписок

## Описание проблемы

После подписки пользователя на премиум аккаунт автора:
1. ✅ Средства списались с кошелька (транзакция прошла)
2. ❌ Пост не открылся (остался заблокированным)
3. ❌ В профиле отображается "basic" вместо "premium"

## Причина проблемы

### 1. Несогласованность форматов хранения
- **В БД**: Планы хранятся с заглавной буквы: `"Basic"`, `"Premium"`, `"VIP"`
- **В коде**: Сравнения делаются с нижним регистром: `'basic'`, `'premium'`, `'vip'`

### 2. Проблемы в компонентах
В файле `app/creator/[id]/page.tsx`:
- Строка 155: `setCurrentSubscriptionTier(subData.subscription.plan)` - устанавливает `"Premium"`
- Строки 551, 594, 634: Условия проверяют `currentSubscriptionTier?.toLowerCase() !== 'premium'`

### 3. Логика отображения
Из-за несогласованности, условия отображения кнопок работают неправильно:
```typescript
// Если currentSubscriptionTier = "Premium"
// То currentSubscriptionTier?.toLowerCase() !== 'premium' = FALSE
// Кнопка "Upgrade to Premium" НЕ показывается
```

## Решение

### Вариант 1: Стандартизация в БД (не рекомендуется)
Привести все планы к единому формату в базе данных. Это рискованно для production.

### Вариант 2: Исправление отображения (РЕКОМЕНДУЕТСЯ) ✅

#### 1. Исправить условия отображения кнопок
В `app/creator/[id]/page.tsx` заменить все условия проверки планов на корректные:

```typescript
// Было:
{currentSubscriptionTier?.toLowerCase() !== 'basic' && (
  <button>Switch to Basic</button>
)}

// Стало:
{(!currentSubscriptionTier || currentSubscriptionTier.toLowerCase() !== 'basic') && (
  <button>Switch to Basic</button>
)}
```

#### 2. Добавить нормализацию при установке плана
```typescript
// Было:
setCurrentSubscriptionTier(subData.subscription.plan)

// Стало:
setCurrentSubscriptionTier(subData.subscription.plan?.toLowerCase())
```

#### 3. Создать функцию форматирования для отображения
```typescript
const formatPlanName = (plan: string) => {
  if (!plan) return ''
  return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase()
}

// Использование:
<span>{formatPlanName(currentSubscriptionTier)} tier</span>
```

## Файлы для изменения

### 1. `app/creator/[id]/page.tsx`
- Строка 155: Нормализовать план при установке
- Строки 551, 594, 634: Исправить условия проверки
- Строки 396, 507: Использовать функцию форматирования для отображения

### 2. `components/UserSubscriptions.tsx`
- Проверить и исправить отображение планов

### 3. `components/PostCard.tsx`
- Убедиться, что проверка доступа работает корректно

## Проверка исправлений

### 1. Запустить диагностику
```bash
# На сервере
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/diagnose-subscription-display-issue.js"
```

### 2. Проверить конкретный случай
```bash
# Проверить подписку конкретного пользователя
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/diagnose-subscription-display-issue.js username creatorname"
```

### 3. Проверить проблемы с Premium
```bash
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/check-premium-subscription-issues.js"
```

## Временное решение (быстрый фикс)

Если нужно срочно исправить для конкретных пользователей:

```sql
-- Привести все планы к единому формату
UPDATE subscriptions 
SET plan = CASE 
  WHEN LOWER(plan) = 'free' THEN 'Free'
  WHEN LOWER(plan) = 'basic' THEN 'Basic'
  WHEN LOWER(plan) = 'premium' THEN 'Premium'
  WHEN LOWER(plan) = 'vip' THEN 'VIP'
  ELSE plan
END
WHERE "isActive" = true;
```

## Важные замечания

1. **Доступ к постам работает корректно** - функция `hasAccessToTier` использует `.toLowerCase()`
2. **Транзакции сохраняются правильно** - планы в метаданных совпадают с планами в подписках
3. **Проблема только в UI** - отображение и условия показа кнопок

## Результат после исправления

✅ Пользователи с Premium подпиской:
- Видят "Premium tier" в профиле создателя
- Имеют доступ к Premium постам
- Не видят кнопку "Upgrade to Premium"
- Видят кнопку "Upgrade to VIP" (если доступен VIP тир)

## Дополнительные рекомендации

1. Добавить логирование при установке подписки
2. Создать e2e тесты для проверки всех сценариев подписки
3. Рассмотреть миграцию к единому формату хранения в будущем

---
*Дата создания: 26 января 2025* 