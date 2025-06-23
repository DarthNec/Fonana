# Руководство по интеграции динамического курса

## Текущий статус

### ✅ Реализовано:
1. **Изолированная система ценообразования** в `/lib/pricing/`
2. **Тестовые страницы** для проверки функциональности:
   - `/test/pricing` - главный дашборд
   - `/test/pricing/subscription` - тест подписок
   - `/test/pricing/post-purchase` - тест покупок
3. **API эндпоинт** `/api/pricing` для серверных запросов
4. **Отображение курса в навбаре** (только на тестовых страницах)

### 🎯 Доступ к тестовым страницам:
- Локально: http://localhost:3000/test/pricing
- На проде: https://fonana.me/test/pricing

## Следующие шаги для полной интеграции

### 1. Замена захардкоженного курса $45

**Файлы для изменения:**
- `components/PurchaseModal.tsx` (строка 364)
- `components/CreatePostModal.tsx` (строки 702, 819)
- `components/SubscribeModal.tsx` (строка 683)

**Пример изменения:**
```tsx
// Было:
≈ ${(post.price * 45).toFixed(2)} USD

// Станет:
import { useDynamicPrice } from '@/lib/pricing/hooks/useDynamicPrice'

const dynamicPrice = useDynamicPrice(post.price)
// В JSX:
{dynamicPrice.usd && <span>≈ {formatUsdAmount(dynamicPrice.usd)}</span>}
```

### 2. Обновление основного layout

**В `app/layout.tsx`:**
```tsx
import { PricingProvider } from '@/lib/pricing/PricingProvider'

// Обернуть все приложение, но с условием включения
const isDynamicPricingEnabled = process.env.NEXT_PUBLIC_DYNAMIC_PRICING === 'true'

<PricingProvider enabled={isDynamicPricingEnabled}>
  {children}
</PricingProvider>
```

### 3. Обновление Navbar для всех страниц

**В `components/Navbar.tsx`:**
```tsx
// Убрать условие pathname?.startsWith('/test/pricing')
// Добавить проверку feature flag
{isDynamicPricingEnabled && <SolanaRateDisplay />}
```

### 4. Обновление компонентов с ценами

#### PurchaseModal.tsx:
```tsx
import { useDynamicPrice } from '@/lib/pricing/hooks/useDynamicPrice'

// В компоненте:
const dynamicPrice = useDynamicPrice(displayPrice)

// Заменить статический текст на:
<div>
  <span>{formatSolAmount(displayPrice)}</span>
  {dynamicPrice.usd && (
    <span className="text-sm text-gray-600">
      ≈ {formatUsdAmount(dynamicPrice.usd)}
    </span>
  )}
</div>
```

#### SubscribeModal.tsx:
```tsx
// Аналогично для каждого тарифа
const basicPrice = useDynamicPrice(tier.price)
```

### 5. Сохранение курса в транзакциях

**В API эндпоинтах создания транзакций:**
```typescript
// Добавить в metadata транзакции:
metadata: {
  ...existingMetadata,
  exchangeRate: await priceService.getPrice('SOL'),
  priceSource: 'dynamic',
  usdAmount: solAmount * exchangeRate
}
```

## Поэтапный rollout

### Фаза 1: Тестирование (текущая)
- [x] Тестовые страницы работают
- [x] API эндпоинт доступен
- [ ] Протестировать на реальных пользователях

### Фаза 2: Soft Launch
1. Добавить переменную окружения:
   ```bash
   NEXT_PUBLIC_DYNAMIC_PRICING=true
   DYNAMIC_PRICING_USERS=user1,user2,user3
   ```

2. Включить только для выбранных пользователей:
   ```tsx
   const isDynamicPricingEnabled = 
     process.env.NEXT_PUBLIC_DYNAMIC_PRICING === 'true' &&
     allowedUsers.includes(user?.id)
   ```

### Фаза 3: Полный запуск
1. Убрать ограничения по пользователям
2. Мониторить метрики конверсии
3. Готовность к быстрому откату

## Команды для управления

### Включить динамические цены:
```bash
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && echo 'NEXT_PUBLIC_DYNAMIC_PRICING=true' >> .env && npm run build && pm2 restart fonana"
```

### Отключить динамические цены:
```bash
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && sed -i '/NEXT_PUBLIC_DYNAMIC_PRICING/d' .env && npm run build && pm2 restart fonana"
```

### Проверить статус:
```bash
node scripts/test-dynamic-pricing.js https://fonana.me
```

## Мониторинг после запуска

1. **Конверсия покупок** - сравнить до/после
2. **Ошибки API** - проверять логи
3. **Производительность** - время загрузки страниц
4. **Точность курса** - сравнение с биржами

## Потенциальные проблемы

1. **API недоступен** → используется fallback курс $100
2. **Резкое изменение курса** → валидация отклонит обновление
3. **Нагрузка на API** → кэширование на 5 минут
4. **CORS ошибки** → API работает через server-side

## Контрольный чеклист перед production

- [ ] Все тесты пройдены
- [ ] Fallback механизмы работают
- [ ] Логирование настроено
- [ ] Мониторинг готов
- [ ] План отката подготовлен
- [ ] Команда оповещена 