# 🔍 АНАЛИЗ: Unlock не работает в ExplorePageClient → Store

## ❌ **ПРОБЛЕМА**

Когда пользователь:
1. Заходит в ExplorePageClient
2. Переключается на вкладку "Store" (платные посты)
3. Кликает на пост → открывается Fullscreen
4. Видит PostLocked overlay с кнопкой "Unlock"
5. **Кликает на "Unlock" → НИЧЕГО НЕ ПРОИСХОДИТ**

В то же время:
- ✅ В **Feed** при клике на Subscribe → открывается модалка подписки или предлагает подключить кошелек
- ❌ В **Explore Store** ничего не происходит

---

## 🔬 **ДИАГНОЗ**

### **1. Архитектура компонентов (✅ Правильная)**

```
ExplorePageClient
  ├─ FullscreenCarousel (onAction={handlePostAction})
      ├─ FullscreenPostCard (onAction={handleAction})
          └─ PostContent (onAction prop передан)
              └─ PostLocked (onAction prop передан)
                  └─ <button onClick={handleUnlock}>
```

**Все `onAction` props передаются корректно!** ✅

---

### **2. Обработчики действий**

#### **PostLocked → отправляет правильные actions:**
```typescript
// components/posts/core/PostLocked/index.tsx (строки 86-99)
const handleUnlock = () => {
  if (!onAction) return

  if (needsPay || post.commerce?.isSellable) {
    if (post.commerce?.isSellable) {
      onAction({ type: 'bid', postId: post.id })
    } else {
      onAction({ type: 'purchase', postId: post.id }) // ✅ Отправляется
    }
  } else if (needsSub || needsUpgrade) {
    onAction({ type: 'subscribe', postId: post.id }) // ✅ Отправляется
  }
}
```

#### **ExplorePageClient → обрабатывает эти actions:**
```typescript
// components/ExplorePageClient.tsx
const handlePostAction = useCallback(async (action: PostAction) => {
  const post = posts.find(p => p.id === action.postId)
  
  switch (action.type) {
    case 'subscribe': // ✅ ЕСТЬ (строки 226-232)
      setSelectedCreator(post.creator)
      setShowSubscribeModal(true)
      break
      
    case 'purchase': // ✅ ЕСТЬ (строки 234-262)
      setSelectedPost(purchasePost)
      setShowPurchaseModal(true)
      break
  }
}, [posts])
```

**Обработчики есть! Код правильный!** ✅

---

### **3. Модалки рендерятся**

```typescript
// ExplorePageClient.tsx (строки 335-380)

// В блоке if (showFullscreen):
{showSubscribeModal && selectedCreator && (
  <NewSubscribeModal ... />
)}

{showPurchaseModal && selectedPost && (
  <PurchaseModal ... />
)}

// И в основном return:
{showSubscribeModal && selectedCreator && (
  <NewSubscribeModal ... />
)}

{showPurchaseModal && selectedPost && (
  <PurchaseModal ... />
)}
```

**Модалки есть в обоих местах!** ✅

---

## 🐛 **ГИПОТЕЗЫ ПРОБЛЕМЫ**

### **Гипотеза #1: `onAction` не доходит до PostLocked**
❓ **Проверка:** Может где-то в цепочке `onAction` становится `undefined`?

**Цепочка:**
```
ExplorePageClient (onAction={handlePostAction})
  → FullscreenCarousel (onAction передан)
    → FullscreenPostCard (onAction передан)
      → PostContent (onAction передан?)
        → PostLocked (onAction передан?)
```

**Проверить:**
- PostContent передаёт ли `onAction` в PostLocked?
- Есть ли условие которое блокирует передачу?

---

### **Гипотеза #2: `posts` пустой в handlePostAction**
❓ **Проблема:** В `handlePostAction`:
```typescript
const post = posts.find(p => p.id === action.postId)
if (!post) return // ← ВОЗМОЖНО ЗДЕСЬ ВЫХОД!
```

**Если `posts` не содержит постов из Store, то:**
- `post` будет `undefined`
- Функция выйдет с `return`
- Модалка не откроется

**Проверить:**
1. Откуда берётся массив `posts` в `handlePostAction`?
2. Содержит ли он платные посты из Store?
3. Передаются ли в `FullscreenCarousel` правильные посты?

---

### **Гипотеза #3: `filteredPosts` vs `posts` - разные массивы**

```typescript
// ExplorePageClient.tsx (строка 327-329)
<FullscreenCarousel
  posts={filteredPosts} // ← Передаются filteredPosts
  onAction={handlePostAction}
/>

// А в handlePostAction:
const post = posts.find(p => p.id === action.postId) // ← Ищет в posts
```

