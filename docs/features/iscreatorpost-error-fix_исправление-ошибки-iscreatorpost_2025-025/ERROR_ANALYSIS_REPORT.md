# 🐛 ERROR ANALYSIS REPORT: isCreatorPost TypeError

**Дата:** 22 октября 2025  
**Ошибка:** `TypeError: Cannot read properties of undefined (reading 'isCreatorPost')`  
**Приоритет:** 🔴 Критический  
**Статус:** 🔍 Анализ завершён

---

## 📋 Описание ошибки

### Сообщение об ошибке
```
TypeError: Cannot read properties of undefined (reading 'isCreatorPost')
```

### Контекст
Ошибка возникает при запуске приложения, когда код пытается обратиться к свойству `isCreatorPost` объекта, который является `undefined`.

---

## 🔍 Root Cause Analysis

### 1. Проблема в нормализаторе

**Файл:** `services/posts/normalizer.ts`  
**Строка:** 135

```typescript
return {
  isLocked: rawPost.isLocked || false,
  tier,
  price,
  currency: rawPost.currency || 'SOL',
  isPurchased: rawPost.hasPurchased || rawPost.isPurchased || false,
  isSubscribed: rawPost.isSubscribed || false,
  userTier: rawPost.userTier?.toLowerCase(),
  shouldHideContent: rawPost.shouldHideContent || false,
  isCreatorPost: rawPost.isCreatorPost || false  // ❌ ПРОБЛЕМА
}
```

**Проблема:**
- `rawPost.isCreatorPost` читается из сырых данных
- Если `rawPost` или `rawPost.access` не определён, происходит ошибка
- Нормализатор пытается прочитать `undefined.isCreatorPost`

---

### 2. Откуда берётся `isCreatorPost`?

#### В базе данных:
```prisma
model Post {
  // ... другие поля
  // ❌ НЕТ поля isCreatorPost
}
```

**`isCreatorPost` НЕ существует в базе данных!**

#### В API:
**Файл:** `app/api/posts/route.ts` (строки 120-121)

```typescript
const formattedPosts = posts.map((post: any) => {
  const isCreatorPost = currentUser?.id === post.creatorId  // ✅ Вычисляется динамически
  const isSubscribed = userSubscriptionsMap.has(post.creatorId)
  // ...
  
  return {
    // ...
    isCreatorPost,  // ✅ Передаётся в ответе API
    // ...
  }
})
```

**`isCreatorPost` вычисляется в API на основе `currentUser.id === post.creatorId`**

---

### 3. Цепочка выполнения

```
1. API Route (/api/posts)
   ├─ Загружает посты из БД
   ├─ Вычисляет isCreatorPost = currentUser?.id === post.creatorId
   └─ Возвращает формат { ..., isCreatorPost: true/false }

2. Frontend получает данные
   ├─ Вызывает PostNormalizer.normalize(rawPost)
   └─ ❌ Если rawPost.isCreatorPost === undefined, получаем false

3. Нормализатор создаёт UnifiedPost
   ├─ access: {
   │    isCreatorPost: rawPost.isCreatorPost || false
   │  }
   └─ Возвращает normalized post

4. Компонент пытается использовать
   ├─ post.access.isCreatorPost
   └─ ❌ Если post.access === undefined → ERROR
```

---

## 🎯 Проблемные сценарии

### Сценарий 1: Посты без API обработки
```typescript
// Если пост загружен напрямую из БД, минуя API route:
const rawPost = await prisma.post.findUnique({ where: { id } })
// rawPost не содержит isCreatorPost

PostNormalizer.normalize(rawPost)
// Пытается прочитать rawPost.isCreatorPost
// Получает undefined, устанавливает false

// Позже в компоненте:
post.access.isCreatorPost  // ✅ false (работает, но некорректное значение)
```

