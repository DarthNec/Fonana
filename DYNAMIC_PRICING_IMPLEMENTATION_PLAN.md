# План имплементации динамического курса валют

## Архитектура решения

### 1. Изолированная система ценообразования

#### Принципы:
- Полностью отдельный модуль, не затрагивающий основной функционал
- Тестирование на отдельных страницах перед интеграцией
- Fallback на статические цены при любых ошибках

#### Структура:
```
lib/pricing/
├── PricingProvider.tsx      # Контекст для цен
├── hooks/
│   ├── useDynamicPrice.ts   # Хук для конвертации
│   └── usePriceDisplay.ts   # Хук для отображения
├── services/
│   ├── priceService.ts      # Логика получения курсов
│   └── cacheService.ts      # Кэширование курсов
└── config.ts                # Конфигурация

app/test/pricing/            # Тестовые страницы
├── page.tsx                 # Дашборд с курсами
├── subscription/page.tsx    # Тест подписок
└── post-purchase/page.tsx   # Тест покупок
```

### 2. Поэтапная интеграция

#### Фаза 1: Изолированное тестирование
- Создать отдельный контекст `PricingProvider`
- Тестовые страницы доступны только по прямым ссылкам:
  - `/test/pricing` - общий дашборд
  - `/test/pricing/subscription` - тест подписок
  - `/test/pricing/post-purchase` - тест покупок

#### Фаза 2: A/B тестирование
- Feature flag в user settings: `enableDynamicPricing`
- Включить только для тестовых аккаунтов
- Логирование всех операций

#### Фаза 3: Постепенный rollout
- Включение по процентам пользователей
- Мониторинг конверсии
- Быстрый откат при проблемах

### 3. Технические детали

#### API для курсов
```typescript
// lib/pricing/services/priceService.ts
interface PriceData {
  SOL_USD: number
  BTC_USD: number
  ETH_USD: number
  timestamp: number
  source: 'coingecko' | 'binance' | 'cache'
}

class PriceService {
  private cache: Map<string, PriceData>
  private fallbackPrices = {
    SOL_USD: 100,  // Безопасный fallback
    BTC_USD: 50000,
    ETH_USD: 3000
  }

  async getPrice(crypto: string): Promise<number> {
    try {
      // 1. Проверить кэш (5 минут)
      // 2. Запросить из API
      // 3. Fallback на статику
    } catch {
      return this.fallbackPrices[`${crypto}_USD`]
    }
  }
}
```

#### Хук использования
```typescript
// lib/pricing/hooks/useDynamicPrice.ts
export function useDynamicPrice(amountInSol: number) {
  const { prices, isLoading, error } = usePricing()
  
  const usdAmount = useMemo(() => {
    if (!prices?.SOL_USD) return null
    return amountInSol * prices.SOL_USD
  }, [amountInSol, prices])

  return {
    sol: amountInSol,
    usd: usdAmount,
    displayPrice: usdAmount 
      ? `$${usdAmount.toFixed(2)} (${amountInSol} SOL)`
      : `${amountInSol} SOL`,
    isLoading,
    error
  }
}
```

### 4. Тестовые сценарии

#### Сценарий 1: Отображение курса
```typescript
// app/test/pricing/page.tsx
export default function PricingTestPage() {
  return (
    <PricingProvider>
      <div className="p-8">
        <h1>Тест динамического курса</h1>
        <PriceDisplay amount={0.05} />
        <PriceDisplay amount={0.15} />
        <PriceDisplay amount={0.35} />
      </div>
    </PricingProvider>
  )
}
```

#### Сценарий 2: Покупка с динамической ценой
- Показать цену в USD и SOL
- При оплате использовать только SOL
- Сохранять курс на момент покупки в транзакции

### 5. Безопасность и откат

#### Условия автоматического отката:
1. Ошибка получения курса > 5 раз подряд
2. Курс изменился > 50% за час
3. Падение конверсии > 20%

#### Команда быстрого отката:
```bash
# Отключить динамические цены
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && echo 'ENABLE_DYNAMIC_PRICING=false' >> .env && pm2 restart fonana"
```

### 6. Мониторинг

#### Метрики для отслеживания:
- Успешность запросов курса
- Время ответа API
- Конверсия покупок до/после
- Количество откатов на fallback

#### Логирование:
```typescript
// При каждой транзакции сохранять:
{
  priceSource: 'dynamic' | 'static',
  solAmount: number,
  usdAmount: number | null,
  exchangeRate: number | null,
  timestamp: Date
}
```

### 7. UI/UX принципы

1. **Всегда показывать SOL как основную валюту**
   - USD только как справочная информация
   - Пример: "0.05 SOL (~$5.00 USD)"

2. **Индикация динамической цены**
   - Иконка обновления рядом с USD
   - Tooltip: "Цена обновляется каждые 5 минут"

3. **Graceful degradation**
   - При ошибке показывать только SOL
   - Не блокировать покупки

### 8. Тестовые адреса

После имплементации будут доступны:
- `https://fonana.me/test/pricing` - дашборд
- `https://fonana.me/test/pricing/subscription` - подписки
- `https://fonana.me/test/pricing/post-purchase` - покупки
- `https://fonana.me/test/pricing/settings` - настройки

Доступ только для аккаунтов с флагом `testDynamicPricing: true` 