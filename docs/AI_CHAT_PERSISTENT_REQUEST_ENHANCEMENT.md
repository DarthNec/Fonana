# 🔥 AI Chat Bot - Persistent Request Enhancement

**Date:** 2026-02-13  
**Type:** Smart Monetization Feature  
**Status:** ✅ IMPLEMENTED

---

## 🎯 User Request

"Если пользователь настойчиво просит, 2 раза подряд например, пусть AI переводит его к себе в профиль, говоря, что весь горячий контент у меня в профиле, заходи, сладкий (смайлики)"

---

## 💡 Solution: Smart Persistent Request Detection

### Core Logic:

**If user makes 2+ consecutive explicit requests** → AI redirects to profile with hot invitation

**Why this works:**
- ✅ Shows STRONG interest (asked multiple times)
- ✅ Natural monetization point (user is ready)
- ✅ Not aggressive (only after persistence)
- ✅ Maintains sexy, flirty tone

---

## 🔧 Implementation Details

### 1. New Function: `detectConsecutiveExplicitRequests()`

**Location:** Lines ~43-62

**Purpose:** Count how many explicit requests in a row

**Code:**
```typescript
function detectConsecutiveExplicitRequests(
  recentMessages: Array<{ senderId: string; content: string | null }>,
  userId: string
): number {
  const userMessages = recentMessages
    .filter(m => m.senderId === userId && m.content)
    .slice(0, 5) // Last 5 messages
  
  let consecutiveCount = 0
  
  // Count consecutive explicit requests from the end (most recent)
  for (const msg of userMessages) {
    if (classifyUserIntent(msg.content || '') === UserIntent.EXPLICIT_REQUEST) {
      consecutiveCount++
    } else {
      break // Stop if non-explicit message found
    }
  }
  
  return consecutiveCount
}
```

**Logic:**
- Takes last 5 user messages
- Counts consecutive explicit requests from most recent
- Stops counting when non-explicit message found

**Examples:**
```
Scenario 1: ["Покажи анал", "Нет прямо сейчас", "Hi"]
→ consecutiveCount = 2 ✅ (triggers redirect)

Scenario 2: ["Покажи анал", "Как дела", "Покажи анал"]
→ consecutiveCount = 1 ❌ (no redirect, "Как дела" breaks chain)

Scenario 3: ["Покажи", "Давай", "Хочу", "Ну покажи"]
→ consecutiveCount = 4 ✅ (super persistent!)
```

---

### 2. Updated PromptContext Interface

**Location:** Lines 35-41

**Added Field:**
```typescript
interface PromptContext {
  stage: ConversationStage
  intent: UserIntent
  engagement: number
  messageCount: number
  hasPurchased: boolean
  consecutiveExplicitRequests: number // 🔥 NEW
}
```

---

### 3. Enhanced Anti-Deflection Rule

**Location:** Lines 183-230

**Two Modes:**

#### Mode A: First Explicit Request (consecutiveCount = 1)
```
→ Pure hot flirting, NO redirect
→ Same as before (Fix #2)
```

#### Mode B: Persistent Request (consecutiveCount >= 2)
```
→ Smart redirect to profile with sexy invitation
```

**Prompt Template:**
```
🔥💰 PERSISTENT EXPLICIT REQUEST (2+ раз подряд) - SMART REDIRECT:

СТРАТЕГИЯ ОТВЕТА:
1. СНАЧАЛА флирт и признание желания (1 предложение):
   - "Mmm, я вижу ты действительно хочешь этого 🔥"
   - "Ты такой настойчивый, мне это нравится 😏"

2. ПОТОМ мягкий redirect на профиль (1-2 предложения):
   - "Весь мой самый горячий контент у меня в профиле 😈"
   - "Заходи ко мне в профиль, там есть ВСЁ что ты хочешь 💋"

3. ЗАВЕРШЕНИЕ флиртом с приглашением (1 предложение):
   - "Обещаю, тебе понравится, сладкий 😘💕"
   - "Там ты увидишь то, что искал 😏🔥"

ВАЖНО:
- Тон: игривый, соблазнительный, НЕ продающий
- Не говори "BUY", "SUBSCRIBE", "PURCHASE"
- Используй: "заходи", "смотри", "там есть"
- Эмодзи: 😈💋🔥😘💕🥵
```

---

### 4. Context Building

**Location:** Lines 703-719

**Added:**
```typescript
const consecutiveExplicitRequests = detectConsecutiveExplicitRequests(recentMessages, user.id)

if (consecutiveExplicitRequests >= 2) {
  console.log(`[AI CHAT] 💰 PERSISTENT REQUEST: User asked ${consecutiveExplicitRequests} times - redirecting to profile`)
}

const context: PromptContext = {
  // ... existing fields
  consecutiveExplicitRequests // 🔥 NEW
}
```

---

## 📊 Behavior Matrix

| Scenario | Consecutive Count | AI Response |
|----------|-------------------|-------------|
| First ask: "Покажи анал" | 1 | 🔥 Hot flirting, NO redirect |
| Second ask: "Нет прямо сейчас" | 2 | 💰 Redirect to profile with sexy invitation |
| Third ask: "Ну давай" | 3 | 💰 Redirect (more persistent = stronger interest) |
| Ask → chat → ask again | 1 | 🔥 Hot flirting (chain broken by chat) |

---

## 🧪 Test Cases

