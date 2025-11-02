# DELETE метод для удаления диалогов (conversations)

## 📋 Обзор

Добавлен DELETE метод в `/api/conversations/mobile` для удаления диалогов и всех связанных сообщений без необходимости аутентификации.

## 🎯 Endpoint

**`DELETE /api/conversations/mobile?conversationId=xxx`**

Удаляет диалог и все связанные данные:
- Все сообщения в диалоге
- Все покупки сообщений (MessagePurchase)
- Сам диалог (Conversation)

## 🔧 Параметры

### Query Parameters

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `conversationId` | string | ✅ Да | ID диалога для удаления |

## 📝 Примеры запросов

### JavaScript/TypeScript

```typescript
// Удаление диалога
const conversationId = 'clxxx...';

const response = await fetch(`/api/conversations/mobile?conversationId=${conversationId}`, {
  method: 'DELETE'
});

const result = await response.json();
console.log(result);
```

### cURL

```bash
curl -X DELETE "http://localhost:3000/api/conversations/mobile?conversationId=clxxx..."
```

### Fetch API (в компоненте React)

```typescript
const deleteConversation = async (conversationId: string) => {
  try {
    const response = await fetch(`/api/conversations/mobile?conversationId=${conversationId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete conversation');
    }

    const result = await response.json();
    console.log('Deleted successfully:', result);
    
    // Обновить UI
    // ...
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## 📤 Ответы API

### Успешное удаление (200 OK)

```json
{
  "success": true,
  "message": "Conversation deleted successfully",
  "conversationId": "clxxx..."
}
```

### Ошибки

#### 400 Bad Request - Не указан conversationId

```json
{
  "error": "Conversation ID is required"
}
```

#### 404 Not Found - Диалог не найден

```json
{
  "error": "Conversation not found"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Failed to delete conversation",
  "details": "Detailed error message"
}
```

## 🔄 Процесс удаления

Удаление происходит в транзакции и включает следующие шаги:

1. **Проверка существования** - проверяется, существует ли диалог
2. **Получение сообщений** - находятся все сообщения в диалоге
3. **Удаление покупок** - удаляются все `MessagePurchase` связанные с сообщениями
4. **Удаление сообщений** - удаляются все `Message` в диалоге
5. **Удаление диалога** - удаляется сам `Conversation`

Все операции выполняются атомарно - либо все удаляется успешно, либо ничего не удаляется.

## 🔐 Безопасность

⚠️ **ВАЖНО**: Этот endpoint **НЕ требует аутентификации**.

Это сделано намеренно для упрощения интеграции с мобильными приложениями, но означает, что:

- Любой, кто знает `conversationId`, может удалить диалог
- Рекомендуется использовать UUID/CUID для ID (что уже реализовано в Prisma)
- В будущем можно добавить дополнительные проверки владения

### Рекомендации по безопасности

Для продакшена рекомендуется:

1. Добавить проверку, что пользователь является участником диалога
2. Добавить rate limiting
3. Логировать все операции удаления

Пример с проверкой владения:

```typescript
// Проверяем, что пользователь является участником диалога
const conversation = await prisma.conversation.findUnique({
  where: { id: conversationId }
});

if (!conversation) {
  return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
}

// Получаем userId из query params или токена
const userId = searchParams.get('userId');

if (conversation.fromUserId !== userId && conversation.toUserId !== userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}

// Продолжаем удаление...
```

## 📊 Логирование

Endpoint логирует все ключевые операции:

```
[API/conversations/mobile] Starting DELETE request
[API/conversations/mobile] Deleting conversation: clxxx...
[API/conversations/mobile] Found messages to delete: 15
[API/conversations/mobile] Deleted message purchases: 3
[API/conversations/mobile] Deleted messages: 15
[API/conversations/mobile] Deleted conversation: clxxx...
[API/conversations/mobile] Successfully deleted conversation and all related data
```

## 🧪 Тестирование

### Ручное тестирование

1. Создайте диалог через UI или API
2. Скопируйте `conversationId` из URL или из ответа API
3. Выполните DELETE запрос с этим ID
4. Проверьте, что диалог исчез из списка
5. Проверьте, что все сообщения удалены из БД

### Автоматическое тестирование

```typescript
describe('DELETE /api/conversations/mobile', () => {
  it('should delete conversation successfully', async () => {
    // Создаем тестовый диалог
    const conversation = await createTestConversation();
    
    // Удаляем
    const response = await fetch(`/api/conversations/mobile?conversationId=${conversation.id}`, {
      method: 'DELETE'
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    
    // Проверяем, что диалог удален
    const deleted = await prisma.conversation.findUnique({
      where: { id: conversation.id }
    });
    expect(deleted).toBeNull();
  });
  
  it('should return 404 for non-existent conversation', async () => {
    const response = await fetch('/api/conversations/mobile?conversationId=invalid-id', {
      method: 'DELETE'
    });
    
    expect(response.status).toBe(404);
  });
});
```

## 🔗 Связанные файлы

- **API Route**: `app/api/conversations/mobile/route.ts` (строки 340-413)
- **Клиентский код**: `components/MessagesPageClient.tsx` (функция `deleteConversation`, строки 147-174)
- **Модели БД**: `prisma/schema.prisma` (Conversation, Message, MessagePurchase)

## 📱 Интеграция в UI

Функция `deleteConversation` в `MessagesPageClient.tsx` уже обновлена для использования нового endpoint:

```typescript
const deleteConversation = async (conversationId: string) => {
  try {
    console.log('[deleteConversation] Deleting conversation:', conversationId)

    const response = await fetch(`/api/conversations/mobile?conversationId=${conversationId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete conversation')
    }

    const result = await response.json()
    console.log('[deleteConversation] Delete result:', result)

    // Обновляем UI
    setConversations(prev => prev.filter(conv => conv.id !== conversationId))
    refetchConversations()
    setConversationIdForDelete(null)
  } catch (error) {
    console.error('[deleteConversation] Error:', error)
    throw error
  }
}
```

## ✅ Чеклист для разработчиков

- [x] DELETE метод реализован в `/api/conversations/mobile/route.ts`
- [x] Удаление происходит в транзакции
- [x] Удаляются все связанные данные (messages, purchases)
- [x] Добавлено логирование
- [x] Обработка ошибок
- [x] Валидация входных данных
- [x] Клиентский код обновлен
- [x] Исправлены ошибки TypeScript
- [x] Документация создана

## 🚀 Следующие шаги (опционально)

1. ✨ Добавить проверку владения диалога
2. 🔒 Добавить rate limiting
3. 📊 Добавить аналитику удалений
4. 🧪 Написать E2E тесты
5. 📱 Обновить мобильное приложение

---

**Дата создания**: 27 октября 2025  
**Версия API**: v1  
**Статус**: ✅ Готово к использованию