**ВОЗМОЖНАЯ ПРОБЛЕМА:**
- `FullscreenCarousel` получает `filteredPosts`
- `handlePostAction` ищет пост в `posts`
- Если это разные массивы → пост не найдётся!

**Проверить:**
1. Что такое `filteredPosts`?
2. Есть ли в нём платные посты?
3. Должен ли `handlePostAction` искать в `filteredPosts` вместо `posts`?

---

### **Гипотеза #4: `activeTab` не влияет на `filteredPosts`**
❓ **Проблема:** Когда переключаешься на Store, `filteredPosts` не обновляется правильно?

**Проверить:**
1. Как формируется `filteredPosts`?
2. Зависит ли он от `activeTab`?
3. Фильтруются ли посты по типу (public/feed/store)?

---

## 🎯 **РЕШЕНИЕ (Предположительное)**

### **Вариант 1: Исправить поиск поста**
```typescript
// ExplorePageClient.tsx
const handlePostAction = useCallback(async (action: PostAction) => {
  // ❌ БЫЛО:
  const post = posts.find(p => p.id === action.postId)
  
  // ✅ ДОЛЖНО БЫТЬ:
  const post = filteredPosts.find(p => p.id === action.postId)
  
  if (!post) {
    console.error('[Explore] Post not found for action:', action)
    return
  }
  // ... rest of code
}, [filteredPosts]) // ← Зависимость от filteredPosts, не posts
```

**Почему это решение:**
- `FullscreenCarousel` работает с `filteredPosts`
- `handlePostAction` должен искать в том же массиве
- Сейчас происходит рассинхронизация

---

### **Вариант 2: Добавить логирование для отладки**
```typescript
const handlePostAction = useCallback(async (action: PostAction) => {
  console.log('[Explore] handlePostAction called:', {
    actionType: action.type,
    postId: action.postId,
    postsLength: posts.length,
    filteredPostsLength: filteredPosts.length,
    activeTab
  })
  
  const post = posts.find(p => p.id === action.postId)
  
  if (!post) {
    console.error('[Explore] POST NOT FOUND!', {
      searchedIn: 'posts',
      postId: action.postId,
      availableIds: posts.map(p => p.id)
    })
    return
  }
  
  console.log('[Explore] Post found:', post.id)
  // ... rest of code
}, [posts, filteredPosts, activeTab])
```

---

### **Вариант 3: Проверить передачу onAction в PostContent**
```typescript
// components/posts/newCore/PostContent.tsx (строка 99-105)
{(shouldHideContent || isLocked) ? (
  <PostLocked
    post={post}
    onAction={onAction} // ← Передаётся ли правильно?
    variant="full"
    isOverlay={true}
  />
) : (
```

**Добавить логи:**
```typescript
export function PostContent({ post, onAction, className, isFullscreen = false }: PostContentProps) {
  console.log('[PostContent] Rendered with onAction:', !!onAction, 'postId:', post.id)
  // ... rest
}
```

---

## 📝 **СЛЕДУЮЩИЕ ШАГИ**

1. **Проверить откуда берётся `posts` в handlePostAction**
2. **Сравнить `posts` vs `filteredPosts`**
3. **Добавить логи для отладки**
4. **Исправить на `filteredPosts.find` если подтвердится гипотеза #3**

---

## 🚀 **РЕКОМЕНДАЦИЯ К ИСПРАВЛЕНИЮ**

### **Наиболее вероятная причина: Гипотеза #3**

**Изменить:**
```typescript
const handlePostAction = useCallback(async (action: PostAction) => {
  // ✅ FIX: Ищем пост в filteredPosts, а не в posts
  const post = filteredPosts.find(p => p.id === action.postId)
  
  if (!post) {
    console.error('[Explore] Post not found in filteredPosts:', action.postId)
    return
  }
  
  switch (action.type) {
    case 'subscribe':
      setSelectedPost(post)
      setSelectedCreator(post.creator)
      setShowSubscribeModal(true)
      break
      
    case 'purchase':
      const purchasePost = {
        id: post.id,
        // ... rest of mapping
      }
      setSelectedPost(purchasePost)
      setShowPurchaseModal(true)
      break
  }
}, [filteredPosts]) // ← Зависимость от filteredPosts
```

**Это наиболее логичное решение**, потому что:
1. `FullscreenCarousel` работает с `filteredPosts`
2. `handlePostAction` должен искать в том же массиве
3. Разные массивы = пост не найдётся = модалка не откроется
