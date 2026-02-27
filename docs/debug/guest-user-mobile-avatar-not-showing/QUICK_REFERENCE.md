# 🎯 QUICK REFERENCE: Guest User Avatar Bug

**Проблема**: Аватар гостя не показывается в мобильном bottom nav

---

## 🔴 ROOT CAUSE

**Файл**: `components/BottomNav.tsx`

**Строка 144**:
```typescript
if (user && publicKeyString) {  // ← ОШИБКА
```

**Проблема**: Для гостей `publicKeyString = null` (потому что `FK_` не валидный Solana адрес)

---

## ✅ РЕШЕНИЕ

**Изменить на**:
```typescript
if (connected && user) {  // ← ПРАВИЛЬНО
```

**Также изменить строку 88**:
```typescript
// Было:
if (!publicKeyString) {
  setShowLoginPopup(true)
  return
}

// Стало:
if (!connected || !user) {
  setShowLoginPopup(true)
  return
}
```

---

## 📝 ОБЪЯСНЕНИЕ

**Гостевые пользователи**:
- ✅ `user` существует
- ✅ `connected = true` (эмулируется в WalletStoreSync)
- ❌ `publicKeyString = null` (FK_ не валидный адрес)

**Текущий код**:
```typescript
user && publicKeyString  // true && null → false ❌
```

**Правильный код**:
```typescript
connected && user  // true && true → true ✅
```

---

## 📊 АНАЛОГИЯ

**LeftSidebar (desktop)** - работает правильно:
```typescript
{connected && user && (
  <Avatar />
)}
```

**BottomNav (mobile)** - не работает:
```typescript
{user && publicKeyString && (  // ← Ошибка
  <Avatar />
)}
```

---

## ⏱️ TIME ESTIMATE

- **Fix**: 5 минут
- **Test**: 10 минут
- **Total**: 15 минут

---

## ✅ TESTING

Проверить после фикса:

1. **Guest**: Аватар показывается ✅
2. **Wallet**: Аватар показывается ✅
3. **Not logged in**: Иконка показывается ✅
4. **Click on avatar**: Profile panel открывается ✅

---

**Priority**: 🔴 HIGH  
**Status**: Ready to fix
