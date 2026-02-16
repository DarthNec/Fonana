# 🔍 DISCOVERY REPORT: CreatePostModal Price Input "0" Problem

**M7 Session ID:** `task_проанализировать-проблему-в-cr_8987`  
**Дата:** 29 января 2026  
**Статус:** ✅ ANALYSIS IN PROGRESS

---

## 📋 Проблема (от пользователя)

### Симптомы:

**В `CreatePostModal`** поле ввода цены (`Price input`):
- При попытке ввести "1" получается **"01"**
- При попытке ввести "2" получается **"02"**
- **Первый 0 не стирается!**
- При этом нужна возможность вводить дробные числа: **0.1, 0.5** и т.д.

**User experience:**
```
User видит поле: [0]
User печатает: "1"
Ожидает: [1]
Получает: [01] ❌

User печатает: "5"
Ожидает: [5]
Получает: [05] ❌

User хочет: [0.1]
Но боится стереть 0!
```

---

## 🔍 Root Cause Analysis

### Current Implementation

**Location:** `components/CreatePostModal.tsx` (lines 1899-1909)

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

---

### 🎯 Root Cause Found!

**Problem:** `parseFloat(e.target.value) || 0`

**Analysis:**

#### Case 1: User starts typing "1"
```javascript
// Initial state:
formData.price = 0                    // Number: 0

// User types "1" in empty field
e.target.value = "1"                  // String: "1"
parseFloat("1") = 1                   // Number: 1
formData.price = 1                    // ✅ OK

// BUT! Field already shows "0"
// User types "1" → input becomes "01"
e.target.value = "01"                 // String: "01"
parseFloat("01") = 1                  // Number: 1
formData.price = 1                    // Number is correct
// BUT input shows "01" ❌
```

#### Case 2: User wants "0.1"
```javascript
// Initial state:
formData.price = 0                    // Number: 0

// User types "." (decimal point)
e.target.value = "0."                 // String: "0."
parseFloat("0.") = 0                  // Number: 0
formData.price = 0                    // Number: 0
// Field shows "0" (dot lost!) ❌

// Or if dot survives:
e.target.value = "0.1"                // String: "0.1"
parseFloat("0.1") = 0.1               // Number: 0.1
formData.price = 0.1                  // ✅ OK
```

**THE PROBLEM:**

1. ✅ **Number value is correct** (`formData.price = 1`)
2. ❌ **Input display is wrong** (shows "01" instead of "1")

**Why?**

`type="number"` input + `value={formData.price}` creates a **two-way binding issue**:
- State: `formData.price = 1` (Number)
- Input shows: value from typing ("01")
- React tries to sync: `1` (state) vs "01" (input value)
- Browser native `type="number"` formatting fights with React controlled input

---

## 🎨 Visualization of Problem

### Current Flow:

```
Initial:
  State: price = 0
  Input shows: [0]

User types "1":
  Input raw value: "01" (appended to "0")
  parseFloat("01") = 1
  State updates: price = 1
  React re-renders with value={1}
  BUT browser already has "01" in input
  → Conflict! Shows "01" ❌
```

### Expected Flow:

```
Initial:
  State: price = 0
  Input shows: [0.00] or empty

User types "1":
  Input clears and shows: [1]
  State updates: price = 1
  Input shows: [1] ✅

User types ".5":
  Input shows: [1.5]
  State: price = 1.5 ✅

User types "0.1":
  Input shows: [0.1]
  State: price = 0.1 ✅
```

---

## 🔍 Comparison with Other Components

### 1. `SubscriptionTiersSettings.tsx` (Line 434-441)

```typescript
<input
  type="number"
  value={tier.price}
  onChange={(e) => updateTierPrice(tier.id, parseFloat(e.target.value) || 0)}
  step="0.01"
  min="0"
  className="..."
/>
```

**Same pattern! Same issue!** ❌

---

### 2. `SearchBar.tsx` (Lines 370-378)

```typescript
<input
  type="number"
  value={filters.minPrice || ''}
  onChange={(e) => setFilters({ 
    ...filters, 
    minPrice: e.target.value ? parseFloat(e.target.value) : undefined 
  })}
  placeholder="От"
  step="0.01"
  min="0"
  className="..."
/>
```

