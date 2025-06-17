# Transaction Expiry Fix

## Проблема

При покупке sellable постов возникала ошибка:
```
TransactionExpiredBlockheightExceededError: Signature has expired: block height exceeded
```

При этом покупка подписок работала корректно.

## Причина

В компоненте `SellablePostModal` транзакция отправлялась без установки свежего blockhash перед отправкой. Это приводило к тому, что транзакция использовала устаревший blockhash и истекала до подтверждения.

## Решение

Добавлено получение свежего blockhash непосредственно перед отправкой транзакции (как это реализовано в других компонентах оплаты):

```typescript
// Get fresh blockhash right before sending
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
transaction.recentBlockhash = blockhash
;(transaction as any).lastValidBlockHeight = lastValidBlockHeight

// Отправляем транзакцию с правильными настройками
const sendOptions = {
  skipPreflight: false,
  preflightCommitment: 'confirmed' as any,
  maxRetries: 3
}

const signature = await sendTransaction(transaction, connection, sendOptions)
```

## Дополнительные улучшения

1. Добавлена задержка после отправки транзакции для попадания в сеть
2. Улучшена обработка ошибок с более понятными сообщениями пользователю
3. Используется `lastValidBlockHeight` для правильного подтверждения транзакции

## Проверенные компоненты

Все компоненты оплаты теперь используют одинаковый подход:
- ✅ `SubscribeModal` - работал корректно
- ✅ `PurchaseModal` - работал корректно  
- ✅ `SubscriptionPayment` - работал корректно
- ✅ `SellablePostModal` - исправлен

## Результат

Покупка sellable постов теперь работает надежно без ошибок истечения транзакций. 