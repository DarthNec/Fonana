# 🔍 M7 DISCOVERY REPORT: Voice Recording Button Logic Issue

**Issue ID:** `voice-recording-buttons-logic-2026-02-22`  
**Discovery Date:** 2026-02-22  
**Component:** `MessagesPageClient.tsx`  
**Severity:** 🟡 MEDIUM (UX Confusion)  
**Status:** 🔍 ANALYSIS PHASE

---

## 📋 PROBLEM STATEMENT

### 🎯 User Report:

> "Почему в MessagesPageClient кнопка Record audio когда модалка где Cancel и Stop они выполняют одну и ту же функцию? Почему при нажатии на Cancel модалка не закрывается, а открывает превью голосового сообщения?"

### 🔎 Expected Behavior:
1. **Cancel button** → полностью удаляет запись, закрывает модалку
2. **Stop button** → сохраняет запись, показывает preview
3. **Разные функции** для Cancel и Stop

### ❌ Actual Behavior:
1. **Cancel button** → вызывает `cancelRecording()`
2. **Stop button** → вызывает `stopRecording()`
3. **Обе функции** приводят к показу preview modal! 🚨

---

## 🔬 TECHNICAL ANALYSIS

### 📂 File Under Investigation:
**`components/MessagesPageClient.tsx`**

---

## 🎯 ROOT CAUSE ANALYSIS

### ❌ PROBLEM 1: `stopRecording()` и `cancelRecording()` почти идентичны!

#### 📍 `stopRecording()` Function (Lines 600-615)

```typescript
const stopRecording = () => {
  console.log('[Voice Recording] Stopping recording...')
  
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorder.stop() // ← Triggers onstop handler
  }
  
  if (recordingTimerRef.current) {
    clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
  }
  
  setIsRecording(false) // ← Closes recording modal
  
  console.log('[Voice Recording] Recording stopped')
}
```

**What it does:**
1. ✅ Stops MediaRecorder
2. ✅ Clears timer
3. ✅ Sets `isRecording = false`
4. ❌ **DOES NOT clear audio data!**

---

#### 📍 `cancelRecording()` Function (Lines 620-653)

```typescript
const cancelRecording = () => {
  console.log('[Voice Recording] Cancelling recording...')
  
  // Stop recorder if active
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorder.stop() // ← SAME as stopRecording!
  }
  
  // Clear timer
  if (recordingTimerRef.current) {
    clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
  }
  
  // Stop stream
  if (audioStreamRef.current) {
    audioStreamRef.current.getTracks().forEach(track => track.stop())
    audioStreamRef.current = null
  }
  
  // Clear state
  setIsRecording(false) // ← SAME as stopRecording!
  setRecordingDuration(0)
  setAudioBlob(null) // ← Clears blob
  
  if (audioPreviewUrl) {
    URL.revokeObjectURL(audioPreviewUrl)
    setAudioPreviewUrl(null) // ← Clears preview URL
  }
  
  audioChunksRef.current = []
  
  console.log('[Voice Recording] Recording cancelled')
}
```

**What it does:**
1. ✅ Stops MediaRecorder (SAME)
2. ✅ Clears timer (SAME)
3. ✅ Sets `isRecording = false` (SAME)
4. ✅ **ADDITIONALLY clears audio data** (blob, preview URL, chunks)
5. ✅ Stops audio stream

---

### 🚨 KEY ISSUE: MediaRecorder.onstop Handler

**Location:** Lines 541-558 (inside `startRecording()`)

```typescript
// Handle recording stop
mediaRecorder.onstop = () => {
  console.log('[Voice Recording] Recording stopped, creating blob...')
  
  const blob = new Blob(audioChunksRef.current, { type: supportedMimeType })
  console.log('[Voice Recording] Blob created:', {
    size: blob.size,
    type: blob.type
  })
  
  setAudioBlob(blob) // ← CREATES BLOB!
  setAudioPreviewUrl(URL.createObjectURL(blob)) // ← CREATES PREVIEW URL!
  
  // Stop all tracks
  if (audioStreamRef.current) {
    audioStreamRef.current.getTracks().forEach(track => track.stop())
    audioStreamRef.current = null
  }
}
```

