# 🐛 МЕТОДОЛОГИЯ ОТЛАДКИ И ПРЕДОТВРАЩЕНИЯ АРХИТЕКТУРНЫХ ПРОБЛЕМ

## 📋 НАЗНАЧЕНИЕ
Этот документ описывает методологию быстрой диагностики проблем и предотвращения архитектурных несоответствий, которые могут привести к многочасовой отладке простых проблем.

---

## 🚨 ГЛАВНОЕ ПРАВИЛО: ПРОВЕРЯЙ ДАННЫЕ, А НЕ КОД!

### ❌ Как НЕ надо делать (наш случай):
1. Проблема: "Авторизация сбрасывается при обновлении"
2. Потратили 5 часов на:
   - Исправление race conditions
   - Переписывание логики провайдеров
   - Добавление сложных проверок
   - Рефакторинг компонентов
3. **Реальная проблема**: Просто не сохранялся нужный ключ в localStorage!

### ✅ Как НАДО делать:
1. **ПЕРВЫМ ДЕЛОМ** - проверить реальные данные:
   - Открыть DevTools → Application → localStorage
   - Посмотреть что РЕАЛЬНО сохраняется
   - Сравнить с тем, что ОЖИДАЕТ код
2. **Только потом** - искать проблемы в коде

---

## 🔍 ПОШАГОВАЯ МЕТОДОЛОГИЯ ОТЛАДКИ

### 1️⃣ **НЕМЕДЛЕННАЯ ПРОВЕРКА ДАННЫХ (5 минут)**
```javascript
// В консоли браузера
console.table(Object.entries(localStorage))

// Проверить конкретные ключи
['key1', 'key2', 'key3'].forEach(key => {
  console.log(`${key}:`, localStorage.getItem(key))
})

// Проверить формат данных
try {
  const data = JSON.parse(localStorage.getItem('key'))
  console.log('Parsed data:', data)
} catch (e) {
  console.log('Not JSON:', localStorage.getItem('key'))
}
```

### 2️⃣ **ПРОВЕРКА ПОТОКА ДАННЫХ (10 минут)**
```javascript
// Добавить логирование в критические места
console.log('SAVE:', { key, value, location: 'auth.ts:43' })
console.log('LOAD:', { key, value, location: 'provider.tsx:28' })
console.log('CHECK:', { key, exists: !!value, location: 'header.tsx:15' })
```

### 3️⃣ **АРХИТЕКТУРНЫЙ АНАЛИЗ (15 минут)**
- **Где сохраняются данные?** (grep для localStorage.setItem)
- **Где читаются данные?** (grep для localStorage.getItem)
- **Совпадают ли ключи?** (сравнить названия)
- **Согласована ли логика?** (один сохраняет, другой читает)

### 4️⃣ **ТОЛЬКО ПОСЛЕ ЭТОГО - КОД (если нужно)**

---

## 🏗️ ПРЕДОТВРАЩЕНИЕ АРХИТЕКТУРНЫХ ПРОБЛЕМ

### 1. **Единая точка управления состоянием**
```typescript
// ❌ ПЛОХО - разбросанное управление
// auth/hooks.ts
localStorage.setItem('fonana_user', user)

// wallet/provider.tsx  
localStorage.setItem('fonana_wallet', wallet)

// somewhere/else.ts
localStorage.setItem('fonana_user_wallet', userWallet)

// ✅ ХОРОШО - централизованное управление
// lib/storage/auth.ts
export const AuthStorage = {
  saveSession(user, wallet) {
    localStorage.setItem('fonana_session', JSON.stringify({
      user,
      wallet,
      timestamp: Date.now()
    }))
  },
  
  loadSession() {
    const data = localStorage.getItem('fonana_session')
    return data ? JSON.parse(data) : null
  },
  
  clearSession() {
    localStorage.removeItem('fonana_session')
  }
}
```

### 2. **Документирование хранилища**
```typescript
// lib/storage/types.ts
export interface StorageSchema {
  'fonana_session': {
    user: User
    wallet: string
    timestamp: number
  }
  'fonana_preferences': {
    theme: 'light' | 'dark'
    language: string
  }
}

// Это позволяет видеть ВСЕ что хранится
```

