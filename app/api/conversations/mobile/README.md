# 📱 Conversations Mobile API

**Endpoint**: `/api/conversations/mobile`  
**Дата**: 19.10.2025  
**Назначение**: Упрощенный API для работы с чатами без JWT аутентификации

## 🎯 Особенности

- ✅ **Без JWT токена** - аутентификация на стороне клиента
- ✅ **Простой интерфейс** - принимает `userId` напрямую
- ✅ **Оптимизированные запросы** - использует raw SQL для производительности
- ✅ **Непрочитанные сообщения** - автоматический подсчет unread count
- ✅ **Защита платного контента** - скрывает содержимое неоплаченных сообщений
- ✅ **Идемпотентность** - безопасное создание чатов

## 📡 Endpoints

### 1. GET - Получить все чаты пользователя

**URL**: `GET /api/conversations/mobile?userId=xxx`

**Query Parameters**:
- `userId` (required) - ID пользователя, для которого получаем чаты

**Success Response** (200):
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_id_123",
      "participant": {
        "id": "user_456",
        "nickname": "john_doe",
        "fullName": "John Doe",
        "avatar": "https://cdn.example.com/avatar.jpg",
        "wallet": "7xKXtg2..."
      },
      "lastMessage": {
        "id": "msg_789",
        "content": "Hello there!",
        "senderId": "user_456",
        "senderName": "john_doe",
        "createdAt": "2025-10-19T12:00:00.000Z",
        "isPaid": false,
        "price": null,
        "isPurchased": false
      },
      "lastMessageAt": "2025-10-19T12:00:00.000Z",
      "createdAt": "2025-10-01T10:00:00.000Z",
      "unreadCount": 3
    },
    {
      "id": "conv_id_456",
      "participant": {
        "id": "creator_789",
        "nickname": "jane_creator",
        "fullName": "Jane Creator",
        "avatar": "https://cdn.example.com/avatar2.jpg",
        "wallet": "8yLYuh3..."
      },
      "lastMessage": {
        "id": "msg_101",
        "content": "💰 Paid message",
        "senderId": "creator_789",
        "senderName": "jane_creator",
        "createdAt": "2025-10-18T15:30:00.000Z",
        "isPaid": true,
        "price": 0.1,
        "isPurchased": false
      },
      "lastMessageAt": "2025-10-18T15:30:00.000Z",
      "createdAt": "2025-09-15T08:00:00.000Z",
      "unreadCount": 0
    }
  ]
}
```

**Empty Response** (200):
```json
{
  "success": true,
  "conversations": []
}
```

**Error Responses**:
```json
// 400 - Missing userId
{
  "error": "User ID is required"
}

// 404 - User not found
{
  "error": "User not found"
}

// 500 - Server error
{
  "error": "Failed to fetch conversations",
  "details": "Error message"
}
```

---

### 2. POST - Создать новый чат

**URL**: `POST /api/conversations/mobile`

**Request Body**:
```json
{
  "userId": "user_123",        // ID пользователя, который создает чат
  "otherUserId": "user_456"    // ID пользователя, с кем создается чат
}
```

**Success Response - New Conversation** (200):
```json
{
  "success": true,
  "conversation": {
    "id": "conv_new_789",
    "participant": {
      "id": "user_456",
      "nickname": "john_doe",
      "fullName": "John Doe",
      "avatar": "https://cdn.example.com/avatar.jpg",
      "wallet": "7xKXtg2..."
    },
    "lastMessage": null,
    "lastMessageAt": null,
    "createdAt": "2025-10-19T12:30:00.000Z",
    "unreadCount": 0
  },
  "message": "Conversation created successfully"
}
```

**Success Response - Existing Conversation** (200):
```json
{
  "success": true,
  "conversation": {
    "id": "conv_existing_123",
    "participant": {
      "id": "user_456",
      "nickname": "john_doe",
      "fullName": "John Doe",
      "avatar": "https://cdn.example.com/avatar.jpg",
      "wallet": "7xKXtg2..."
    },
    "lastMessage": null,
    "lastMessageAt": "2025-10-15T10:00:00.000Z",
    "createdAt": "2025-10-01T08:00:00.000Z",
    "unreadCount": 0
  },
  "message": "Conversation already exists"
}
```

**Error Responses**:
```json
// 400 - Missing userId
{
  "error": "User ID is required"
}

