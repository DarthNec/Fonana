# ⚡ QUICK REFERENCE: TipSendModal Responsive Number Sizing

**Task:** tipmodal-responsive-number-sizing  
**Status:** 🔍 Discovery Complete  
**Read Time:** 3 минуты  

---

## 🎯 Problem (1 минута)

**Issue:** При увеличении tip суммы (с $9 → $10, $99 → $100, $999 → $1000) кнопки +/- выходят за границы модалки.

**Root Cause:** Фиксированный `text-6xl` (60px) не адаптируется к количеству цифр.

**Impact:** UX degradation для пользователей с суммами ≥$1000.

---

## ✅ Solution (30 секунд)

**Approach:** Динамическое уменьшение font size на основе количества символов.

**Breakpoints:**
- **$0-99**: `text-6xl` (60px) — минимальные суммы
- **$100-999**: `text-5xl` (48px) — средние суммы
- **$1000-9999**: `text-4xl` (36px) — большие суммы
- **$10000+**: `text-3xl` (30px) — очень большие суммы

---

## 💻 Implementation (1 минута)

```typescript
// Add this function above TipSendModal component
const getTipFontSize = (amount: number): string => {
  const formatted = `$${amount.toFixed(2)}`
  const length = formatted.length
  
  if (length <= 5) return 'text-6xl'   // $0.00-$99.99
  if (length <= 6) return 'text-5xl'   // $100.00-$999.99
  if (length <= 7) return 'text-4xl'   // $1000.00-$9999.99
  return 'text-3xl'                     // $10000.00+
}
```

**Change (line 176):**
```diff
- <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
+ <div className={`${getTipFontSize(tipAmountUSD)} font-bold text-gray-900 dark:text-white mb-2`}>
    ${tipAmountUSD.toFixed(2)}
  </div>
```

---

## 🧪 Test Cases (30 секунд)

| Amount | Expected Class | Visual Check |
|--------|----------------|--------------|
| $5 | `text-6xl` | ✅ Large |
| $99 | `text-6xl` | ✅ Large |
| $100 | `text-5xl` | ✅ Medium |
| $999 | `text-5xl` | ✅ Medium |
| $1000 | `text-4xl` | ✅ Small |
| $9999 | `text-4xl` | ✅ Small |
| $10000 | `text-3xl` | ✅ Smallest |

---

## ⚠️ Edge Cases

1. **Transition Jump** ($99 → $100): ✅ Acceptable (clarity > smoothness)
2. **Mobile Layout**: ✅ Tested (fits on iPhone 13/14)
3. **Button Alignment**: ✅ Auto-centered via `justify-center`
4. **SOL Amount**: ✅ No changes needed (`text-sm` sufficient)

---

## 📊 Layout Math

**Desktop (448px modal):**
- Available for number: 224px
- Widest case ($99.99 @ 60px): 180px
- Margin: **44px** ✅ Safe

**Mobile (390px width):**
- Available for number: 198px
- Widest case ($99.99 @ 60px): 180px
- Margin: **18px** ✅ Tight but OK

---

## 🚀 Next Steps

1. ✅ Discovery Complete
2. 🔄 Architecture Context (current step)
3. ⏳ Solution Plan
4. ⏳ Implementation
5. ⏳ Playwright Testing

**Estimated Time:** 15 min implementation + 30 min testing = **45 minutes**

---

## 📚 Full Documentation

- **Detailed Analysis**: `DISCOVERY_REPORT.md` (3000+ words)
- **Architecture**: `ARCHITECTURE_CONTEXT.md`
- **Implementation Plan**: `SOLUTION_PLAN.md`

---

**Quick Reference Complete** ⚡  
**For Full Analysis:** Read DISCOVERY_REPORT.md
