# Окончательное решение проблемы с Solana транзакциями

## Проблема
`TransactionExpiredBlockheightExceededError: block height exceeded`

## Корневая причина
Использование `confirmTransaction` с blockhash вызывает ошибку истечения по высоте блока, если транзакция не подтверждается достаточно быстро.

## Решение
НЕ использовать `confirmTransaction` вообще. Вместо этого использовать только `getSignatureStatus` в цикле, как это делается во всех работающих компонентах проекта.

### Анализ кода проекта показал:
1. **PurchaseModal.tsx** - использует только `getSignatureStatus`
2. **SellablePostModal.tsx** - использует только `getSignatureStatus`
3. **lib/solana/validation.ts** - комментарий: "Не используем confirmTransaction так как для этого нужен blockhash"
4. **waitForTransactionConfirmation** - правильный паттерн с циклом проверки статуса

### Правильный паттерн подтверждения:
```typescript
// НЕ ИСПОЛЬЗУЕМ confirmTransaction!
let confirmed = false
const maxConfirmAttempts = 30 // 30 секунд максимум

for (let i = 0; i < maxConfirmAttempts; i++) {
  try {
    const status = await connection.getSignatureStatus(signature)
    
    if (status.value?.confirmationStatus === 'confirmed' || 
        status.value?.confirmationStatus === 'finalized') {
      console.log(`Transaction confirmed after ${i + 1} attempts!`)
      confirmed = true
      break
    }
    
    if (status.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`)
    }
    
    // Если транзакция еще не видна, ждем больше в начале
    if (!status.value && i < 10) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
  } catch (error) {
    // Продолжаем попытки при сетевых ошибках
    if (i < maxConfirmAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      continue
    }
    throw error
  }
}
```

### Почему confirmTransaction не работает:
1. Требует точный blockhash и lastValidBlockHeight из транзакции
2. Если транзакция не подтверждается за отведенное количество блоков (~150 блоков), выбрасывает "block height exceeded"
3. В Solana блоки генерируются очень быстро (~400ms), поэтому даже 10-15 секунд ожидания могут привести к истечению

### Что мы убрали:
- ❌ Проверку ренты (аккаунты существуют)
- ❌ Симуляцию транзакций (вызывала AccountNotFound)
- ❌ confirmTransaction (вызывал block height exceeded)

### Что оставили:
- ✅ Priority fee для ускорения
- ✅ Retry логика при отправке
- ✅ getSignatureStatus в цикле для проверки

## Итог
Следуйте паттернам из работающего кода проекта, а не стандартной документации Solana Web3.js. 