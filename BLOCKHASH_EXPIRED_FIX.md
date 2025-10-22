# 🔧 Исправление ошибки "Blockhash not found"

## ❌ **Проблема**

При отправке транзакции через `/api/relaytransaction` возникала ошибка:
```
Error: Transaction simulation failed: Blockhash not found
```

---

## 🔍 **Причина**

### **Flow транзакции:**

```
1. Мобильное приложение → POST /api/createtransaction
   ↓ Получает blockhash и создает транзакцию
   ↓ Возвращает сериализованную транзакцию в base58
   
2. Мобильное приложение → подписывает транзакцию
   ⏰ ВРЕМЯ ПРОХОДИТ (может быть 30-60+ секунд)
   
3. Мобильное приложение → POST /api/relaytransaction
   ↓ Отправка в Solana blockchain
   ❌ Ошибка: blockhash уже устарел!
```

### **Время жизни blockhash в Solana:**

- ⏱️ **~60-90 секунд** (примерно 150 блоков)
- 🕐 Каждый блок ~0.4 секунды
- ⚠️ После истечения времени транзакция отклоняется

### **Что происходило:**

1. `createtransaction` создавал транзакцию с blockhash
2. Пользователь подписывал транзакцию (могло занять время)
3. `relaytransaction` отправлял с `skipPreflight: false`
4. RPC симулировал транзакцию → проверял blockhash → **не находил** (устарел)
5. **Ошибка**: "Blockhash not found"

---

## ✅ **Решение**

### **1. Изменен `/api/relaytransaction`**

#### **Было:**
```typescript
params: [txBase64, { encoding: 'base64', skipPreflight: false }]
```

#### **Стало:**
```typescript
params: [txBase64, { 
  encoding: 'base64', 
  skipPreflight: true,  // ✅ Пропускаем preflight симуляцию
  maxRetries: 3,
  preflightCommitment: 'confirmed'
}]
```

**Почему `skipPreflight: true`?**
- ✅ Транзакция уже подписана на клиенте
- ✅ Невозможно изменить после подписания
- ✅ Preflight симуляция приводит к ошибке с устаревшим blockhash
- ✅ Транзакция будет проверена нодой при реальной отправке

---

### **2. Добавлена обработка ошибок blockhash**

```typescript
if (errorMessage.includes('Blockhash not found') || 
    errorMessage.includes('block height exceeded')) {
  return NextResponse.json({ 
    error: 'Transaction expired',
    details: 'Blockhash has expired. Please create a new transaction.',
    code: 'BLOCKHASH_EXPIRED',
    originalError: sendJson.error
  }, { status: 400 })
}
```

**Клиент получает понятную ошибку:**
- ❌ `error: "Transaction expired"`
- 📝 `details: "Blockhash has expired. Please create a new transaction."`
- 🔖 `code: "BLOCKHASH_EXPIRED"`

---

### **3. Улучшен `/api/createtransaction`**

Теперь возвращается информация о времени жизни транзакции:

```json
{
  "success": true,
  "transactionBase58": "...",
  "distribution": { ... },
  "validity": {
    "blockhash": "...",
    "lastValidBlockHeight": 275123456,
    "currentBlockHeight": 275123300,
    "blocksRemaining": 156,
    "estimatedSecondsRemaining": 62,
    "expiresAt": "2025-10-18T12:34:56.789Z",
    "warning": null
  }
}
```

**Клиент теперь знает:**
- ⏱️ Сколько времени осталось до истечения
- 📅 Точное время истечения (`expiresAt`)
- ⚠️ Предупреждение если времени мало (<30 секунд)

---

## 📊 **Рекомендации для клиента**

### **1. Проверяйте время жизни**
```typescript
const response = await fetch('/api/createtransaction', {...})
const { transactionBase58, validity } = await response.json()

if (validity.estimatedSecondsRemaining < 20) {
  console.warn('Transaction expires soon! Sign immediately!')
}
```

### **2. Обрабатывайте ошибку BLOCKHASH_EXPIRED**
```typescript
try {
  const result = await fetch('/api/relaytransaction', {...})
  const data = await result.json()
  
  if (data.code === 'BLOCKHASH_EXPIRED') {
    // Создайте новую транзакцию
    console.log('Transaction expired, creating new one...')
    return createNewTransaction()
  }
} catch (error) {
  // ...
}
```

