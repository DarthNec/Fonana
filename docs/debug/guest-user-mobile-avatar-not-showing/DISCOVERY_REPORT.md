# 🔍 M7 DISCOVERY: Guest User Avatar Not Showing on Mobile Bottom Nav

**Дата**: 19.02.2026  
**Проблема**: После гостевой авторизации аватар не появляется в мобильном navbar, и при клике на профиль опять просит авторизоваться

---

## 🎯 СИМПТОМЫ

### **Что происходит:**
1. ✅ Пользователь авторизуется как Guest (получает `FK_` wallet)
2. ✅ Авторизация проходит успешно (user создан, JWT получен)
3. ❌ **Аватар НЕ появляется** в мобильном bottom navbar (остаётся иконка `UserIcon`)
4. ❌ **При клике на Profile** опять показывается `LogInMethodPopup` (как будто не авторизован)

### **Что ожидалось:**
- Должен показаться аватар пользователя в bottom navbar
- При клике на аватар должна открыться боковая панель профиля

---

## 🔬 ROOT CAUSE ANALYSIS

### **Проблема #1: Условие показа аватара**

**Файл**: `components/BottomNav.tsx` (line 144)

```typescript
// Profile кнопка - показываем аватар если подключен
if (item.name === 'Profile') {
  if (user && publicKeyString) {  // ← 🚨 ПРОБЛЕМА ТУТ!
    return (
      // Рендерим аватар
    )
  } else {
    return (
      // Рендерим иконку
    )
  }
}
```

**Почему это проблема:**

1. **Для гостей**: `publicKeyString` = `null` (потому что `FK_` не валидный Solana адрес)
2. **Условие**: `user && publicKeyString` → `true && null` → `false`
3. **Результат**: Аватар НЕ показывается, даже если `user` есть

---

### **Проблема #2: onClick handler для Profile**

**Файл**: `components/BottomNav.tsx` (lines 87-94)

```typescript
{
  name: 'Profile',
  href: '#',
  icon: UserIcon,
  activeIcon: UserSolidIcon,
  onClick: () => {
    if (!publicKeyString) {  // ← 🚨 ПРОБЛЕМА ТУТ!
      setShowLoginPopup(true)  // Показываем Login popup
      return
    }
    setShowProfilePanel(true)  // Открываем панель профиля
  }
}
```

**Почему это проблема:**

1. **Для гостей**: `publicKeyString` = `null`
2. **Условие**: `!publicKeyString` → `!null` → `true`
3. **Результат**: Показывается `LoginPopup` вместо панели профиля

---

## 🔍 КАК ЭТО РАБОТАЕТ ДЛЯ ГОСТЕЙ

### **Guest User Flow:**

1. **Авторизация** (`POST /api/auth/guest`):
   - Создаётся user с `wallet: "FK_..."` (НЕ валидный Solana адрес)
   - `solanaWallet: null`
   - Генерируется JWT token

2. **localStorage**:
   ```
   fonana_device_id: "device_abc123"
   fonana_user_wallet: "FK_Qm7..."  ← Fake wallet
   fonana_guest_auth: "true"
   ```

3. **WalletStoreSync** (lines 222-240):
   ```typescript
   const fakePublicKey = (savedWallet.startsWith('TG_') || savedWallet.startsWith('FK_')) 
     ? null  // ← Для гостей publicKey = null!
     : new PublicKey(savedWallet)
   
   useWalletStore.getState().updateState({
     connected: true,
     publicKey: fakePublicKey,  // null для гостей
     ...
   })
   ```

4. **BottomNav state**:
   - `user` = ✅ есть (загружен из store)
   - `publicKeyString` = ❌ `null` (потому что publicKey = null)
   - `connected` = ✅ `true` (эмулируется в WalletStoreSync)

---

## 🎯 АРХИТЕКТУРНАЯ ПРОБЛЕМА

### **Ошибочное предположение:**

Код `BottomNav.tsx` предполагает:
- "Пользователь авторизован" ⇔ "`publicKeyString` не null"

**Но это неправильно!**

Реальность:
- **Wallet users**: `publicKeyString` ≠ null ✅
- **Guest users**: `publicKeyString` = null ❌
- **Telegram users**: `publicKeyString` = null ❌

---

## 📊 СРАВНЕНИЕ С ДРУГИМИ КОМПОНЕНТАМИ

### **LeftSidebar.tsx** (desktop) - РАБОТАЕТ ПРАВИЛЬНО!

```typescript
{connected && user && (
  <div className="p-4 border-t">
    <Link href={getProfileLink(user)}>
      {user.avatar ? (
        <img src={user.avatar} />
      ) : (
        <div className="bg-gradient-to-br">
          {user.nickname?.charAt(0)}
        </div>
      )}
    </Link>
  </div>
)}
```

**Условие**: `connected && user`  
**Почему работает**: Для гостей `connected = true` (эмулируется в WalletStoreSync)

---

### **BottomNav.tsx** (mobile) - НЕ РАБОТАЕТ!

```typescript
if (user && publicKeyString) {  // ← Ошибка: publicKeyString = null для гостей
  return <Avatar />
}
```

**Условие**: `user && publicKeyString`  
**Почему НЕ работает**: Для гостей `publicKeyString = null`

---

## 🔍 ДОПОЛНИТЕЛЬНЫЕ ПРОБЛЕМЫ

### **Create Button**

**Файл**: `components/BottomNav.tsx` (lines 67-74)

```typescript
{
  name: 'Create',
  href: '#',
  onClick: () => {
    if (!publicKeyString) {  // ← Гостям нельзя создавать контент?
      setShowLoginPopup(true)
      return
    }
    setShowCreateModal(true)
  }
}
```

