# Система динамического курса Solana

## Обзор

Мы реализовали систему динамического курса Solana, которая автоматически получает актуальный курс SOL/USD от CoinGecko API и кеширует его на 5 минут.

## Архитектура

### 1. API Endpoint (`/api/pricing`)
- Получает курс от CoinGecko API 
- Кеширует результат на 5 минут
- Возвращает фоллбэк значение при ошибках
- Поддерживает два формата ответа для обратной совместимости

### 2. Кеширование (`lib/config/ratesCache.ts`)
- Серверный кеш с TTL 5 минут
- Автоматический фоллбэк на значение по умолчанию (135 USD)
- Проверка актуальности перед запросом

### 3. React Hook (`lib/hooks/useSolRate.ts`)
- Клиентский хук для получения курса
- Автоматическая загрузка при монтировании компонента
- Возвращает `{rate: number, isLoading: boolean}`

### 4. Система цен (`lib/pricing/`)
- `PricingProvider` - контекст для глобального управления ценами
- `useDynamicPrice` - хук для конвертации SOL в USD
- Поддержка нескольких источников данных (CoinGecko, Binance)

## Использование

### В компонентах React:
```tsx
import { useSolRate } from '@/lib/hooks/useSolRate'

function MyComponent() {
  const { rate: solRate, isLoading } = useSolRate()
  
  return (
    <div>
      {isLoading ? 'Загрузка...' : `1 SOL = $${solRate}`}
    </div>
  )
}
```

### С PricingProvider:
```tsx
import { useDynamicPrice } from '@/lib/pricing/hooks/useDynamicPrice'

function PriceDisplay({ solAmount }) {
  const price = useDynamicPrice(solAmount)
  
  return (
    <div>
      {price.displayPrice} {/* "0.1 SOL ($13.50)" */}
    </div>
  )
}
```

## Обновленные компоненты

1. **SubscribeModal** (`components/SubscribeModal.tsx`)
   - Использует `useSolRate()` вместо захардкоженного значения 45
   - Отображает цены в USD рядом с SOL

2. **Страница сообщений** (`app/messages/[id]/page.tsx`)
   - Динамическое отображение цен для PPV сообщений
   - Конвертация чаевых в USD

3. **Тестовая страница** (`app/test/pricing/page.tsx`)
   - Отображает текущий курс
   - Автообновление каждые 30 секунд
   - Тестирование транзакций с реальным курсом

## API Response Format

```json
{
  "success": true,
  "rate": 135.42,
  "lastUpdate": "2024-01-20T10:30:00.000Z",
  "data": {
    "prices": {
      "SOL_USD": 135.42,
      "BTC_USD": 50000,
      "ETH_USD": 3000,
      "timestamp": 1705748400000,
      "source": "coingecko"
    }
  }
}
```

## Тестирование

Запустите тестовый скрипт:
```bash
node scripts/test-dynamic-pricing.js
```

Или проверьте на странице:
- https://fonana.me/test/pricing

## Миграция от старой системы

### Было:
- Захардкоженный курс в `lib/config/rates.ts` (SOL_USD: 135)
- Использование `convertSolToUsd()` функции
- Ручное умножение на 45 или 135 в компонентах

### Стало:
- Динамический курс через API
- Использование хуков `useSolRate()` или `useDynamicPrice()`
- Автоматическое обновление каждые 5 минут

## Производительность

- Кеширование на сервере: 5 минут
- Кеширование в Next.js: `revalidate: 300`
- Время ответа API: <100ms (из кеша)
- Fallback при ошибках: мгновенно

## Безопасность

- Валидация диапазона цен (0.01 - 10000 USD)
- Проверка изменения цены (макс 50% за обновление)
- Автоматический откат при 5 последовательных ошибках
- CORS защита на API endpoints

## TODO

- [ ] Добавить больше источников курса (Binance, Coinbase)
- [ ] Исторические данные для графиков
- [ ] WebSocket для real-time обновлений
- [ ] Кеширование в Redis для масштабирования 