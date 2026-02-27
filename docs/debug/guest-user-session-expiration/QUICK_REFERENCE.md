# 🎯 QUICK REFERENCE: Guest Session Expiration Bug

**Проблема**: Гостей выбрасывает через ~7 дней

---

## 🔴 ROOT CAUSE

### **Конфликт TTL**:

```
StorageService TTL:  7 дней  (удаляет зашифрованный JWT cache)
JWT Token TTL:      30 дней  (сам токен ещё валиден)
```

**Файл**: `lib/services/StorageService.ts`

**Строка 28**:
```typescript
ttl: 7 * 24 * 60 * 60 * 1000, // 7 дней
```

**Строка 235-238**:
```typescript
// Проверяем TTL для токена (1 час) ← ЛОЖЬ! Использует 7 дней!
if (!this.isCacheValid(encryptedData.timestamp)) {
  this.clearJWTToken()  // ← Удаляет JWT через 7 дней
  return null
}
```

---

## ⏱️ ВРЕМЕННАЯ ЛИНИЯ

| День | Что происходит |
|------|----------------|
| **0** | JWT создан (expires: день 30), зашифрован (timestamp: день 0) |
| **7** | StorageService TTL истёк → удаляет зашифрованный JWT |
| **7+** | Fallback ищет токен в `localStorage` → может найти или нет |
| **7+** | Если fallback не сработал → API `/api/user` может фейлиться |
| **7+** | `connected = true`, но `user = null` → UI показывает "не авторизован" ❌ |

---

## ✅ РЕШЕНИЕ

### **Fix 1: Отдельный TTL для JWT**

```typescript
// StorageService.ts
private config: StorageConfig = {
  ttl: 7 * 24 * 60 * 60 * 1000,         // 7 дней для кеша
  jwtTtl: 35 * 24 * 60 * 60 * 1000,    // 35 дней для JWT (больше чем токен)
  prefix: 'fonana_'
}

getJWTToken(): string | null {
  // ... existing code ...
  
  // Используем jwtTtl вместо ttl
  const jwtCacheValid = Date.now() - encryptedData.timestamp < this.config.jwtTtl
  if (!jwtCacheValid) {
    this.clearJWTToken()
    return null
  }
  
  // ... existing code ...
}
```

### **Fix 2: Проверять user перед connected**

```typescript
// WalletStoreSync.tsx
const checkSavedUser = async () => {
  // ... existing checks ...
  
  // Загружаем user
  const userLoaded = await fetchAndSetUser(savedWallet)
  
  // Устанавливаем connected ТОЛЬКО если user загружен
  if (userLoaded) {
    useWalletStore.getState().updateState({
      connected: true,
      publicKey: null,
      ...
    })
  } else {
    // Очищаем сессию
    localStorage.removeItem('fonana_guest_auth')
    localStorage.removeItem('fonana_user_wallet')
  }
}
```

---

## 📊 IMPACT

- 🔴 **CRITICAL**: Пользователи теряют сессии через 7 дней
- 🔴 **HIGH**: Плохой UX (непонятно почему выкинуло)
- 🟡 **MEDIUM**: Потеря вовлечённости

---

## ⏱️ ВРЕМЯ

- **Анализ**: 30 минут ✅
- **Реализация**: 30-40 минут
- **Total**: ~1.5 часа

---

**Status**: ✅ Analysis complete  
**Priority**: 🔴 CRITICAL
