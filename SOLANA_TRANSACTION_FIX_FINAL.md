# Финальное решение проблемы с Solana транзакциями

## Проблема
`TransactionExpiredBlockheightExceededError: block height exceeded`

## Найденные причины

1. **Неправильное подтверждение транзакции** - использовался НОВЫЙ blockhash вместо того что был в транзакции
2. **Ненужная проверка ренты** - аккаунт DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG существует и имеет 0.234 SOL
3. **Ошибочная симуляция** - симуляция падала с AccountNotFound хотя аккаунт существует
4. **Неправильный паттерн подтверждения** - не следовали паттерну из рабочего PurchaseModal

## Решение

### 1. Убрали проверку ренты
```typescript
// БЫЛО: проверяли и добавляли ренту
const creatorRent = await getAccountRentIfNeeded(recipientPubkey)
const creatorTransferAmount = creatorAmount + creatorRent

// СТАЛО: просто отправляем сумму
transaction.add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: recipientPubkey,
    lamports: creatorAmount
  })
)
```

### 2. Убрали симуляцию транзакции
```typescript
// БЫЛО: симулировали и игнорировали AccountNotFound
try {
  const simulation = await connection.simulateTransaction(transaction)
  if (simulation.value.err && simulation.value.err !== 'AccountNotFound') {
    throw new Error(...)
  }
} catch (simError) {
  console.warn('Simulation error (continuing):', simError)
}

// СТАЛО: сразу отправляем (как в PurchaseModal)
signature = await sendTransaction(transaction, connection, sendOptions)
```

### 3. Исправили подтверждение транзакции
```typescript
// Сохраняем blockhash из транзакции
transactionBlockhash = transaction.recentBlockhash!
transactionLastValidBlockHeight = (transaction as any).lastValidBlockHeight

// Используем ИХ для подтверждения, а не новые
const confirmation = await connection.confirmTransaction({
  signature,
  blockhash: transactionBlockhash,  // из транзакции!
  lastValidBlockHeight: transactionLastValidBlockHeight  // из транзакции!
}, 'confirmed')
```

### 4. Следуем паттерну из PurchaseModal
1. Отправляем транзакцию
2. Ждем 2 секунды
3. Проверяем статус через getSignatureStatus
4. Если не подтверждена - ждем еще 8 секунд
5. Только потом пробуем confirmTransaction с правильными параметрами

## Ключевые выводы

1. **НЕ делайте предположений** - аккаунт который "не существует" имел 0.234 SOL
2. **Следуйте рабочим паттернам** - PurchaseModal работает без симуляции и проверки ренты
3. **Используйте правильные параметры** - blockhash для подтверждения должен быть из транзакции, а не новый
4. **Логируйте детально** - добавленное логирование помогло найти реальную проблему

## Статус
✅ Исправлено и готово к тестированию 