// 400 - Missing otherUserId
{
  "error": "Other user ID is required"
}

// 400 - Self-conversation attempt
{
  "error": "Cannot create conversation with yourself"
}

// 404 - User not found
{
  "error": "User not found"
}

// 404 - Other user not found
{
  "error": "Other user not found"
}

// 500 - Server error
{
  "error": "Failed to create conversation",
  "details": "Error message"
}
```

## 📊 Структура данных

### Conversation Object:
```typescript
interface Conversation {
  id: string                    // ID чата
  participant: {                // Другой участник чата
    id: string
    nickname: string
    fullName: string | null
    avatar: string | null
    wallet: string | null
  }
  lastMessage: {                // Последнее сообщение (или null)
    id: string
    content: string             // "💰 Paid message" для неоплаченных
    senderId: string
    senderName: string
    createdAt: string
    isPaid: boolean
    price: number | null
    isPurchased: boolean        // Куплено ли текущим пользователем
  } | null
  lastMessageAt: string | null  // Время последнего сообщения
  createdAt: string             // Время создания чата
  unreadCount: number           // Количество непрочитанных сообщений
}
```

## 🔐 Защита платного контента

Если сообщение платное (`isPaid: true`) и не куплено пользователем, вместо реального контента возвращается:
```json
{
  "content": "💰 Paid message",
  "isPaid": true,
  "price": 0.1,
  "isPurchased": false
}
```

После покупки сообщения контент становится доступен:
```json
{
  "content": "Real message content here",
  "isPaid": true,
  "price": 0.1,
  "isPurchased": true
}
```

## 💡 Примеры использования

### JavaScript/TypeScript:

```typescript
// Получить все чаты
async function getConversations(userId: string) {
  const response = await fetch(
    `/api/conversations/mobile?userId=${userId}`
  )
  const data = await response.json()
  
  if (data.success) {
    console.log('Чаты:', data.conversations)
    console.log('Всего непрочитанных:', 
      data.conversations.reduce((sum, c) => sum + c.unreadCount, 0)
    )
  } else {
    console.error('Ошибка:', data.error)
  }
  
  return data.conversations || []
}

// Создать новый чат
async function createConversation(userId: string, otherUserId: string) {
  const response = await fetch('/api/conversations/mobile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, otherUserId })
  })
  
  const data = await response.json()
  
  if (data.success) {
    console.log('Чат:', data.conversation)
    console.log('Сообщение:', data.message)
    return data.conversation
  } else {
    console.error('Ошибка:', data.error)
    throw new Error(data.error)
  }
}

// Использование
const myUserId = 'user_123'
const conversations = await getConversations(myUserId)

// Начать чат с пользователем
const creatorId = 'creator_456'
const newChat = await createConversation(myUserId, creatorId)
```

### React Native:

```typescript
import { useState, useEffect } from 'react'