### Test 1: Single Explicit Request
```
User: "Покажи анал"

Expected:
- consecutiveExplicitRequests: 1
- Response: Hot flirting, NO profile mention
- Example: "Mmm, ты такой нетерпеливый 🥵"
```

### Test 2: Double Explicit Request (TRIGGER)
```
User 1: "Покажи анал"
User 2: "Ну давай, прямо сейчас"

Expected:
- consecutiveExplicitRequests: 2
- Console: "[AI CHAT] 💰 PERSISTENT REQUEST: User asked 2 times"
- Response Structure:
  1. "Ты такой настойчивый, мне нравится 😏" (recognition)
  2. "Весь мой горячий контент в профиле 😈" (redirect)
  3. "Заходи, сладкий, не пожалеешь 💋" (invitation)
```

### Test 3: Triple Request (Super Persistent)
```
User 1: "Покажи"
User 2: "Ну покажи"
User 3: "Давай уже"

Expected:
- consecutiveExplicitRequests: 3
- Same redirect as Test 2
- Higher probability of conversion (very interested)
```

### Test 4: Broken Chain (No Redirect)
```
User 1: "Покажи анал"
User 2: "Как дела?" (NOT explicit)
User 3: "Покажи"

Expected:
- consecutiveExplicitRequests: 1 (chain broken)
- Response: Hot flirting, NO redirect
```

---

## 📈 Expected Impact

### User Experience:
- ✅ First request: Gets hot flirting (satisfaction)
- ✅ Second request: Gets clear path to content (conversion)
- ✅ No frustration: AI responds, not deflects

### Monetization:
- 💰 **Conversion Rate:** Expected +20-30% on persistent users
- 💰 **ARPU:** Higher quality leads (asked 2+ times = serious)
- 💰 **Natural funnel:** Free flirting → Persistent interest → Profile redirect

### Metrics to Track:
| Metric | Baseline | Target |
|--------|----------|--------|
| Persistent requests (2+) | N/A | 15-25% of explicit |
| Conversion on redirect | N/A | 30-40% |
| User complaints | Baseline | No increase |

---

## 🎯 Examples of AI Responses

### Example 1: First Request (No Redirect)
```
User: "Покажи анал"
AI: "Mmm, ты такой нетерпеливый 🥵 Мне нравится твоя смелость 😏🔥"
```

### Example 2: Second Request (Redirect)
```
User: "Ну давай, хочу увидеть"
AI: "Я вижу ты действительно хочешь этого 😏 Весь мой самый горячий контент у меня в профиле 😈 Заходи, сладкий, там есть всё что ты ищешь 💋🔥"
```

### Example 3: Third Request (Strong Redirect)
```
User: "Покажи уже наконец"
AI: "Ты такой настойчивый, это возбуждает 🥵 Я выкладываю всё самое откровенное в своём профиле 😈 Обещаю, тебе понравится, детка 💋"
```

---

## 🔍 Debugging

### Console Logs:

**Normal explicit request:**
```
[AI CHAT] 🔥 Explicit request detected, engagement boosted to: 70
[Auto-reply] Context: { consecutiveExplicitRequests: 1, ... }
```

**Persistent request (redirect):**
```
[AI CHAT] 🔥 Explicit request detected, engagement boosted to: 70
[AI CHAT] 💰 PERSISTENT REQUEST detected: User asked 2 times in a row - redirecting to profile
[Auto-reply] Context: { consecutiveExplicitRequests: 2, ... }
```

---

## ✅ Implementation Checklist

- ✅ Added `detectConsecutiveExplicitRequests()` function
- ✅ Updated `PromptContext` interface with new field
- ✅ Enhanced anti-deflection rule with 2 modes
- ✅ Added context building logic
- ✅ Added debug logging
- ✅ No linter errors
- ⏳ Production testing needed

---

## 🚀 Deployment Notes

**Ready for:** Immediate deployment

**Monitor:**
1. Console logs for "💰 PERSISTENT REQUEST detected"
2. Frequency of 2+ consecutive requests
3. User responses to profile redirects
4. Conversion rate on redirects

**Success Criteria:**
- ✅ 2+ consecutive requests detected correctly
- ✅ AI uses sexy invitation tone (not salesy)
- ✅ Conversion rate 30-40% on redirects
- ✅ No increase in user complaints

---

## 🔄 Rollback Plan

If issues occur:

**Disable persistent redirect:**
```typescript
// In buildDynamicPrompt, change:
if (context.consecutiveExplicitRequests >= 2) {
  // ... redirect logic
}

// To:
if (false) { // DISABLED
  // ... redirect logic
}
```

**Result:** Falls back to pure flirting mode (Fix #2)

---

## 📊 Summary

**What Changed:**
- NEW: Detects when user asks 2+ times for explicit content
- NEW: Smart redirect to profile with sexy invitation
- MAINTAINS: First request gets pure hot flirting

**Why It's Smart:**
- ✅ Natural conversion point (user is ready)
- ✅ Not aggressive (only after persistence)
- ✅ Maintains hot, flirty tone
- ✅ Clear path to monetization

**Expected Result:**
- 💰 +20-30% conversion on persistent users
- 😊 Better UX (clear path vs endless flirting)
- 🔥 Maintains heat (doesn't break immersion)

---

*Enhancement completed: 2026-02-13 11:30 AM*  
*Feature: Smart Persistent Request Monetization*  
*Status: 🟢 READY FOR DEPLOYMENT*
