# 💰 Tips Mobile API

**Endpoint**: `/api/tips/mobile`  
**Дата**: 19.10.2025  
**Назначение**: Упрощенный API для отправки чаевых без JWT аутентификации

## 🎯 Особенности

- ✅ **Без JWT токена** - аутентификация на стороне клиента
- ✅ **Blockchain verification** - проверка транзакции в Solana
- ✅ **Идемпотентность** - повторная отправка той же транзакции безопасна
- ✅ **Автоматические уведомления** - WebSocket + DB notifications
- ✅ **Сообщения в чате** - создает системное сообщение о донате
- ✅ **Tip levels** - автоматическое определение уровня (small/medium/large/legendary)

## 📡 Endpoint

### POST - Отправить чаевые

**URL**: `POST /api/tips/mobile`

**Request Body**:
```json
{
  "userId": "user_123",              // ID отправителя (required)
  "creatorId": "creator_456",        // ID получателя (required)
  "amount": 0.5,                     // Сумма в SOL (required)
  "txSignature": "tx_hash...",       // Подпись транзакции Solana (required)
  "conversationId": "conv_789"       // ID чата (optional)
}
```

**Success Response** (200):
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

**Already Recorded Response** (200):
```json
{
  "success": true,
  "transaction": {
    "id": "existing_transaction_id",
    ...
  },
  "message": "Transaction already recorded"
}
```

**Error Responses**:
```json
// 400 - Missing userId
{
  "error": "User ID is required"
}

// 400 - Missing required fields
{
  "error": "Creator ID, amount and transaction signature are required"
}

// 400 - Invalid amount
{
  "error": "Invalid tip amount"
}

// 400 - Transaction not confirmed
{
  "error": "Transaction not confirmed"
}

// 404 - User not found
{
  "error": "User not found"
}

// 404 - Creator not found
{
  "error": "Creator not found"
}

// 500 - Server error
{
  "error": "Failed to record tip",
  "details": "Error message"
}
```

## 💎 Tip Levels

Автоматически определяется уровень чаевых:

| Amount (SOL) | Level | Emoji |
|--------------|-------|-------|
| < 0.1 | `small` | ✨ |
| 0.1 - 0.99 | `medium` | ⭐ |
| 1 - 4.99 | `large` | 💎 |
| ≥ 5 | `legendary` | 🔥 |

## 🔐 Blockchain Verification

### Процесс проверки транзакции:

1. **Проверка дубликата** - проверяем, не записана ли уже транзакция
2. **Ожидание 3 секунды** - даем транзакции время попасть в сеть
3. **Начальная проверка** - получаем статус транзакции
4. **Дополнительное ожидание** - если не найдена, ждем еще 5 секунд
5. **Подтверждение** - ждем полного подтверждения через `waitForTransactionConfirmation`
6. **Диагностика** - если не подтверждена, получаем детали для отладки

```typescript
// Пример проверки транзакции
const connection = getConnection()
const status = await connection.getSignatureStatus(txSignature)

if (!status.value) {
  // Транзакция еще не в сети, ждем
  await new Promise(resolve => setTimeout(resolve, 5000))
}

// Ждем подтверждения
const isConfirmed = await waitForTransactionConfirmation(txSignature)
```

## 📊 Что происходит при отправке чаевых

### 1. Создается запись о транзакции:
```prisma
Transaction {
  type: "TIP"
  amount: 0.5
  currency: "SOL"
  status: "CONFIRMED"
  txSignature: "tx_hash..."
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

### 2. Создается уведомление для получателя:
```prisma
Notification {
  type: "TIP_RECEIVED"
  title: "New Tip Received!"
  message: "You received a 0.5 SOL tip in a message!"
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
```json
{
  "type": "TIP_RECEIVED",
  "title": "New Tip Received!",
  "message": "You received a 0.5 SOL tip in a message!",
  "metadata": {
    "senderId": "user_123",
    "senderName": "john_doe",
    "amount": 0.5,
    "conversationId": "conv_789",
    "id": "notification_id",
    "isRead": false,
    "createdAt": "2025-10-19T12:00:00.000Z"
  }
}
```

### 4. Если указан conversationId, создается сообщение в чате:
```prisma
Message {
  conversationId: "conv_789"
  senderId: "user_123"
  content: null
  isPaid: false
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

## 💡 Примеры использования

### JavaScript/TypeScript:

```typescript
// Отправить чаевые
async function sendTip(
  userId: string,
  creatorId: string,
  amount: number,
  txSignature: string,
  conversationId?: string
) {
  const response = await fetch('/api/tips/mobile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      creatorId,
      amount,
      txSignature,
      conversationId
    })
  })
  
  const data = await response.json()
  
  if (data.success) {
    console.log('Tip sent successfully!', data.transaction)
    return data.transaction
  } else {
    console.error('Failed to send tip:', data.error)
    throw new Error(data.error)
  }
}

