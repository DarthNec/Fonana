# 📱 Mobile Post Purchase API

## Эндпоинт: `/api/posts/[id]/buy/mobile`

**Упрощенная версия покупки поста для мобильного приложения.**

---

## ⚡ Отличия от `/api/posts/[id]/buy`:

| Функция | buy | buy/mobile |
|---------|-----|------------|
| **Ожидание подтверждения** | ✅ Да (`waitForTransactionConfirmation`) | ❌ Нет |
| **Валидация транзакции** | ✅ Да (`validateTransaction`) | ❌ Нет |
| **Создание записей в БД** | ✅ Да | ✅ Да |
| **JWT авторизация** | ✅ Да | ✅ Да |
| **Уведомления** | ✅ Да | ✅ Да |
| **Скорость обработки** | ~15-30 секунд | ~1-2 секунды |

---

## 📝 **Request**

### **Method:** `POST`

### **URL:** 
```
POST /api/posts/{postId}/buy/mobile
```

### **Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### **Body:**
```json
{
  "buyerWallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "txSignature": "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9...",
  "price": 0.05,
  "hasReferrer": false,
  "distribution": {
    "creatorWallet": "EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw",
    "creatorAmount": 0.045,
    "platformAmount": 0.005,
    "referrerWallet": null,
    "referrerAmount": null,
    "totalAmount": 0.05
  }
}
```

### **Required Fields:**
- ✅ `buyerWallet` - Кошелек покупателя
- ✅ `txSignature` - Signature транзакции (Base58)

### **Optional Fields:**
- `price` - Цена покупки (если отличается от цены в посте)
- `hasReferrer` - Есть ли реферер
- `distribution` - Объект распределения платежа

---

## 📤 **Response**

### **Success (200):**
```json
{
  "success": true,
  "post": {
    "id": "cm2post123...",
    "title": "Amazing Content",
    "price": 0.05,
    "isLocked": true,
    "isSellable": false,
    "creator": {
      "id": "cm2creator123...",
      "nickname": "creator",
      "wallet": "EEqs..."
    }
  },
  "transaction": {
    "id": "cm2tx123...",
    "txSignature": "5VERv8NMvzbJ...",
    "fromWallet": "7xKXtg2CW...",
    "toWallet": "EEqsmop...",
    "amount": 0.05,
    "currency": "SOL",
    "type": "POST_PURCHASE",
    "status": "CONFIRMED",
    "confirmedAt": "2025-10-18T12:00:00.000Z"
  },
  "purchase": {
    "id": "cm2purchase123...",
    "postId": "cm2post123...",
    "userId": "cm2user123...",
    "price": 0.05,
    "currency": "SOL",
    "txSignature": "5VERv8NMvzbJ...",
    "paymentStatus": "COMPLETED",
    "creatorAmount": 0.045
  },
  "isPayablePost": true
}
```

### **Error Responses:**

```json
// 401 Unauthorized
{ "error": "No token provided" }
{ "error": "Invalid token" }

// 400 Bad Request
{ "error": "Missing required fields" }
{ "error": "Post not found" }
{ "error": "Creator wallet not configured" }
{ "error": "This post is not for sale" }
{ "error": "This post has already been sold" }
{ "error": "Invalid post price" }
{ "error": "Wallet mismatch" }
{ "error": "You cannot buy your own post" }
{ "error": "You have already purchased this post" }

// 404 Not Found
{ "error": "Buyer not found" }

// 500 Internal Server Error
{
  "error": "Failed to buy post",
  "details": "Error message"
}
```

---

## 🔄 **Workflow**

```
1. Мобильное приложение создает транзакцию покупки
   ↓
2. Пользователь подписывает в Phantom Mobile
   ↓
3. Приложение отправляет в блокчейн
   ↓
4. Получает signature
   ↓
5. POST /api/posts/[id]/buy/mobile с signature
   ↓
6. Сервер создает записи в БД (БЕЗ проверки блокчейна)
   ↓
7. Возвращает post + transaction + purchase
```

