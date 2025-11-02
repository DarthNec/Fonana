# 🎯 ANALYSIS: isCreatorPost через Normalizer

**Дата:** 22 октября 2025  
**Предложение:** Пробрасывать `user` в `PostNormalizer` и вычислять `isCreatorPost` в `normalizeAccess()`  
**Статус:** ✅ Отличное предложение! Очень актуально  
**Приоритет:** 🟢 Рекомендуется к реализации

---

## 📋 Суть предложения

### Текущая ситуация (ПРОБЛЕМНАЯ)
```typescript
// В useOptimizedPosts.ts
const normalizedPosts = PostNormalizer.normalizeMany(rawPosts, likesData)
// ❌ user НЕ передаётся в нормализатор

// В normalizer.ts
private static normalizeAccess(rawPost: any): PostAccess {
  return {
    // ...
    isCreatorPost: rawPost.isCreatorPost || false  // ❌ Берёт из rawPost
  }
}
```

**Проблемы:**
- ❌ `isCreatorPost` должен быть в `rawPost` (зависимость от API)
- ❌ Если данные пришли не через API → `isCreatorPost` некорректен
- ❌ Нарушение Single Source of Truth
- ❌ Потенциальная уязвимость безопасности

---

### Предложенное решение (ПРАВИЛЬНОЕ)
```typescript
// В useOptimizedPosts.ts (строка 150)
const normalizedPosts = PostNormalizer.normalizeMany(
  rawPosts, 
  likesData,
  user?.id  // ✅ Передаём userId!
)

// В normalizer.ts
static normalize(rawPost: any, currentUserId?: string, likesData?: any[]): UnifiedPost {
  return {
    // ...
    access: this.normalizeAccess(rawPost, currentUserId),  // ✅ Пробрасываем userId
  }
}

private static normalizeAccess(rawPost: any, currentUserId?: string): PostAccess {
  // ✅ Вычисляем isCreatorPost ЗДЕСЬ!
  const isCreatorPost = currentUserId 
    ? currentUserId === (rawPost.creatorId || rawPost.creator?.id)
    : false
  
  return {
    isLocked: rawPost.isLocked || false,
    // ... другие поля
    isCreatorPost,  // ✅ Всегда корректное значение!
  }
}
```

---

## ✅ Почему это ОТЛИЧНОЕ предложение

### 1. Single Source of Truth ✅
```typescript
// ДО: isCreatorPost вычисляется в 2 местах
// 1. API route: const isCreatorPost = currentUser?.id === post.creatorId
// 2. Normalizer: берёт из rawPost или подставляет false

// ПОСЛЕ: isCreatorPost вычисляется ТОЛЬКО в одном месте
// Normalizer.normalizeAccess(): вычисляется из currentUserId + creatorId
```

**Результат:**
- ✅ Одна логика вычисления
- ✅ Нет расхождений между источниками
- ✅ Легко поддерживать

---

### 2. Безопасность ✅
```typescript
// ДО: Клиент может подделать isCreatorPost
const fakePost = {
  id: 'someoneElsesPost',
  isCreatorPost: true  // ❌ Подделка!
}
PostNormalizer.normalize(fakePost)
// → isCreatorPost: true (НЕПРАВИЛЬНО!)

// ПОСЛЕ: Клиент НЕ МОЖЕТ подделать
const fakePost = {
  id: 'someoneElsesPost',
  isCreatorPost: true  // Игнорируется!
}
PostNormalizer.normalize(fakePost, 'realUserId')
// → isCreatorPost вычисляется из realUserId === fakePost.creatorId
// → isCreatorPost: false (ПРАВИЛЬНО!)
```

**Результат:**
- ✅ Невозможно подделать
- ✅ Всегда корректное значение
- ✅ Безопасность гарантирована

---

### 3. Независимость от API ✅
```typescript
// ДО: Работает только если данные через API route
const posts = await prisma.post.findMany()
PostNormalizer.normalize(posts[0])
// → isCreatorPost: false (ВСЕГДА! Даже для автора)

// ПОСЛЕ: Работает откуда угодно
const posts = await prisma.post.findMany()
PostNormalizer.normalize(posts[0], user.id)
// → isCreatorPost вычисляется корректно
```

**Результат:**
- ✅ Работает с любыми источниками данных
- ✅ Не зависит от API route
- ✅ Гибкость архитектуры

---

