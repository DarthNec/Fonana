# Полное решение проблем с подписками

## Проблема

1. **При подписке на Dogwater**: Ошибка "Invalid subscription price"
2. **При подписке lafufu на vizer36**: Тир сбрасывается

## Причина

### Проблема 1: Dogwater имеет кастомные цены
- Basic: 0.05 SOL (стандартная)
- Premium: **0.2 SOL** (не 0.15!)
- VIP: **0.4 SOL** (не 0.35!)

Наша логика проверяла только стандартные цены и отклоняла кастомные.

### Проблема 2: Сброс тира
Когда пользователь выбирает один тир, но платит цену другого, система автоматически корректирует план по оплаченной сумме.

## Решение

### 1. Учет кастомных цен создателей

Обновили логику в `app/api/subscriptions/process-payment/route.ts`:

```typescript
// Получаем настройки тиров создателя
const creatorTierSettings = await prisma.creatorTierSettings.findUnique({
  where: { creatorId }
})

// Определяем ожидаемые цены (кастомные или дефолтные)
const tierPrices: Record<string, number> = {
  'basic': 0.05,
  'premium': 0.15,
  'vip': 0.35
}

// Если есть кастомные настройки, используем их
if (creatorTierSettings) {
  const basicTier = creatorTierSettings.basicTier as any
  const premiumTier = creatorTierSettings.premiumTier as any
  const vipTier = creatorTierSettings.vipTier as any
  
  if (basicTier?.enabled !== false && basicTier?.price) {
    tierPrices.basic = basicTier.price
  }
  if (premiumTier?.enabled !== false && premiumTier?.price) {
    tierPrices.premium = premiumTier.price
  }
  if (vipTier?.enabled !== false && vipTier?.price) {
    tierPrices.vip = vipTier.price
  }
}
```

### 2. Улучшенные сообщения об ошибках

Теперь при несоответствии цены показываются доступные тиры:

```
Invalid subscription price 0.15 SOL. Available tiers: Basic 0.05 SOL, Premium 0.2 SOL, VIP 0.4 SOL
```

### 3. Логирование для отладки

Добавлено детальное логирование:
- Какие цены использует создатель
- Есть ли кастомные настройки
- Какая корректировка была сделана

## Текущее состояние

### Создатели с кастомными тирами:
1. **Dogwater**: Basic 0.05, Premium 0.2, VIP 0.4
2. **octanedreams**: Basic 0.05, Premium 0.2, VIP 0.3

### Создатели со стандартными тирами:
- lafufu: 0.05, 0.15, 0.35
- vizer36: 0.05, 0.15, 0.35

## Версионирование

Добавлена версия в футер: `v1.0.1-fix-subscriptions`

## Проверка

Для проверки настроек любого создателя:
```bash
node scripts/check-custom-tier-settings.js
``` 