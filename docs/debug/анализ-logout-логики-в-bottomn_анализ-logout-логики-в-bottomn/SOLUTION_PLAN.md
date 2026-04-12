# M7 Solution Plan: Исправление logout логики

**Session ID:** `task_анализ-logout-логики-в-bottomn_0252`  
**Date:** 2026-03-17  
**Phase:** SOLUTION_PLAN  
**Status:** ✅ COMPLETE

---

## 🎯 Solution Overview

**Проблема:** `localStorage.removeItem('fonana_device_id')` при logout создает новые гостевые аккаунты.

**Решение:** **Удалить одну строку кода** из `handleLogout()` в `BottomNav.tsx`.

**Complexity:** 🟢 **TRIVIAL** (1 line change)  
**Risk:** 🟢 **ZERO** (removing buggy behavior)  
**Time:** ⏱️ **30 seconds**

---

## 📋 Changes Required

### **File: `components/BottomNav.tsx`**

**Location:** Lines 133-151

**Change:**

```diff
const handleLogout = async () => {
  try {
    await disconnect()
    clearUser()
    // Очищаем все маркеры авторизации
    localStorage.removeItem('fonana_user_wallet')
    localStorage.removeItem('fonana_jwt_token')
    localStorage.removeItem('fonana_telegram_auth')
    localStorage.removeItem('fonana_guest_auth')
-   localStorage.removeItem('fonana_device_id')     // ❌ УДАЛИТЬ ЭТУ СТРОКУ
    localStorage.removeItem('fonana_phantom_mobile_auth')
    setShowProfilePanel(false)
    router.push('/feed')
    toast.success('Logged out successfully')
  } catch (error) {
    console.error('Logout error:', error)
    toast.error('Failed to logout')
  }
}
```

**Explanation:**
- `device_id` - это **permanent device identifier**, не session data
- Он должен **ALWAYS** сохраняться при logout
- Он удаляется только при **migration** (Guest → Real Wallet)

---

## ✅ Validation: device_id Usage

### **Правильное использование (KEEP)**

**ConnectWalletPopup.tsx** (lines 86-89):
```typescript
// Guest migrates to real wallet
if (userType === 'guest') {
  localStorage.removeItem('fonana_guest_auth')
  localStorage.removeItem('fonana_device_id')  // ✅ ПРАВИЛЬНО!
}
```

**Почему правильно:**
- Гость **upgrade** на реальный кошелек
- device_id больше НЕ НУЖЕН (есть реальный wallet)
- Это **migration**, не logout

### **Неправильное использование (FIX)**

**BottomNav.tsx** (line 142):
```typescript
// Regular logout
localStorage.removeItem('fonana_device_id')  // ❌ НЕПРАВИЛЬНО!
```

**Почему неправильно:**
- Это **regular logout**, не migration
- device_id НУЖЕН для повторного входа
- Удаление создает новый аккаунт

---

## 🔍 Audit Results

### **All logout locations**

| File | Function | device_id handling | Status |
|------|----------|-------------------|--------|
| `BottomNav.tsx` | `handleLogout()` | ❌ Удаляет | 🔴 **BUG** |
| `LeftSidebar.tsx` | `handleLogout()` | ✅ Не трогает | 🟢 OK |
| `ConnectWalletPopup.tsx` | `handleConnectWallet()` | ✅ Удаляет при migration | 🟢 OK |

**Вывод:** Только **1 место** требует исправления.

---

## 🧪 Test Plan

### **Test Case 1: Guest Logout → Login**

```
GIVEN: Guest user logged in with deviceId "device_abc123"
WHEN:  User clicks Logout
AND:   User clicks "Continue as Guest" again
THEN:  SAME user should be returned (nickname, posts, likes preserved)
AND:   isNewUser should be FALSE
```

**Before fix:**
```typescript
// After logout
localStorage.getItem('fonana_device_id') // → null ❌
// After login
POST /api/auth/guest { deviceId: null }
// Backend creates NEW user ❌
isNewUser: true ❌
```

**After fix:**
```typescript
// After logout
localStorage.getItem('fonana_device_id') // → "device_abc123" ✅
// After login
POST /api/auth/guest { deviceId: "device_abc123" }
// Backend finds existing user ✅
isNewUser: false ✅
```

### **Test Case 2: Guest Migration**

```
GIVEN: Guest user with deviceId "device_abc123"
WHEN:  User connects real Phantom wallet
THEN:  deviceId should be DELETED (migration complete)
AND:   Guest auth marker should be removed
```

**Status:** ✅ Already works correctly (ConnectWalletPopup.tsx)

### **Test Case 3: Multiple Logouts**

```
GIVEN: Guest user logged in
WHEN:  User does: Login → Logout → Login → Logout → Login
THEN:  Should be SAME user across all 3 logins
AND:   Database should have only 1 guest account
```