---

## 📊 **Пример использования (React Native)**

```typescript
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import bs58 from 'bs58'

// 1. Создать транзакцию покупки
const createPurchase = async (postId: string, price: number, creatorWallet: string) => {
  // Создаем транзакцию
  const response = await fetch('https://api.fonana.me/api/createtransaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromPublicKey: wallet.publicKey.toBase58(),
      toPublicKey: creatorWallet,
      amount: price
    })
  })
  
  const { transactionBase58, distribution } = await response.json()
  
  // 2. Подписать транзакцию
  const tx = Transaction.from(bs58.decode(transactionBase58))
  const signedTx = await wallet.signTransaction(tx)
  
  // 3. Отправить в блокчейн
  const relayResponse = await fetch('https://api.fonana.me/api/relaytransaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signedTransaction: bs58.encode(signedTx.serialize()),
      encoding: 'base58'
    })
  })
  
  const { signature } = await relayResponse.json()
  
  // 4. Создать покупку на сервере
  const purchaseResponse = await fetch(`https://api.fonana.me/api/posts/${postId}/buy/mobile`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify({
      buyerWallet: wallet.publicKey.toBase58(),
      txSignature: signature,
      price,
      distribution,
      hasReferrer: false
    })
  })
  
  const result = await purchaseResponse.json()
  
  if (result.success) {
    console.log('✅ Post purchased:', result.purchase.id)
    return result
  } else {
    throw new Error(result.error)
  }
}

// Использование
try {
  const result = await createPurchase(
    'cm2post123',
    0.05,
    'EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw'
  )
  console.log('Purchase completed:', result)
} catch (error) {
  console.error('Purchase failed:', error)
}
```

---

## ⚠️ **Важные особенности**

### **1. Нет валидации блокчейна**
- ❌ Сервер НЕ проверяет существование транзакции
- ❌ Сервер НЕ проверяет суммы в транзакции
- ⚠️ **Клиент должен сам валидировать транзакцию**

### **2. Быстрая обработка**
- ✅ Ответ за 1-2 секунды
- ✅ Не ждет подтверждения блоков
- ✅ Сразу создает записи в БД

### **3. Типы постов**
- **Платный пост** (`isLocked: true, price > 0`) - можно купить многократно разными пользователями
- **Продаваемый пост** (`isSellable: true`) - можно купить только один раз

### **4. Дедупликация**
- Для платных постов проверяется, не купил ли пользователь уже этот пост
- Для продаваемых постов проверяется, не куплен ли пост кем-то еще

---

## 🧪 **Тестирование**

```bash
# 1. Получить JWT токен
curl -X POST https://api.fonana.me/api/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{"wallet":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"}'

# 2. Купить пост
curl -X POST https://api.fonana.me/api/posts/cm2post123/buy/mobile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "buyerWallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "txSignature": "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9...",
    "price": 0.05
  }'
```

---

## 📚 **Связанные эндпоинты**

- `POST /api/createtransaction` - Создание транзакции
- `POST /api/relaytransaction` - Отправка транзакции в блокчейн
- `POST /api/posts/[id]/buy` - Полная версия с валидацией
- `GET /api/posts/[id]` - Получение информации о посте

---

## 🎯 **Итоги**

### **Преимущества:**
- ⚡ Быстрая обработка (1-2 секунды vs 15-30 секунд)
- 🚀 Мгновенный ответ без ожидания блокчейна
- 📱 Оптимизирован для мобильных приложений

### **Недостатки:**
- ⚠️ Нет валидации транзакции на сервере
- ⚠️ Клиент должен сам проверять транзакцию
- ⚠️ Требует доверия к клиенту

### **Рекомендации:**
- ✅ Используйте для мобильных приложений
- ✅ Добавьте фоновую проверку транзакций
- ✅ Логируйте все signatures для аудита
- ✅ Периодически проверяйте транзакции через блокчейн explorer