**Проблема**: Гости не могут создавать контент (даже публичный)

**Но согласно INDEX.md**:
```markdown
Ограничения для гостевых пользователей:
- ❌ Нельзя создавать платный контент
- ✅ Можно писать в чаты
- ✅ Можно просматривать публичный контент
```

**Вопрос**: Должны ли гости создавать БЕСПЛАТНЫЙ контент?

---

## 🎯 РЕШЕНИЯ

### **Solution 1: Изменить условие на `connected && user`**

**Плюсы**:
- ✅ Простое решение
- ✅ Совместимо с LeftSidebar
- ✅ Работает для всех типов пользователей

**Минусы**:
- ⚠️ `connected` может быть `true` даже без user (теоретически)

**Код**:
```typescript
// BottomNav.tsx line 144
if (connected && user) {  // Вместо: if (user && publicKeyString)
  return <Avatar />
}

// BottomNav.tsx line 87
onClick: () => {
  if (!connected || !user) {  // Вместо: if (!publicKeyString)
    setShowLoginPopup(true)
    return
  }
  setShowProfilePanel(true)
}
```

---

### **Solution 2: Проверять `user` И тип wallet**

**Плюсы**:
- ✅ Более явная проверка
- ✅ Работает для всех типов пользователей

**Минусы**:
- ⚠️ Более сложный код
- ⚠️ Нужно добавить helper функцию

**Код**:
```typescript
// Добавить helper
const isUserAuthenticated = () => {
  if (!user) return false
  // Wallet user: publicKeyString есть
  if (publicKeyString) return true
  // Guest/Telegram user: wallet начинается с FK_ или TG_
  if (user.wallet?.startsWith('FK_') || user.wallet?.startsWith('TG_')) return true
  return false
}

// Использовать
if (isUserAuthenticated()) {
  return <Avatar />
}
```

---

### **Solution 3: Добавить флаг `isGuest` / `isTelegram` в store**

**Плюсы**:
- ✅ Самый чистый подход
- ✅ Легко читается

**Минусы**:
- ⚠️ Нужно изменять store
- ⚠️ Больше изменений в коде

**Код**:
```typescript
// appStore.ts
interface AppState {
  user: User | null
  isGuest: boolean      // ← Добавить
  isTelegram: boolean   // ← Добавить
}

// WalletStoreSync.tsx
if (savedWallet.startsWith('FK_')) {
  useAppStore.getState().setIsGuest(true)
}

// BottomNav.tsx
const { user, isGuest, isTelegram } = useAppStore()
const isAuthenticated = user && (publicKeyString || isGuest || isTelegram)
```

---

## 📋 РЕКОМЕНДОВАННОЕ РЕШЕНИЕ

### **🎯 Solution 1 (Простой и быстрый)**

**Изменения**:
1. `BottomNav.tsx` line 144: `user && publicKeyString` → `connected && user`
2. `BottomNav.tsx` line 88: `!publicKeyString` → `!connected || !user`
3. `BottomNav.tsx` line 68 (Create button): оставить как есть (гости не создают контент)

**Время**: 5 минут  
**Риск**: Низкий  
**Тестирование**: Простое

---

### **Альтернатива: Solution 2 (Более явный)**

Если нужна более строгая проверка + возможность отличать гостей от wallet users

---

## 🔍 ДОПОЛНИТЕЛЬНЫЕ ВОПРОСЫ

### **1. Должны ли гости создавать контент?**

**Текущее поведение**: Нет (Create button → Login popup)

**Документация** (INDEX.md):
```markdown
❌ Нельзя создавать платный контент
```

**Не сказано про бесплатный контент!**

**Вопросы**:
- Могут ли гости создавать бесплатные посты?
- Или они только читают и пишут в чаты?

---

### **2. Нужен ли отдельный UI для гостей?**

**Примеры**:
- Кнопка "Upgrade to Full Account" (подключить кошелёк)
- Badge "Guest" на аватаре
- Ограниченная функциональность с подсказками

---

### **3. Должны ли гости видеть платный контент?**

**Текущее поведение**: ?

**Вопросы**:
- Показывать ли "Locked" контент с призывом подключить кошелёк?
- Или скрывать полностью?

---

## 🎯 SUMMARY

### **Root Cause:**
`BottomNav.tsx` использует `publicKeyString` для проверки авторизации, но для гостей `publicKeyString = null`

### **Impact:**
- ❌ Аватар не показывается
- ❌ Profile button не работает
- ❌ UX broken для guest users

### **Recommended Fix:**
Изменить условие с `user && publicKeyString` на `connected && user`

### **Files to Change:**
- `components/BottomNav.tsx` (2 места: line 144 и line 88)

### **Time Estimate:**
- Изменение: 5 минут
- Тестирование: 10 минут
- **Total**: 15 минут

---

## ✅ TESTING CHECKLIST

После фикса проверить:

1. **Guest User**:
   - [ ] Аватар показывается в bottom nav
   - [ ] Клик на аватар открывает profile panel
   - [ ] Profile panel показывает данные гостя

2. **Wallet User**:
   - [ ] Аватар показывается (не сломали)
   - [ ] Клик работает (не сломали)

3. **Telegram User** (если используется):
   - [ ] Аватар показывается
   - [ ] Клик работает

4. **Not Logged In**:
   - [ ] Показывается иконка `UserIcon`
   - [ ] Клик открывает LoginPopup

---

**Status**: ✅ Analysis Complete  
**Ready for**: Implementation  
**Priority**: 🔴 HIGH (критичный UX bug для гостей)
