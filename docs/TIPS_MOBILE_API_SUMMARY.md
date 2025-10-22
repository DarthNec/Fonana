# 💰 Tips Mobile API - Краткое резюме

**Файл**: `app/api/tips/mobile/route.ts`  
**Дата**: 19.10.2025  
**Статус**: ✅ Готов к использованию

## 🚀 Быстрый старт

### Отправить чаевые:
```bash
curl -X POST http://localhost:3000/api/tips/mobile \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"user_123",
    "creatorId":"creator_456",
    "amount":0.5,
    "txSignature":"tx_hash...",
    "conversationId":"conv_789"
  }'
```

## 🎯 API Method

| Method | Endpoint | Body | Описание |
|--------|----------|------|----------|
| `POST` | `/api/tips/mobile` | `{userId, creatorId, amount, txSignature, conversationId?}` | Отправить чаевые |

## ✅ Response Format

```json
{
  "success": true,
  "transaction": {
    "id": "transaction_id",
    "fromWallet": "7xKXtg2...",
    "toWallet": "8yLYuh3...",
    "type": "TIP",
    "amount": 0.5,
    "currency": "SOL",
    "status": "CONFIRMED",
    "txSignature": "tx_hash...",
    "confirmedAt": "2025-10-19T12:00:00.000Z",
    "metadata": {
      "senderId": "user_123",
      "receiverId": "creator_456",
      "senderName": "john_doe",
      "creatorName": "jane_creator",
      "conversationId": "conv_789",
      "source": "mobile"
    }
  },
  "message": "Tip sent successfully"
}
```

## 🔥 TypeScript пример

```typescript
// Полный процесс отправки чаевых
async function sendTip(
  userId: string,
  creatorId: string,
  creatorWallet: string,
  amount: number,
  conversationId?: string
) {
  // 1. Создаем Solana транзакцию
  const transaction = await createTipTransaction(
    publicKey,
    creatorWallet,
    amount
  )
  
  // 2. Отправляем в блокчейн
  const signature = await sendTransaction(transaction, connection, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3
  })
  
  console.log('Transaction sent:', signature)
  
  // 3. Ждем 10 секунд для подтверждения
  await new Promise(resolve => setTimeout(resolve, 10000))
  
  // 4. Записываем в БД
  const response = await fetch('/api/tips/mobile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      creatorId,
      amount,
      txSignature: signature,
      conversationId
    })
  })
  
  const data = await response.json()
  
  if (data.success) {
    console.log('Tip recorded successfully!')
    return data.transaction
  } else {
    throw new Error(data.error)
  }
}

// Использование
await sendTip('user_123', 'creator_456', 'creator_wallet...', 0.5, 'conv_789')
```

## 💎 Tip Levels

Автоматически определяется уровень чаевых:

| Amount | Level | Emoji | Message |
|--------|-------|-------|---------|
| < 0.1 SOL | `small` | ✨ | Tip! |
| 0.1 - 0.99 SOL | `medium` | ⭐ | Nice Tip! |
| 1 - 4.99 SOL | `large` | 💎 | Large Tip! |
| ≥ 5 SOL | `legendary` | 🔥 | Legendary Tip! |

## 🔐 Blockchain Verification

### Процесс проверки:
```
1. Проверка дубликата транзакции
   ↓
2. Ожидание 3 секунды
   ↓
3. Начальная проверка статуса
   ↓
4. Дополнительное ожидание 5 секунд (если не найдена)
   ↓
5. Полное подтверждение через waitForTransactionConfirmation
   ↓
6. Запись в БД
```

**Минимальное время:** 8 секунд (3 + 5)  
**Максимальное время:** ~68 секунд (3 + 5 + 60)

## 📊 Что происходит при отправке чаевых

### 1. Создается Transaction:
```typescript
{
  type: "TIP",
  amount: 0.5,
  currency: "SOL",
  status: "CONFIRMED",
  txSignature: "tx_hash...",
  metadata: {
    senderId,
    receiverId,
    senderName,
    creatorName,
    conversationId,
    source: "mobile"
  }
}
```

