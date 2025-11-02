# ⚡ QUICK REFERENCE: Remix Carousel Fix

**Для быстрого старта - всё в одном месте**

---

## 🎯 TL;DR

**Проблема:** Кнопки карусели ремиксов не видны  
**Причина:** `hasRemixes()` → всегда `false`, `UnifiedPost` без `remixId`  
**Решение:** 3 файла, 3 изменения, 15 минут  
**Риск:** 🟢 Низкий (backward compatible)

---

## 📝 Изменения (Copy-Paste Ready)

### 1️⃣ `types/posts/index.ts`

**Добавить в конец интерфейса `UnifiedPost`:**
```typescript
  // [remix_carousel_fix_2025_025] Добавлено для поддержки карусели ремиксов
  remixId?: string | null
  hasRemixesCount?: number
```

---

### 2️⃣ `components/posts/core/PostCard/index.tsx`

**Заменить функцию `hasRemixes()` (строка 327):**
```typescript
function hasRemixes(post: UnifiedPost): boolean {
  const isRemix = post.remixId != null && post.remixId !== ''
  const hasOwnRemixes = (post.hasRemixesCount ?? 0) > 0
  return isRemix || hasOwnRemixes
}
```

**Заменить вызов (строка 83):**
```typescript
const shouldShowRemixCarousel = hasRemixes(post) // было: hasRemixes(post.id)
```

**Заменить в конвертере (строка 346):**
```typescript
remixId: post.remixId ?? null, // было: remixId: null,
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
# Открыть http://localhost:3000/posts/[remix-post-id]
# Должны быть видны кнопки [<] и [>]
```

---

## 🚀 Deploy

```bash
git checkout -b fix/remix-carousel-display
# внести изменения
git add .
git commit -m "fix(remix-carousel): исправлено отображение кнопок"
git push origin fix/remix-carousel-display
# Create PR
```

---

## 🆘 Troubleshooting

| Проблема | Решение |
|----------|---------|
| TypeScript errors | `rm -rf .next && npm install` |
| Кнопки не видны | Проверить `post.remixId` в DevTools |
| Navigation не работает | Проверить Network tab → API calls |

---

## 📚 Full Docs

- [README.md](./README.md) - Обзор
- [DISCOVERY_REPORT.md](./DISCOVERY_REPORT.md) - Анализ
- [SOLUTION_PLAN.md](./SOLUTION_PLAN.md) - План
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Гайд

---

**⏱️ Время:** 15 минут  
**🎯 Успех:** 95%  
**⚠️ Риск:** Низкий


