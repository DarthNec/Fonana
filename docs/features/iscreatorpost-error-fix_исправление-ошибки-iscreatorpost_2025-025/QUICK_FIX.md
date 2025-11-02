# ⚡ QUICK FIX: isCreatorPost TypeError

**Проблема:** `TypeError: Cannot read properties of undefined (reading 'isCreatorPost')`  
**Время на фикс:** 10-15 минут  
**Риск:** 🟢 Низкий

---

## 🎯 TL;DR

**Root Cause:**
- Код пытается прочитать `post.access.isCreatorPost`
- `post.access` или `isCreatorPost` может быть `undefined`
- Нормализатор подставляет `false` вместо `undefined`

**Solution:**
1. Добавить optional chaining (`?.`) во всех местах
2. Использовать nullish coalescing (`??`) для fallback значений

---

## 🔧 Быстрый фикс (Copy-Paste Ready)

### 1. Исправить `services/posts/normalizer.ts`

**Найти (строка 135):**
```typescript
isCreatorPost: rawPost.isCreatorPost || false
```

**Заменить на:**
```typescript
// [iscreatorpost_fix_2025_025] Безопасное чтение без принудительного false
isCreatorPost: rawPost.isCreatorPost ?? undefined
```

---

### 2. Исправить `components/posts/core/PostContent/index.tsx`

**Найти (строка 107):**
```typescript
const shouldHideContent = post.access.isCreatorPost ? false : (
  post.access.shouldHideContent || 
  (post.access.isLocked && !post.access.isPurchased && !post.access.isSubscribed)
)
```

**Заменить на:**
```typescript
// [iscreatorpost_fix_2025_025] Безопасное чтение с optional chaining
const isCreatorPost = post.access?.isCreatorPost ?? false
const shouldHideContent = isCreatorPost ? false : (
  post.access.shouldHideContent || 
  (post.access.isLocked && !post.access.isPurchased && !post.access.isSubscribed)
)
```

**Найти (строка 112):**
```typescript
const isLocked = post.access.isCreatorPost ? false : (
  needsPayment(post) || needsSubscription(post) || needsTierUpgrade(post)
)
```

**Заменить на:**
```typescript
// [iscreatorpost_fix_2025_025] Используем уже вычисленный isCreatorPost
const isLocked = isCreatorPost ? false : (
  needsPayment(post) || needsSubscription(post) || needsTierUpgrade(post)
)
```

---

### 3. Проверка всех использований

**Команда для поиска:**
```bash
grep -rn "\.isCreatorPost" --include="*.tsx" --include="*.ts" | grep -v "?."
```

**Заменить паттерн:**
```typescript
// Было:
post.access.isCreatorPost

// Стало:
post.access?.isCreatorPost ?? false
```

---

## ✅ Validation

```bash
# TypeScript check
npx tsc --noEmit

# Build
npm run build

# Test
npm run dev
# Проверить, что ошибка больше не возникает
```

---

## 📊 Affected Files

- ✅ `services/posts/normalizer.ts` (1 изменение)
- ✅ `components/posts/core/PostContent/index.tsx` (2 изменения)
- ⚠️ Потенциально другие компоненты (требуется проверка)

---

## 🎉 Expected Result

После применения фикса:
- ✅ Ошибка `TypeError: Cannot read properties of undefined` исчезнет
- ✅ Приложение будет корректно обрабатывать посты без `isCreatorPost`
- ✅ Backward compatibility сохранится

---

**Время:** 15 минут  
**Риск:** 🟢 Низкий  
**Готов к применению:** ✅