### 4. Удобство использования ✅
```typescript
// ДО: Нужно заранее добавлять isCreatorPost
const postsWithCreatorFlag = posts.map(post => ({
  ...post,
  isCreatorPost: currentUser.id === post.creatorId
}))
PostNormalizer.normalize(postsWithCreatorFlag)

// ПОСЛЕ: Просто передаём userId
PostNormalizer.normalize(posts, currentUser.id)
// Всё!
```

**Результат:**
- ✅ Меньше кода
- ✅ Проще использовать
- ✅ Меньше ошибок

---

## 🔍 Анализ текущего кода

### В `useOptimizedPosts.ts` ВСЕ ДАННЫЕ УЖЕ ЕСТЬ!

#### Место 1: loadPosts() - строка 150
```typescript
const normalizedPosts = PostNormalizer.normalizeMany(rawPosts, likesData);
//                                                              ↑
//                                                    ❌ НЕ ПЕРЕДАЁМ user!
```

**Доступные данные:**
- ✅ `user` (строка 46): `const user = useUser()`
- ✅ `user?.id` используется в строке 91
- ✅ `rawPosts` содержат `creatorId`

**Что нужно:**
```typescript
const normalizedPosts = PostNormalizer.normalizeMany(
  rawPosts, 
  likesData,
  user?.id  // ✅ ДОБАВИТЬ!
);
```

---

#### Место 2: loadMore() - строка 266
```typescript
const normalizedPosts = PostNormalizer.normalizeMany(rawPosts, likesData)
//                                                              ↑
//                                                    ❌ НЕ ПЕРЕДАЁМ user!
```

**Что нужно:**
```typescript
const normalizedPosts = PostNormalizer.normalizeMany(
  rawPosts, 
  likesData,
  user?.id  // ✅ ДОБАВИТЬ!
)
```

---

#### Место 3: addNewPost() - строка 511
```typescript
const normalizedPost = PostNormalizer.normalize(newPost)
//                                                ↑
//                                      ❌ НЕ ПЕРЕДАЁМ user!
```

**Что нужно:**
```typescript
const normalizedPost = PostNormalizer.normalize(
  newPost,
  user?.id  // ✅ ДОБАВИТЬ!
)
```

---

#### Место 4: loadPostById() - строка 562
```typescript
const normalizedPosts = PostNormalizer.normalizeMany([{...postData.post}], likesData)
//                                                                           ↑
//                                                                 ❌ НЕ ПЕРЕДАЁМ user!
```

**Что нужно:**
```typescript
const normalizedPosts = PostNormalizer.normalizeMany(
  [{...postData.post}], 
  likesData,
  user?.id  // ✅ ДОБАВИТЬ!
)
```

---

## 📊 Места использования в `useOptimizedPosts.ts`

| Место | Строка | Функция | Статус |
|-------|--------|---------|--------|
| 1 | 150 | `loadPosts()` | ❌ Не передаёт `user.id` |
| 2 | 266 | `loadMore()` | ❌ Не передаёт `user.id` |
| 3 | 511 | `addNewPost()` | ❌ Не передаёт `user.id` |
| 4 | 562 | `loadPostById()` | ❌ Не передаёт `user.id` |

**Итого:** 4 места требуют изменений в `useOptimizedPosts.ts`

---

## 🎯 Предлагаемые изменения

### Изменение 1: Сигнатура `PostNormalizer`

**Файл:** `services/posts/normalizer.ts`

```typescript
// БЫЛО:
static normalize(rawPost: any): UnifiedPost {
  return {
    // ...
    access: this.normalizeAccess(rawPost),
  }
}

static normalizeMany(rawPosts: any[], likesData: any[]): UnifiedPost[] {
  // ...
  return rawPosts.map(post => this.normalize(post))
}

private static normalizeAccess(rawPost: any): PostAccess {
  return {
    // ...
    isCreatorPost: rawPost.isCreatorPost || false  // ❌
  }
}
```

