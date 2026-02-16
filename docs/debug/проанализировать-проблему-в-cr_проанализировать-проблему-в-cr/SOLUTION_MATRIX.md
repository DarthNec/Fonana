# 🎯 SOLUTION MATRIX: CreatePostModal Price Input Fix

**M7 Session ID:** `task_проанализировать-проблему-в-cr_8987`  
**Дата:** 29 января 2026

---

## 📊 AI Decision Making Protocol

**По протоколу из `.cursorrules`:**

### 1. **Правильное > Быстрое**
- Все варианты < 30 минут
- Выбираем **ПРАВИЛЬНОЕ** решение

### 2. **Root Cause > Symptom**
- ❌ **Symptom:** "01" shows instead of "1"
- ✅ **Root Cause:** `type="number"` + Number state = Browser formatting conflict

### 3. **Use Available Data**
- ✅ `MessagesPageClient` уже использует String-based approach
- ✅ Industry standard: `type="text"` + validation
- ✅ Используем proven pattern!

### 4. **ALWAYS Matrix**
✅ Solution matrix создана ниже

### 5. **Check Red Flags**
- ✅ Pattern available (MessagesPageClient) → следуем
- ✅ Industry standard → применяем
- ✅ No duplication

---

## 🏆 SOLUTION MATRIX

| Критерий | Вес | Вариант 1: String State + Text Input | Вариант 2: Controlled Number Input | Вариант 3: Uncontrolled Input |
|----------|-----|---------------------------------------|-----------------------------------|-------------------------------|
| **Architecture** | 30% | ⭐⭐⭐⭐⭐ (30/30) | ⭐⭐⭐☆☆ (18/30) | ⭐⭐☆☆☆ (12/30) |
| **Security** | 25% | ⭐⭐⭐⭐⭐ (25/25) | ⭐⭐⭐⭐⭐ (25/25) | ⭐⭐⭐☆☆ (15/25) |
| **UX** | 15% | ⭐⭐⭐⭐⭐ (15/15) | ⭐⭐☆☆☆ (6/15) | ⭐⭐⭐☆☆ (9/15) |
| **Risk** | 15% | ⭐⭐⭐⭐⭐ (15/15) | ⭐⭐⭐☆☆ (9/15) | ⭐⭐☆☆☆ (6/15) |
| **Maintainability** | 15% | ⭐⭐⭐⭐⭐ (15/15) | ⭐⭐⭐☆☆ (9/15) | ⭐⭐☆☆☆ (6/15) |
| **TOTAL SCORE** | | **100/100** 🏆 | **67/100** | **48/100** |

---

## 📋 Детальная оценка

### Вариант 1: String State + Text Input (RECOMMENDED) 🏆

```typescript
// State
const [priceInput, setPriceInput] = useState('0')

// Input
<input
  type="text"
  inputMode="decimal"
  value={priceInput}
  onChange={(e) => {
    const value = e.target.value
    // Allow only numbers and one decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setPriceInput(value)
    }
  }}
  onBlur={() => {
    // Convert to number and format
    const numValue = parseFloat(priceInput) || 0
    setPriceInput(numValue.toFixed(2))
    setFormData(prev => ({ ...prev, price: numValue }))
  }}
/>
```

#### Architecture (30/30) - ⭐⭐⭐⭐⭐
- ✅ **Industry standard** (OpenSea, Uniswap, Coinbase)
- ✅ **Already used in project** (`MessagesPageClient`)
- ✅ Full control over input behavior
- ✅ Clean separation: String for display, Number for logic
- ✅ No browser formatting conflicts

#### Security (25/25) - ⭐⭐⭐⭐⭐
- ✅ Regex validation (`/^\d*\.?\d*$/`)
- ✅ Prevents injection attacks
- ✅ Only allows valid numeric input
- ✅ Server-side validation still needed (как всегда)

#### UX (15/15) - ⭐⭐⭐⭐⭐
- ✅ **Natural typing:** "1" shows as "1" (не "01")
- ✅ **Decimals work:** "0." → "0.1" → "0.15"
- ✅ **Shorthand OK:** ".5" allowed during typing
- ✅ **Mobile friendly:** `inputMode="decimal"` → numeric keyboard
- ✅ **Auto-format on blur:** "5" → "5.00"

#### Risk (15/15) - ⭐⭐⭐⭐⭐
- ✅ **Proven pattern** (MessagesPageClient уже использует)
- ✅ **Industry standard** (billions of transactions)
- ✅ **Simple implementation** (~20 lines)
- ✅ **Easy to test**

#### Maintainability (15/15) - ⭐⭐⭐⭐⭐
- ✅ Clear, readable code
- ✅ Well-documented pattern
- ✅ Easy to extend (add formatting, validation)
- ✅ Matches MessagesPageClient (consistency)

**TOTAL:** 100/100 🏆

---

### Вариант 2: Controlled Number Input (Current, but smarter)