**Before fix:** 3 accounts created ❌  
**After fix:** 1 account reused ✅

---

## 📊 Impact Analysis

### **Metrics Before Fix**

```
Scenario: 1000 guest users, 30% logout rate
Result:
- Guest accounts created: 1300
- Spam accounts: 300 (+30%)
- Storage waste: ~15MB (300 × 50KB average)
```

### **Metrics After Fix**

```
Scenario: 1000 guest users, 30% logout rate
Result:
- Guest accounts created: 1000
- Spam accounts: 0
- Storage waste: 0
```

### **User Experience**

| Before Fix | After Fix |
|------------|-----------|
| Logout → All data lost ❌ | Logout → Data preserved ✅ |
| Confusion: "Where are my posts?" ❌ | Expected behavior ✅ |
| Multiple accounts per device ❌ | 1 account per device ✅ |

---

## 🔒 Security Analysis

### **Q: Является ли хранение device_id security риском?**

**A: НЕТ.**

**Reasons:**

1. **device_id не содержит sensitive data**
   ```
   device_id: "device_a1b2c3d4e5f6..."
   ↑ Random UUID, no personal info
   ```

2. **device_id ≠ authentication token**
   ```
   device_id → Identifies DEVICE
   JWT token → Authenticates SESSION
   ```

3. **Физический доступ required**
   ```
   Attacker needs:
   1. Physical access to device
   2. Access to browser localStorage
   
   If attacker has this → they have EVERYTHING anyway
   ```

4. **Limited blast radius**
   ```
   Compromised device_id gives access to:
   - Guest account (FK_... wallet)
   - No real money
   - No sensitive personal data
   ```

### **Comparison: Session Token vs Device ID**

| Parameter | JWT Token | device_id |
|-----------|-----------|-----------|
| **Contains** | userId, wallet, expiry | Random UUID |
| **Gives access to** | Full user account | Device identification only |
| **Should rotate** | Every 30 days | NEVER |
| **Delete on logout** | ✅ YES | ❌ NO |
| **Security impact if leaked** | 🔴 HIGH | 🟡 LOW |

---

## 📖 Documentation Updates

### **Add code comment**

```typescript
const handleLogout = async () => {
  try {
    await disconnect()
    clearUser()
    
    // Clear session-specific data
    localStorage.removeItem('fonana_user_wallet')
    localStorage.removeItem('fonana_jwt_token')
    localStorage.removeItem('fonana_telegram_auth')
    localStorage.removeItem('fonana_guest_auth')
    localStorage.removeItem('fonana_phantom_mobile_auth')
    
    // IMPORTANT: fonana_device_id is NOT removed!
    // Device ID must persist across logouts to prevent creating
    // duplicate guest accounts. It's only removed when guest
    // migrates to a real wallet (see ConnectWalletPopup.tsx)
    
    setShowProfilePanel(false)
    router.push('/feed')
    toast.success('Logged out successfully')
  } catch (error) {
    console.error('Logout error:', error)
    toast.error('Failed to logout')
  }
}
```

---

## 🎯 Implementation Steps

### **Step 1: Remove buggy line**

```bash
# File: components/BottomNav.tsx
# Line: 142
# Action: DELETE
```

### **Step 2: Add documentation comment**

```typescript
// Add comment explaining why device_id is NOT removed
```

### **Step 3: Test**

```bash
# Manual test
1. Login as guest → Note nickname
2. Logout
3. Login as guest again → Should see SAME nickname
```

### **Step 4: Deploy**

```bash
# No special deployment steps
# Standard web deployment
```

---

## ✅ Acceptance Criteria

- [ ] `localStorage.removeItem('fonana_device_id')` removed from `BottomNav.tsx`
- [ ] Documentation comment added
- [ ] Test Case 1 passed: Logout → Login returns same user
- [ ] Test Case 2 passed: Migration still deletes device_id
- [ ] Test Case 3 passed: Multiple logouts don't create spam accounts
- [ ] Code review approved
- [ ] Deployed to production

---

## 🎓 Lessons Learned

### **For Future Reference**

1. **Device identifiers ≠ Session tokens**
   - Device ID: PERMANENT
   - Session token: TEMPORARY

2. **Read the docs**
   - USER_GUEST_AUTH.md explicitly says "НЕ удаляй deviceId"
   - Always check official documentation

3. **Think about user data**
   - Logout should clear SESSION, not USER DATA
   - User expects to return to their account

4. **Test edge cases**
   - Logout → Login flow
   - Multiple logouts
   - Data persistence

---

## 🎯 Conclusion

**Solution:** Delete 1 line of code.  
**Impact:** Prevents account spam, preserves user data.  
**Risk:** Zero (removing bug).  
**Time:** 30 seconds.

**Status:** ✅ SOLUTION PLAN COMPLETE  
**Ready for:** IMPLEMENTATION  
**Confidence:** 100%
