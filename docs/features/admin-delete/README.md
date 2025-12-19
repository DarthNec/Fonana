# Административное удаление постов

## 📋 Обзор

Функционал позволяет администраторам удалять любые посты на платформе независимо от авторства.

## 👥 Администраторы

ID администраторов хранятся в двух местах:

### Frontend (UI)
**Файл:** `components/posts/core/PostMenu/index.tsx`
```typescript
const ADMIN_IDS = [
  'cmbymuez00004qoe1aeyoe7zf',
  'cmfetoamd001spzkowc5pdygf'
]
```

### Backend (API)
**Файл:** `app/api/posts/[id]/admin-delete/route.ts`
```typescript
const ADMIN_IDS = [
  'cmbymuez00004qoe1aeyoe7zf',
  'cmfetoamd001spzkowc5pdygf'
]
```

## 🎨 UI компоненты

### PostMenu
**Файл:** `components/posts/core/PostMenu/index.tsx`

#### Для авторов постов (если они администраторы)
- Кнопка "Delete As Administrator" отображается после обычной кнопки "Delete Post"
- Цвет: **оранжевый** (для отличия от обычного удаления)
- Иконка: `ShieldCheckIcon`
- Разделитель перед кнопкой

#### Для не-авторов (если они администраторы)
- Кнопка "Delete As Administrator" отображается в начале меню
- Цвет: **красный** (как стандартное удаление)
- Иконка: `ShieldCheckIcon`
- Разделитель после кнопки

## 🔧 API Endpoint

### DELETE /api/posts/[id]/admin-delete

**Параметры:**
- `userWallet` (query param) - адрес кошелька пользователя

**Процесс:**
1. Получает `userWallet` из query параметров
2. Получает пользователя по wallet через `getUserByWallet()`
3. Проверяет, что userId входит в список `ADMIN_IDS`
4. Если проверка успешна - удаляет пост
5. Логирует административное действие

**Ответы:**
- `200` - успешное удаление
  ```json
  {
    "success": true,
    "message": "Post deleted by administrator",
    "details": {
      "postId": "...",
      "postTitle": "...",
      "originalCreator": "...",
      "deletedBy": "...",
      "timestamp": "..."
    }
  }
  ```
- `400` - не передан userWallet
- `403` - недостаточно прав (не администратор)
- `404` - пользователь или пост не найден
- `500` - ошибка сервера

## 📊 Логирование

Все административные действия логируются с префиксом `🛡️ [ADMIN DELETE]` и `⚠️ [ADMIN ACTION]`:

```
🛡️ [ADMIN DELETE] Request received for post: <postId>
🛡️ [ADMIN DELETE] userWallet from query params: <wallet>
🛡️ [ADMIN DELETE] User found: { userId: ..., userWallet: ... }
🛡️ [ADMIN DELETE] Is user admin: true userId: <userId>
🛡️ [ADMIN DELETE] Post details: { postId: ..., postTitle: ..., postCreatorId: ..., ... }
⚠️ [ADMIN ACTION] Administrator <adminId> is deleting post <postId> by <creatorNickname>
🛡️ [ADMIN DELETE] Post deleted successfully by administrator
```

## 🔄 Обработка на фронтенде

### useOptimizedPosts Hook
**Файл:** `lib/hooks/useOptimizedPosts.ts`

Функция `handleAdminDelete`:
- Показывает специальное подтверждение с предупреждением "⚠️ АДМИНИСТРАТИВНОЕ УДАЛЕНИЕ"
- Отправляет DELETE запрос на `/api/posts/[id]/admin-delete`
- Обрабатывает 403 ошибку с сообщением "У вас нет прав администратора"
- Удаляет пост из локального состояния
- Показывает toast "Пост удален администратором"

### useUnifiedPosts Hook
**Файл:** `lib/hooks/useUnifiedPosts.ts`

Аналогичная реализация `handleAdminDelete` с той же логикой.

## 🎯 Типы

### PostActionType
**Файл:** `types/posts/index.ts`

Добавлен новый тип действия:
```typescript
export type PostActionType = 
  | 'like' 
  | 'unlike' 
  | 'comment' 
  | 'share' 
  | 'subscribe' 
  | 'purchase' 
  | 'bid'
  | 'edit'
  | 'delete'
  | 'adminDelete' // ← НОВЫЙ ТИП
  | 'bookmark'
  | 'report'
  | 'remix_created'
  | 'add-emotion'
  | 'remove-emotion'
```

## 🔐 Безопасность

1. **Двойная проверка прав:** 
   - Frontend проверяет ID для отображения кнопки
   - Backend проверяет ID перед удалением

2. **Аудит действий:**
   - Все административные удаления логируются
   - Сохраняется информация о том, кто и когда удалил пост

3. **Wallet-based аутентификация:**
   - Проверка прав по wallet address
   - Получение пользователя через `getUserByWallet()`

## 🚀 Использование

1. Пользователь с ID из списка `ADMIN_IDS` видит кнопку "Delete As Administrator" в меню любого поста
2. При клике показывается подтверждение с предупреждением
3. После подтверждения пост удаляется через специальный endpoint
4. Действие логируется для аудита
5. Пост удаляется из интерфейса с соответствующим уведомлением

## 📝 Добавление новых администраторов

Чтобы добавить нового администратора:

1. Добавьте его userId в `ADMIN_IDS` в файле `components/posts/core/PostMenu/index.tsx`
2. Добавьте тот же userId в `ADMIN_IDS` в файле `app/api/posts/[id]/admin-delete/route.ts`

**⚠️ ВАЖНО:** ID должны совпадать в обоих файлах!

## 🧪 Тестирование

1. Войдите под пользователем с ID из списка администраторов
2. Откройте любой пост (свой или чужой)
3. Откройте меню поста (три точки)
4. Убедитесь, что видна кнопка "Delete As Administrator"
5. Попробуйте удалить пост
6. Проверьте логи в консоли браузера и сервера
7. Убедитесь, что пост удален и показано соответствующее уведомление