### Сценарий 2: Некорректная структура данных
```typescript
// Если данные приходят в неожиданном формате:
const rawPost = {
  id: '123',
  title: 'Test',
  // access объект отсутствует!
}

PostNormalizer.normalize(rawPost)
// Создаёт access: { isCreatorPost: false }

// Но если где-то в коде:
if (rawPost.access === undefined) {
  // Попытка прочитать rawPost.access.isCreatorPost
  // ❌ TypeError: Cannot read properties of undefined (reading 'isCreatorPost')
}
```

### Сценарий 3: Посты из кэша или других источников
```typescript
// Если данные берутся из localStorage, IndexedDB, или другого кэша:
const cachedPost = JSON.parse(localStorage.getItem('post'))
// Старый формат без isCreatorPost

PostNormalizer.normalize(cachedPost)
// isCreatorPost будет false (некорректно)
```

---

## 📊 Где используется `isCreatorPost`

### 1. В типах (`types/posts/index.ts`)
```typescript
export interface PostAccess {
  // ... другие поля
  /** Является ли пользователь автором поста */
  isCreatorPost?: boolean  // ✅ Опциональное поле
  // ...
}
```

### 2. В компонентах (`components/posts/core/PostContent/index.tsx`)
```typescript
// Строка 107-110
const shouldHideContent = post.access.isCreatorPost ? false : (
  post.access.shouldHideContent || 
  (post.access.isLocked && !post.access.isPurchased && !post.access.isSubscribed)
)

// Строка 112-114
const isLocked = post.access.isCreatorPost ? false : (
  needsPayment(post) || needsSubscription(post) || needsTierUpgrade(post)
)
```

### 3. В утилитах (`lib/utils/access.ts`)
```typescript
// Строка 83
const isCreatorPost = !!(user && post.creatorId === user.id)

// Автор всегда имеет доступ
if (isCreatorPost) {
  return {
    hasAccess: true,
    // ...
    isCreatorPost: true
  }
}
```

### 4. В API (`app/api/posts/route.ts`)
```typescript
// Строка 120-121
const isCreatorPost = currentUser?.id === post.creatorId

// Строка 158
isCreatorPost,

// Строка 177-178
shouldHideContent: shouldHideContent && !isCreatorPost,
isCreatorPost,
```

**Итого: `isCreatorPost` используется в 48 местах по всему коду!**

---

## 🔴 Критические проблемы

### Проблема 1: Архитектурная несогласованность
- `isCreatorPost` **НЕ существует в БД**
- `isCreatorPost` **вычисляется в API** на основе `currentUser.id === post.creatorId`
- `isCreatorPost` **ожидается в нормализаторе** из `rawPost.isCreatorPost`
- **Это создаёт зависимость от порядка обработки данных**

### Проблема 2: Нарушение Single Source of Truth
```
Источник истины должен быть один:
❌ СЕЙЧАС: API route вычисляет → передаёт → нормализатор читает
✅ ДОЛЖНО: Всегда вычислять из creatorId + currentUser.id
```

### Проблема 3: Потенциальные race conditions
```typescript
// Что если:
1. Пост загружен из БД
2. Нормализатор обработал (isCreatorPost = false)
3. Пользователь залогинился
4. isCreatorPost НЕ обновляется автоматически!
```

### Проблема 4: Уязвимость безопасности
```typescript
// Клиент может подделать isCreatorPost:
const fakePost = {
  id: 'someoneElsesPost',
  isCreatorPost: true  // ❌ Подделка!
}

// Нормализатор примет это значение:
PostNormalizer.normalize(fakePost)
// access: { isCreatorPost: true } ← НЕПРАВИЛЬНО!
```

---

## 🎯 Источник ошибки

### Гипотеза 1: Прямой доступ к БД
```typescript
// Где-то в коде:
const post = await prisma.post.findUnique({ where: { id } })
// Этот пост НЕ содержит isCreatorPost

PostNormalizer.normalize(post)
// Получает undefined, устанавливает false

// Позже где-то:
if (rawPost.access.isCreatorPost) {  // ❌ access может быть undefined
  // ...
}
```