### 3. **Валидация при чтении**
```typescript
// ❌ ПЛОХО - доверяем данным
const user = JSON.parse(localStorage.getItem('user'))

// ✅ ХОРОШО - проверяем формат
const loadUser = () => {
  try {
    const data = localStorage.getItem('user')
    if (!data) return null
    
    const parsed = JSON.parse(data)
    
    // Проверяем структуру
    if (!parsed.id || !parsed.wallet) {
      console.error('Invalid user data:', parsed)
      return null
    }
    
    return parsed
  } catch (error) {
    console.error('Failed to load user:', error)
    return null
  }
}
```

---

## 🎯 ЧЕКЛИСТ БЫСТРОЙ ДИАГНОСТИКИ

### При любой проблеме с состоянием:
- [ ] Открыл DevTools → Application → localStorage?
- [ ] Проверил что РЕАЛЬНО сохранено?
- [ ] Сравнил ключи в коде и в хранилище?
- [ ] Проверил формат данных (строка/JSON)?
- [ ] Нашел ВСЕ места где сохраняется?
- [ ] Нашел ВСЕ места где читается?
- [ ] Убедился что логика согласована?

### Красные флаги архитектуры:
- 🚩 Разные части кода управляют одними данными
- 🚩 Нет единого места для работы с хранилищем
- 🚩 Ключи хранилища не документированы
- 🚩 Нет валидации при чтении данных
- 🚩 Сложная логика для простых вещей

---

## 📊 МЕТРИКИ ХОРОШЕЙ АРХИТЕКТУРЫ

### Storage Management
- ✅ Один модуль для работы с localStorage
- ✅ Типизированная схема хранилища
- ✅ Валидация при чтении
- ✅ Централизованная очистка

### Debugging Speed
- ✅ Проблема найдена за 5-15 минут
- ✅ Данные проверены ДО кода
- ✅ Логи показывают поток данных
- ✅ Архитектура понятна с первого взгляда

---

## 🛠️ ИНСТРУМЕНТЫ БЫСТРОЙ ДИАГНОСТИКИ

### Browser Console Snippets
```javascript
// Показать все localStorage
console.table(Object.entries(localStorage))

// Мониторинг изменений
const watchStorage = (key) => {
  const original = localStorage.getItem(key)
  console.log(`Watching ${key}:`, original)
  
  const interval = setInterval(() => {
    const current = localStorage.getItem(key)
    if (current !== original) {
      console.log(`${key} changed:`, { from: original, to: current })
    }
  }, 100)
  
  return () => clearInterval(interval)
}

// Поиск по значению
const findInStorage = (searchValue) => {
  Object.entries(localStorage).forEach(([key, value]) => {
    if (value.includes(searchValue)) {
      console.log(`Found in ${key}:`, value)
    }
  })
}
```

### Debug Mode
```typescript
// lib/debug.ts
export const StorageDebug = {
  enable() {
    // Перехватываем все операции с localStorage
    const originalSet = localStorage.setItem
    const originalGet = localStorage.getItem
    const originalRemove = localStorage.removeItem
    
    localStorage.setItem = function(key, value) {
      console.log('📝 SET:', { key, value, stack: new Error().stack })
      return originalSet.call(this, key, value)
    }
    
    localStorage.getItem = function(key) {
      const value = originalGet.call(this, key)
      console.log('📖 GET:', { key, value, found: value !== null })
      return value
    }
    
    localStorage.removeItem = function(key) {
      console.log('🗑️ REMOVE:', { key })
      return originalRemove.call(this, key)
    }
  }
}
```

---

## 💡 ГЛАВНЫЕ УРОКИ

### 1. **Данные важнее кода**
Всегда проверяй что РЕАЛЬНО происходит, а не что ДОЛЖНО происходить по коду.

### 2. **Простые проблемы имеют простые решения**
Если решение становится сложным - ты решаешь не ту проблему.

### 3. **Архитектурная согласованность**
Разные части системы должны работать по одним правилам.

### 4. **Отладка должна быть быстрой**
Если ищешь проблему больше 30 минут - используешь неправильный подход.

---

## 🚀 ПРИМЕНЕНИЕ

### При каждой проблеме:
1. **СТОП!** Не лезь в код
2. Открой DevTools
3. Проверь данные
4. Найди несоответствие
5. Только потом исправляй код

### При проектировании:
1. Централизуй управление состоянием
2. Документируй хранилище
3. Добавляй валидацию
4. Делай архитектуру очевидной

---

**🎯 REMEMBER: 5 минут проверки данных экономят 5 часов отладки кода!** 