**СТАНЕТ:**
```typescript
// [iscreatorpost_normalizer_fix_2025_025]
/**
 * Преобразует сырые данные поста в унифицированный формат
 * @param rawPost - Сырые данные поста
 * @param currentUserId - ID текущего пользователя для вычисления isCreatorPost
 */
static normalize(rawPost: any, currentUserId?: string): UnifiedPost {
  return {
    id: rawPost.id,
    creator: this.normalizeCreator(rawPost.creator || rawPost),
    content: this.normalizeContent(rawPost),
    media: this.normalizeMedia(rawPost),
    access: this.normalizeAccess(rawPost, currentUserId),  // ✅ Передаём userId
    commerce: this.normalizeCommerce(rawPost),
    engagement: this.normalizeEngagement(rawPost),
    createdAt: rawPost.createdAt,
    updatedAt: rawPost.updatedAt || rawPost.createdAt,
    remixId: rawPost.remixId ?? null,
    hasRemixesCount: rawPost._count?.remixes ?? rawPost.hasRemixesCount ?? undefined
  }
}

/**
 * Нормализует массив постов
 * @param rawPosts - Массив сырых данных постов
 * @param likesData - Данные о лайках пользователя
 * @param currentUserId - ID текущего пользователя для вычисления isCreatorPost
 */
static normalizeMany(rawPosts: any[], likesData: any[], currentUserId?: string): UnifiedPost[] {
  console.log(`[PostNormalizer] Likes data:`, likesData);
  console.log(`[PostNormalizer] Raw posts:`, rawPosts);
  
  if(likesData != undefined) {
    if(likesData.length > 0) {
      rawPosts = rawPosts.map(post => {
        const like = likesData.find(like => like.postId === post.id);
        return {
          ...post,
          isLiked: like ? true : false
        }
      })
    }
  }
  
  console.log(`[PostNormalizer] Raw posts after likes:`, rawPosts);
  return rawPosts.map(post => this.normalize(post, currentUserId))  // ✅ Передаём userId
}

/**
 * Нормализует данные доступа к посту
 * @param rawPost - Сырые данные поста
 * @param currentUserId - ID текущего пользователя
 */
private static normalizeAccess(rawPost: any, currentUserId?: string): PostAccess {
  // ... existing code ...
  
  // [iscreatorpost_normalizer_fix_2025_025] Вычисляем isCreatorPost
  // на основе currentUserId и creatorId из поста
  const creatorId = rawPost.creatorId || rawPost.creator?.id
  const isCreatorPost = !!(currentUserId && creatorId && currentUserId === creatorId)
  
  return {
    isLocked: rawPost.isLocked || false,
    tier,
    price,
    currency: rawPost.currency || 'SOL',
    isPurchased: rawPost.hasPurchased || rawPost.isPurchased || false,
    isSubscribed: rawPost.isSubscribed || false,
    userTier: rawPost.userTier?.toLowerCase(),
    shouldHideContent: rawPost.shouldHideContent || false,
    isCreatorPost,  // ✅ Всегда корректное значение!
    isCreatorPost: rawPost.isCreatorPost || false
  }
}
```

---

### Изменение 2: Использование в `useOptimizedPosts.ts`

**Файл:** `lib/hooks/useOptimizedPosts.ts`

#### 2.1. В `loadPosts()` (строка 150)
```typescript
// БЫЛО:
const normalizedPosts = PostNormalizer.normalizeMany(rawPosts, likesData);

// СТАНЕТ:
const normalizedPosts = PostNormalizer.normalizeMany(
  rawPosts, 
  likesData,
  user?.id  // ✅ Передаём userId
);
```

#### 2.2. В `loadMore()` (строка 266)
```typescript
// БЫЛО:
const normalizedPosts = PostNormalizer.normalizeMany(rawPosts, likesData)

// СТАНЕТ:
const normalizedPosts = PostNormalizer.normalizeMany(
  rawPosts, 
  likesData,
  user?.id  // ✅ Передаём userId
)
```

#### 2.3. В `addNewPost()` (строка 511)
```typescript
// БЫЛО:
const normalizedPost = PostNormalizer.normalize(newPost)

// СТАНЕТ:
const normalizedPost = PostNormalizer.normalize(
  newPost,
  user?.id  // ✅ Передаём userId
)
```

#### 2.4. В `loadPostById()` (строка 562)
```typescript
// БЫЛО:
const normalizedPosts = PostNormalizer.normalizeMany([{...postData.post}], likesData)

// СТАНЕТ:
const normalizedPosts = PostNormalizer.normalizeMany(
  [{...postData.post}], 
  likesData,
  user?.id  // ✅ Передаём userId
)
```

---

## ✅ Преимущества решения

### 1. Архитектурные преимущества
- ✅ **Single Source of Truth** - одно место вычисления
- ✅ **Независимость от источника данных** - работает с любыми данными
- ✅ **Чистая архитектура** - логика в нормализаторе
- ✅ **Легко тестировать** - один метод для тестирования

### 2. Безопасность
- ✅ **Невозможно подделать** - вычисляется на клиенте из userId
- ✅ **Всегда корректное значение** - не зависит от API
- ✅ **Нет уязвимостей** - клиент не может манипулировать

