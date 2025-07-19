# 🔍 DISCOVERY REPORT: setState В RENDER ЦИКЛЕ КРИТИЧЕСКАЯ ОШИБКА

**Дата:** 18.01.2025  
**Статус:** В процессе research  
**Приоритет:** 🔴 КРИТИЧЕСКИЙ  

## 📋 ОПИСАНИЕ ПРОБЛЕМЫ

### Симптомы:
- **React Error**: `Cannot update a component (HotReload) while rendering a different component (ConversationPage)`
- **Локация**: `app/messages/[id]/page.tsx:48:116`
- **Следствие**: Бесконечные re-renders, performance degradation, потенциальные crashes

### Контекст:
- Компонент: `ConversationPage` в чат-диалогах
- Вызывающий фактор: Загрузка сообщений и установка participant
- Частота: Происходит **каждый раз** при загрузке диалога

## 🔍 ПРЕДВАРИТЕЛЬНОЕ ИССЛЕДОВАНИЕ

### 1. Что такое setState в render цикле?

**Определение**: Вызов setState функций непосредственно во время выполнения рендер фазы React компонента.

**React Render Phases**:
1. **Render Phase** - вычисление нового virtual DOM
2. **Commit Phase** - применение изменений к реальному DOM

**Проблема**: setState во время Render Phase вызывает:
- Immediate re-render запрос
- Infinite loop между render → setState → render
- Performance bottleneck
- Потенциальный stack overflow

### 2. Анализ текущих исправлений

**Попытка 1: setTimeout(() => {}, 0)**
```javascript
// Пробовал обернуть:
setTimeout(() => {
  setParticipant(otherParticipant)
}, 0)
```

**Результат**: ❌ НЕ РАБОТАЕТ
**Причина**: setTimeout отложит выполнение, но не решит корневую проблему

### 3. Источники setState в render цикле

**Найденные локации:**

#### A. `loadMessages` функция (строка ~244):
```javascript
if (otherParticipant) {
  setTimeout(() => {
    setParticipant(otherParticipant) // ❌ Все еще в render цикле
  }, 0)
}
```

#### B. `checkCircuitBreaker` функция:
```javascript
setCircuitBreakerState({...}) // ❌ Вызывается во время рендера
```

#### C. `loadConversationInfo` callback:
```javascript
setParticipant(conversation.participant) // ❌ setState в async callback
```

#### D. `incrementCallCounter` callback:
```javascript
setCircuitBreakerState(prev => ({...})) // ❌ setState в callback
```

## 🧪 АНАЛИЗ АЛЬТЕРНАТИВ

### Alternative 1: useRef для synchronous storage
```javascript
const participantRef = useRef(null)
// Хранить данные в ref вместо state для immediate access
```

### Alternative 2: useEffect с dependency для async updates
```javascript
useEffect(() => {
  // Отложенное обновление после рендера
}, [triggerData])
```

### Alternative 3: useLayoutEffect для синхронного обновления
```javascript
useLayoutEffect(() => {
  // Выполняется synchronously после DOM mutations
}, [])
```

### Alternative 4: Reducer pattern с dispatch
```javascript
const [state, dispatch] = useReducer(reducer, initialState)
// dispatch не вызывает immediate re-render
```

### Alternative 5: External state management (Zustand)
```javascript
// Вынести state за пределы компонента
const useParticipantStore = create((set) => ({
  participant: null,
  setParticipant: (p) => set({ participant: p })
}))
```

## 📊 ИССЛЕДОВАНИЕ BEST PRACTICES

### React Official Guidelines:
1. **Never call setState during render phase**
2. **Use useEffect for side effects**
3. **Use useCallback/useMemo for expensive computations**
4. **Consider external state for complex state logic**

### Community Solutions:
1. **Dan Abramov approach**: Move setState to useEffect
2. **Kent C. Dodds approach**: Use useLayoutEffect for DOM-related updates
3. **Redux Toolkit approach**: External state management
4. **React Query approach**: Server state separation

### Performance Considerations:
- **setState cost**: ~0.1-1ms per call
- **Re-render cost**: ~1-10ms per component tree
- **Infinite loop risk**: 100% CPU usage, browser freeze

## 🔄 PRECEDENTS В ПРОЕКТЕ

### Похожие проблемы:
1. **WebSocket infinite loops**: Решено отключением auto-connect
2. **Conversations API loops**: Решено circuit breaker pattern
3. **Fast refresh errors**: Решено dependency optimization

### Успешные паттерны:
1. **Circuit breaker**: Используется в `checkCircuitBreaker`
2. **useCallback**: Используется для stable references
3. **Dependency arrays**: Тщательно контролируются в useEffect

## 🎯 PLAYWRIGHT MCP ИССЛЕДОВАНИЕ

### Browser Automation Plan:
1. **Navigate** к `/messages/[id]` странице
2. **Monitor** console errors в real-time
3. **Capture** network requests during load
4. **Take snapshots** at each render cycle
5. **Measure** performance metrics

### Test Scenarios:
1. **Fresh page load**: Первая загрузка диалога
2. **Refresh behavior**: F5 обновление страницы
3. **Navigation**: Переход между диалогами
4. **Memory pressure**: Множественные открытия/закрытия

## 📈 ВЫВОДЫ DISCOVERY

### Корневая причина:
**setState вызывается непосредственно во время рендер фазы**, что противоречит React architecture principles.

### setTimeout не помогает потому что:
1. **Callback все еще в render context**
2. **Async execution не меняет timing**
3. **React уже находится в render phase**

### Критичность:
- 🔴 **Production blocking**: Влияет на все диалоги
- 🔴 **Performance critical**: Infinite re-renders
- 🔴 **User experience**: Потенциальные зависания

### Необходимые следующие шаги:
1. **ARCHITECTURE_CONTEXT.md**: Анализ компонента и data flow
2. **SOLUTION_PLAN.md**: Выбор правильного архитектурного решения
3. **IMPLEMENTATION_SIMULATION.md**: Моделирование всех edge cases
4. **Browser testing**: Playwright validation

## ✅ DISCOVERY CHECKLIST

- [x] Проблема идентифицирована: setState в render цикле
- [x] Корневая причина найдена: loadMessages во время рендера
- [x] Альтернативы исследованы: 5 потенциальных решений
- [x] Best practices проанализированы: React guidelines
- [x] Precedents изучены: Похожие проблемы в проекте
- [ ] Browser automation подготовлен: Playwright scenarios
- [ ] Performance impact измерен: Metrics collection
- [ ] Solution decision: Выбор оптимального подхода

**Следующий файл**: ARCHITECTURE_CONTEXT.md для анализа component structure и data dependencies. 