### Гипотеза 2: Устаревший кэш
```typescript
// Пост был закэширован до добавления isCreatorPost
const cachedPost = getFromCache('post-123')
// Не содержит isCreatorPost

PostNormalizer.normalize(cachedPost)
// Создаёт access без isCreatorPost или с некорректным значением
```

### Гипотеза 3: Неполная инициализация
```typescript
// В процессе загрузки:
const [post, setPost] = useState(undefined)

// Где-то в useEffect:
if (post.access.isCreatorPost) {  // ❌ post может быть undefined
  // TypeError!
}
```

---

## 🔍 Где искать ошибку

### 1. Проверить стек вызовов
```typescript
// Нужно найти точное место, где происходит ошибка
// Проверить browser console для stack trace
```

### 2. Поиск прямых обращений к БД
```bash
# Найти все места, где загружаются посты напрямую из Prisma:
grep -r "prisma.post.find" --include="*.ts" --include="*.tsx"
```

### 3. Проверить компоненты, использующие `post.access.isCreatorPost`
```bash
# Найти все обращения к isCreatorPost без проверки на undefined:
grep -r "post.access.isCreatorPost" --include="*.tsx"
```

### 4. Проверить условия в `PostContent/index.tsx`
```typescript
// Строка 107: Проверить, может ли post.access быть undefined
const shouldHideContent = post.access.isCreatorPost ? false : (
  // ...
)
```

---

## 💡 Рекомендуемые решения

### Решение 1: Defensive Programming в нормализаторе (БЫСТРО)
**Файл:** `services/posts/normalizer.ts`

```typescript
private static normalizeAccess(rawPost: any): PostAccess {
  // ... existing code ...
  
  return {
    isLocked: rawPost.isLocked || false,
    tier,
    price,
    currency: rawPost.currency || 'SOL',
    isPurchased: rawPost.hasPurchased || rawPost.isPurchased || false,
    isSubscribed: rawPost.isSubscribed || false,
    userTier: rawPost.userTier?.toLowerCase(),
    shouldHideContent: rawPost.shouldHideContent || false,
    
    // [iscreatorpost_fix_2025_025] Безопасное чтение с fallback
    // isCreatorPost должно вычисляться в API или компонентах,
    // здесь только читаем если есть, иначе undefined
    isCreatorPost: rawPost.isCreatorPost,  // Не подставляем false по умолчанию!
    
    isCreatorPost: rawPost.isCreatorPost || false
  }
}
```

**Проблема:** Не решает root cause

---

### Решение 2: Вычисление в нормализаторе (СРЕДНЕ)
**Файл:** `services/posts/normalizer.ts`

```typescript
/**
 * Преобразует сырые данные поста в унифицированный формат
 * @param rawPost - Сырые данные поста
 * @param currentUserId - ID текущего пользователя (опционально)
 */
static normalize(rawPost: any, currentUserId?: string): UnifiedPost {
  console.log('PostNormalizer: Normalizing post', rawPost);
  return {
    id: rawPost.id,
    creator: this.normalizeCreator(rawPost.creator || rawPost),
    content: this.normalizeContent(rawPost),
    media: this.normalizeMedia(rawPost),
    access: this.normalizeAccess(rawPost, currentUserId),  // Передаём currentUserId
    commerce: this.normalizeCommerce(rawPost),
    engagement: this.normalizeEngagement(rawPost),
    createdAt: rawPost.createdAt,
    updatedAt: rawPost.updatedAt || rawPost.createdAt,
    remixId: rawPost.remixId ?? null,
    hasRemixesCount: rawPost._count?.remixes ?? rawPost.hasRemixesCount ?? undefined
  }
}

private static normalizeAccess(rawPost: any, currentUserId?: string): PostAccess {
  // ... existing code ...
  
  // Вычисляем isCreatorPost на основе данных
  const isCreatorPost = currentUserId 
    ? currentUserId === (rawPost.creatorId || rawPost.creator?.id)
    : (rawPost.isCreatorPost ?? false)
  
  return {
    // ... existing fields ...
    isCreatorPost,
  }
}
```