**This handler is triggered by BOTH:**
- ✅ `stopRecording()` → `mediaRecorder.stop()`
- ❌ `cancelRecording()` → `mediaRecorder.stop()` 🚨

---

## 🔄 FLOW COMPARISON

### ✅ EXPECTED FLOW (Cancel)

```
User clicks Cancel
   ↓
cancelRecording() called
   ↓
1. Stop MediaRecorder
2. Clear timer
3. Clear audioBlob
4. Clear audioPreviewUrl
5. setIsRecording(false)
   ↓
Recording Modal closes
   ↓
✅ NO Preview Modal (audioPreviewUrl = null)
```

---

### ❌ ACTUAL FLOW (Cancel) - BROKEN!

```
User clicks Cancel
   ↓
cancelRecording() called
   ↓
1. mediaRecorder.stop() ← Triggers onstop handler! 🚨
   ↓
   ├─→ onstop handler runs:
   │   ├─→ Creates blob from audioChunksRef
   │   ├─→ setAudioBlob(blob) ✅
   │   └─→ setAudioPreviewUrl(URL.createObjectURL(blob)) ✅
   │
2. setIsRecording(false)
3. setAudioBlob(null) ← TOO LATE! Already set by onstop
4. setAudioPreviewUrl(null) ← TOO LATE! Already set by onstop
   ↓
Recording Modal closes (isRecording = false)
   ↓
❌ Preview Modal APPEARS! (audioPreviewUrl set by onstop)
```

---

### ✅ ACTUAL FLOW (Stop) - WORKS AS INTENDED

```
User clicks Stop
   ↓
stopRecording() called
   ↓
1. mediaRecorder.stop() ← Triggers onstop handler
   ↓
   ├─→ onstop handler runs:
   │   ├─→ Creates blob
   │   ├─→ setAudioBlob(blob)
   │   └─→ setAudioPreviewUrl(URL.createObjectURL(blob))
   │
2. setIsRecording(false)
   ↓
Recording Modal closes
   ↓
✅ Preview Modal APPEARS (correct behavior for Stop)
```

---

## 🎯 KEY INSIGHT: Race Condition!

### Timeline of Events (Cancel button):

```
Time 0ms:  User clicks Cancel
           ↓
Time 1ms:  cancelRecording() starts
           ↓
Time 2ms:  mediaRecorder.stop() called
           ↓
Time 3ms:  onstop handler SCHEDULED (async)
           ↓
Time 4ms:  setIsRecording(false) ← Synchronous
Time 5ms:  setAudioBlob(null) ← Synchronous
Time 6ms:  setAudioPreviewUrl(null) ← Synchronous
           ↓
Time 10ms: onstop handler EXECUTES ← TOO LATE! 🚨
           ├─→ setAudioBlob(blob) ← OVERWRITES null!
           └─→ setAudioPreviewUrl(url) ← OVERWRITES null!
           ↓
Time 15ms: Component re-renders
           ↓
Result:    audioPreviewUrl !== null
           → Preview Modal shows! ❌
```

---

## 💡 SOLUTION APPROACHES

### 🎯 APPROACH 1: Add `isCancelled` flag to prevent onstop

**Strategy:** Skip blob creation in `onstop` if cancellation was requested.

