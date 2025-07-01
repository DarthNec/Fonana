# Анализ критического бага toFixed при покупке постов

## Проблема
После внедрения нового UX/UI рефакторинга возникла ошибка:
```
TypeError: Cannot read properties of undefined (reading 'toFixed')
```

## Причина
Баг возникает в компоненте `PostLocked` (строки 149 и 153), где `finalPrice` может быть `undefined`, но используется без проверки:

```typescript
// Проблемный код:
{finalPrice.toFixed(2)} {post.access.currency}
≈ ${(finalPrice * solRate).toFixed(2)} USD
```

## Анализ кода

### 1. PostLocked компонент
В строке 82-84 вычисляется `finalPrice`:
```typescript
const finalPrice = post.commerce?.flashSale && post.access.price
  ? calculatePriceWithDiscount(post.access.price, post.commerce.flashSale)
  : post.access.price
```

Проблема: если `post.access.price` равно `undefined`, то `finalPrice` тоже будет `undefined`.

### 2. Другие компоненты (безопасные)
- **SellablePostModal**: использует защиту `(currentPrice || 0).toFixed(2)` ✅
- **PurchaseModal**: использует функцию `formatSolAmount` с защитой ✅
- **postHelpers.ts**: функция `formatPrice` имеет защиту `const safePrice = price || 0` ✅
- **FlashSale**: `getOriginalPrice()` всегда возвращает число (0 по умолчанию) ✅

### 3. Частично небезопасные места
В `postHelpers.ts` функция `getActionButtonText` использует toFixed без явной защиты:
- Строка 136: `discountedPrice.toFixed(2)`
- Строка 145: `discountedPrice.toFixed(2)`

Но здесь `calculatePriceWithDiscount` всегда возвращает число, так что это безопасно.

## Решение
1. Добавить защиту в PostLocked компоненте
2. Использовать существующую функцию `formatPrice` из postHelpers
3. Добавить проверку перед отображением блока с ценой

## Последствия
- Покупка некоторых постов невозможна
- Приложение крашится при попытке отобразить цену
- Пользователи не могут купить контент 