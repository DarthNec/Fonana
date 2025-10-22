# 💬 Messages Mobile API - Краткое резюме

**Файл**: `app/api/conversations/[id]/messages/mobile/route.ts`  
**Дата**: 19.10.2025  
**Статус**: ✅ Готов к использованию

## 🚀 Быстрый старт

### Получить сообщения:
```bash
curl "http://localhost:3000/api/conversations/conv_123/messages/mobile?userId=user_456&limit=20"
```

### Отправить сообщение:
```bash
curl -X POST http://localhost:3000/api/conversations/conv_123/messages/mobile \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_456","content":"Hello!"}'
```

### Отправить платное сообщение:
```bash
curl -X POST http://localhost:3000/api/conversations/conv_123/messages/mobile \
  -H "Content-Type: application/json" \
  -d '{"userId":"creator_789","content":"Exclusive!","isPaid":true,"price":0.1}'
```

## 🎯 API Methods

| Method | Endpoint | Parameters | Описание |
|--------|----------|------------|----------|
| `GET` | `/api/conversations/[id]/messages/mobile?userId=xxx` | `userId`, `before`, `limit` | Получить сообщения |
| `POST` | `/api/conversations/[id]/messages/mobile` | `{userId, content, ...}` | Отправить сообщение |

## ✅ Response Format

### GET - Список сообщений:
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "sender": {
        "nickname": "john_doe",
        "avatar": "https://..."
      },
      "content": "Hello!",
      "isPaid": false,
      "isPurchased": false,
      "isOwn": false,
      "isRead": true,
      "createdAt": "2025-10-19T12:00:00Z"
    }
  ],
  "hasMore": true
}
```

### POST - Отправка сообщения:
```json
{
  "success": true,
  "message": {
    "id": "msg_new_456",
    "content": "Hello!",
    "isOwn": true,
    "createdAt": "2025-10-19T12:30:00Z"
  }
}
```

## 🔥 TypeScript примеры

### Получить сообщения с пагинацией:
```typescript
async function loadMessages(
  conversationId: string,
  userId: string,
  before?: string
) {
  const params = new URLSearchParams({ userId, limit: '20' })
  if (before) params.append('before', before)
  
  const response = await fetch(
    `/api/conversations/${conversationId}/messages/mobile?${params}`
  )
  const { messages, hasMore } = await response.json()
  
  return { messages, hasMore }
}

// Первая загрузка
const page1 = await loadMessages('conv_123', 'user_456')

// Загрузка еще (если есть)
if (page1.hasMore) {
  const oldestId = page1.messages[page1.messages.length - 1].id
  const page2 = await loadMessages('conv_123', 'user_456', oldestId)
}
```

### Отправить сообщение:
```typescript
async function sendMessage(
  conversationId: string,
  userId: string,
  content: string,
  options?: {
    isPaid?: boolean
    price?: number
    mediaUrl?: string
    mediaType?: 'photo' | 'video' | 'audio'
  }
) {
  const response = await fetch(
    `/api/conversations/${conversationId}/messages/mobile`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content, ...options })
    }
  )
  
  const { message } = await response.json()
  return message
}

// Обычное сообщение
await sendMessage('conv_123', 'user_456', 'Hello!')

// Платное сообщение
await sendMessage('conv_123', 'creator_789', 'Exclusive!', {
  isPaid: true,
  price: 0.1
})

// Сообщение с медиа
await sendMessage('conv_123', 'user_456', 'Check this out!', {
  mediaUrl: 'https://cdn.example.com/photo.jpg',
  mediaType: 'photo'
})
```

## 🔐 Защита платного контента

### Платное сообщение (не куплено):
```json
{
  "content": null,          // ← Скрыто
  "mediaUrl": null,         // ← Скрыто
  "isPaid": true,
  "price": 0.1,
  "isPurchased": false
}
```

### Платное сообщение (куплено):
```json
{
  "content": "Exclusive!",  // ← Доступно
  "mediaUrl": "https://...", // ← Доступно
  "isPaid": true,
  "price": 0.1,
  "isPurchased": true
}
```

## 📄 Пагинация (Cursor-based)

```typescript
// 1. Загрузить первые 20 сообщений
const { messages, hasMore } = await loadMessages('conv_123', 'user_456')

