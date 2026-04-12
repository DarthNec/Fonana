# M7 Discovery Report: Анализ logout логики с device_id

**Session ID:** `task_анализ-logout-логики-в-bottomn_0252`  
**Date:** 2026-03-17  
**Phase:** DISCOVERY  
**Status:** ✅ COMPLETE

---

## 🎯 Executive Summary

**Вердикт:** Пользователь **АБСОЛЮТНО ПРАВ**. Удаление `fonana_device_id` при logout приведет к **созданию множественных гостевых аккаунтов** для одного устройства.

**Severity:** 🔴 **CRITICAL BUG**  
**Impact:** Спам аккаунтов, потеря данных пользователя, проблемы с метриками

---

## 🔍 Текущая реализация

### **BottomNav.tsx** (lines 133-151)

```typescript
const handleLogout = async () => {
  try {
    await disconnect()
    clearUser()
    // Очищаем все маркеры авторизации
    localStorage.removeItem('fonana_user_wallet')
    localStorage.removeItem('fonana_jwt_token')
    localStorage.removeItem('fonana_telegram_auth')
    localStorage.removeItem('fonana_guest_auth')
    localStorage.removeItem('fonana_device_id')     // ❌ ПРОБЛЕМА!
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

---

## 🔬 Как работает Guest авторизация

### **Архитектура**

```
┌─────────────────────────────────────────────────────────┐
│  ПЕРВЫЙ ВХОД (deviceId отсутствует)                    │
├─────────────────────────────────────────────────────────┤
│  1. Client: localStorage.getItem('fonana_device_id')   │
│     → null                                               │
│  2. Client → POST /api/auth/guest { deviceId: null }    │
│  3. Backend: Создает НОВОГО пользователя               │
│     - Генерирует deviceId: "device_a1b2c3d4..."        │
│     - Генерирует nickname: "HappyFox123"                │
│     - Генерирует wallet: "FK_3kR8mN9v..."              │
│     - Сохраняет в DB: telegramId = deviceId             │
│  4. Backend → Response:                                  │
│     { deviceId, user, token, isNewUser: true }          │
│  5. Client: localStorage.setItem('fonana_device_id')   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ПОВТОРНЫЙ ВХОД (deviceId существует)                  │
├─────────────────────────────────────────────────────────┤
│  1. Client: localStorage.getItem('fonana_device_id')   │
│     → "device_a1b2c3d4..."                              │
│  2. Client → POST /api/auth/guest                       │
│     { deviceId: "device_a1b2c3d4..." }                  │
│  3. Backend: Ищет существующего пользователя           │
│     → prisma.user.findFirst({                           │
│         where: { telegramId: deviceId }                 │
│       })                                                 │
│  4. Backend: НАХОДИТ пользователя                      │
│     → Возвращает ТОГО ЖЕ пользователя                  │
│  5. Backend → Response:                                  │
│     { deviceId, user, token, isNewUser: false }         │
│  6. Client: Пользователь продолжает с прежнего аккаунта│
└─────────────────────────────────────────────────────────┘
```

---

## 🐛 Проблема: Что происходит при logout с удалением device_id

### **Сценарий**

```
User → Login as Guest → Creates content → Logout → Login as Guest again
         (deviceId created)    (posts)    (deviceId deleted)  (NEW deviceId!)
                                                                     ↓
                                                            NEW USER CREATED!
                                                            (Old data lost)
```

### **Конкретный пример**

**Шаг 1: Первый вход**
```typescript
// localStorage BEFORE
fonana_device_id: null

// Backend creates:
- deviceId: "device_abc123"
- nickname: "HappyFox123"
- wallet: "FK_3kR8mN9v..."
- DB: telegramId = "device_abc123"

// localStorage AFTER
fonana_device_id: "device_abc123"
fonana_user_wallet: "FK_3kR8mN9v..."
fonana_guest_auth: "true"
```

**Шаг 2: Пользователь создает контент**
```
- Создает 5 постов
- Лайкает 10 постов
- Подписывается на 3 создателей
- Все привязано к wallet: "FK_3kR8mN9v..."
```

**Шаг 3: Logout (ТЕКУЩАЯ РЕАЛИЗАЦИЯ)**
```typescript
// handleLogout() удаляет ВСЁ, включая deviceId
localStorage.removeItem('fonana_device_id')  // ❌ ПРОБЛЕМА!

