# 💬 Messages Mobile API

**Endpoint**: `/api/conversations/[id]/messages/mobile`  
**Дата**: 19.10.2025  
**Назначение**: Упрощенный API для работы с сообщениями чата без JWT аутентификации

## 🎯 Особенности

- ✅ **Без JWT токена** - аутентификация на стороне клиента
- ✅ **Пагинация** - загрузка сообщений порциями (cursor-based)
- ✅ **Автоматическое прочтение** - помечает сообщения как прочитанные
- ✅ **Защита платного контента** - скрывает неоплаченные сообщения
- ✅ **Проверка доступа** - только участники чата могут читать сообщения
- ✅ **Push уведомления** - автоматические уведомления получателю

## 📡 Endpoints

### 1. GET - Получить сообщения чата

**URL**: `GET /api/conversations/[id]/messages/mobile?userId=xxx`

**Path Parameters**:
- `id` (required) - ID чата (conversation ID)

**Query Parameters**:
- `userId` (required) - ID пользователя, который читает сообщения
- `before` (optional) - ID сообщения, до которого загружать (для пагинации)
- `limit` (optional) - Количество сообщений (по умолчанию 20)

**Success Response** (200):
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "conversationId": "conv_456",
      "senderId": "user_789",
      "sender": {
        "id": "user_789",
        "nickname": "john_doe",
        "fullName": "John Doe",
        "avatar": "https://...",
        "wallet": "7xKXtg2..."
      },
      "content": "Hello! How are you?",
      "mediaUrl": null,
      "mediaType": null,
      "isPaid": false,
      "price": null,
      "isPurchased": false,
      "isOwn": false,
      "isRead": true,
      "createdAt": "2025-10-19T12:00:00.000Z",
      "metadata": null
    },
    {
      "id": "msg_456",
      "conversationId": "conv_456",
      "senderId": "creator_999",
      "sender": {
        "id": "creator_999",
        "nickname": "jane_creator",
        "fullName": "Jane Creator",
        "avatar": "https://...",
        "wallet": "8yLYuh3..."
      },
      "content": null,
      "mediaUrl": null,
      "mediaType": "photo",
      "isPaid": true,
      "price": 0.1,
      "isPurchased": false,
      "isOwn": false,
      "isRead": false,
      "createdAt": "2025-10-19T11:45:00.000Z",
      "metadata": null
    }
  ],
  "hasMore": true
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

// 404 - Conversation not found
{
  "error": "Conversation not found"
}

// 403 - Not a participant
{
  "error": "Access denied"
}

// 500 - Server error
{
  "error": "Failed to fetch messages",
  "details": "Error message"
}
```

---

### 2. POST - Отправить сообщение

**URL**: `POST /api/conversations/[id]/messages/mobile`

**Path Parameters**:
- `id` (required) - ID чата (conversation ID)

**Request Body**:
```json
{
  "userId": "user_123",              // ID отправителя (required)
  "content": "Hello there!",         // Текст сообщения (optional если есть mediaUrl)
  "mediaUrl": "https://...",         // URL медиа (optional если есть content)
  "mediaType": "photo",              // Тип: photo/video/audio (optional)
  "isPaid": true,                    // Платное сообщение? (optional, default: false)
  "price": 0.1,                      // Цена в SOL (required если isPaid: true)
  "metadata": {                      // Дополнительные данные (optional)
    "duration": 120,
    "preview": "https://..."
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": {
    "id": "msg_new_789",
    "conversationId": "conv_456",
    "senderId": "user_123",
    "sender": {
      "id": "user_123",
      "nickname": "john_doe",
      "fullName": "John Doe",
      "avatar": "https://...",
      "wallet": "7xKXtg2..."
    },
    "content": "Hello there!",
    "mediaUrl": null,
    "mediaType": null,
    "isPaid": false,
    "price": null,
    "isPurchased": false,
    "isOwn": true,
    "isRead": false,
    "createdAt": "2025-10-19T12:30:00.000Z",
    "metadata": null
  }
}
```

**Error Responses**:
```json
// 400 - Missing userId
{
  "error": "User ID is required"
}

