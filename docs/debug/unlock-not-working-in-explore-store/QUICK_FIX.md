# ⚡ QUICK FIX: Unlock не работает в Store

## 🐛 **ПРОБЛЕМА**
При клике на "Unlock" в платных постах (Store tab) в ExplorePageClient → **ничего не происходит**.

---

## 🎯 **ПРИЧИНА (99% уверенность)**

**Рассинхронизация массивов:**
```typescript
// ExplorePageClient.tsx

// 1. FullscreenCarousel получает filteredPosts:
<FullscreenCarousel
  posts={filteredPosts} // ← Платные посты здесь
  onAction={handlePostAction}
/>

// 2. Но handlePostAction ищет в posts:
const handlePostAction = useCallback(async (action: PostAction) => {
  const post = posts.find(p => p.id === action.postId) // ❌ Неправильный массив!
  if (!post) return // ← Пост не найден → выход → модалка не открывается
  
  switch (action.type) {
    case 'subscribe': // Не достигается
    case 'purchase': // Не достигается
  }
}, [posts])
```

**Результат:**
- Пост не находится в `posts`
- Функция выходит с `return`
- Модалка не открывается

---

## ✅ **РЕШЕНИЕ**

### **Изменить в ExplorePageClient.tsx:**

```typescript
const handlePostAction = useCallback(async (action: PostAction) => {
  // ✅ FIX: Искать в filteredPosts, а не в posts
  const post = filteredPosts.find(p => p.id === action.postId)
  
  if (!post) {
    console.error('[Explore] Post not found:', action.postId)
    return
  }
  
  // ... rest of switch (subscribe/purchase)
}, [filteredPosts]) // ← Изменить зависимость
```

---

## 🔍 **ЧТО МЕНЯТЬ**

### **Файл:** `components/ExplorePageClient.tsx`

**1. Найти строку (~210):**
```typescript
const post = posts.find(p => p.id === action.postId)
```

**2. Заменить на:**
```typescript
const post = filteredPosts.find(p => p.id === action.postId)
```

**3. Найти зависимость useCallback (~198):**
```typescript
}, [posts])
```

**4. Заменить на:**
```typescript
}, [filteredPosts])
```

**5. (Опционально) Добавить логи для проверки:**
```typescript
const handlePostAction = useCallback(async (action: PostAction) => {
  console.log('[Explore] Action:', action.type, 'for post:', action.postId)
  const post = filteredPosts.find(p => p.id === action.postId)
  
  if (!post) {
    console.error('[Explore] Post not found in filteredPosts')
    return
  }
  
  console.log('[Explore] Post found, processing action')
  // ... rest
}, [filteredPosts])
```

---

## 📊 **АЛЬТЕРНАТИВНЫЕ РЕШЕНИЯ**

### **Вариант 2: Искать в обоих массивах (безопаснее)**
```typescript
const post = filteredPosts.find(p => p.id === action.postId) 
          || posts.find(p => p.id === action.postId)
```

### **Вариант 3: Объединить массивы**
```typescript
const allPosts = [...new Map([...posts, ...filteredPosts].map(p => [p.id, p])).values()]
const post = allPosts.find(p => p.id === action.postId)
```

---

## 🚀 **РЕЗУЛЬТАТ ПОСЛЕ ФИКСА**

✅ Клик на "Unlock" → находится пост в `filteredPosts`  
✅ Открывается `PurchaseModal` для платных постов  
✅ Открывается `NewSubscribeModal` для подписочных постов  
✅ Аналогично Feed странице