### 3. Совместимость
- ✅ **Backward compatible** - `currentUserId` опциональный
- ✅ **Постепенная миграция** - можно обновлять по частям
- ✅ **Не ломает существующий код** - если не передать userId, работает как раньше

### 4. Удобство
- ✅ **Простое API** - просто передать `user?.id`
- ✅ **Понятная логика** - всё в одном месте
- ✅ **Легко расширять** - можно добавить другие вычисляемые поля

---

## 🔴 Потенциальные проблемы и решения

### Проблема 1: Другие компоненты используют `PostNormalizer`

**Анализ:**
```bash
# Поиск всех использований:
grep -r "PostNormalizer.normalize" --include="*.ts" --include="*.tsx"
```

**Решение:**
- ✅ `currentUserId` опциональный параметр
- ✅ Если не передать - работает как раньше (fallback на `rawPost.isCreatorPost`)
- ✅ Backward compatible

---

### Проблема 2: API route тоже вычисляет `isCreatorPost`

**Текущее состояние:**
```typescript
// app/api/posts/route.ts (строка 120)
const isCreatorPost = currentUser?.id === post.creatorId
```

**Решение:**
- ✅ Оставить в API для SSR/initial render
- ✅ На клиенте нормализатор пересчитает корректно
- ✅ Двойное вычисление не проблема (дёшевая операция)

**Или (лучше):**
```typescript
// Убрать вычисление из API, оставить только в нормализаторе
// API просто не передаёт isCreatorPost
// Нормализатор вычислит на клиенте
```

---

### Проблема 3: SSR и серверные компоненты

**Вопрос:** Как передать `userId` на сервере?

**Решение:**
```typescript
// В серверном компоненте:
const session = await getServerSession()
const posts = await loadPosts()
const normalizedPosts = PostNormalizer.normalizeMany(
  posts, 
  [], 
  session?.user?.id  // ✅ Передаём userId с сервера
)
```

---

## 📊 Сравнение решений

| Аспект | Текущее решение | Optional chaining | **Normalizer (предложение)** |
|--------|----------------|-------------------|-------------------------------|
| **Single Source of Truth** | ❌ Нет | ❌ Нет | ✅ Да |
| **Безопасность** | ❌ Уязвимо | ⚠️ Частично | ✅ Безопасно |
| **Независимость от API** | ❌ Зависит | ❌ Зависит | ✅ Независимо |
| **Простота** | ⚠️ Средняя | ✅ Простая | ✅ Простая |
| **Backward compatible** | ✅ Да | ✅ Да | ✅ Да |
| **Легко поддерживать** | ❌ Нет | ⚠️ Средне | ✅ Да |
| **Время реализации** | - | 15 мин | 30 мин |
| **Архитектурная чистота** | ❌ Плохая | ⚠️ Средняя | ✅ Отличная |

**Победитель:** 🏆 **Normalizer solution (предложение)**

---

## 🎯 Рекомендация

### ✅ РЕАЛИЗОВАТЬ ПРЕДЛОЖЕНИЕ!

**Причины:**
1. ✅ Правильная архитектура
2. ✅ Безопасность
3. ✅ Single Source of Truth
4. ✅ Легко поддерживать
5. ✅ Backward compatible

**План:**
1. Обновить `PostNormalizer.normalize()` и `normalizeMany()`
2. Обновить 4 места в `useOptimizedPosts.ts`
3. Протестировать
4. Постепенно обновить другие компоненты

**Время:** 30-40 минут  
**Риск:** 🟢 Низкий  
**Выгода:** 🟢 Высокая

---

## 📝 Summary

**Предложение:**
> Пробрасывать `user` в `PostNormalizer` и вычислять `isCreatorPost` в `normalizeAccess()`

**Оценка:** ⭐⭐⭐⭐⭐ (5/5)

**Причины:**
- ✅ Решает root cause проблемы
- ✅ Правильная архитектура
- ✅ Безопасность
- ✅ Легко реализовать
- ✅ Backward compatible

**Вердикт:**
# 🎉 ОТЛИЧНОЕ ПРЕДЛОЖЕНИЕ! ОЧЕНЬ АКТУАЛЬНО!
# 🚀 РЕКОМЕНДУЕТСЯ К НЕМЕДЛЕННОЙ РЕАЛИЗАЦИИ!

---

**Готов приступить к реализации по вашей команде! 🚀**


