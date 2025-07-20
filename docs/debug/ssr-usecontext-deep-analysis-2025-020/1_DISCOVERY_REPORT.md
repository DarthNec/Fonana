# 🔍 DISCOVERY REPORT: SSR useContext Root Cause Analysis

## 📅 Date: 2025-01-20
## 🎯 Goal: Find TRUE source of useContext null errors during SSR

---

## 🧪 **СВЕЖИЙ ВЗГЛЯД НА ПРОБЛЕМУ**

### **Observed Symptom**
```
TypeError: Cannot read properties of null (reading 'useContext')
at t.useContext (next-server/app-page.runtime.prod.js:12:108898)
at g (/Users/dukeklevenski/Web/Fonana/.next/server/chunks/5834.js:1:22517)
at p (/Users/dukeklevenski/Web/Fonana/.next/server/chunks/5834.js:1:13569)
```

### **Критическое наблюдение**
Ошибка происходит в **chunks/5834.js** - это СКОМПИЛИРОВАННЫЙ код, не наш исходный!

---

## 🔎 **ГЛУБОКИЙ АНАЛИЗ CHUNKS**

### **Что такое chunks/5834.js?**
- Это webpack bundle chunk
- Содержит скомпилированный код НЕСКОЛЬКИХ модулей
- Может включать: наш код + vendor код + polyfills

### **Ключевой инсайт**
Функции `g()` и `p()` в стеке - это минифицированные функции. Нам нужно узнать ЧТО они делают!

---

## 🧪 **ЭКСПЕРИМЕНТ 1: Source Map Analysis**

```bash
# Проверим есть ли source maps
ls -la .next/server/chunks/*.map

# Если нет, включим их в next.config.js:
productionBrowserSourceMaps: true
```

---

## 🔬 **ЭКСПЕРИМЕНТ 2: Chunk Content Analysis**

```bash
# Посмотрим что внутри проблемного chunk
cat .next/server/chunks/5834.js | head -100

# Поищем паттерны useContext
grep -o "useContext" .next/server/chunks/5834.js | wc -l

# Поищем другие React hooks
grep -o "useState\|useEffect\|useMemo" .next/server/chunks/5834.js
```

---

## 🎯 **ГИПОТЕЗЫ (НОВЫЕ)**

### **Hypothesis 1: Third-party Library**
Возможно какая-то библиотека использует useContext неправильно:
- react-hot-toast
- @headlessui/react  
- @heroicons/react
- date-fns (маловероятно)

### **Hypothesis 2: Build-time Plugin**
Next.js или webpack plugin может инжектить код:
- SWC transforms
- Babel plugins
- CSS-in-JS runtime

### **Hypothesis 3: Polyfill Issue**
Возможно полифилл для старых браузеров конфликтует с SSR

### **Hypothesis 4: Hidden Provider**
Может быть скрытый Provider в:
- _app.tsx (если есть)
- _document.tsx (если есть)
- Middleware
- Custom server

---

## 🧪 **ПРОВЕРОЧНЫЕ ТЕСТЫ**

### **Test 1: Minimal Build**
```bash
# Создадим минимальную страницу БЕЗ провайдеров
echo 'export default function Test() { return <div>Test</div> }' > app/test/page.tsx
npm run build
# Если работает - проблема в наших компонентах
```

### **Test 2: Binary Search Components**
```bash
# Временно закомментируем половину импортов в layout.tsx
# Потом другую половину
# Найдем проблемный компонент методом исключения
```

### **Test 3: Vendor Library Check**
```bash
# Проверим все внешние библиотеки на useContext
find node_modules -name "*.js" -type f | xargs grep -l "useContext" | grep -v ".map" | sort | uniq
```

---

## 🔍 **НЕОЧЕВИДНЫЕ МЕСТА ДЛЯ ПРОВЕРКИ**

1. **CSS-in-JS Libraries**
   - styled-components (если используется)
   - emotion (если используется)
   - Могут использовать Context для темы

2. **Animation Libraries**
   - framer-motion
   - react-spring
   - Часто используют Context для конфигурации

3. **Form Libraries**
   - react-hook-form
   - formik
   - Могут иметь скрытые провайдеры

4. **Toast/Notification Libraries**
   - react-hot-toast ✅ (используем!)
   - react-toastify
   - Обычно требуют Provider

5. **Modal/Dialog Libraries**
   - @headlessui/react ✅ (используем!)
   - react-modal
   - Часто используют Portal с Context

---

## 🎭 **PLAYWRIGHT BROWSER EXPLORATION**

### **Browser Console Analysis**
```javascript
// 1. Откроем dev сервер
await browser_navigate({ url: "http://localhost:3000" })

// 2. Проверим консоль на client-side
const messages = await browser_console_messages()

// 3. Выполним диагностику
await browser_evaluate({
  function: () => {
    // Найдем все контексты
    const contexts = [];
    for (let key in window) {
      if (key.includes('Context') || key.includes('Provider')) {
        contexts.push(key);
      }
    }
    return contexts;
  }
})
```

---

## 💡 **КРИТИЧЕСКИЙ ИНСАЙТ**

Проблема может быть НЕ в нашем коде напрямую, а в:
1. **Порядке загрузки модулей** при SSR
2. **Race condition** между провайдерами
3. **Webpack chunk splitting** логике
4. **Next.js internal SSR optimization**

---

## 🎯 **НОВЫЙ ПЛАН ДЕЙСТВИЙ**

### **Priority 1: Identify Exact Source**
1. Включить source maps
2. Проанализировать chunk 5834.js
3. Найти оригинальный файл через source map

### **Priority 2: Isolate Problem**
1. Создать test page без провайдеров
2. Постепенно добавлять компоненты
3. Найти точку сбоя

### **Priority 3: Check External Libraries**
1. react-hot-toast - проверить SSR compatibility
2. @headlessui/react - известны проблемы с SSR?
3. Все UI библиотеки на предмет Context usage

---

## ✅ **IMMEDIATE ACTIONS**

```bash
# 1. Анализ текущего chunk
cat .next/server/chunks/5834.js | grep -A5 -B5 "useContext"

# 2. Поиск всех Context в vendor
find node_modules -path "*/node_modules" -prune -o -name "*.js" -type f -exec grep -l "createContext\|useContext" {} \; | grep -E "(toast|headless|hero)" | head -20

# 3. Проверка нашего кода на прямые вызовы
grep -r "useContext" --include="*.tsx" --include="*.ts" app/ components/ lib/ | grep -v "node_modules"

# 4. Next.js конфигурация проверка
cat next.config.js | grep -E "swc|babel|webpack"
```

---

## 🔄 **ВЫВОД**

Проблема глубже чем просто "wallet-adapter использует useContext". Нужно:
1. **Понять что скомпилировано в chunk 5834**
2. **Найти реальный источник через source maps**
3. **Проверить ALL third-party libraries**
4. **Изолировать проблему минимальным примером**

Переходим к ARCHITECTURE_CONTEXT с новым пониманием! 