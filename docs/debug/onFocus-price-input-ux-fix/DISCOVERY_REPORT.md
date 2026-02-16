# 🔍 M7 DISCOVERY REPORT: onFocus Price Input UX Fix

**Задача:** Проанализировать проблему с полем ввода цены (priceInput)  
**Дата:** 2026-01-29  
**Сессия M7:** task_проанализировать-и-предложить_3931  

---

## 🎯 Описание проблемы (User Report)

### Текущее поведение:
1. Пользователь кликает на поле цены
2. В поле отображается "0.00" (дефолтное значение)
3. Курсор устанавливается **в конец** строки после "0.00"
4. Пользователь начинает печатать цифру (например, "1")
5. **Результат:** `"0.001"` ❌ вместо ожидаемого `"1"` ✅

### Ожидаемое поведение:
- При фокусе на поле с дефолтным "0.00" → **очистить поле**
- При фокусе на поле с реальным значением (например, "5.50") → **НЕ очищать**

---

## 🔬 ROOT CAUSE ANALYSIS

### Текущая реализация (CreatePostModal.tsx)

**Line 90:**
```typescript
const [priceInput, setPriceInput] = useState('0.00')
```

**Lines 1906-1925:**
```typescript
<input
  type="text"
  inputMode="decimal"
  value={priceInput}
  onChange={(e) => {
    const value = e.target.value
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPriceInput(value)
      const numValue = parseFloat(value) || 0
      setFormData(prev => ({ ...prev, price: numValue }))
    }
  }}
  onBlur={() => {
    const numValue = parseFloat(priceInput) || 0
    setPriceInput(numValue.toFixed(2))
    setFormData(prev => ({ ...prev, price: numValue }))
  }}
  ...
/>
```

### 🚨 ПРОБЛЕМА: Отсутствует `onFocus` handler

**Причина бага:**
1. При инициализации: `priceInput = "0.00"`
2. Пользователь кликает → фокус на input → курсор идёт в конец `"0.00|"`
3. Пользователь печатает "1" → `"0.001"` ❌

**Почему это происходит:**
- `onChange` срабатывает только при изменении значения
- При фокусе значение не меняется → `onChange` не срабатывает
- Курсор по умолчанию идёт в конец строки

---

## 💡 РЕШЕНИЕ: Добавить `onFocus` с умной логикой

### ✅ Решение 1: onFocus с проверкой "0.00" (RECOMMENDED)

**Логика:**
```typescript
onFocus={(e) => {
  // Если поле содержит дефолтное "0.00" → очистить
  if (priceInput === '0.00') {
    setPriceInput('')
    e.target.select() // Для дополнительной надёжности
  }
  // Если реальное значение (например, "5.50") → НЕ трогаем
}}
```

**Преимущества:**
- ✅ Решает проблему "0.001"
- ✅ Не мешает редактированию существующих значений
- ✅ Интуитивно понятно для пользователя
- ✅ Минимальное изменение кода (1 handler)

**Сценарии:**

| Сценарий | Текущее значение | onFocus | Результат |
|----------|------------------|---------|-----------|
| Новый пост | `"0.00"` | Очищает → `""` | Пользователь вводит "5" → `"5"` ✅ |
| Edit mode | `"5.50"` | НЕ очищает | Пользователь корректирует "5.50" → "6.00" ✅ |
| После onBlur | `"10.00"` | НЕ очищает | Пользователь редактирует "10.00" → "15.00" ✅ |

---

### ⚠️ Решение 2: onFocus с проверкой parseFloat === 0 (Альтернатива)

**Логика:**
```typescript
onFocus={(e) => {
  // Если поле содержит 0 (в любом формате) → очистить
  if (parseFloat(priceInput) === 0) {
    setPriceInput('')
    e.target.select()
  }
}}
```

**Проблема:**
- ❌ Если пользователь случайно ввёл "0.00", он не сможет отредактировать поле (оно будет очищаться)
- ❌ Менее интуитивно

**Вердикт:** НЕ рекомендуется ❌

---

### ⚠️ Решение 3: onFocus с e.target.select() (Слишком агрессивно)

**Логика:**
```typescript
onFocus={(e) => {
  e.target.select() // Выделяет весь текст
}}
```

**Проблема:**
- ❌ При редактировании "5.50" → весь текст выделяется → любой ввод стирает всё
- ❌ Пользователь хотел изменить "5.50" → "5.75", но всё стерлось

