# Исправление проблем унифицированного PostCard

*Дата: 26 января 2025*

## Описание проблем

После внедрения унифицированной системы постов возникли следующие проблемы:

1. **Profile page** - при просмотре своих постов возникала ошибка
2. **Логика доступа** - авторам предлагалось подписаться на свои собственные посты
3. **Creator page** - вечная загрузка постов

## Причины проблем

### 1. Profile page
- Компонент `MyPostsSection` не передавал `userWallet` при загрузке постов
- API не мог определить текущего пользователя без `userWallet`

### 2. Логика доступа
- API endpoint `/api/posts` не передавал информацию о том, что пользователь является автором (`isCreatorPost`)
- Компонент `PostContent` не учитывал флаг автора при определении доступа

### 3. Creator page
- После загрузки постов не вызывался `setIsLoadingPosts(false)`
- Компонент оставался в состоянии загрузки

## Внесенные изменения

### 1. app/profile/page.tsx
```typescript
// Добавлена передача userWallet
const fetchUserPosts = async () => {
  const params = new URLSearchParams()
  if (userId) params.append('creatorId', userId)
  if (user?.wallet) params.append('userWallet', user.wallet)
  const response = await fetch(`/api/posts?${params.toString()}`)
  // ...
}

// Обновлен компонент
<MyPostsSection userId={user?.id} userWallet={user?.wallet} />
```

### 2. app/api/posts/route.ts
```typescript
// Добавлен флаг isCreatorPost в возвращаемый объект
return {
  ...post,
  isCreatorPost, // Новый флаг
  shouldHideContent: shouldHideContent && !isCreatorPost, // Автор всегда видит контент
  // ...
}
```

### 3. types/posts/index.ts
```typescript
export interface PostAccess {
  // ...существующие поля...
  /** Является ли пользователь автором поста */
  isCreatorPost?: boolean
}
```

### 4. services/posts/normalizer.ts
```typescript
// Добавлена нормализация isCreatorPost
return {
  // ...
  isCreatorPost: rawPost.isCreatorPost || false
}
```

### 5. components/posts/core/PostContent/index.tsx
```typescript
// Обновлена логика проверки доступа
const shouldHideContent = post.access.isCreatorPost ? false : (
  post.access.shouldHideContent || 
  (post.access.isLocked && !post.access.isPurchased && !post.access.isSubscribed)
)

const isLocked = post.access.isCreatorPost ? false : (
  needsPayment(post) || needsSubscription(post) || needsTierUpgrade(post)
)
```

### 6. app/creator/[id]/page.tsx
```typescript
// Добавлен вызов setIsLoadingPosts(false)
setPosts(formattedPosts)
setIsLoadingPosts(false) // Устанавливаем флаг загрузки в false

// Добавлено в маппинг постов
isCreatorPost: post.isCreatorPost || false
```

## Результаты

Диагностический скрипт `scripts/check-unified-postcard-access.js` подтверждает:

✅ Авторы видят все свои посты независимо от блокировки
✅ Другие пользователи видят только разблокированный контент
✅ Загрузка постов работает корректно на всех страницах

## Команды для проверки

```bash
# Проверка на сервере
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/check-unified-postcard-access.js"

# Локальная проверка
node scripts/check-unified-postcard-access.js
```

## Заключение

Все проблемы с унифицированным PostCard успешно решены. Система корректно определяет доступ к контенту для авторов и подписчиков. 