// 2. Загрузить еще 20 (если есть)
if (hasMore) {
  const oldestMessage = messages[messages.length - 1]
  const nextPage = await loadMessages('conv_123', 'user_456', oldestMessage.id)
}
```

## 📊 Структура Message

```typescript
interface Message {
  id: string
  conversationId: string
  senderId: string
  sender: {
    id: string
    nickname: string
    fullName: string | null
    avatar: string | null
    wallet: string | null
  }
  content: string | null      // null если платное и не куплено
  mediaUrl: string | null     // null если платное и не куплено
  mediaType: string | null    // photo/video/audio
  isPaid: boolean
  price: number | null
  isPurchased: boolean        // Куплено?
  isOwn: boolean              // Своё?
  isRead: boolean             // Прочитано?
  createdAt: string
  metadata: object | null
}
```

## ✨ Особенности

✅ **Без JWT токена** - передается `userId` напрямую  
✅ **Cursor-based пагинация** - загрузка порциями по 20  
✅ **Автоматическое прочтение** - помечает сообщения как прочитанные  
✅ **Защита платного контента** - скрывает неоплаченные  
✅ **Проверка доступа** - только участники чата  
✅ **Push уведомления** - автоматические для получателя  

## 🔄 Автоматическое прочтение

При GET запросе все непрочитанные сообщения помечаются как `isRead: true`:
```typescript
// До загрузки: 5 непрочитанных
await loadMessages('conv_123', 'user_456')
// После загрузки: 0 непрочитанных ✅
```

## 🔔 Push уведомления

Создаются автоматически при отправке:
```json
{
  "type": "NEW_MESSAGE",
  "title": "New message",
  "message": "john_doe: Hello!",
  "metadata": {
    "conversationId": "conv_123",
    "messageId": "msg_456",
    "senderId": "user_789",
    "source": "mobile"
  }
}
```

## 📱 React Native пример

```typescript
function ChatScreen({ conversationId, userId }) {
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [text, setText] = useState('')
  
  useEffect(() => {
    loadMessages()
  }, [conversationId])
  
  async function loadMessages(before?: string) {
    const params = new URLSearchParams({ userId, limit: '20' })
    if (before) params.append('before', before)
    
    const response = await fetch(
      `/api/conversations/${conversationId}/messages/mobile?${params}`
    )
    const data = await response.json()
    
    if (before) {
      setMessages(prev => [...prev, ...data.messages])
    } else {
      setMessages(data.messages)
    }
    setHasMore(data.hasMore)
  }
  
  async function send() {
    const response = await fetch(
      `/api/conversations/${conversationId}/messages/mobile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: text })
      }
    )
    const data = await response.json()
    
    setMessages(prev => [data.message, ...prev])
    setText('')
  }
  
  return (
    <View>
      <FlatList
        data={messages}
        inverted
        renderItem={({ item }) => <MessageItem message={item} />}
        onEndReached={() => {
          if (hasMore) {
            const oldest = messages[messages.length - 1]
            loadMessages(oldest.id)
          }
        }}
      />
      <TextInput value={text} onChangeText={setText} />
      <Button title="Send" onPress={send} />
    </View>
  )
}
```

## 🔍 Логирование

Все операции логируются с префиксом `[API/messages/mobile]`:
```
[API/messages/mobile] GET request started
[API/messages/mobile] Fetching messages: { conversationId, userId }
[API/messages/mobile] Found messages: 15
[API/messages/mobile] Marked as read: 3
[API/messages/mobile] Formatted messages: 15
```

## 🆚 Сравнение с стандартным API

| | Standard API | Mobile API |
|---|---|---|
| **Auth** | JWT Token | userId parameter |
| **Пагинация** | ✅ Cursor-based | ✅ Cursor-based |
| **Автопрочтение** | ✅ Да | ✅ Да |
| **Защита платного** | ✅ Да | ✅ Да |
| **Push уведомления** | ✅ Да | ✅ Да |

## ⚠️ Важно

1. **Безопасность**: Endpoint без JWT - контроль на клиенте
2. **Доступ**: Только участники чата могут читать/писать
3. **Платный контент**: `content` и `mediaUrl` = `null` если не куплено
4. **Автопрочтение**: Все сообщения помечаются при загрузке
5. **Пагинация**: Используйте `before` для загрузки старых сообщений

## 📖 Полная документация

См. `/app/api/conversations/[id]/messages/mobile/README.md` для подробной документации.