**Implementation:**
```typescript
const [isCancellingRecording, setIsCancellingRecording] = useState(false)

// In startRecording():
mediaRecorder.onstop = () => {
  console.log('[Voice Recording] Recording stopped')
  
  // 🔥 FIX: Don't create blob if cancelling
  if (isCancellingRecording) {
    console.log('[Voice Recording] Cancelled - not creating blob')
    setIsCancellingRecording(false)
    return
  }
  
  const blob = new Blob(audioChunksRef.current, { type: supportedMimeType })
  setAudioBlob(blob)
  setAudioPreviewUrl(URL.createObjectURL(blob))
  
  // Stop tracks...
}

// In cancelRecording():
const cancelRecording = () => {
  console.log('[Voice Recording] Cancelling recording...')
  
  // 🔥 FIX: Set flag BEFORE stopping
  setIsCancellingRecording(true)
  
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorder.stop() // ← onstop will check flag
  }
  
  // Rest of cleanup...
  setIsRecording(false)
  setRecordingDuration(0)
  setAudioBlob(null)
  
  if (audioPreviewUrl) {
    URL.revokeObjectURL(audioPreviewUrl)
    setAudioPreviewUrl(null)
  }
  
  audioChunksRef.current = []
}
```

**Pros:**
- ✅ Clean separation of concerns
- ✅ onstop handler checks intent
- ✅ No race condition

**Cons:**
- ⚠️ Adds state variable
- ⚠️ Flag must be managed correctly

**ROI Score:** 9.0/10

---

### 🎯 APPROACH 2: Use ref instead of state for cancellation flag

**Strategy:** Same as Approach 1, but use ref to avoid re-renders.

**Implementation:**
```typescript
const isCancellingRef = useRef(false)

// In startRecording():
mediaRecorder.onstop = () => {
  if (isCancellingRef.current) {
    console.log('[Voice Recording] Cancelled - not creating blob')
    isCancellingRef.current = false
    return
  }
  
  // Create blob...
}

// In cancelRecording():
const cancelRecording = () => {
  isCancellingRef.current = true // ← Use ref
  
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorder.stop()
  }
  
  // Cleanup...
}
```

**Pros:**
- ✅ No extra re-renders
- ✅ Synchronous flag setting
- ✅ Clean pattern

**Cons:**
- ⚠️ Ref pattern less obvious for state management

**ROI Score:** 9.5/10 ⭐ **BEST**

---

### 🎯 APPROACH 3: Don't call stop() on cancel

**Strategy:** Don't stop MediaRecorder, just abandon it.

**Implementation:**
```typescript
const cancelRecording = () => {
  console.log('[Voice Recording] Cancelling recording...')
  
  // 🔥 FIX: DON'T call stop() - just abandon recording
  // if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
  //   mediaRecorder.stop() // ← REMOVE THIS
  // }
  
  // Clear timer
  if (recordingTimerRef.current) {
    clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
  }
  
  // Stop stream immediately
  if (audioStreamRef.current) {
    audioStreamRef.current.getTracks().forEach(track => track.stop())
    audioStreamRef.current = null
  }
  
  // Clear state
  mediaRecorderRef.current = null // ← Just clear ref
  setIsRecording(false)
  setRecordingDuration(0)
  setAudioBlob(null)
  
  if (audioPreviewUrl) {
    URL.revokeObjectURL(audioPreviewUrl)
    setAudioPreviewUrl(null)
  }
  
  audioChunksRef.current = []
}
```

**Pros:**
- ✅ Simple - no flag needed
- ✅ No onstop handler triggered
- ✅ Immediate cleanup

**Cons:**
- ⚠️ MediaRecorder left in recording state (memory leak?)
- ⚠️ Not clean shutdown
- ⚠️ May cause browser warnings

**ROI Score:** 6.0/10

---

### 🎯 APPROACH 4: Clear chunks before stop

**Strategy:** Clear `audioChunksRef` BEFORE calling stop().

**Implementation:**
```typescript
const cancelRecording = () => {
  console.log('[Voice Recording] Cancelling recording...')
  
  // 🔥 FIX: Clear chunks FIRST
  audioChunksRef.current = []
  
  // Now stop (onstop will create empty blob)
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorder.stop()
  }
  
  // Rest of cleanup...
  setIsRecording(false)
  setAudioBlob(null)
  setAudioPreviewUrl(null)
}
```

**Pros:**
- ✅ No new state/ref
- ✅ Clean MediaRecorder shutdown

**Cons:**
- ⚠️ onstop still runs (creates empty blob)
- ⚠️ May still have race condition with setState timing

