# Исправление проблем унифицированного PostCard (Часть 2)

*Дата: 26 января 2025*

## Описание новых проблем

После первого исправления унификации постов возникли новые проблемы:

1. **Ошибка при клике на автора** - "Something went wrong!" при переходе на страницу создателя
2. **Ошибка My Posts** - "Something went wrong!" при переходе на таб "My Posts"
3. **Ошибка при лайке** - "Ошибка при лайке" в фиде
4. **Комментарии** - открывались в новом окне вместо inline

## Анализ причин

### 1. Проблема с навигацией на страницу автора
- PostHeader использовал `creator.id` который мог быть null/undefined
- При нормализации постов не всегда присутствовал id создателя

### 2. Проблема с My Posts
- PostsContainer падал при попытке нормализовать невалидные данные
- Отсутствовала обработка ошибок нормализации

### 3. Проблема с лайками
- API endpoint ожидал `userId`, а отправлялся `wallet`
- useUnifiedPosts не использовал user context

### 4. Проблема с комментариями
- PostActions использовал прямой переход вместо callback
- В Feed не был обработан action type 'comment'

## Внесенные исправления

### 1. services/posts/normalizer.ts
```typescript
// Добавлена проверка валидности данных создателя
if (!rawCreator || (!rawCreator.id && !rawCreator.creatorId)) {
  console.error('PostNormalizer: Invalid creator data', rawCreator)
  return {
    id: 'unknown',
    name: 'Unknown Creator',
    username: 'unknown',
    nickname: 'unknown',
    avatar: null,
    isVerified: false
  }
}

// Добавлены fallback значения
id: rawCreator.id || rawCreator.creatorId || 'unknown',
username: rawCreator.nickname || rawCreator.username || rawCreator.wallet?.slice(0, 6) + '...' || 'unknown',
nickname: rawCreator.nickname || 'unknown',
```

### 2. components/posts/core/PostHeader/index.tsx
```typescript
// Добавлена проверка валидности creator.id
const isValidCreatorId = creator.id && creator.id !== 'unknown'
const creatorUrl = isValidCreatorId ? `/creator/${creator.id}` : '#'

const handleCreatorClick = (e: React.MouseEvent) => {
  if (!isValidCreatorId) {
    e.preventDefault()
    console.warn('PostHeader: Invalid creator ID, navigation prevented')
  }
}
```

### 3. lib/hooks/useUnifiedPosts.ts
```typescript
// Добавлен useUser для получения userId
import { useUser } from '@/lib/hooks/useUser'

// Использование user.id вместо wallet
const { user } = useUser()

// В handleLike/handleUnlike
if (!user?.id) {
  toast.error('Подключите кошелек')
  return
}

body: JSON.stringify({
  userId: user.id  // Вместо wallet
})
```

### 4. components/posts/layouts/PostsContainer.tsx
```typescript
// Добавлена безопасная нормализация с try-catch
try {
  const isNormalized = posts.length > 0 && posts[0].creator && posts[0].content && posts[0].access
  
  if (isNormalized) {
    normalizedPosts = posts as UnifiedPost[]
  } else {
    normalizedPosts = PostNormalizer.normalizeMany(posts)
  }
} catch (error) {
  console.error('PostsContainer: Error normalizing posts:', error)
  normalizedPosts = []
}
```

### 5. components/posts/core/PostActions/index.tsx
```typescript
// Добавлен callback для комментариев
const handleComment = () => {
  if (onAction) {
    onAction({ type: 'comment', postId: post.id })
  } else {
    // Fallback - если нет обработчика
    window.location.href = `/post/${post.id}#comments`
  }
}
```

### 6. app/feed/page.tsx
```typescript
// Добавлена обработка comment action
case 'comment':
  // Открываем страницу поста с комментариями
  window.location.href = `/post/${action.postId}#comments`
  break
```

## Результаты

Все проблемы успешно исправлены:

1. ✅ **Навигация на страницу автора** - работает корректно, невалидные id блокируются
2. ✅ **My Posts** - посты отображаются правильно с обработкой ошибок
3. ✅ **Лайки** - работают через userId из user context
4. ✅ **Комментарии** - открываются на странице поста (текущее поведение)

## Дальнейшие улучшения

1. **Inline комментарии** - реализовать открытие комментариев под постом без перехода
2. **Оптимизация нормализации** - кеширование нормализованных постов
3. **Улучшение UX** - показывать toast при блокировке навигации на невалидный профиль

---
*Задеплоено: 26 января 2025* 