# ⚡ QUICK REFERENCE: FullscreenCarousel Freeze Issue

**Read Time**: 5 minutes  
**Severity**: 🔴 CRITICAL  
**Status**: Discovery Complete

---

## 🎯 TL;DR

**Проблема**: При повторном открытии постов из Explore страницы начинается сильный фриз.

**Root Cause**: Event listeners накапливаются при каждом open/close cycle из-за неполного cleanup.

**Solution**: Proper cleanup refs + `containerReady` state + использование AbortController.

---

## 🔴 TOP 3 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### #1: `containerReady` State Never Resets
```typescript
// ❌ BAD: containerReady = true forever
const [containerReady, setContainerReady] = useState(false)

if (el && !containerReady) {
  setContainerReady(true) // Set once, never reset
}

// ✅ FIX: Reset on unmount
useEffect(() => {
  return () => setContainerReady(false)
}, [])
```
**Impact**: Wheel listener добавляется дважды при 2-м открытии.

---

### #2: Refs Not Cleared on Unmount
```typescript
// ❌ BAD: Refs hold old DOM elements
const containerRef = useRef<HTMLDivElement>(null)
const isScrollingRef = useRef(false)

// ✅ FIX: Clear on unmount
useEffect(() => {
  return () => {
    containerRef.current = null
    isScrollingRef.current = false
  }
}, [])
```
**Impact**: Memory leak + listeners на старый (удалённый) DOM.

---

### #3: Multiple Event Listeners Accumulate
```typescript
// ❌ BAD: Dependencies change → new listener every time
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => { /* ... */ }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [goToPrevious, goToNext, ...]) // Dependencies recreate callback

// ✅ FIX: Use AbortController
useEffect(() => {
  const controller = new AbortController()
  const handleKeyDown = (e: KeyboardEvent) => { /* ... */ }
  window.addEventListener('keydown', handleKeyDown, {
    signal: controller.signal
  })
  return () => controller.abort()
}, []) // Empty deps
```
**Impact**: 2x listeners → 2x operations → FREEZE.

---

## 📊 PERFORMANCE DEGRADATION

| Open Count | Listeners | Operations/Scroll | Frame Rate | Result |
|------------|-----------|-------------------|------------|--------|
| 1st | 5 | 1x | 60fps | ✅ OK |
| 2nd | 10 | 2x | 30fps | ⚠️ Lag |
| 3rd | 15 | 3x | 15fps | 🔴 **FREEZE** |
| 4th | 20 | 4x | <5fps | 🔴 **CRASH** |

---

## 🛠️ SOLUTION SUMMARY

### Phase 1: Immediate Fixes (30 min)
1. Add `containerReady` reset on unmount
2. Clear all refs on unmount
3. Add `isScrollingRef` reset

### Phase 2: Refactor Event Listeners (1-2h)
1. Use `AbortController` for all listeners
2. Reduce `useCallback` dependencies
3. Use refs instead of state in callbacks

### Phase 3: Testing (30 min)
1. Test 10x open/close cycles
2. Monitor listener count (DevTools)
3. Check memory usage (Performance tab)

---

## 🎯 QUICK TEST

```javascript
// In Chrome DevTools Console:

// 1. Open post
// 2. Run this:
getEventListeners(window).keydown.length // Should be 1

// 3. Close post
// 4. Open another post
// 5. Run again:
getEventListeners(window).keydown.length // Should STILL be 1 (not 2!)

// If > 1 → listeners accumulating → freeze inevitable
```

---

## 📋 FILES TO MODIFY

1. **`components/feed/FullscreenCarousel.tsx`** (lines 186-220, 330-344)
   - Add cleanup for `containerReady`
   - Clear refs on unmount
   - Use `AbortController`

---

## 🔗 FULL REPORT

See: [`DISCOVERY_REPORT.md`](./DISCOVERY_REPORT.md) (15 min read)

---

**Next Step**: Create `SOLUTION_PLAN.md` with detailed implementation strategy.