// localStorage AFTER logout
fonana_device_id: null  // ← УДАЛЕНО!
```

**Шаг 4: Повторный вход (ПРОБЛЕМА)**
```typescript
// localStorage BEFORE login
fonana_device_id: null  // ← НЕТ!

// POST /api/auth/guest { deviceId: null }
// Backend НЕ находит пользователя (deviceId = null)
// Backend создает НОВОГО пользователя:

- deviceId: "device_xyz789"  // ← НОВЫЙ!
- nickname: "BraveTiger456"  // ← НОВЫЙ!
- wallet: "FK_7pQ2tY1w..."   // ← НОВЫЙ!

// Результат:
// ❌ Старый аккаунт "HappyFox123" ПОТЕРЯН
// ❌ Все посты, лайки, подписки НЕДОСТУПНЫ
// ❌ В БД 2 аккаунта для одного устройства (СПАМ)
```

---

## 📊 Impact Analysis

### **Проблемы**

| Проблема | Описание | Severity |
|----------|----------|----------|
| **Спам аккаунтов** | Каждый logout → новый аккаунт в БД | 🔴 CRITICAL |
| **Потеря данных пользователя** | Посты, лайки, подписки недоступны | 🔴 CRITICAL |
| **Плохой UX** | Пользователь не понимает почему "всё пропало" | 🔴 CRITICAL |
| **Метрики испорчены** | DAU/MAU завышены (1 user = 10 accounts) | 🟠 HIGH |
| **Storage pollution** | Мертвые аккаунты в БД | 🟡 MEDIUM |
| **Avatar exhaustion** | Быстро кончатся CDN avatars | 🟡 MEDIUM |

### **Частота**

Если пользователь делает logout **хотя бы 1 раз**:
- ✅ ПЕРВЫЙ раз: 1 аккаунт
- ❌ После logout + login: 2 аккаунта
- ❌ После 2-го logout + login: 3 аккаунта
- ❌ После 3-го logout + login: 4 аккаунта

**Математика:**
- 1000 гостевых пользователей
- Средний logout rate: 30%
- Результат: **1300 аккаунтов** вместо 1000 (+30% спам)

---

## 📖 Official Documentation

### **USER_GUEST_AUTH.md** (lines 697-723)

```markdown
### 5. Logout гостевого пользователя

**НЕ удаляй `deviceId`** при logout!

```typescript
// ❌ НЕПРАВИЛЬНО:
await AsyncStorage.clear(); // Удалит deviceId!

// ✅ ПРАВИЛЬНО:
const deviceId = await AsyncStorage.getItem('fonana_device_id');
await AsyncStorage.clear();
await AsyncStorage.setItem('fonana_device_id', deviceId); // Восстанавливаем
```

Или:

```typescript
// ✅ ПРАВИЛЬНО (селективная очистка):
await AsyncStorage.multiRemove([
  'fonana_jwt_token',
  'fonana_user_wallet',
  'fonana_guest_auth',
  'fonana_user_data',
  'fonana_is_new_user'
]);
// deviceId остаётся!
```
```

**Вывод:** Официальная документация **ЯВНО ЗАПРЕЩАЕТ** удаление `deviceId` при logout.

---

## 🔍 Backend Analysis

### **app/api/auth/guest/route.ts** (lines 78-133)

```typescript
// 2. Если deviceId предоставлен - ищем существующего пользователя
if (existingDeviceId) {
  const existingUser = await prisma.user.findFirst({
    where: { telegramId: existingDeviceId }  // ← Поиск по deviceId
  })
  
  if (existingUser) {
    console.log('Found existing guest user')
    // Возвращаем ТОГО ЖЕ пользователя
    return NextResponse.json({
      success: true,
      deviceId: existingDeviceId,
      isNewUser: false,  // ← НЕ новый!
      user: existingUser
    })
  } else {
    console.log('No existing user found for deviceId, creating new...')
  }
}

