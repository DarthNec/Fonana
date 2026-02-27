# 🎯 QUICK REFERENCE: Guest User Disappears After 20-30 Seconds

**Проблема**: Гость исчезает через 20-30 сек (localStorage есть, user = null)

---

## 🔴 ROOT CAUSE

**Файл**: `lib/store/walletStore.ts` (строка 102)

```typescript
updateState: (updates) => {
  if(!updates.connected) {
    const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
    
    if (isTelegramAuth) {  // ← ТОЛЬКО TELEGRAM! НЕТ GUEST!
      // Сохраняем сессию
    } else {
      // Удаляем ВСЁ (включая гостей!) ← БАГ!
      localStorage.removeItem('fonana-app-store')  // ← УДАЛЯЕТ USER!
    }
  }
}
```

**Проблема**: Проверка **только** для Telegram, **НЕ** для Guest!

---

## ⏱️ ЧТО ПРОИСХОДИТ

| Время | Событие |
|-------|---------|
| **0 сек** | Страница загружается, guest user загружен, аватар показывается ✅ |
| **1-19 сек** | Всё работает стабильно ✅ |
| **20-30 сек** | Phantom Wallet инициализируется → `connected = false` |
| **20-30 сек** | `walletStore.updateState({ connected: false })` вызывается |
| **20-30 сек** | Проверка `if (isTelegramAuth)` → **false** (это гость!) |
| **20-30 сек** | Попадает в `else` → удаляет `fonana-app-store` ❌ |
| **20-30 сек** | `user` исчезает из store ❌ |
| **20-30 сек** | Аватар слетает ❌ |

**localStorage НЕ очищается**:
- ✅ `fonana_guest_auth = 'true'` - остаётся
- ✅ `fonana_user_wallet = 'FK_...'` - остаётся
- ❌ `fonana-app-store = null` - удалён!

---

## ✅ РЕШЕНИЕ

### **Fix: Добавить проверку Guest**

```typescript
// lib/store/walletStore.ts (строка 102)

// Было:
const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'

if (isTelegramAuth) {

// Стало:
const isTelegramAuth = localStorage.getItem('fonana_telegram_auth') === 'true'
const isGuestAuth = localStorage.getItem('fonana_guest_auth') === 'true'

if (isTelegramAuth || isGuestAuth) {  // ← ДОБАВИТЬ || isGuestAuth
```

**Изменение**: 1 строка!

---

## 📊 IMPACT

- 🔴 **CRITICAL**: Гости теряют сессию через 20-30 сек
- 🔴 **HIGH**: UX сломан (непонятно почему выкинуло)
- 🔴 **HIGH**: Inconsistent state (localStorage есть, user = null)

---

## ⏱️ ВРЕМЯ

- **Анализ**: 30 минут ✅
- **Реализация**: 5 минут (1 строка!)
- **Total**: 35 минут

---

**Status**: ✅ Analysis complete  
**Priority**: 🔴 CRITICAL  
**Risk**: 🟢 LOW (1 line change)
