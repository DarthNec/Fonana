# ✅ Упрощенная логика обновления подписок

**Дата**: 19.10.2025  
**Файл**: `app/api/subscriptions/mobile/route.ts`  
**Подход**: Простое обновление - вся бизнес-логика на клиенте

## 🎯 Принцип работы

### Серверная логика (максимально простая):

```typescript
// 1. Проверяем есть ли подписка
const existingSubscription = await prisma.subscription.findUnique(...)

// 2. Всегда обновляем или создаем с входными данными
const subscription = existingSubscription
  ? await prisma.subscription.update({ plan, price, validUntil })  // ОБНОВИТЬ
  : await prisma.subscription.create({ plan, price, validUntil })  // СОЗДАТЬ

// 3. Создаем транзакцию
const transaction = await prisma.transaction.create(...)

// 4. Уведомляем креатора
await sendNotification(...)

// 5. Возвращаем результат
return { success: true, subscription, transaction }
```

### Что делает сервер:

✅ **Просто обновляет данные** - никакой проверки апгрейда/даунгрейда  
✅ **Всегда устанавливает `validUntil = +1 месяц`** от текущей даты  
✅ **Сохраняет `previousPlan`** в метаданные для истории  
✅ **Логирует операцию** с флагом `isUpdate`  

### Что НЕ делает сервер:

❌ Не проверяет иерархию тиров  
❌ Не блокирует даунгрейды  
❌ Не различает апгрейд/продление/даунгрейд  
❌ Не отправляет специальные уведомления  

## 📊 Пример работы

### Входные данные:
```json
POST /api/subscriptions/mobile
{
  "creatorId": "creator123",
  "plan": "premium",
  "price": 0.15,
  "signature": "tx_hash..."
}
```

### Сценарий 1: Нет подписки
```
Было: null
Пришло: { plan: "basic", price: 0.05 }
Результат: СОЗДАНА подписка Basic
```

### Сценарий 2: Есть Basic → пришел Premium
```
Было: { plan: "basic", validUntil: "2025-11-01" }
Пришло: { plan: "premium", price: 0.15 }
Результат: ОБНОВЛЕНА подписка на Premium, validUntil = "2025-12-19"
```

### Сценарий 3: Есть VIP → пришел Basic
```
Было: { plan: "vip", validUntil: "2025-11-01" }
Пришло: { plan: "basic", price: 0.05 }
Результат: ОБНОВЛЕНА подписка на Basic, validUntil = "2025-12-19"
```

### Сценарий 4: Есть Basic → пришел Basic снова
```
Было: { plan: "basic", validUntil: "2025-11-01" }
Пришло: { plan: "basic", price: 0.05 }
Результат: ОБНОВЛЕНА подписка Basic, validUntil = "2025-12-19"
```

## 🔍 Логирование

### Лог успешной операции:
```
[PAYMENT] Processing subscription { 
  userId: 'abc12...', 
  creatorId: 'xyz78...', 
  plan: 'premium',
  hasExisting: true,
  previousPlan: 'basic'
}

[PAYMENT] Subscription processed in 245ms { 
  plan: 'premium',
  previousPlan: 'basic',
  isUpdate: true
}
```

## 📝 Метаданные транзакции

```json
{
  "plan": "premium",
  "creatorId": "creator123",
  "hasReferrer": true,
  "source": "mobile",
  "note": "Transaction validated on client side",
  "previousPlan": "basic"  // Для истории
}
```

## 🔔 Уведомления

Единое простое уведомление:
```json
{
  "type": "SUBSCRIPTION",
  "title": "Подписка обновлена",
  "message": "User подписался на план premium",
  "metadata": {
    "userId": "user123",
    "plan": "premium",
    "source": "mobile",
    "previousPlan": "basic"
  }
}
```

## 🎨 Клиентская логика (ваша ответственность)

Клиент получает:
```json
{
  "success": true,
  "subscription": {
    "plan": "premium",
    "validUntil": "2025-12-19",
    "isActive": true
  },
  "transaction": {
    "metadata": {
      "previousPlan": "basic"
    }
  }
}
```

Клиент может:
- Сравнить `previousPlan` и `subscription.plan`
- Показать UI для апгрейда: "🎉 Поздравляем с апгрейдом!"
- Показать UI для продления: "✅ Подписка продлена"
- Показать UI для даунгрейда: "⚠️ План изменен"

## 🛡️ Преимущества простого подхода

### ✅ Плюсы:
- **Простая серверная логика** - легко поддерживать
- **Гибкость на клиенте** - можно менять UI без деплоя бэкенда
- **Нет сложных проверок** - меньше багов
- **Единая точка обновления** - просто обновляем данные

### ⚠️ Нужно учитывать:
- Клиент должен правильно обрабатывать UI
- Клиент отвечает за проверку бизнес-правил
- Сервер не защищает от "плохих" переходов

## 🔧 Код на клиенте (пример)

```typescript
// Клиент делает запрос
const response = await fetch('/api/subscriptions/mobile', {
  method: 'POST',
  body: JSON.stringify({
    creatorId,
    plan: selectedPlan,
    price,
    signature
  })
})

const { subscription, transaction } = await response.json()

// Клиент определяет тип операции
const previousPlan = transaction.metadata?.previousPlan
const currentPlan = subscription.plan

if (!previousPlan) {
  showUI('🎉 Добро пожаловать! Вы подписались на ' + currentPlan)
} else if (isUpgrade(previousPlan, currentPlan)) {
  showUI('🎉 Поздравляем с апгрейдом до ' + currentPlan)
} else if (previousPlan === currentPlan) {
  showUI('✅ Подписка ' + currentPlan + ' продлена')
} else {
  showUI('⚠️ План изменен на ' + currentPlan)
}
```

## 📈 Что записывается в БД

### Subscription:
```sql
UPDATE subscriptions SET
  plan = 'premium',           -- Входное значение
  price = 0.15,               -- Входное значение
  validUntil = NOW() + 1 month,
  isActive = true,
  txSignature = 'tx_hash',
  paymentStatus = 'COMPLETED'
WHERE userId = 'user123' AND creatorId = 'creator123'
```

### Transaction:
```sql
INSERT INTO transactions (
  subscriptionId,
  txSignature,
  amount,
  type,
  status,
  metadata
) VALUES (
  'sub_id',
  'tx_hash',
  0.15,
  'SUBSCRIPTION',
  'CONFIRMED',
  '{"plan":"premium","previousPlan":"basic","source":"mobile"}'
)
```

## ✅ Итого

**Сервер**: Тупо обновляет данные на входные  
**Клиент**: Умно обрабатывает UI и бизнес-логику  
**Результат**: Простая поддержка + гибкий UX