// Использование
const userId = 'user_123'
const creatorId = 'creator_456'
const amount = 0.5

// 1. Создаем Solana транзакцию
const transaction = await createTipTransaction(
  publicKey,
  creatorWallet,
  amount
)

// 2. Отправляем транзакцию
const signature = await sendTransaction(transaction, connection)

// 3. Ждем 10 секунд для подтверждения
await new Promise(resolve => setTimeout(resolve, 10000))

// 4. Записываем чаевые в БД
const result = await sendTip(
  userId,
  creatorId,
  amount,
  signature,
  'conv_789' // optional conversation ID
)

console.log('Tip recorded:', result)
```

### React Native:

```typescript
import { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useConnection } from '@solana/wallet-adapter-react'
import { createTipTransaction } from '@/lib/solana/payments'

function TipButton({ userId, creatorId, creatorWallet, conversationId }) {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [isSending, setIsSending] = useState(false)
  const [tipAmount, setTipAmount] = useState('0.1')
  
  async function handleSendTip() {
    if (!publicKey) {
      alert('Connect wallet first')
      return
    }
    
    setIsSending(true)
    
    try {
      const amount = parseFloat(tipAmount)
      
      // 1. Создаем транзакцию
      const transaction = await createTipTransaction(
        publicKey,
        creatorWallet,
        amount
      )
      
      // 2. Отправляем в Solana
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      })
      
      console.log('Transaction sent:', signature)
      
      // 3. Ждем подтверждения
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
        alert(`Tip of ${amount} SOL sent successfully!`)
      } else {
        throw new Error(data.error)
      }
      
    } catch (error) {
      console.error('Error sending tip:', error)
      
      if (error.message.includes('User rejected')) {
        alert('Transaction cancelled')
      } else if (error.message.includes('insufficient')) {
        alert('Insufficient balance')
      } else {
        alert('Failed to send tip')
      }
    } finally {
      setIsSending(false)
    }
  }
  
  return (
    <View>
      <TextInput
        value={tipAmount}
        onChangeText={setTipAmount}
        keyboardType="decimal-pad"
        placeholder="0.1"
      />
      
      <TouchableOpacity 
        onPress={handleSendTip}
        disabled={isSending}
      >
        <Text>
          {isSending ? 'Sending...' : `Send ${tipAmount} SOL Tip 💰`}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
```

### Полный пример с UI:

```typescript
function TipModal({ userId, creatorId, creator, conversationId, onClose }) {
  const [amount, setAmount] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  
  const quickAmounts = [0.01, 0.1, 1, 5]
  
  async function sendTip() {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Enter a valid amount')
      return
    }
    
    setIsSending(true)
    
    try {
      const tipAmount = parseFloat(amount)
      
      // Создаем транзакцию
      const transaction = await createTipTransaction(
        publicKey,
        creator.solanaWallet || creator.wallet,
        tipAmount
      )
      
      // Отправляем
      const signature = await sendTransaction(transaction, connection)
      
      // Ждем
      await new Promise(resolve => setTimeout(resolve, 10000))
      
      // Записываем
      const response = await fetch('/api/tips/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          creatorId,
          amount: tipAmount,
          txSignature: signature,
          conversationId
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Sent ${tipAmount} SOL tip! 🎉`)
        onClose()
      }
      
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to send tip')
    } finally {
      setIsSending(false)
    }
  }
  
  return (
    <Modal>
      <View>
        <Text>Send Tip to {creator.nickname}</Text>
        
        {/* Quick Amounts */}
        <View style={styles.quickAmounts}>
          {quickAmounts.map(qa => (
            <TouchableOpacity
              key={qa}
              onPress={() => setAmount(qa.toString())}
            >
              <Text>{qa} SOL</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Custom Amount */}
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Custom amount"
          keyboardType="decimal-pad"
        />
        
        {/* Send Button */}
        <TouchableOpacity 
          onPress={sendTip}
          disabled={isSending || !amount}
        >
          <Text>
            {isSending ? 'Sending...' : 'Send Tip 💰'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}
```

## 🔍 Логирование

Все операции логируются с префиксом `[API/tips/mobile]`:

```
[API/tips/mobile] Starting tip request
[API/tips/mobile] Tip request received: { userId, creatorId, amount, txSignature }
[API/tips/mobile] Waiting 3 seconds before checking transaction...
[API/tips/mobile] Getting transaction status for: tx_hash...
[API/tips/mobile] Initial status check: { value: {...}, slot: 12345 }
[API/tips/mobile] Starting transaction confirmation check: tx_hash...
[API/tips/mobile] Transaction confirmed successfully: tx_hash...
[API/tips/mobile] Transaction created: transaction_id
[API/tips/mobile] Notification created: notification_id
[API/tips/mobile] WebSocket notification sent
[API/tips/mobile] Creating tip message in conversation: conv_789
[API/tips/mobile] Tip message created: message_id
```

## 🔧 Технические детали

### Время ожидания:
- **3 секунды** - начальное ожидание перед проверкой
- **5 секунд** - дополнительное ожидание если транзакция не найдена
- **До 60 секунд** - ожидание полного подтверждения (через `waitForTransactionConfirmation`)

### Идемпотентность:
Если транзакция с таким `txSignature` уже записана, возвращается существующая запись без ошибки:
```json
{
  "success": true,
  "transaction": {...},
  "message": "Transaction already recorded"
}
```

### WebSocket уведомления:
Отправляются автоматически, но неудача не блокирует основной процесс:
```typescript
try {
  await sendNotification(creatorId, {...})
  console.log('WebSocket notification sent')
} catch (error) {
  console.error('WebSocket notification failed:', error)
  // Продолжаем выполнение
}
```

## 📈 База данных

### Таблица Transaction:
```prisma
model Transaction {
  id            String   @id @default(cuid())
  fromWallet    String
  toWallet      String
  type          String   // "TIP"
  amount        Decimal
  currency      String   // "SOL"
  status        String   // "CONFIRMED"
  txSignature   String   @unique
  confirmedAt   DateTime
  metadata      Json
  createdAt     DateTime @default(now())
}
```

### Таблица Notification:
```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "TIP_RECEIVED"
  title     String
  message   String
  isRead    Boolean  @default(false)
  metadata  Json
  createdAt DateTime @default(now())
}
```

### Таблица Message (если conversationId):
```prisma
model Message {
  id             String   @id @default(cuid())
  conversationId String
  senderId       String
  content        String?  // null для tip messages
  isPaid         Boolean  @default(false)
  isRead         Boolean  @default(false)
  metadata       Json     // { type: "tip", amount, tipLevel, ... }
  createdAt      DateTime @default(now())
}
```

## 🆚 Отличия от `/api/tips`

| Функция | Standard API | Mobile API |
|---------|--------------|------------|
| **Аутентификация** | JWT Token (Bearer) | userId в body |
| **Валидация** | JWT verification | Только существование user |
| **Blockchain check** | ✅ Да | ✅ Да |
| **Идемпотентность** | ✅ Да | ✅ Да |
| **WebSocket** | ✅ Да | ✅ Да |
| **Chat messages** | ✅ Да | ✅ Да |

## ⚠️ Важные замечания

1. **Безопасность**: Endpoint без JWT - клиент должен контролировать доступ
2. **Blockchain verification**: Обязательная проверка транзакции в Solana
3. **Ожидание подтверждения**: Минимум 8 секунд (3 + 5) перед проверкой
4. **Идемпотентность**: Повторная отправка той же транзакции безопасна
5. **WebSocket**: Уведомления отправляются автоматически
6. **Chat integration**: Если указан conversationId, создается системное сообщение

## 🐛 Обработка ошибок

```typescript
try {
  const response = await fetch('/api/tips/mobile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, creatorId, amount, txSignature })
  })
  
  const data = await response.json()
  
  if (!data.success) {
    // Обработка ошибки API
    if (response.status === 400) {
      if (data.error === 'Transaction not confirmed') {
        showError('Transaction not confirmed yet. Please try again in a moment.')
      } else {
        showError(data.error)
      }
    } else {
      showError('Failed to send tip')
    }
    return
  }
  
  // Обработка успешного ответа
  showSuccess(`Tip of ${amount} SOL sent successfully!`)
  
} catch (error) {
  // Обработка сетевой ошибки
  console.error('Network error:', error)
  showError('Failed to connect to server')
}
```

## 📖 См. также

- `/api/tips` - Standard version with JWT
- `/api/conversations/[id]/messages/mobile` - Messages API
- `/lib/solana/payments` - Solana transaction helpers
- `/lib/solana/validation` - Blockchain verification