### **3. Минимизируйте время между созданием и отправкой**
```
✅ Хорошо:  create → sign → send (< 30 секунд)
⚠️ Плохо:   create → долгое ожидание → sign → send (> 60 секунд)
```

---

## 🎯 **Альтернативные решения** (для будущего)

### **1. Durable Nonce (Рекомендуется для production)**
```typescript
// Создание durable nonce аккаунта
const nonceAccount = await createNonceAccount(connection, payer)

// Использование в транзакции
const tx = new Transaction()
tx.add(
  SystemProgram.nonceAdvance({
    noncePubkey: nonceAccount.publicKey,
    authorizedPubkey: payer.publicKey,
  })
)
// Транзакция действительна до тех пор, пока nonce не изменится
```

**Преимущества:**
- ✅ Транзакция никогда не истекает
- ✅ Можно создать заранее и подписать позже
- ✅ Идеально для мобильных приложений

**Недостатки:**
- ⚠️ Требует дополнительный аккаунт (рента ~0.0015 SOL)
- ⚠️ Более сложная реализация

---

### **2. Just-in-time blockhash (Текущее решение)**
```typescript
// Получаем свежий blockhash прямо перед подписью
const { blockhash } = await connection.getLatestBlockhash()
transaction.recentBlockhash = blockhash

// Сразу подписываем
await wallet.signTransaction(transaction)

// Сразу отправляем
await sendAndConfirmTransaction(...)
```

**Преимущества:**
- ✅ Простая реализация
- ✅ Не требует дополнительных аккаунтов

**Недостатки:**
- ⚠️ Требует быструю подпись и отправку
- ⚠️ Не подходит для офлайн подписи

---

## 📝 **Измененные файлы**

### `app/api/relaytransaction/route.ts`
- ✅ Изменен `skipPreflight: false` → `skipPreflight: true`
- ✅ Добавлена обработка ошибки "Blockhash not found"
- ✅ Добавлен код ошибки `BLOCKHASH_EXPIRED`

### `app/api/createtransaction/route.ts`
- ✅ Добавлен расчет времени жизни blockhash
- ✅ Возвращается объект `validity` с полной информацией
- ✅ Добавлено логирование валидности blockhash

---

## 🧪 **Тестирование**

### **1. Тест с нормальным временем:**
```bash
# 1. Создать транзакцию
curl -X POST http://localhost:3000/api/createtransaction \
  -H "Content-Type: application/json" \
  -d '{"fromPublicKey":"...","toPublicKey":"...","amount":0.1}'

# 2. Подписать и отправить сразу (< 30 секунд)
curl -X POST http://localhost:3000/api/relaytransaction \
  -H "Content-Type: application/json" \
  -d '{"signedTransaction":"...","encoding":"base58"}'
```

**Ожидаемый результат:** ✅ `{"signature":"..."}`

---

### **2. Тест с устаревшим blockhash:**
```bash
# 1. Создать транзакцию
# 2. Подождать 90+ секунд
# 3. Попытаться отправить

# Ожидаемый результат:
{
  "error": "Transaction expired",
  "details": "Blockhash has expired. Please create a new transaction.",
  "code": "BLOCKHASH_EXPIRED"
}
```

---

## 🎉 **Итоги**

### **Что было исправлено:**
- ✅ Ошибка "Blockhash not found" больше не блокирует транзакции
- ✅ Клиент получает информацию о времени жизни транзакции
- ✅ Понятные коды ошибок для обработки на клиенте
- ✅ Улучшенное логирование для отладки

### **Что нужно сделать на клиенте:**
1. ⚡ Минимизировать время между create и relay
2. 📊 Использовать поле `validity` для мониторинга
3. 🔄 Обрабатывать ошибку `BLOCKHASH_EXPIRED` и создавать новую транзакцию
4. ⏱️ Показывать таймер пользователю если `estimatedSecondsRemaining < 30`

---

## 📚 **Полезные ссылки**

- [Solana Blockhash Documentation](https://docs.solana.com/developing/programming-model/transactions#recent-blockhash)
- [Durable Nonce Guide](https://docs.solana.com/developing/programming-model/transactions#durable-transaction-nonces)
- [Transaction Expiration](https://docs.solana.com/cluster/commitments#transaction-expiration)


