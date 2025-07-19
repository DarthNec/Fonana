# SOLUTION_PLAN: Fix Post Content Render Error
## ID: [post_content_render_2025_017]

## 1. КОРНЕВАЯ ПРИЧИНА

При добавлении нового поста локально в FeedPageClient происходит следующее:
1. CreatePostModal возвращает сырой пост из API
2. FeedPageClient вызывает `addNewPost(newPost)` БЕЗ нормализации
3. useOptimizedPosts добавляет сырой пост в начало массива
4. PostContent пытается отрендерить `post.content.text`, но `post.content` это сам контент (строка)
5. React выбрасывает ошибку "Objects are not valid as a React child"

## 2. РЕШЕНИЕ

### Шаг 1: Нормализация в useOptimizedPosts
Обновить функцию `addNewPost` чтобы она нормализовала пост перед добавлением:
```typescript
const addNewPost = useCallback((newPost: any) => {
  const normalizedPost = PostNormalizer.normalize(newPost)
  setPosts(prevPosts => [normalizedPost, ...prevPosts])
}, [])
```

### Шаг 2: Защита в PostContent (опционально)
Добавить проверку типа в PostContent для предотвращения подобных ошибок:
```typescript
{!shouldHideContent && post.content?.text && typeof post.content.text === 'string' && (
  <p>{post.content.text}</p>
)}
```

## 3. ПЛАН ДЕЙСТВИЙ

1. **Обновить useOptimizedPosts.ts**
   - Импортировать PostNormalizer
   - Обновить функцию addNewPost для нормализации

2. **Протестировать создание поста**
   - Создать новый пост
   - Убедиться что нет ошибок рендеринга
   - Проверить что пост отображается корректно

3. **Обновить документацию**
   - Задокументировать исправление
   - Обновить IMPLEMENTATION_REPORT

## 4. ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

- Новые посты добавляются в ленту без ошибок
- Структура данных соответствует UnifiedPost
- React не выбрасывает ошибки о рендеринге объектов

## 5. РИСКИ

- Минимальные - изменение затрагивает только нормализацию при локальном добавлении
- Не влияет на существующие посты или API 