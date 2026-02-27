# 🎯 QUICK REFERENCE: Slider Progress Bar Overlay Fix

**Problem:** Розовая линия прогресса перекрывает ползунок слайдера  
**Root Cause:** Progress bar рисуется ПОСЛЕ input в DOM → визуально ПОВЕРХ  
**Solution:** Добавить z-index для явного control stacking order  
**Time:** 2 minutes  
**Risk:** LOW

---

## 📋 PROBLEM

```
Slider Track (серый)
   ↓
Progress Bar (розовый) ← НАД ползунком! ❌
   ↓
Thumb (ползунок) ← Визуально "проваливается" под bar
```

---

## 🚨 ROOT CAUSE

**DOM Order:**
```html
<div class="relative">
  <input type="range" />       <!-- Layer 1 -->
  <div class="progress-bar" /> <!-- Layer 2 → ПОВЕРХ input! -->
</div>
```

**Browser Default:** Элементы без z-index рисуются в порядке DOM.

---

## ✅ SOLUTION

**Add z-index classes:**

```typescript
<div className="flex-1 relative">
  <input
    type="range"
    className="... relative z-10"
    // ↑ Added: relative z-10 (input поверх)
  />
  <div 
    className="... z-0"
    // ↑ Added: z-0 (progress bar под input)
    style={{ width: `${((zoom - 1) / 2) * 100}%` }}
  />
</div>
```

---

## 🎯 WHY IT WORKS

**After Fix:**
```
Layer 10: Input + Thumb ← НА ВЕРХУ ✅
   ↓
Layer 0: Progress Bar ← ПОД input
```

**Thumb** автоматически наследует z-index от input → всегда видим!

---

## 🧪 TESTING

1. Zoom slider → 50%
2. **Check:** Thumb визуально НАД розовой линией ✅
3. Drag thumb → thumb всегда видим

---

## 📊 COMPARISON

| State | Before | After |
|-------|--------|-------|
| **Visual** | Bar over thumb ❌ | Thumb over bar ✅ |
| **Z-Index** | Auto (DOM order) | Explicit (z-10 vs z-0) |

---

## 🚀 IMPLEMENTATION

**File:** `components/ImageCropModal.tsx`  
**Line 280:** Add `relative z-10` to input  
**Line 289:** Add `z-0` to progress bar div  
**Time:** 2 minutes  
**Risk:** LOW

---

**Full Analysis:** [DISCOVERY_REPORT.md](./DISCOVERY_REPORT.md)