```typescript
// State
const [price, setPrice] = useState(0)

// Input
<input
  type="number"
  value={price === 0 ? '' : price}
  onChange={(e) => {
    const val = e.target.value
    if (val === '' || val === undefined) {
      setPrice(0)
    } else {
      const parsed = parseFloat(val)
      if (!isNaN(parsed)) {
        setPrice(parsed)
      }
    }
  }}
/>
```

#### Architecture (18/30) - ⭐⭐⭐☆☆
- ⚠️ Fighting against browser behavior
- ⚠️ Not industry standard
- ✅ Simple in concept
- ❌ Edge cases complex

#### Security (25/25) - ⭐⭐⭐⭐⭐
- ✅ Type coercion safe
- ✅ Native browser validation

#### UX (6/15) - ⭐⭐☆☆☆
- ❌ **Still has issues:** "0." → "0" (dot lost)
- ❌ **Can't type ".5"** (leading dot)
- ⚠️ Spinner arrows (good or bad?)
- ✅ Mobile numeric keyboard

#### Risk (9/15) - ⭐⭐⭐☆☆
- ⚠️ **Complex edge cases**
- ⚠️ Browser inconsistencies
- ⚠️ May still have "01" issue in some browsers

#### Maintainability (9/15) - ⭐⭐⭐☆☆
- ⚠️ Edge cases hard to handle
- ⚠️ Browser-specific bugs possible

**TOTAL:** 67/100

**Why not recommended:**
- Doesn't fully solve "0." problem
- Edge cases remain
- Not industry standard

---

### Вариант 3: Uncontrolled Input

```typescript
// Ref
const priceInputRef = useRef<HTMLInputElement>(null)

// Input
<input
  ref={priceInputRef}
  type="number"
  defaultValue={formData.price}
/>

// On submit
const price = parseFloat(priceInputRef.current?.value || '0')
```

#### Architecture (12/30) - ⭐⭐☆☆☆
- ❌ **Anti-pattern in React**
- ❌ No real-time validation
- ❌ Hard to show USD equivalent live

#### Security (15/25) - ⭐⭐⭐☆☆
- ⚠️ Delayed validation
- ⚠️ User can submit invalid data before check

#### UX (9/15) - ⭐⭐⭐☆☆
- ⚠️ No real-time feedback
- ❌ Can't show USD equivalent during typing
- ❌ No immediate validation

#### Risk (6/15) - ⭐⭐☆☆☆
- ⚠️ Uncontrolled components harder to debug
- ⚠️ State sync issues possible

#### Maintainability (6/15) - ⭐⭐☆☆☆
- ❌ Hard to add features (real-time USD, validation)
- ❌ Not recommended by React

**TOTAL:** 48/100

**Why not recommended:**
- Anti-pattern
- Loses USD conversion feature
- Poor UX

---

## 🎯 RECOMMENDATION

**Выбираем:** ✅ **Вариант 1: String State + Text Input (100/100)**

### Почему?

1. **По протоколу:**
   - ✅ Root Cause решён (no browser formatting conflict)
   - ✅ Используем industry standard
   - ✅ Следуем паттерну проекта (MessagesPageClient)

2. **По метрикам:**
   - 🏆 Максимальный SCORE: 100/100
   - ⭐⭐⭐⭐⭐ во всех категориях
   - Лучший UX: natural typing, no "01" bug

3. **По опыту:**
   - ✅ Industry standard (OpenSea, Uniswap, Coinbase)
   - ✅ Already used in MessagesPageClient
   - ✅ Proven pattern (billions of transactions)

---

## 📋 Implementation Plan

### File: `components/CreatePostModal.tsx`

#### 1. Add State for String Input

**Location:** After existing state declarations (~line 50-100)

```typescript
// NEW: String state for price input (separate from formData.price)
const [priceInput, setPriceInput] = useState('0.00')
```

#### 2. Update Input JSX (Lines 1899-1909)

**FROM:**
```typescript
<input
  type="number"
  step="0.01"
  min="0.01"
  max="1000"
  value={formData.price}
  onChange={(e) => setFormData(prev => ({ 
    ...prev, 
    price: parseFloat(e.target.value) || 0 
  }))}
  placeholder="0.00"
  required
/>
```

**TO:**
```typescript
<input
  type="text"
  inputMode="decimal"
  value={priceInput}
  onChange={(e) => {
    const value = e.target.value
    // Allow only: digits, one decimal point, empty
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPriceInput(value)
      // Update formData with parsed number (for USD conversion)
      const numValue = parseFloat(value) || 0
      setFormData(prev => ({ ...prev, price: numValue }))
    }
  }}
  onBlur={() => {
    // Format on blur: "5" → "5.00", "0.1" → "0.10"
    const numValue = parseFloat(priceInput) || 0
    setPriceInput(numValue.toFixed(2))
    setFormData(prev => ({ ...prev, price: numValue }))
  }}
  placeholder="0.00"
  required
  className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
/>
```

#### 3. Initialize Price Input on Edit Mode

**Location:** In `useEffect` where post data is loaded (~line 200-300)

```typescript
useEffect(() => {
  // ... existing code ...
  if (post && mode === 'edit') {
    setFormData({
      // ... existing fields ...
      price: post.access?.price || 0
    })
    // NEW: Initialize price input string
    const price = post.access?.price || 0
    setPriceInput(price.toFixed(2))
  }
}, [postId, mode])
```

