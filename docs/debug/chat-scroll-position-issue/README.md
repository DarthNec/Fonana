# Chat Scroll Position Issue

**Issue ID:** `chat-scroll-position-2026-02-22`  
**Status:** 🔍 ANALYSIS COMPLETE → AWAITING APPROVAL  
**Date:** 2026-02-22

---

## 🎯 PROBLEM

Чат открывается сверху (старые сообщения), вместо низа (новые сообщения). Пользователю приходится вручную скроллить вниз.

---

## 📚 DOCUMENTATION

### 📄 Quick Reference
**File:** [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)  
**For:** Developers who need instant solution

### 📄 Full Discovery Report
**File:** [DISCOVERY_REPORT.md](./DISCOVERY_REPORT.md)  
**For:** Complete technical analysis, all approaches, edge cases

---

## ✅ RECOMMENDED SOLUTION

**Add useEffect to auto-scroll on first load:**

```typescript
useEffect(() => {
  if (messages.length > 0 && isFirstLoad && !isLoadingMessages) {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }, 100)
  }
}, [messages.length, isFirstLoad, isLoadingMessages])
```

**Location:** `components/MessagesPageClient.tsx`, after line 1107

---

## 📊 SOLUTION METRICS

- **Lines Added:** 7
- **Lines Modified:** 0
- **Files Changed:** 1
- **Risk:** LOW
- **Time:** 5 minutes
- **ROI:** 9.5/10

---

## 🧪 TESTING CHECKLIST

- [ ] Open conversation → scrolls to bottom
- [ ] Send message → still scrolls to bottom
- [ ] Empty conversation → no errors
- [ ] Switch conversations → each scrolls correctly
- [ ] Polling → no unexpected scroll
- [ ] Mobile → works same way
- [ ] Long conversation → performance OK

---

## 🚀 STATUS

**Analysis:** ✅ COMPLETE  
**Documentation:** ✅ COMPLETE  
**Code Implementation:** 🕐 AWAITING USER APPROVAL  
**Testing:** 🕐 PENDING  
**Deployment:** 🕐 PENDING

---

## 📝 NEXT STEPS

1. ✅ User review of analysis
2. 🕐 User approval to implement
3. 🕐 Code implementation
4. 🕐 Manual testing
5. 🕐 Deploy to production

---

**Prepared By:** M7 AI System  
**Analysis Time:** 20 minutes  
**Implementation Time:** 5 minutes (estimated)