// 400 - Missing content and media
{
  "error": "Message content or media required"
}

// 400 - Invalid price for paid message
{
  "error": "Valid price required for paid messages"
}

// 404 - User not found
{
  "error": "User not found"
}

// 404 - Conversation not found
{
  "error": "Conversation not found"
}

// 403 - Not a participant
{
  "error": "Access denied"
}

// 500 - Server error
{
  "error": "Failed to send message",
  "details": "Error message"
}
```

## 📊 Структура данных

### Message Object:
```typescript
interface Message {
  id: string                      // ID сообщения
  conversationId: string          // ID чата
  senderId: string                // ID отправителя
  sender: {                       // Данные отправителя
    id: string
    nickname: string
    fullName: string | null
    avatar: string | null
    wallet: string | null
  }
  content: string | null          // Текст (null если платное и не куплено)
  mediaUrl: string | null         // URL медиа (null если платное и не куплено)
  mediaType: string | null        // Тип медиа: photo/video/audio
  isPaid: boolean                 // Платное сообщение?
  price: number | null            // Цена в SOL
  isPurchased: boolean            // Куплено текущим пользователем?
  isOwn: boolean                  // Отправлено текущим пользователем?
  isRead: boolean                 // Прочитано?
  createdAt: string               // Время отправки
  metadata: object | null         // Дополнительные данные
}
```

## 🔐 Защита платного контента

### Платное сообщение (не куплено):
```json
{
  "id": "msg_456",
  "content": null,                // ← Контент скрыт
  "mediaUrl": null,               // ← Медиа скрыто
  "isPaid": true,
  "price": 0.1,
  "isPurchased": false,
  "isOwn": false
}
```

### Платное сообщение (куплено):
```json
{
  "id": "msg_456",
  "content": "Exclusive content",  // ← Доступно
  "mediaUrl": "https://...",      // ← Доступно
  "isPaid": true,
  "price": 0.1,
  "isPurchased": true,
  "isOwn": false
}
```

### Платное сообщение (свое):
```json
{
  "id": "msg_789",
  "content": "My exclusive content",  // ← Всегда доступно своё
  "mediaUrl": "https://...",         // ← Всегда доступно своё
  "isPaid": true,
  "price": 0.1,
  "isPurchased": false,
  "isOwn": true                      // ← Своё сообщение
}
```

## 📄 Пагинация

Используется cursor-based пагинация (по ID сообщения):

```typescript
// Первая загрузка (последние 20 сообщений)
const response1 = await fetch(
  `/api/conversations/conv_123/messages/mobile?userId=user_456&limit=20`
)
const { messages: page1, hasMore } = await response1.json()

if (hasMore) {
  // Загрузка следующих 20 сообщений (до самого старого из первой страницы)
  const oldestMessage = page1[page1.length - 1]
  const response2 = await fetch(
    `/api/conversations/conv_123/messages/mobile?userId=user_456&before=${oldestMessage.id}&limit=20`
  )
  const { messages: page2 } = await response2.json()
}
```

## 💡 Примеры использования

### JavaScript/TypeScript:

```typescript
// Получить сообщения чата
async function getMessages(
  conversationId: string, 
  userId: string,
  before?: string,
  limit: number = 20
) {
  const params = new URLSearchParams({ userId, limit: limit.toString() })
  if (before) params.append('before', before)
  
  const response = await fetch(
    `/api/conversations/${conversationId}/messages/mobile?${params}`
  )
  const data = await response.json()
  
  if (data.success) {
    console.log('Сообщений:', data.messages.length)
    console.log('Есть еще:', data.hasMore)
    return data
  } else {
    console.error('Ошибка:', data.error)
    throw new Error(data.error)
  }
}