**Different approach:**
- `value={filters.minPrice || ''}` - Shows empty string if no value
- `e.target.value ? parseFloat(...) : undefined` - Allows empty state

**Better, but still has issues with "0."** ⚠️

---

### 3. `MessagesPageClient.tsx` (Lines 1312-1320)

```typescript
<input
  type="number"
  step="0.01"
  min="0.01"
  value={messagePrice}
  onChange={(e) => setMessagePrice(e.target.value)}
  placeholder="0.00"
  className="..."
/>
```

**Different approach:**
- ✅ `value={messagePrice}` - String state!
- ✅ `onChange={(e) => setMessagePrice(e.target.value)}` - Stores as string!
- ✅ Converts to number only when needed: `parseFloat(messagePrice)`

**This works better!** ✅

---

## 📊 Pattern Comparison

| Component | State Type | onChange Logic | Has Issue? |
|-----------|------------|----------------|------------|
| **CreatePostModal** | Number | `parseFloat() \|\| 0` | ❌ YES |
| SubscriptionTiersSettings | Number | `parseFloat() \|\| 0` | ❌ YES |
| SearchBar | Number/undefined | `parseFloat() or undefined` | ⚠️ PARTIAL |
| **MessagesPageClient** | **String** | **Store raw string** | ✅ NO |

**Conclusion:** Storing as **String** and converting to Number only when needed is the **best approach!**

---

## 🎯 Problem Categories

### Issue 1: Leading Zero Persistence
**Symptom:** Typing "1" results in "01"

**Root Cause:**
```javascript
// State is Number: 0
value={formData.price}  // React sets value="0"
// User types "1"
// Input tries to show "01" (append)
// parseFloat("01") = 1
// React updates value to 1
// But browser already painted "01"
// → Visual glitch
```

**Solution:** Store as String, not Number

---

### Issue 2: Decimal Point Lost
**Symptom:** Typing "0." immediately becomes "0"

**Root Cause:**
```javascript
e.target.value = "0."   // Valid input during typing
parseFloat("0.") = 0    // parseFloat removes trailing dot
formData.price = 0      // State updates to 0
value={0}               // React re-renders with 0
// Dot is lost! ❌
```

**Solution:** Store raw string value, parse only when submitting

---

### Issue 3: Cannot Start with "."
**Symptom:** User wants to type ".5" (shorthand for "0.5") but can't

**Root Cause:**
```javascript
e.target.value = "."    // User types just dot
parseFloat(".") = NaN   // parseFloat fails
parseFloat(".") || 0 = 0  // Falls back to 0
formData.price = 0      // Dot lost
```

**Solution:** Allow intermediate invalid states during typing

---

## 🌐 Industry Standards

### How other platforms handle this:

#### 1. **OpenSea (NFT Marketplace)**
```html
<input type="text" pattern="[0-9]*[.]?[0-9]*" />
```
- Uses `type="text"` with pattern
- Validates on blur/submit
- Allows "0.", ".5", "0.01" during typing

#### 2. **Uniswap (DeFi)**
```javascript
value={inputValue}  // String
onChange={(e) => {
  const val = e.target.value
  if (/^\d*\.?\d*$/.test(val)) {  // Allow only valid number format
    setInputValue(val)
  }
}}
```
- String state
- Regex validation during typing
- Converts to Number only for calculations

#### 3. **Coinbase (Exchange)**
```javascript
<input 
  type="text" 
  inputMode="decimal"  // Mobile numeric keyboard
  pattern="[0-9]*\.?[0-9]*"
/>
```
- `type="text"` for full control
- `inputMode="decimal"` for mobile UX
- Pattern for validation

**Industry consensus: Use `type="text"` with validation, NOT `type="number"`!**

---

## 📊 HTML Input Type Analysis

### `type="number"` - Pros & Cons

**Pros:**
- ✅ Native browser validation (min, max, step)
- ✅ Up/down arrows (spinner)
- ✅ Mobile numeric keyboard (on some browsers)

