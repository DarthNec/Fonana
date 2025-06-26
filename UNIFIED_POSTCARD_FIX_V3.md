# Исправление проблем унифицированного PostCard (Часть 3)

*Дата: 26 января 2025*

## Описание проблем

После второй волны исправлений остались две проблемы:

1. **Лайки требуют подключения кошелька** - хотя кошелек уже подключен
2. **Комментарии открываются в новом окне** - вместо inline отображения

## Анализ причин

### 1. Проблема с лайками
- `useUser()` загружает данные асинхронно
- При первом рендере `user` может быть `null` даже при подключенном кошельке
- Проверка `user?.id` срабатывает до загрузки user

### 2. Проблема с комментариями
- Использовался переход на отдельную страницу
- Отсутствовал компонент для inline отображения комментариев

## Внесенные исправления

### 1. lib/hooks/useUnifiedPosts.ts
```typescript
// Добавлена функция для получения userId с fallback на API
const getUserId = useCallback(async (): Promise<string | null> => {
  // Если user уже загружен
  if (user?.id) return user.id
  
  // Если кошелек подключен, но user еще загружается
  if (publicKey && !user) {
    try {
      const response = await fetch(`/api/user?wallet=${publicKey.toBase58()}`)
      if (response.ok) {
        const data = await response.json()
        return data.user?.id || null
      }
    } catch (error) {
      console.error('Error fetching user by wallet:', error)
    }
  }
  
  return null
}, [user, publicKey])

// Обновлены handleLike/handleUnlike для использования getUserId
const userId = await getUserId()
if (!userId) {
  toast.error('Пользователь не найден')
  return
}
```

### 2. components/posts/core/CommentsSection/index.tsx
```typescript
// Создан полноценный компонент для отображения комментариев
export function CommentsSection({ postId, className, onClose }: CommentsSectionProps) {
  // Загрузка комментариев
  // Форма добавления комментария
  // Список комментариев с аватарами
  // Поддержка анонимных комментариев
  // Форматирование даты
}
```

### 3. components/posts/core/PostCard/index.tsx
```typescript
// Добавлено состояние для управления видимостью комментариев
const [showComments, setShowComments] = useState(false)

// Обработка action type 'comment'
const handleAction = (action: PostAction) => {
  if (action.type === 'comment') {
    setShowComments(!showComments)
  } else if (onAction) {
    onAction(action)
  }
}

// Рендер CommentsSection при showComments === true
{showComments && (
  <CommentsSection
    postId={post.id}
    onClose={() => setShowComments(false)}
    className="animate-fade-in"
  />
)}
```

### 4. app/globals.css
```css
/* Добавлена анимация для плавного появления комментариев */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
```

### 5. app/feed/page.tsx
```typescript
// Удален case 'comment' - теперь обрабатывается в PostCard
// Комментарии открываются inline без перезагрузки страницы
```

## Результаты

Все проблемы успешно исправлены:

1. ✅ **Лайки** - работают сразу после подключения кошелька, даже если user еще загружается
2. ✅ **Комментарии** - открываются inline под постом с плавной анимацией

## Технические детали

### Архитектура CommentsSection
- Автономный компонент с собственным состоянием
- Загрузка комментариев через API
- Поддержка анонимных комментариев
- Автоматическое обновление после добавления
- Форматирование относительного времени

### Оптимизация getUserId
- Кеширование результата через useCallback
- Fallback на API при отсутствии user
- Использование publicKey для идентификации

## Дальнейшие улучшения

1. **Realtime комментарии** - обновление без перезагрузки через WebSocket
2. **Ответы на комментарии** - древовидная структура
3. **Реакции на комментарии** - эмодзи и лайки
4. **Упоминания** - @username в комментариях
5. **Оптимистичные обновления** - мгновенное отображение нового комментария

---
*Задеплоено: 26 января 2025* 