**Вердикт:** НЕ рекомендуется ❌

---

## 📊 SOLUTION MATRIX

| Критерий | Решение 1 (check "0.00") | Решение 2 (check === 0) | Решение 3 (select all) |
|----------|---------------------------|--------------------------|-------------------------|
| **Решает "0.001"** | ✅ | ✅ | ✅ |
| **Не мешает edit mode** | ✅ | ❌ | ❌ |
| **Интуитивный UX** | ✅ | ⚠️ | ❌ |
| **Простота кода** | ✅ | ✅ | ✅ |
| **Edge case safety** | ✅ | ❌ | ❌ |
| **SCORE** | **100/100** 🏆 | 70/100 | 60/100 |

---

## 🎯 РЕКОМЕНДУЕМОЕ РЕШЕНИЕ

### ✅ **Решение 1: onFocus с проверкой "0.00"**

**Реализация:**
```typescript
<input
  type="text"
  inputMode="decimal"
  value={priceInput}
  onFocus={(e) => {
    // 🎯 M7 FIX: Clear default "0.00" on focus
    if (priceInput === '0.00') {
      setPriceInput('')
      e.target.select() // Extra safety
    }
  }}
  onChange={(e) => {
    const value = e.target.value
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPriceInput(value)
      const numValue = parseFloat(value) || 0
      setFormData(prev => ({ ...prev, price: numValue }))
    }
  }}
  onBlur={() => {
    const numValue = parseFloat(priceInput) || 0
    setPriceInput(numValue.toFixed(2))
    setFormData(prev => ({ ...prev, price: numValue }))
  }}
  ...
/>
```

**Файл:** `components/CreatePostModal.tsx`  
**Line:** ~1906 (после `value={priceInput}`)

---

## 🧪 TEST SCENARIOS

### ✅ Сценарий 1: Новый пост
1. Открыть Create Post Modal
2. Выбрать "Paid"
3. Кликнуть на поле цены (дефолт: "0.00")
4. **Ожидание:** Поле очищается → `""`
5. Ввести "5" → результат: `"5.00"` (после onBlur) ✅

### ✅ Сценарий 2: Edit mode
1. Открыть пост на редактирование (price = 5.5)
2. Поле показывает "5.50"
3. Кликнуть на поле
4. **Ожидание:** Поле НЕ очищается → курсор для редактирования ✅
5. Изменить на "6.00" ✅

### ✅ Сценарий 3: После onBlur
1. Создать пост, ввести "10" → onBlur → "10.00"
2. Кликнуть снова на поле
3. **Ожидание:** Поле НЕ очищается (не "0.00") ✅
4. Редактировать значение ✅

### ✅ Сценарий 4: Empty input
1. Пользователь очистил поле → `""`
2. onBlur → `"0.00"`
3. Кликнуть снова → поле очищается ✅
4. Ввести новое значение ✅

---

## 📋 IMPLEMENTATION CHECKLIST

- [ ] Добавить `onFocus` handler в input (line ~1906)
- [ ] Добавить проверку `if (priceInput === '0.00')`
- [ ] Добавить `setPriceInput('')`
- [ ] Добавить `e.target.select()` для extra safety
- [ ] Протестировать все 4 сценария
- [ ] Проверить TypeScript/linter

---

## 🛡️ RISK ASSESSMENT

| Риск | Вероятность | Impact | Митигация |
|------|-------------|--------|-----------|
| Баг в edit mode | LOW | MEDIUM | Проверка `=== "0.00"` (не `=== 0`) |
| onFocus не срабатывает | VERY LOW | LOW | React synthetic events надёжны |
| Cursor jumps | VERY LOW | LOW | `e.target.select()` решает |

**Overall Risk:** 🟢 **LOW** (безопасное изменение)

---

## 🎯 NEXT STEPS

1. ✅ Discovery Report создан
2. ⏳ User Validation (дождаться подтверждения пользователя)
3. ⏳ Implementation (добавить onFocus handler)
4. ⏳ Testing (4 test scenarios)
5. ⏳ Documentation (update implementation report)

---

**M7 Session:** task_проанализировать-и-предложить_3931  
**Phase:** DISCOVERY → PLANNING  
**Status:** ✅ Готово к реализации (после user approval)
