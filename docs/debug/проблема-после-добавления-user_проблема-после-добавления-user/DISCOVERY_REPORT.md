# 🔍 DISCOVERY REPORT: Проблема разного размера карточек в Explore

**Дата:** 29 января 2026  
**M7 Session ID:** `task_проблема-после-добавления-user_7214`  
**Статус:** ✅ COMPLETED

---

## 📋 Описание проблемы

После добавления username блока под карточками постов на странице `/creators` (ExplorePageClient), карточки стали отображаться с **разной высотой**, нарушая uniform grid layout.

### 🎯 Ожидаемое поведение
- Все карточки должны быть одинакового размера (квадратные)
- Username блок НЕ должен влиять на размер карточки
- Grid должен быть равномерным как в TikTok

### ❌ Текущее поведение
- Карточки имеют разную высоту
- Username блоки добавляют переменную высоту
- Grid выглядит неравномерно

---

## 🔬 Анализ текущей структуры

### 📂 Файл: `components/posts/layouts/PostGallery.tsx`

#### Текущая структура (строки 89-103):

```typescript
<div className={cn('p-6', className)}>
  <div className={cn('grid gap-3', getGridClass())}>
    {mediaPosts.map((post, index) => (
      <MediaTile
        key={post.id}
        post={post}
        index={index}
        onClick={() => handleTileClick(index)}
        onAction={onAction}
        showUsername={showUsername}
      />
    ))}
  </div>
</div>
```

#### MediaTile wrapper (строки 182-367):

```typescript
<div className="flex flex-col gap-2">
  {/* Карточка поста */}
  <div className="relative aspect-square ...">
    {/* Media content */}
  </div>

  {/* Username блок (только для Explore) */}
  {showUsername && post.creator && (
    <div className="flex items-center gap-2 px-1">
      {/* Avatar + Username */}
    </div>
  )}
</div>
```

---

## 🐛 Root Cause Analysis

### Причина проблемы:

1. **CSS Grid Auto-Rows поведение:**
   - Grid использует `gap-3` и динамические колонки (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`)
   - НЕ указан `grid-auto-rows`, поэтому высота ячеек определяется контентом
   
2. **Flex Column с gap-2:**
   - Wrapper `<div className="flex flex-col gap-2">` позволяет контенту растягиваться
   - `aspect-square` применён к КАРТОЧКЕ, но не к wrapper
   
3. **Переменная высота username блока:**
   - Username блок имеет переменную высоту в зависимости от:
     - Длины username (может быть truncate, но занимает место)
     - Наличия avatar (6h + gap-2 = ~32px минимум)
   - Разные username → разная высота wrapper

4. **Grid row expansion:**
   - Когда в одной строке есть ячейка с высоким контентом
   - ВСЯ строка растягивается до максимальной высоты
   - Но другие ячейки в строке НЕ заполняют пространство равномерно
   - Их карточки остаются `aspect-square`, а wrapper растягивается

### Визуализация проблемы:

```
ТЕКУЩАЯ СТРУКТУРА:

Grid Row 1:
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Карточка    │  │   Карточка    │  │   Карточка    │
│  (square)     │  │  (square)     │  │  (square)     │
│               │  │               │  │               │
├───────────────┤  ├───────────────┤  ├───────────────┤
│ 😀 @short     │  │ 😀 @verylongus│  │ 😀 @mid       │
└───────────────┘  │    ername     │  └───────────────┘
    (height 1)     └───────────────┘      (height 1)
                      (height 2 !)
                      
→ Row height = max(1, 2, 1) = 2
→ Все ячейки растянуты до height 2
→ Но карточки остаются square, username блоки НЕ выровнены
```

---

## 🎨 Анализ TikTok подхода (со скриншота)

На скриншоте видно:

1. **Uniform Grid:**
   - Все карточки ОДИНАКОВОГО размера
   - Username блоки НЕ влияют на размер карточки
   
2. **Username блок:**
   - Расположен ВНИЗУ карточки
   - Фиксированная высота (~32-36px)
   - Avatar + truncated username на одной строке
   
3. **Grid Layout:**
   - Чёткий gap между карточками
   - Нет "прыжков" по высоте

---

## 💡 Возможные решения

### ✅ Решение 1: Fixed Height для Username блока (RECOMMENDED)

**Подход:** Ограничить высоту username блока фиксированным значением

**Плюсы:**
- ✅ Простая реализация
- ✅ Uniform grid
- ✅ Соответствует TikTok подходу
- ✅ Не ломает существующий функционал

**Минусы:**
- ⚠️ Нужно подобрать правильную высоту

**Изменения:**
```typescript
{showUsername && post.creator && (
  <div className="flex items-center gap-2 px-1 h-8"> {/* Fixed height */}
    {/* Avatar + Username */}
  </div>
)}
```

---

### ✅ Решение 2: Grid Auto-Rows с Minmax

**Подход:** Контролировать высоту ячеек через `grid-auto-rows`

**Плюсы:**
- ✅ Полный контроль над размером ячеек
- ✅ Uniform grid гарантирован

**Минусы:**
- ⚠️ Сложнее подобрать responsive значения
- ⚠️ Может требовать изменений в layout

**Изменения:**
```typescript
<div className={cn('grid gap-3 auto-rows-[1fr]', getGridClass())}>
  {/* ... */}
</div>
```

---

### ⚠️ Решение 3: Absolute Positioning

**Подход:** Поместить username блок поверх карточки

**Плюсы:**
- ✅ НЕ влияет на высоту wrapper
- ✅ Uniform grid

**Минусы:**
- ❌ Username блок перекрывает контент карточки
- ❌ Не соответствует TikTok UI
- ❌ Хуже UX

**НЕ рекомендуется**

---

## 🎯 Рекомендуемое решение

### **Решение 1: Fixed Height для Username блока**

**Scoring по AI Decision Making Protocol:**

| Критерий | Вес | Оценка | Score |
|----------|-----|--------|-------|
| Architecture | 30% | 9/10 | 27 |
| Security | 25% | 10/10 | 25 |
| Speed | 15% | 10/10 | 15 |
| Risk | 15% | 9/10 | 13.5 |
| Maintainability | 15% | 9/10 | 13.5 |
| **TOTAL** | **100%** | **9.4/10** | **94** |

**Почему это лучшее решение:**

1. **Root Cause > Symptom:** Решает именно проблему переменной высоты
2. **Minimal Changes:** Изменения только в username блоке
3. **TikTok Pattern:** Соответствует проверенному UI паттерну
4. **Backward Compatible:** Не ломает профили и другие страницы
5. **Fast Implementation:** ~5 минут

---

## 📊 Impact Analysis

### Затронутые файлы:
- ✅ `components/posts/layouts/PostGallery.tsx` (ТОЛЬКО username блок)

### Незатронутые компоненты:
- ✅ `CreatorPageClient.tsx` (showUsername=false по умолчанию)
- ✅ `FeedPageClient.tsx` (не использует PostGallery)
- ✅ `BookmarksPageClient.tsx` (showUsername=false)
- ✅ `PurchasesPageClient.tsx` (showUsername=false)

### Риски:
- 🟢 **LOW**: Изменения только в CSS, логика не меняется
- 🟢 **LOW**: Backward compatibility сохранена через default props

---

## 🚀 Implementation Plan

### Step 1: Фиксированная высота username блока

**Файл:** `components/posts/layouts/PostGallery.tsx`

**Изменить строку 344:**

```typescript
// ❌ BEFORE:
<div className="flex items-center gap-2 px-1">

// ✅ AFTER:
<div className="flex items-center gap-2 px-1 h-8">
```

### Step 2: Убрать gap-2 из wrapper

**Изменить строку 182:**

```typescript
// ❌ BEFORE:
<div className="flex flex-col gap-2">

// ✅ AFTER:
<div className="flex flex-col">
```

**Добавить mt-2 к username блоку:**

```typescript
// ✅ AFTER:
<div className="flex items-center gap-2 px-1 h-8 mt-2">
```

---

## ✅ Success Criteria

1. Все карточки в Explore имеют одинаковую высоту
2. Username блоки выровнены по горизонтали
3. Grid выглядит uniform как в TikTok
4. Профили пользователей остались без изменений
5. Blurred посты, видео, audio остались без изменений

---

## 🧪 Testing Plan

### Manual Testing:
1. Открыть `/creators`
2. Проверить что все карточки одинакового размера
3. Проверить разные username (короткие/длинные)
4. Проверить responsive (mobile, tablet, desktop)
5. Открыть профиль креатора → убедиться что username НЕ отображается

### Browser Testing:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (если доступен)

---

## 📝 Заметки

- TikTok использует именно fixed height подход
- Grid auto-rows - overkill для этой задачи
- Absolute positioning - плохой UX
- Fixed height - "золотая середина"

---

**Next Step:** Перейти к SOLUTION_PLAN.md