// Отправить обычное сообщение
async function sendMessage(
  conversationId: string,
  userId: string,
  content: string
) {
  const response = await fetch(
    `/api/conversations/${conversationId}/messages/mobile`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content })
    }
  )
  
  const data = await response.json()
  
  if (data.success) {
    console.log('Сообщение отправлено:', data.message.id)
    return data.message
  } else {
    console.error('Ошибка:', data.error)
    throw new Error(data.error)
  }
}

// Отправить платное сообщение
async function sendPaidMessage(
  conversationId: string,
  userId: string,
  content: string,
  price: number
) {
  const response = await fetch(
    `/api/conversations/${conversationId}/messages/mobile`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        content,
        isPaid: true,
        price
      })
    }
  )
  
  const data = await response.json()
  return data.message
}

// Отправить сообщение с медиа
async function sendMediaMessage(
  conversationId: string,
  userId: string,
  mediaUrl: string,
  mediaType: 'photo' | 'video' | 'audio',
  content?: string
) {
  const response = await fetch(
    `/api/conversations/${conversationId}/messages/mobile`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId,
        content: content || '',
        mediaUrl,
        mediaType
      })
    }
  )
  
  const data = await response.json()
  return data.message
}

// Использование
const messages = await getMessages('conv_123', 'user_456')
await sendMessage('conv_123', 'user_456', 'Hello!')
await sendPaidMessage('conv_123', 'creator_789', 'Exclusive!', 0.1)
```

### React Native:

```typescript
import { useState, useEffect, useRef } from 'react'
import { FlatList, TextInput, TouchableOpacity } from 'react-native'

function ChatScreen({ conversationId, userId }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [messageText, setMessageText] = useState('')
  const flatListRef = useRef(null)
  
  // Загрузка сообщений при открытии чата
  useEffect(() => {
    loadMessages()
  }, [conversationId])
  
  async function loadMessages(before?: string) {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({ 
        userId, 
        limit: '20' 
      })
      if (before) params.append('before', before)
      
      const response = await fetch(
        `/api/conversations/${conversationId}/messages/mobile?${params}`
      )
      const data = await response.json()
      
      if (data.success) {
        if (before) {
          // Добавляем к существующим (пагинация)
          setMessages(prev => [...prev, ...data.messages])
        } else {
          // Первая загрузка
          setMessages(data.messages)
        }
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Failed to load messages', error)
    } finally {
      setLoading(false)
    }
  }
  
  async function loadMoreMessages() {
    if (!hasMore || loading) return
    
    const oldestMessage = messages[messages.length - 1]
    await loadMessages(oldestMessage.id)
  }
  
  async function sendMessage() {
    if (!messageText.trim()) return
    
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages/mobile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            content: messageText.trim() 
          })
        }
      )
      
      const data = await response.json()
      
      if (data.success) {
        // Добавляем новое сообщение в начало списка
        setMessages(prev => [data.message, ...prev])
        setMessageText('')
        
        // Прокручиваем вниз
        flatListRef.current?.scrollToOffset({ offset: 0 })
      }
    } catch (error) {
      console.error('Failed to send message', error)
    }
  }
  
  function renderMessage({ item: message }) {
    const isOwn = message.isOwn
    const isPaidLocked = message.isPaid && !message.isPurchased && !isOwn
    
    return (
      <View style={[
        styles.messageContainer,
        isOwn ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwn && (
          <Avatar src={message.sender.avatar} size={32} />
        )}
        
        <View style={styles.messageContent}>
          {isPaidLocked ? (
            <TouchableOpacity 
              onPress={() => handlePurchase(message)}
              style={styles.lockedMessage}
            >
              <Text>🔒 Paid message</Text>
              <Text>{message.price} SOL</Text>
              <Text>Tap to unlock</Text>
            </TouchableOpacity>
          ) : (
            <>
              {message.mediaUrl && (
                <MessageMedia 
                  url={message.mediaUrl} 
                  type={message.mediaType} 
                />
              )}
              {message.content && (
                <Text>{message.content}</Text>
              )}
            </>
          )}
          
          <Text style={styles.timestamp}>
            {formatTime(message.createdAt)}
          </Text>
        </View>
      </View>
    )
  }
  
  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        inverted              // Новые сообщения внизу
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && <LoadingSpinner />}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          style={styles.input}
        />
        <TouchableOpacity onPress={sendMessage}>
          <Text>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