### 2. Создается Notification:
```typescript
{
  type: "TIP_RECEIVED",
  title: "New Tip Received!",
  message: "You received a 0.5 SOL tip in a message!",
  metadata: {
    senderId,
    senderName,
    amount,
    conversationId,
    source: "mobile"
  }
}
```

### 3. Отправляется WebSocket уведомление:
```typescript
await sendNotification(creatorId, {
  type: "TIP_RECEIVED",
  title: "New Tip Received!",
  message: "You received a 0.5 SOL tip in a message!",
  metadata: {...}
})
```

### 4. Создается Message в чате (если conversationId):
```typescript
{
  conversationId: "conv_789",
  senderId: "user_123",
  content: null,
  metadata: {
    type: "tip",
    amount: 0.5,
    tipLevel: "medium",
    senderName: "john_doe",
    creatorName: "jane_creator",
    source: "mobile"
  }
}
```

## ✨ Особенности

✅ **Без JWT токена** - передается `userId` напрямую  
✅ **Blockchain verification** - проверка транзакции в Solana  
✅ **Идемпотентность** - повторная отправка безопасна  
✅ **Автоматические уведомления** - WebSocket + DB  
✅ **Tip levels** - small/medium/large/legendary  
✅ **Chat integration** - создает сообщение в чате  

## 📱 React Native пример

```typescript
function TipButton({ userId, creatorId, creator, conversationId }) {
  const [amount, setAmount] = useState('0.1')
  const [isSending, setIsSending] = useState(false)
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  
  async function handleSendTip() {
    setIsSending(true)
    
    try {
      // 1. Создаем транзакцию
      const transaction = await createTipTransaction(
        publicKey,
        creator.solanaWallet || creator.wallet,
        parseFloat(amount)
      )
      
      // 2. Отправляем
      const signature = await sendTransaction(transaction, connection)
      
      // 3. Ждем
      await new Promise(resolve => setTimeout(resolve, 10000))
      
      // 4. Записываем
      const response = await fetch('/api/tips/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          creatorId,
          amount: parseFloat(amount),
          txSignature: signature,
          conversationId
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Sent ${amount} SOL tip! 🎉`)
      }
      
    } catch (error) {
      alert('Failed to send tip')
    } finally {
      setIsSending(false)
    }
  }
  
  return (
    <TouchableOpacity onPress={handleSendTip} disabled={isSending}>
      <Text>{isSending ? 'Sending...' : `Send ${amount} SOL Tip 💰`}</Text>
    </TouchableOpacity>
  )
}
```

## 🔍 Логирование

Все операции логируются с префиксом `[API/tips/mobile]`:
```
[API/tips/mobile] Starting tip request
[API/tips/mobile] Tip request received: { userId, creatorId, amount, txSignature }
[API/tips/mobile] Transaction confirmed successfully: tx_hash...
[API/tips/mobile] Transaction created: transaction_id
[API/tips/mobile] Notification created: notification_id
[API/tips/mobile] WebSocket notification sent
[API/tips/mobile] Tip message created: message_id
```

## 🆚 Сравнение с `/api/tips`

| | Standard API | Mobile API |
|---|---|---|
| **Auth** | JWT Token | userId parameter |
| **Blockchain check** | ✅ Да | ✅ Да |
| **Идемпотентность** | ✅ Да | ✅ Да |
| **WebSocket** | ✅ Да | ✅ Да |
| **Chat messages** | ✅ Да | ✅ Да |
| **Tip levels** | ✅ Да | ✅ Да |

## ⚠️ Важно

1. **Безопасность**: Endpoint без JWT - контроль на клиенте
2. **Blockchain**: Обязательная проверка транзакции
3. **Ожидание**: Минимум 10 секунд на клиенте перед записью
4. **Идемпотентность**: Повторная отправка той же транзакции безопасна
5. **Tip levels**: Автоматически определяются по сумме
6. **Chat**: Если указан conversationId, создается системное сообщение

## 📖 Полная документация

См. `/app/api/tips/mobile/README.md` для подробной документации.


