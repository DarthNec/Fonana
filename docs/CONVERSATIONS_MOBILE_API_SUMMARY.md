# 💬 Conversations Mobile API - Краткое резюме

**Файл**: `app/api/conversations/mobile/route.ts`  
**Дата**: 19.10.2025  
**Статус**: ✅ Готов к использованию

## 🚀 Быстрый старт

### Получить все чаты:
```bash
curl "http://localhost:3000/api/conversations/mobile?userId=user_123"
```

### Создать новый чат:
```bash
curl -X POST http://localhost:3000/api/conversations/mobile \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_123","otherUserId":"creator_456"}'
```

## 🎯 API Methods

| Method | Endpoint | Parameters | Описание |
|--------|----------|------------|----------|
| `GET` | `/api/conversations/mobile?userId=xxx` | `userId` (query) | Получить все чаты |
| `POST` | `/api/conversations/mobile` | `{userId, otherUserId}` (body) | Создать чат |

## ✅ Response Format

### GET - Список чатов:
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_id",
      "participant": {
        "id": "user_id",
        "nickname": "john_doe",
        "fullName": "John Doe",
        "avatar": "https://...",
        "wallet": "7xKXtg2..."
      },
      "lastMessage": {
        "content": "Hello!",
        "isPaid": false,
        "isPurchased": false,
        "createdAt": "2025-10-19T12:00:00Z"
      },
      "unreadCount": 3
    }
  ]
}
```

### POST - Создание чата:
```json
{
  "success": true,
  "conversation": {
    "id": "new_conv_id",
    "participant": { ... },
    "lastMessage": null,
    "unreadCount": 0
  },
  "message": "Conversation created successfully"
}
```

## 🔥 TypeScript пример

```typescript
// Получить чаты
async function getConversations(userId: string) {
  const response = await fetch(
    `/api/conversations/mobile?userId=${userId}`
  )
  const { conversations } = await response.json()
  return conversations
}

// Создать чат
async function createChat(userId: string, otherUserId: string) {
  const response = await fetch('/api/conversations/mobile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, otherUserId })
  })
  const { conversation } = await response.json()
  return conversation
}

// Использование
const myChats = await getConversations('user_123')
const newChat = await createChat('user_123', 'creator_456')

console.log('Всего чатов:', myChats.length)
console.log('Непрочитанных:', 
  myChats.reduce((sum, c) => sum + c.unreadCount, 0)
)
```

## 🔐 Защита платного контента

Неоплаченные платные сообщения скрываются:
```json
{
  "content": "💰 Paid message",  // ← Вместо реального контента
  "isPaid": true,
  "price": 0.1,
  "isPurchased": false
}
```

После покупки:
```json
{
  "content": "Real exclusive content",  // ← Настоящий контент
  "isPaid": true,
  "price": 0.1,
  "isPurchased": true
}
```

## 📊 Структура Conversation

```typescript
interface Conversation {
  id: string
  participant: {
    id: string
    nickname: string
    fullName: string | null
    avatar: string | null
    wallet: string | null
  }
  lastMessage: {
    id: string
    content: string           // Скрыт если платный и не куплен
    senderId: string
    senderName: string
    createdAt: string
    isPaid: boolean
    price: number | null
    isPurchased: boolean
  } | null
  lastMessageAt: string | null
  createdAt: string
  unreadCount: number         // Только от других пользователей
}
```

## ✨ Особенности

✅ **Без JWT токена** - передается `userId` напрямую  
✅ **Оптимизированные запросы** - использует raw SQL  
✅ **Unread count** - автоматический подсчет непрочитанных  
✅ **Защита платного контента** - скрывает неоплаченные сообщения  
✅ **Идемпотентность** - повторное создание возвращает существующий чат  
✅ **Сортировка** - чаты с новыми сообщениями сверху  

## 🔍 Логирование

Все операции логируются с префиксом `[API/conversations/mobile]`:
```
[API/conversations/mobile] Starting GET request
[API/conversations/mobile] Fetching conversations for user: user_123
[API/conversations/mobile] Found conversations: 5
[API/conversations/mobile] Successfully formatted conversations: 5
```

## 🆚 Сравнение с `/api/conversations`

| | Standard API | Mobile API |
|---|---|---|
| **Auth** | JWT Token | userId parameter |
| **Создание чата** | JWT в header | userId в body |
| **Идемпотентность** | ✅ Да | ✅ Да |
| **Защита платного контента** | ✅ Да | ✅ Да |

## 📱 React Native пример

```typescript
function ConversationsList({ userId }) {
  const [conversations, setConversations] = useState([])
  
  useEffect(() => {
    loadConversations()
  }, [userId])
  
  async function loadConversations() {
    const response = await fetch(
      `/api/conversations/mobile?userId=${userId}`
    )
    const data = await response.json()
    setConversations(data.conversations || [])
  }
  
  async function startChat(otherUserId: string) {
    const response = await fetch('/api/conversations/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, otherUserId })
    })
    const data = await response.json()
    
    // Переходим в чат
    navigation.navigate('Chat', { 
      conversationId: data.conversation.id 
    })
  }
  
  return (
    <FlatList
      data={conversations}
      renderItem={({ item }) => (
        <ChatItem 
          conversation={item}
          onPress={() => navigation.navigate('Chat', { 
            conversationId: item.id 
          })}
        />
      )}
    />
  )
}
```

## ⚠️ Важно

1. **Безопасность**: Endpoint без JWT - контроль на клиенте
2. **Платные сообщения**: Контент скрыт пока не куплен
3. **Unread**: Считается только от других пользователей
4. **Participant**: Показывается другой участник, не текущий
5. **Сортировка**: По времени последнего сообщения

## 📖 Полная документация

См. `/app/api/conversations/mobile/README.md` для подробной документации.