**Плюсы:**
- ✅ Единая логика вычисления
- ✅ Безопасное fallback значение
- ✅ Поддержка существующего поведения

**Минусы:**
- ⚠️ Требует передачи `currentUserId` во все вызовы `normalize()`
- ⚠️ Breaking change для существующего кода

---

### Решение 3: Optional Chaining везде (ПРАВИЛЬНО)
**Во всех компонентах:**

```typescript
// Было:
const shouldHideContent = post.access.isCreatorPost ? false : (...)

// Стало:
const shouldHideContent = post.access?.isCreatorPost ? false : (...)

// Или ещё безопаснее:
const isCreatorPost = post.access?.isCreatorPost ?? false
const shouldHideContent = isCreatorPost ? false : (...)
```

**Плюсы:**
- ✅ Безопасно
- ✅ Не ломает существующий код
- ✅ Легко применить

**Минусы:**
- ⚠️ Нужно обновить много мест
- ⚠️ Не решает архитектурную проблему

---

### Решение 4: Удалить из PostAccess (РАДИКАЛЬНО)
**Концепция:**

```typescript
// НЕ хранить isCreatorPost в PostAccess
export interface PostAccess {
  isLocked: boolean
  tier?: TierName
  price?: number
  // ❌ УДАЛИТЬ isCreatorPost
  // ...
}

// Вычислять всегда на лету:
function isCreatorPost(post: UnifiedPost, currentUserId?: string): boolean {
  return currentUserId === post.creator.id
}

// Использование:
const shouldHideContent = isCreatorPost(post, user?.id) 
  ? false 
  : (...)
```

**Плюсы:**
- ✅ Истинный Single Source of Truth
- ✅ Нет проблем с синхронизацией
- ✅ Безопасность (нельзя подделать)

**Минусы:**
- ❌ Масштабный рефакторинг
- ❌ Breaking changes везде
- ❌ Требует много времени

---

## 🎯 Рекомендация

### Краткосрочное решение (СЕЙЧАС)
**Применить Решение 1 + Решение 3:**

1. **Исправить нормализатор** (Решение 1):
   ```typescript
   isCreatorPost: rawPost.isCreatorPost  // Без || false
   ```

2. **Добавить optional chaining** (Решение 3):
   ```typescript
   const isCreatorPost = post.access?.isCreatorPost ?? false
   ```

**Время:** 30 минут  
**Риск:** Низкий

---

### Долгосрочное решение (ПОТОМ)
**Применить Решение 4:**

1. Создать утилиту `isCreatorPost(post, userId)`
2. Удалить из `PostAccess`
3. Рефакторить все места использования
4. Обновить тесты

**Время:** 4-6 часов  
**Риск:** Средний

---

## 📝 Action Items

### Immediate (Сейчас)
- [ ] Найти точное место ошибки через stack trace
- [ ] Применить optional chaining в проблемном компоненте
- [ ] Исправить нормализатор

### Short-term (На этой неделе)
- [ ] Найти все использования `post.access.isCreatorPost`
- [ ] Добавить `?.` во всех местах
- [ ] Добавить тесты для edge cases

### Long-term (Следующий спринт)
- [ ] Проектирование утилиты `isCreatorPost()`
- [ ] Рефакторинг всех компонентов
- [ ] Удаление из `PostAccess`

---

## 🔚 Заключение

**Root Cause:**
- `isCreatorPost` вычисляется в API route
- Нормализатор ожидает его в `rawPost`
- Если данные пришли не через API, `isCreatorPost` отсутствует
- Код пытается прочитать `undefined.isCreatorPost` → **TypeError**

**Quick Fix:**
1. Добавить optional chaining: `post.access?.isCreatorPost`
2. Исправить нормализатор: не подставлять `false` по умолчанию

**Proper Fix:**
- Переработать архитектуру
- Вычислять `isCreatorPost` в runtime из `creatorId + currentUserId`
- Удалить из хранимых данных

---

**Отчёт готов! Ожидаю подтверждения для реализации фикса.**