## 🔄 Автоматическое прочтение

При загрузке сообщений автоматически помечаются как прочитанные:
- ✅ Только сообщения от других пользователей
- ✅ Только непрочитанные (`isRead: false`)
- ✅ Все сообщения в чате, не только загруженные

```typescript
// После GET запроса все непрочитанные сообщения помечаются как прочитанные
const response = await fetch(`/api/conversations/${id}/messages/mobile?userId=${userId}`)
// → Все сообщения от собеседника теперь isRead: true
```

## 🔔 Push уведомления

При отправке сообщения автоматически создается уведомление для получателя:

### Обычное сообщение:
```json
{
  "type": "NEW_MESSAGE",
  "title": "New message",
  "message": "john_doe: Hello there!",
  "metadata": {
    "conversationId": "conv_123",
    "messageId": "msg_456",
    "senderId": "user_789",
    "senderName": "john_doe",
    "isPaid": false,
    "price": null,
    "source": "mobile"
  }
}
```

### Платное сообщение:
```json
{
  "type": "NEW_MESSAGE",
  "title": "New message",
  "message": "jane_creator sent you a paid message (0.1 SOL)",
  "metadata": {
    "conversationId": "conv_123",
    "messageId": "msg_789",
    "senderId": "creator_999",
    "senderName": "jane_creator",
    "isPaid": true,
    "price": 0.1,
    "source": "mobile"
  }
}
```

## 📈 База данных

### Таблица Message:
```prisma
model Message {
  id             String    @id @default(cuid())
  conversationId String
  senderId       String
  content        String
  mediaUrl       String?
  mediaType      String?
  isPaid         Boolean   @default(false)
  price          Decimal?
  isRead         Boolean   @default(false)
  createdAt      DateTime  @default(now())
  metadata       Json?
  
  conversation   Conversation        @relation(fields: [conversationId], references: [id])
  purchases      MessagePurchase[]
}
```

### Связанные таблицы:
- `Conversation` - чат
- `MessagePurchase` - покупки платных сообщений
- `Notification` - уведомления

## 🆚 Отличия от стандартного API

| Функция | Standard API | Mobile API |
|---------|--------------|------------|
| **Аутентификация** | JWT Token | userId в query/body |
| **Автопрочтение** | ✅ Да | ✅ Да |
| **Защита платного контента** | ✅ Да | ✅ Да |
| **Пагинация** | ✅ Cursor-based | ✅ Cursor-based |
| **Push уведомления** | ✅ Да | ✅ Да |

## ⚠️ Важные замечания

1. **Безопасность**: Endpoint без JWT - контроль на клиенте
2. **Проверка доступа**: Только участники чата могут читать/писать
3. **Платный контент**: Скрыт пока не куплен (content и mediaUrl = null)
4. **Автопрочтение**: Все сообщения помечаются прочитанными при загрузке
5. **Пагинация**: Загружайте сообщения порциями для производительности
6. **Уведомления**: Создаются автоматически, не требуют дополнительных запросов

## 🐛 Обработка ошибок

```typescript
try {
  const response = await fetch(
    `/api/conversations/${conversationId}/messages/mobile?userId=${userId}`
  )
  const data = await response.json()
  
  if (!data.success) {
    // Обработка ошибки API
    if (response.status === 403) {
      showError('Access denied - not a participant')
    } else if (response.status === 404) {
      showError('Conversation not found')
    } else {
      showError(data.error)
    }
    return
  }
  
  // Обработка успешного ответа
  setMessages(data.messages)
  setHasMore(data.hasMore)
  
} catch (error) {
  // Обработка сетевой ошибки
  console.error('Network error:', error)
  showError('Failed to connect to server')
}
```


