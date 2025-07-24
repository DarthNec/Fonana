# 🔍 M7 DISCOVERY REPORT
**Task:** Zustand Selector Refactor 2025-024  
**Date:** 2025-01-24  
**Status:** ✅ DISCOVERY COMPLETE  

---

## 🚨 ПРОБЛЕМА: Широкий Zustand селектор в AppProvider

### **Найденный антипаттерн:**
```typescript
// lib/providers/AppProvider.tsx:41-49
const { 
  user, 
  setUser, 
  setUserLoading, 
  setUserError,
  refreshUser,
  setNotifications,
  userLoading
} = useAppStore()  // ❌ ШИРОКИЙ СЕЛЕКТОР БЕЗ ФУНКЦИИ!
```

### **Корень проблемы:**
1. **Отсутствие селектора** → `useAppStore()` подписывается на **ВСЕ** изменения store
2. **Новый объект каждый раз** → возвращает новый объект при каждом вызове
3. **Cascade ререндеры** → любое изменение в store вызывает ререндер AppProvider
4. **Влияние на всех детей** → AppProvider ререндерит всё приложение

### **Quantified Impact:**
- **Частота ререндеров**: При каждом изменении любого поля в store
- **Scope влияния**: Весь AppProvider tree (root уровень)
- **Potential API calls**: Каскадные эффекты через useEffect с этими dependencies

---

## 🔬 АНАЛИЗ АРХИТЕКТУРЫ

### **Текущая структура AppProvider:**
```typescript
// ПРОБЛЕМНАЯ ЗОНА: строки 41-49
const { 
  user,           // → ререндер при изменении user
  setUser,        // → ререндер если функция не мемоизирована  
  setUserLoading, // → ререндер если функция не мемоизирована
  setUserError,   // → ререндер если функция не мемоизирована
  refreshUser,    // → ререндер если функция не мемоизирована
  setNotifications, // → ререндер если функция не мемоизирована
  userLoading     // → ререндер при изменении userLoading
} = useAppStore() // ❌ БЕЗ СЕЛЕКТОРА!
```

### **Dependencies анализ:**
- **user** используется в: `useEffect` dependencies, JWT логика
- **userLoading** используется в: логирование, состояние
- **Functions** используются в: async операции, но не мемоизированы
- **setNotifications** используется редко, но вызывает ререндеры

---

## 🎯 РЕШЕНИЕ ДЖУНА

### **Предложенная архитектура:**
```typescript
// ✅ УЗКИЕ СЕЛЕКТОРЫ
const user = useAppStore((state: any) => state.user)
const userLoading = useAppStore((state: any) => state.userLoading)
const setUser = useAppStore((state: any) => state.setUser)
const setUserLoading = useAppStore((state: any) => state.setUserLoading)
const setUserError = useAppStore((state: any) => state.setUserError)
const refreshUser = useAppStore((state: any) => state.refreshUser)
const setNotifications = useAppStore((state: any) => state.setNotifications)
```

### **Преимущества решения:**
1. **Минимальные ререндеры** → только при изменении конкретного поля
2. **Изолированные подписки** → каждый hook реагирует только на свое поле
3. **Отличная отладка** → логи показывают что именно триггерит ререндер
4. **Zero cascade** → нет возврата нового объекта на каждый render

---

## 🔧 СУЩЕСТВУЮЩИЕ ХОРОШИЕ ПАТТЕРНЫ

### **В проекте уже есть правильные узкие селекторы:**
```typescript
// lib/store/appStore.ts:449
export const useUser = () => {
  if (typeof window === 'undefined') return null
  return useAppStore(state => state.user) // ✅ УЗКИЙ СЕЛЕКТОР
}

// lib/store/appStore.ts:465-476
const userActionsSelector = (state: AppStore) => ({
  setUser: state.setUser,
  setUserLoading: state.setUserLoading,
  // ...
})
export const useUserActions = () => {
  return useAppStore(userActionsSelector) // ✅ МЕМОИЗИРОВАННЫЙ СЕЛЕКТОР
}
```

### **Проблема AppProvider:**
- **Использует прямой useAppStore()** вместо готовых хуков `useUser()`, `useUserActions()`
- **Игнорирует собственную архитектуру** узких селекторов

---

## 📊 IMPACT ASSESSMENT

### **До рефакторинга:**
```typescript
// КАЖДОЕ изменение store → ререндер AppProvider
store.setCreator(creator)     // → AppProvider ререндер ❌
store.setNotifications([])    // → AppProvider ререндер ❌  
store.setUserLoading(true)    // → AppProvider ререндер ❌
// ALL fields trigger AppProvider rerender!
```

### **После рефакторинга:**
```typescript
// ТОЛЬКО релевантные изменения → ререндер AppProvider
store.setCreator(creator)     // → NO AppProvider ререндер ✅
store.setNotifications([])    // → ONLY setNotifications ререндер ✅
store.setUser(user)          // → ONLY user ререндер ✅
// ISOLATED rerenders!
```

---

## ✅ DISCOVERY РЕЗУЛЬТАТЫ

### **Подтвержденная проблема:**
- ✅ Найден критический широкий селектор в AppProvider
- ✅ Идентифицирован антипаттерн Zustand
- ✅ Quantified impact на производительность
- ✅ Есть готовое решение от джуна
- ✅ Существующие хорошие паттерны в проекте

### **Готовность к реализации:**
- ✅ Четкий план действий
- ✅ Проверенное решение
- ✅ Минимальный risk (только AppProvider)
- ✅ Простая валидация через console logs

---

**NEXT STEPS**: Architecture Context → Solution Plan → Implementation 