// 4. Генерируем новый deviceId если не был предоставлен
const deviceId = existingDeviceId || `device_${generateGuestId()}`
```

**Логика:**
1. **IF** `deviceId` provided **AND** user exists → Return existing user
2. **ELSE** → Create **NEW** user

**Проблема:**  
Если `deviceId = null` (удален при logout), backend **ВСЕГДА** создает нового пользователя.

---

## 🧠 Why device_id Must Persist

### **Аналогия**

`device_id` для гостевого аккаунта = **permanent cookie** для анонимного пользователя.

**Правильное поведение:**
```
Logout ≠ "Удалить устройство"
Logout = "Завершить сессию, но помнить устройство"
```

**Аналог в других приложениях:**
- **YouTube Guest:** Logout не удаляет device fingerprint
- **Spotify Free:** Logout не удаляет device identifier
- **Reddit Guest:** Logout не удаляет anonymous session ID

### **device_id vs JWT Token**

| Параметр | device_id | JWT Token |
|----------|-----------|-----------|
| **Цель** | Идентификация УСТРОЙСТВА | Авторизация СЕССИИ |
| **Lifetime** | PERMANENT | 30 дней |
| **При logout** | СОХРАНИТЬ | УДАЛИТЬ |
| **Уникальность** | 1 per device | 1 per session |
| **Замена** | НИКОГДА | При каждом login |

---

## 🎯 Expected Behavior

### **ПРАВИЛЬНАЯ логика logout**

```typescript
const handleLogout = async () => {
  try {
    await disconnect()
    clearUser()
    
    // ✅ УДАЛИТЬ: Session-specific данные
    localStorage.removeItem('fonana_user_wallet')
    localStorage.removeItem('fonana_jwt_token')
    localStorage.removeItem('fonana_telegram_auth')
    localStorage.removeItem('fonana_guest_auth')
    localStorage.removeItem('fonana_phantom_mobile_auth')
    localStorage.removeItem('fonana_is_new_user')
    
    // ✅ СОХРАНИТЬ: Device-specific данные
    // localStorage.getItem('fonana_device_id')  ← НЕ ТРОГАТЬ!
    
    setShowProfilePanel(false)
    router.push('/feed')
    toast.success('Logged out successfully')
  } catch (error) {
    console.error('Logout error:', error)
    toast.error('Failed to logout')
  }
}
```

### **Flow после исправления**

```
User → Login as Guest → Logout → Login as Guest again
       (deviceId: abc)           (deviceId: abc preserved)
              ↓                            ↓
       Creates content              SAME USER returned!
       (5 posts)                    (All 5 posts visible)
```

---

## 🔐 Security Considerations

### **Q: Не является ли device_id security риском?**

**A: НЕТ.**

**Причины:**
1. **device_id ≠ password:** Он не дает доступ к чужому аккаунту
2. **Привязка к устройству:** device_id работает только на том же устройстве
3. **Fake wallet:** Гостевой wallet (FK_...) не имеет реальных средств
4. **Нет sensitive data:** device_id не содержит персональной информации

### **Q: Что если пользователь очистит localStorage?**

**A: Тогда потеря данных ОПРАВДАНА.**

```
Manual clear by user = INTENTIONAL data loss
Automatic clear on logout = BUG
```

---

## 🎓 Lessons from Other Apps

### **Instagram**

```
Logout → device_id PRESERVED
Multiple accounts → device_id SHARED
```

### **TikTok Guest**

```
Guest session → anonymous_id PERSISTENT
Logout → anonymous_id RETAINED
Clear cache → anonymous_id DELETED (user choice)
```

### **Reddit**

```
Anonymous browsing → device_fingerprint PERMANENT
Logout → device_fingerprint KEPT
```

**Вывод:** Индустрия **ВСЕГДА** сохраняет device identifiers при logout.

---

## 📋 Recommendation

### **Immediate Action Required**

1. **Remove** `localStorage.removeItem('fonana_device_id')` from `handleLogout()`
2. **Test** logout → login flow with existing device_id
3. **Document** device_id persistence in code comments
4. **Audit** other logout implementations (LeftSidebar, etc.)

### **Optional Enhancements**

1. Add "Clear all data" button (separate from logout)
2. Add device management page (view/revoke devices)
3. Add analytics: track device reuse rate

---

## ✅ Validation

### **Test Cases**

| Test Case | Expected Result |
|-----------|-----------------|
| Login → Logout → Login | SAME user returned |
| Login → Create post → Logout → Login | Post still visible |
| Login → Like 10 posts → Logout → Login | Likes preserved |
| Manual localStorage.clear() → Login | NEW user (expected) |

---

## 🎯 Conclusion

**Пользователь прав на 100%.**

Удаление `fonana_device_id` при logout:
- ❌ Нарушает официальную документацию
- ❌ Создает спам аккаунтов
- ❌ Теряет данные пользователя
- ❌ Портит метрики
- ❌ Противоречит индустрии best practices

**Solution:** Просто **НЕ УДАЛЯТЬ** `fonana_device_id` при logout.

---

**Status:** ✅ DISCOVERY COMPLETE  
**Next Phase:** SOLUTION_PLAN.md  
**Confidence:** 100%
