# AI Instructions Improvements - 2025-01-20

## Что было добавлено в AI_CHAT_INSTRUCTIONS.md

### 1. Полная схема базы данных
Теперь ИИ не нужно искать схему БД - все модели с полями описаны прямо в инструкциях:
- **User Model** - все поля пользователя включая wallet, referrals, etc.
- **Post Model** - посты с поддержкой sellable/auction функций
- **Message Model** - личные сообщения с PPV и tips
- **Subscription Model** - подписки с распределением комиссий
- **Transaction Model** - все транзакции Solana
- **FlashSale Model** - флеш-распродажи
- И другие модели...

### 2. Все Enums с описанием
- TransactionType (8 типов)
- PaymentStatus (5 статусов)
- NotificationType (14 типов)
- SellType, AuctionStatus

### 3. Примеры Prisma запросов
Добавлены часто используемые паттерны:
```javascript
// Проверка покупки поста
const purchase = await prisma.postPurchase.findUnique({
  where: { userId_postId: { userId, postId } }
});

// Получение диалога с сообщениями
const conversation = await prisma.conversation.findFirst({...});
```

### 4. Важные константы и конфигурации
- **Комиссии**: Platform 5%, Referrer 5%, Creator 90%
- **Лимиты**: Images 10MB, Videos 100MB
- **Aspect Ratios**: vertical (3:4), square (1:1), horizontal (16:9)
- **Кошельки**: Platform wallet, RPC endpoints
- **Flash Sales**: 10-90% discount range
- **PPV Messages**: 0.01-1000 SOL price range

### 5. Улучшенная структура
- Добавлена секция "Full Database Schema" 
- Добавлена секция "Other Important Models"
- Добавлена секция "Common Prisma Queries"
- Добавлена секция "Important Constants & Configuration"

## Результат
Теперь при работе с проектом ИИ:
- ✅ Не тратит время на поиск схемы БД
- ✅ Знает все поля и типы данных
- ✅ Понимает структуру взаимосвязей
- ✅ Имеет готовые примеры запросов
- ✅ Знает все константы и лимиты

## Рекомендации
При добавлении новых моделей или изменении схемы БД:
1. Обновите секцию "Full Database Schema" в AI_CHAT_INSTRUCTIONS.md
2. Добавьте примеры запросов если они уникальные
3. Обновите константы если они меняются 