# ARCHITECTURE_CONTEXT: Post Content Render Error
## Проблема: Objects are not valid as a React child
### Дата: 2025-01-17 | ID: [post_content_render_2025_017]

## 1. ОПИСАНИЕ ПРОБЛЕМЫ

При создании нового поста от пользователя fonanadev происходит критическая ошибка React:
```
Error: Objects are not valid as a React child (found: object with keys {title, text, category, tags})
```

Ошибка указывает на попытку рендеринга объекта в компоненте `<p>` внутри PostContent.

## 2. ТЕКУЩАЯ АРХИТЕКТУРА

### Структура данных поста
```typescript
// types/posts/index.ts
export interface PostContent {
  title: string
  text: string
  category?: string
  tags: string[]
}

export interface UnifiedPost {
  content: PostContent
  // другие поля...
}
```

### Нормализация данных
```typescript
// services/posts/normalizer.ts
private static normalizeContent(rawPost: any): PostContent {
  return {
    title: rawPost.title || '',
    text: rawPost.content || '',
    category: rawPost.category,
    tags: this.normalizeTags(rawPost.tags)
  }
}
```

### Компонент PostContent
```tsx
// components/posts/core/PostContent/index.tsx
{!shouldHideContent && post.content.text && (
  <p className={cn(
    'text-gray-700 dark:text-slate-300',
    getContentSize(),
    variant !== 'full' && 'line-clamp-3'
  )}>
    {post.content.text}  // Строка 183
  </p>
)}
```

## 3. АНАЛИЗ ОШИБКИ

### Стек вызовов
1. CreatePostModal создает пост и добавляет его локально
2. FeedPageClient получает новый пост через useOptimizedPosts
3. PostContent пытается отрендерить content.text
4. React выбрасывает ошибку о попытке рендеринга объекта

### Возможные причины
1. **Неправильная структура данных**: post.content.text может быть объектом вместо строки
2. **Ошибка нормализации**: PostNormalizer может неправильно обрабатывать новые посты
3. **Проблема с локальным добавлением**: При добавлении поста локально структура может отличаться

## 4. ВОСПРОИЗВЕДЕНИЕ

1. Пользователь создает новый пост с изображением
2. Данные отправляются на сервер успешно
3. Пост добавляется локально в FeedPageClient
4. При рендеринге происходит ошибка

## 5. ДОПОЛНИТЕЛЬНЫЕ НАБЛЮДЕНИЯ

### Успешное создание поста
- API возвращает успешный ответ
- Пост сохраняется в БД (ID: cmd7vd9q2000ld6tx3nmeo5ac)
- Файлы изображений загружаются корректно

### Проблемы с медиа
- 404 ошибки для старых постов с неправильными путями
- Но новый пост загружается по правильному пути

## 6. ГИПОТЕЗЫ

1. **Основная гипотеза**: При локальном добавлении поста структура данных не соответствует UnifiedPost
2. **Альтернативная**: PostNormalizer получает неожиданную структуру от API
3. **Маловероятная**: Компонент PostContent изменился и теперь неправильно обращается к данным 