---

## 🧪 Test Scenarios

### Test 1: Typing "1"
```
Initial: priceInput = "0.00"
User selects all, types "1"
Expected: priceInput = "1"
Display: [1]
formData.price = 1
USD shows: "≈ $180.45" ✅
```

### Test 2: Typing "0.1"
```
Initial: priceInput = "0.00"
User selects all, types "0.1"
Expected: priceInput = "0.1"
Display: [0.1]
formData.price = 0.1
USD shows: "≈ $18.05" ✅
```

### Test 3: Typing ".5" (shorthand)
```
Initial: priceInput = "0.00"
User clears, types ".5"
Expected: priceInput = ".5"
Display: [.5]
formData.price = 0.5
On blur: priceInput = "0.50"
USD shows: "≈ $90.23" ✅
```

### Test 4: Decimal Point During Typing
```
User types: "0."
priceInput = "0."
Display: [0.]
formData.price = 0
USD shows: (hidden, price = 0)
User continues: "0.1"
priceInput = "0.1"
formData.price = 0.1
USD shows: "≈ $18.05" ✅
```

### Test 5: Invalid Characters Blocked
```
User tries to type: "1a2"
Regex /^\d*\.?\d*$/ fails
setPriceInput NOT called
Input stays at previous value ✅
```

### Test 6: Multiple Decimal Points Blocked
```
User types: "1.2.3"
After "1.2": OK
Try to type ".": Regex fails (already has one dot)
Input stays "1.2" ✅
```

### Test 7: Blur Formatting
```
User types "5", then blurs
priceInput = "5" → "5.00"
Display: [5.00]
formData.price = 5 ✅
```

---

## 📊 Comparison: Before vs After

### BEFORE (Current):

| User Action | Input Shows | State | Issue |
|-------------|-------------|-------|-------|
| Type "1" | "01" | price = 1 | ❌ Visual bug |
| Type "0." | "0" | price = 0 | ❌ Dot lost |
| Type ".5" | "0" | price = 0 | ❌ Can't type |

### AFTER (Proposed):

| User Action | Input Shows | State | Result |
|-------------|-------------|-------|--------|
| Type "1" | "1" | priceInput = "1", price = 1 | ✅ Natural |
| Type "0." | "0." | priceInput = "0.", price = 0 | ✅ Decimals OK |
| Type ".5" | ".5" | priceInput = ".5", price = 0.5 | ✅ Shorthand OK |
| Blur on "5" | "5.00" | priceInput = "5.00", price = 5 | ✅ Formatted |

---

## 🎨 Code Changes Summary

**Changes:**
1. ✅ Add new state: `priceInput` (String)
2. ✅ Change input `type="number"` → `type="text"`
3. ✅ Add `inputMode="decimal"` (mobile keyboard)
4. ✅ Add regex validation in onChange
5. ✅ Add onBlur formatting
6. ✅ Initialize priceInput in edit mode
7. ✅ Remove `step`, `min`, `max` attributes (manual validation)

**Lines changed:** ~30 lines

**Files:** 1 (`CreatePostModal.tsx`)

**Risk:** 🟢 Low (proven pattern, already in MessagesPageClient)

---

## ⚠️ Edge Cases Handled

### 1. Empty Input
```typescript
if (value === '') {
  setPriceInput('')
  setFormData(prev => ({ ...prev, price: 0 }))
}
```

### 2. Leading Zeros
```
User types "007"
priceInput = "007" (allowed during typing)
On blur: "007" → parseFloat → 7 → "7.00"
```

### 3. Trailing Decimal Point
```
User types "5."
priceInput = "5." (allowed during typing)
On blur: "5." → parseFloat → 5 → "5.00"
```

### 4. Very Large Numbers
```
User types "999999"
priceInput = "999999"
On submit: Validate ≤ 1000 (existing validation)
Show error if > 1000
```

---

## ✅ Benefits

### User Experience:
- ✅ **Natural typing** (no "01" bug)
- ✅ **Decimals work perfectly** ("0.", ".5")
- ✅ **Mobile-friendly** (numeric keyboard via `inputMode`)
- ✅ **Auto-formatting** (on blur)
- ✅ **Real-time USD conversion** (preserved!)

### Developer Experience:
- ✅ **Proven pattern** (MessagesPageClient)
- ✅ **Industry standard** (OpenSea, Uniswap, etc)
- ✅ **Easy to test**
- ✅ **Easy to extend** (add more validation, formatting)

### Technical:
- ✅ **No browser conflicts**
- ✅ **Full control**
- ✅ **Clean code**
- ✅ **Maintainable**

---

## 📊 Final Recommendation

**✅ PROCEED with Variant 1: String State + Text Input**

**Score:** 100/100 🏆  
**Risk:** 🟢 Low  
**Time:** ~30 минут  
**Impact:** 🎯 High (fixes major UX issue)

---

**Status:** ✅ SOLUTION MATRIX COMPLETE  
**Next:** Implementation (awaiting user approval)
