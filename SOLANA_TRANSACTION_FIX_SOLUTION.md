# Решение проблемы с таймаутом транзакций Solana

## Проблема
`TransactionExpiredTimeoutError: Transaction was not confirmed in 30.00 seconds`

## Причины
1. **Отсутствие приоритетной комиссии** - транзакция может застрять в пуле
2. **Устаревший blockhash** - транзакция становится недействительной
3. **Неправильные параметры подтверждения** - используется устаревший API
4. **Отсутствие retry логики** - нет повторных попыток при сбоях
5. **Не учитывается рента** - транзакция может провалиться для новых аккаунтов

## Решение

### 1. Приоритетная комиссия (Priority Fee)
```typescript
const getPriorityFee = async (): Promise<number> => {
  try {
    const fees = await connection.getRecentPrioritizationFees()
    if (fees && fees.length > 0) {
      const nonZeroFees = fees.filter(f => f.prioritizationFee > 0)
      if (nonZeroFees.length > 0) {
        const feeValues = nonZeroFees.map(f => f.prioritizationFee).sort((a, b) => a - b)
        const p90 = feeValues[Math.floor(feeValues.length * 0.9)]
        return Math.min(Math.max(p90 || 600000, 600000), 2000000)
      }
    }
  } catch (error) {
    console.error('Error getting priority fees:', error)
  }
  return 600000 // По умолчанию
}

// Добавляем к транзакции
transaction.add(
  ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: priorityFee
  })
)
```

### 2. Свежий blockhash для каждой попытки
```typescript
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
transaction.recentBlockhash = blockhash
transaction.feePayer = publicKey
;(transaction as any).lastValidBlockHeight = lastValidBlockHeight
```

### 3. Проверка и добавление ренты
```typescript
const getAccountRentIfNeeded = async (pubkey: PublicKey): Promise<number> => {
  try {
    const accountInfo = await connection.getAccountInfo(pubkey)
    if (!accountInfo) {
      const minRent = await connection.getMinimumBalanceForRentExemption(0)
      return minRent
    }
  } catch (error) {
    console.error('Error checking account:', error)
  }
  return 0
}

// При переводе добавляем ренту
const creatorRent = await getAccountRentIfNeeded(recipientPubkey)
const creatorTransferAmount = creatorAmount + creatorRent
```

### 4. Правильные параметры отправки
```typescript
const sendOptions = {
  skipPreflight: false,
  preflightCommitment: 'confirmed' as any,
  maxRetries: 3
}

const signature = await sendTransaction(transaction, connection, sendOptions)
```

### 5. Retry логика
```typescript
let signature: string = ''
let attempts = 0
const maxAttempts = 3

while (attempts < maxAttempts) {
  attempts++
  
  try {
    const transaction = await createTransaction() // Новый blockhash
    
    // Симуляция (опционально)
    const simulation = await connection.simulateTransaction(transaction)
    if (simulation.value.err && simulation.value.err !== 'AccountNotFound') {
      throw new Error(`Симуляция неуспешна: ${JSON.stringify(simulation.value.err)}`)
    }
    
    signature = await sendTransaction(transaction, connection, sendOptions)
    break // Успех
    
  } catch (sendError) {
    if (attempts === maxAttempts) {
      throw sendError
    }
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}
```

### 6. Правильное подтверждение
```typescript
const latestBlockhash = await connection.getLatestBlockhash('confirmed')

const confirmation = await connection.confirmTransaction({
  signature,
  blockhash: latestBlockhash.blockhash,
  lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
}, 'confirmed')

// Проверка статуса даже при таймауте
if (!confirmation.value.err) {
  const status = await connection.getSignatureStatus(signature)
  if (status.value?.confirmationStatus === 'confirmed' || 
      status.value?.confirmationStatus === 'finalized') {
    // Транзакция прошла
  }
}
```

## Ключевые настройки Connection
```typescript
const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 120000, // 2 минуты вместо 30 секунд
  disableRetryOnRateLimit: false
})
```

## Полный шаблон транзакции
```typescript
async function sendOptimizedTransaction(
  fromWallet: PublicKey,
  toWallet: PublicKey,
  amount: number // в SOL
) {
  // 1. Создание транзакции с актуальными данными
  const createTransaction = async () => {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    const transaction = new Transaction()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = fromWallet
    ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight

    // 2. Добавляем приоритетную комиссию
    const priorityFee = await getPriorityFee()
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFee
      })
    )

    // 3. Проверяем ренту
    const rent = await getAccountRentIfNeeded(toWallet)
    const transferAmount = Math.floor((amount + rent / LAMPORTS_PER_SOL) * LAMPORTS_PER_SOL)

    // 4. Добавляем инструкцию перевода
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromWallet,
        toPubkey: toWallet,
        lamports: transferAmount
      })
    )

    return transaction
  }

  // 5. Отправка с retry
  const sendOptions = {
    skipPreflight: false,
    preflightCommitment: 'confirmed' as any,
    maxRetries: 3
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const transaction = await createTransaction()
      const signature = await sendTransaction(transaction, connection, sendOptions)
      
      // 6. Подтверждение
      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed')
      
      return signature
    } catch (error) {
      if (attempt === 3) throw error
      await new Promise(r => setTimeout(r, 2000))
    }
  }
}
```

## Итог
Проблема решена путем:
1. Добавления приоритетной комиссии для ускорения обработки
2. Получения свежего blockhash перед каждой попыткой
3. Учета ренты для новых аккаунтов
4. Использования правильных параметров отправки
5. Реализации retry логики
6. Правильного API для подтверждения транзакций

Эти изменения обеспечивают надежную отправку транзакций даже в условиях высокой загрузки сети. 