**Cons:**
- ❌ **Poor UX for decimals** (our issue!)
- ❌ **Inconsistent behavior across browsers**
- ❌ Can't control intermediate states ("0.", ".5")
- ❌ Scientific notation ("1e10") allowed
- ❌ Leading zeros behavior inconsistent

### `type="text"` with validation - Pros & Cons

**Pros:**
- ✅ **Full control over input value**
- ✅ **No formatting fights with browser**
- ✅ Can allow intermediate states ("0.", ".5")
- ✅ Consistent behavior across browsers
- ✅ Can use `inputMode="decimal"` for mobile keyboard

**Cons:**
- ⚠️ No native up/down arrows (can add custom)
- ⚠️ Need manual validation
- ⚠️ Need to prevent invalid characters

**Verdict:** For money/price inputs, **`type="text"` is industry standard!**

---

## 🎯 Solution Requirements

**Must have:**
1. ✅ Allow typing "1" without getting "01"
2. ✅ Allow typing "0.1", "0.5" etc (decimals starting with 0)
3. ✅ Allow typing ".5" (shorthand for "0.5")
4. ✅ Allow intermediate states during typing ("0.", ".")
5. ✅ Prevent non-numeric characters (except ".")
6. ✅ Only ONE decimal point allowed
7. ✅ Validate final value (min: 0.01, max: 1000)

**Nice to have:**
- ✅ Mobile numeric keyboard
- ✅ Clear visual feedback
- ✅ USD equivalent shown (already implemented!)

---

## 📋 Current vs Desired Behavior

### Current (BAD):

| User Action | Input Shows | State Value | Result |
|-------------|-------------|-------------|--------|
| Initial | "0" | 0 | OK |
| Type "1" | "01" | 1 | ❌ Visual bug |
| Type "0." | "0" | 0 | ❌ Dot lost |
| Type ".5" | "0" | 0 | ❌ Can't type |

### Desired (GOOD):

| User Action | Input Shows | State Value | Result |
|-------------|-------------|-------------|--------|
| Initial | "" or "0.00" | 0 | ✅ Clear |
| Type "1" | "1" | "1" (string) | ✅ Natural |
| Type "0." | "0." | "0." (string) | ✅ Allows decimals |
| Type ".5" | ".5" | ".5" (string) | ✅ Shorthand OK |
| Blur/Submit | "0.50" | 0.5 (number) | ✅ Formatted |

---

## 🔍 Edge Cases to Consider

### 1. Empty Input
```
User clears field
Input: ""
State: "" (string)
On submit: Convert to 0 or show error? → Show error (required field)
```

### 2. Multiple Decimal Points
```
User types: "1.2.3"
Validation: BLOCK (only one decimal point allowed)
```

### 3. Leading Zeros
```
User types: "007"
Input shows: "007" during typing ✅
On blur: Format to "7" or keep? → Keep for now, validate on submit
```

### 4. Very Large Numbers
```
User types: "999999"
Max is 1000
Validation: Show error on blur or submit
```

### 5. Very Small Numbers
```
User types: "0.001"
Min is 0.01
Validation: Show error "Minimum price: 0.01 SOL"
```

### 6. Scientific Notation
```
User somehow enters: "1e10"
Block: Yes (only allow digits and one decimal point)
```

---

## ✅ Conclusion

### Root Cause Summary:

**The problem is NOT a bug, it's a fundamental conflict:**
- ❌ `type="number"` + Number state = Browser formatting conflicts
- ❌ `parseFloat(e.target.value) || 0` = Loses intermediate states ("0.", ".")
- ❌ React controlled input + browser native number input = Fight for control

### Solution Direction:

**Switch to String-based approach:**
1. ✅ Change `type="number"` → `type="text"` (with `inputMode="decimal"`)
2. ✅ Store value as String during typing
3. ✅ Add regex validation to allow only valid numeric input
4. ✅ Convert to Number only on blur/submit
5. ✅ Format nicely after conversion

**This matches:**
- ✅ Industry standards (OpenSea, Uniswap, Coinbase)
- ✅ MessagesPageClient pattern (already in project!)
- ✅ Better UX (no fighting with input)

---

**Status:** ✅ ROOT CAUSE IDENTIFIED  
**Next:** Solution Matrix with implementation options