**ROI Score:** 7.5/10

---

## 📊 SOLUTION COMPARISON MATRIX

| Approach | Simplicity | Reliability | Clean Code | Risk | ROI |
|----------|-----------|-------------|------------|------|-----|
| **1. State flag** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | LOW | 9.0 |
| **2. Ref flag** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | LOW | **9.5** ⭐ |
| **3. Don't stop()** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | MEDIUM | 6.0 |
| **4. Clear chunks first** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | LOW | 7.5 |

---

## 🏆 RECOMMENDED SOLUTION

### ✅ APPROACH 2: Use ref flag (isCancellingRef)

**Reasoning:**
1. **Highest ROI** (9.5/10)
2. **No race conditions** (ref is synchronous)
3. **Clean pattern** (common in React for non-reactive flags)
4. **No extra re-renders** (ref doesn't trigger renders)
5. **Proper MediaRecorder shutdown** (still calls stop())

---

## 📝 IMPLEMENTATION PLAN

### Changes Required:

#### 1. Add ref declaration (after line 175)
```typescript
const isCancellingRef = useRef(false)
```

#### 2. Modify onstop handler in startRecording() (line 541)
```typescript
mediaRecorder.onstop = () => {
  console.log('[Voice Recording] Recording stopped')
  
  // 🔥 FIX: Check if cancelling - don't create blob
  if (isCancellingRef.current) {
    console.log('[Voice Recording] Cancelled - skipping blob creation')
    isCancellingRef.current = false
    
    // Still stop audio stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
      audioStreamRef.current = null
    }
    
    return // ← Exit early
  }
  
  // Normal stop flow - create blob
  const blob = new Blob(audioChunksRef.current, { type: supportedMimeType })
  console.log('[Voice Recording] Blob created:', {
    size: blob.size,
    type: blob.type
  })
  
  setAudioBlob(blob)
  setAudioPreviewUrl(URL.createObjectURL(blob))
  
  // Stop all tracks
  if (audioStreamRef.current) {
    audioStreamRef.current.getTracks().forEach(track => track.stop())
    audioStreamRef.current = null
  }
}
```

#### 3. Modify cancelRecording() (line 620)
```typescript
const cancelRecording = () => {
  console.log('[Voice Recording] Cancelling recording...')
  
  // 🔥 FIX: Set flag BEFORE stopping MediaRecorder
  isCancellingRef.current = true
  
  // Stop recorder if active (onstop will check flag)
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorderRef.current.stop()
  }
  
  // Clear timer
  if (recordingTimerRef.current) {
    clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
  }
  
  // Note: audioStream cleanup moved to onstop handler
  
  // Clear state
  setIsRecording(false)
  setRecordingDuration(0)
  setAudioBlob(null)
  
  if (audioPreviewUrl) {
    URL.revokeObjectURL(audioPreviewUrl)
    setAudioPreviewUrl(null)
  }
  
  audioChunksRef.current = []
  
  console.log('[Voice Recording] Recording cancelled')
}
```

---

## 🧪 TESTING CHECKLIST

### Test Case 1: Cancel During Recording
- [ ] Start recording
- [ ] Click "Cancel" button
- [ ] **Expected:** Recording modal closes, NO preview modal

### Test Case 2: Stop During Recording
- [ ] Start recording
- [ ] Click "Stop" button
- [ ] **Expected:** Recording modal closes, preview modal appears

### Test Case 3: Cancel After Stop
- [ ] Start recording → Stop → Preview modal appears
- [ ] Click "Cancel" (X button on preview)
- [ ] **Expected:** Preview modal closes, blob cleaned up

### Test Case 4: Send Voice Message
- [ ] Start recording → Stop → Preview
- [ ] Click "Send"
- [ ] **Expected:** Message sent, preview closes

### Test Case 5: Multiple Recordings
- [ ] Record → Cancel
- [ ] Record → Cancel
- [ ] Record → Stop → Send
- [ ] **Expected:** No memory leaks, all modals behave correctly

### Test Case 6: Cancel Mid-Recording (Quick)
- [ ] Start recording
- [ ] Immediately click Cancel (<1 second)
- [ ] **Expected:** No preview modal, clean cancellation

### Test Case 7: Browser Console Check
- [ ] Record → Cancel
- [ ] **Expected Console Logs:**
   ```
   [Voice Recording] Cancelling recording...
   [Voice Recording] Recording stopped
   [Voice Recording] Cancelled - skipping blob creation
   [Voice Recording] Recording cancelled
   ```

---

## 🎯 EDGE CASES TO CONSIDER

### ✅ Case 1: MediaRecorder already stopped
**Scenario:** User clicks Cancel after recording auto-stopped (5 min)  
**Behavior:** Flag prevents blob creation, cleanup proceeds  
**Handled by:** Flag check in onstop

### ✅ Case 2: Multiple rapid clicks on Cancel
**Scenario:** User double-clicks Cancel button  
**Behavior:** First click sets flag, second is no-op  
**Handled by:** `if (mediaRecorderRef.current)` check

### ✅ Case 3: Browser tab backgrounded during recording
**Scenario:** User switches tabs, returns, clicks Cancel  
**Behavior:** MediaRecorder still recording, flag works correctly  
**Handled by:** Ref persists across re-renders

### ✅ Case 4: Microphone permission revoked mid-recording
**Scenario:** User revokes permission during recording  
**Behavior:** Error handler calls cancelRecording  
**Handled by:** Existing error handler (line 561)

---

## 📈 EXPECTED OUTCOMES

### Before Fix:
- ❌ Cancel button shows preview modal (confusing!)
- ❌ User expects recording deleted, but it's saved
- ❌ UX inconsistent with standard patterns

### After Fix:
- ✅ Cancel button closes modal, NO preview
- ✅ Stop button shows preview (correct)
- ✅ Clear distinction between Cancel and Stop
- ✅ Matches user expectations (WhatsApp, Telegram pattern)

---

## 📊 PERFORMANCE IMPACT

### Before Fix:
- CPU: Creates unwanted blob on cancel
- Memory: Blob persists briefly (until cleanup)

### After Fix:
- CPU: <1% (one ref check)
- Memory: 0 bytes (no blob created on cancel)
- Network: 0 impact

---

## 🔍 CODE QUALITY

### Metrics:
- **Lines Added:** ~10
- **Lines Modified:** ~15
- **New State:** 0 (using ref)
- **Cyclomatic Complexity:** +1 (one if check)
- **Maintainability:** HIGH

---

## 🚀 DEPLOYMENT READINESS

**Status:** 🟢 READY FOR IMPLEMENTATION  
**Risk Level:** 🟢 LOW  
**Breaking Changes:** ❌ NONE  
**Rollback Plan:** Remove flag check in onstop

---

## 📝 NEXT STEPS

1. ✅ **Discovery Complete** (current document)
2. 🕐 **User Review** (awaiting confirmation)
3. 🕐 **Implementation** (10 minutes)
4. 🕐 **Testing** (manual - 7 test cases)
5. 🕐 **Deploy** (merge to main)
6. 🕐 **Monitor** (check user feedback)

---

**Prepared By:** M7 AI System  
**Analysis Date:** 2026-02-22  
**Document Version:** 1.0  
**Status:** 🔍 AWAITING USER APPROVAL FOR IMPLEMENTATION

---

## 💡 FINAL RECOMMENDATION

**Implement APPROACH 2: Ref flag (isCancellingRef)**

**Key Changes:**
1. Add `isCancellingRef = useRef(false)`
2. Check flag in onstop handler → early return if cancelling
3. Set flag in cancelRecording() BEFORE stop()

**Why this solution:**
- ✅ Highest ROI (9.5/10)
- ✅ No race conditions
- ✅ Cleanest code pattern
- ✅ No extra re-renders
- ✅ Proper MediaRecorder shutdown

**Ready to implement after user approval!** 🚀