function ConversationsScreen({ userId }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Загружаем чаты при монтировании
  useEffect(() => {
    loadConversations()
  }, [userId])
  
  async function loadConversations() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/conversations/mobile?userId=${userId}`
      )
      const data = await response.json()
      
      if (data.success) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Failed to load conversations', error)
    } finally {
      setLoading(false)
    }
  }
  
  async function startConversation(otherUserId: string) {
    try {
      const response = await fetch('/api/conversations/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otherUserId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Переходим в чат
        navigation.navigate('Chat', { 
          conversationId: data.conversation.id 
        })
      }
    } catch (error) {
      console.error('Failed to create conversation', error)
    }
  }
  
  if (loading) return <LoadingSpinner />
  
  return (
    <FlatList
      data={conversations}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <ConversationItem
          conversation={item}
          onPress={() => navigation.navigate('Chat', { 
            conversationId: item.id 
          })}
        />
      )}
    />
  )
}

// Компонент элемента чата
function ConversationItem({ conversation, onPress }) {
  const { participant, lastMessage, unreadCount } = conversation
  
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.container}>
        <Avatar src={participant.avatar} />
        <View style={styles.content}>
          <Text style={styles.name}>
            {participant.fullName || participant.nickname}
          </Text>
          <Text style={styles.message} numberOfLines={1}>
            {lastMessage?.content || 'No messages yet'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Badge count={unreadCount} />
        )}
      </View>
    </TouchableOpacity>
  )
}
```

## 🔧 Производительность

### Оптимизации:
1. **Raw SQL запросы** - использует `$queryRaw` для сложных join'ов
2. **Единый запрос** - получает все данные за один раунд-трип
3. **GroupBy для unread** - эффективный подсчет непрочитанных
4. **Сортировка по lastMessageAt** - чаты с новыми сообщениями сверху

### SQL запрос под капотом:
```sql
SELECT 
  c.id,
  c.fromUserId,
  c.toUserId,
  -- JSON объекты с данными участников
  json_build_object(...) as fromUser,
  json_build_object(...) as toUser,
  -- Подзапрос для последнего сообщения
  (SELECT json_build_object(...) 
   FROM Message m 
   WHERE m.conversationId = c.id 
   ORDER BY m.createdAt DESC 
   LIMIT 1
  ) as lastMessage
FROM Conversation c
WHERE c.fromUserId = :userId OR c.toUserId = :userId
ORDER BY c.lastMessageAt DESC NULLS LAST
```

## 📈 База данных

### Таблица Conversation:
```prisma
model Conversation {
  id            String    @id @default(cuid())
  fromUserId    String
  toUserId      String
  lastMessageAt DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  fromUser      User      @relation("ConversationFrom", fields: [fromUserId], references: [id])
  toUser        User      @relation("ConversationTo", fields: [toUserId], references: [id])
  messages      Message[]
  
  @@unique([fromUserId, toUserId])
}
```

### Связанные таблицы:
- `Message` - сообщения в чате
- `MessagePurchase` - покупки платных сообщений
- `User` - участники чатов

## 🆚 Отличия от `/api/conversations`

| Функция | Standard API | Mobile API |
|---------|--------------|------------|
| **Аутентификация** | JWT Token (Bearer) | userId в query/body |
| **Валидация** | JWT verification | Только существование user |
| **Создание чата** | Требует токен | userId в body |
| **Идемпотентность** | Да | Да |
| **Защита платного контента** | Да | Да |

## ⚠️ Важные замечания

1. **Безопасность**: Endpoint не использует JWT, клиент должен контролировать доступ
2. **Платные сообщения**: Контент скрыт за "💰 Paid message" пока не куплен
3. **Unread count**: Считается только для сообщений от других пользователей
4. **Сортировка**: Чаты с последними сообщениями отображаются первыми
5. **Participant**: Всегда показывается другой участник, не текущий пользователь

## 🐛 Обработка ошибок

```typescript
try {
  const response = await fetch(
    `/api/conversations/mobile?userId=${userId}`
  )
  const data = await response.json()
  
  if (!data.success) {
    // Обработка ошибки API
    showError(data.error)
    return
  }
  
  // Обработка успешного ответа
  setConversations(data.conversations)
  
} catch (error) {
  // Обработка сетевой ошибки
  console.error('Network error:', error)
  showError('Failed to connect to server')
}
```

## 📊 Примеры ответов

### Чат без сообщений:
```json
{
  "id": "conv_123",
  "participant": { ... },
  "lastMessage": null,
  "lastMessageAt": null,
  "createdAt": "2025-10-19T10:00:00.000Z",
  "unreadCount": 0
}
```

### Чат с обычным сообщением:
```json
{
  "id": "conv_456",
  "participant": { ... },
  "lastMessage": {
    "content": "Hello!",
    "isPaid": false,
    "isPurchased": false
  },
  "unreadCount": 1
}
```

### Чат с платным сообщением (не куплено):
```json
{
  "id": "conv_789",
  "participant": { ... },
  "lastMessage": {
    "content": "💰 Paid message",
    "isPaid": true,
    "price": 0.1,
    "isPurchased": false
  },
  "unreadCount": 0
}
```

### Чат с платным сообщением (куплено):
```json
{
  "id": "conv_789",
  "participant": { ... },
  "lastMessage": {
    "content": "Exclusive content here!",
    "isPaid": true,
    "price": 0.1,
    "isPurchased": true
  },
  "unreadCount": 0
}
```


