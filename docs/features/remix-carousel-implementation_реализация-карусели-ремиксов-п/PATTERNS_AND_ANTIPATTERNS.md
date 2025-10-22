# ПАТТЕРНЫ И АНТИПАТТЕРНЫ - Карусель ремиксов постов

## 🎯 Обзор паттернов

### Цель документа
Детальное описание рекомендуемых паттернов и антипаттернов для реализации карусели ремиксов постов, основанное на анализе AI Code Safety, Context7 и лучших практиках React.

## ✅ РЕКОМЕНДУЕМЫЕ ПАТТЕРНЫ

### 1. Gallery/Carousel Pattern
**Описание**: Паттерн галереи для навигации между элементами
**Источник**: React официальная документация

```typescript
// ✅ ПРАВИЛЬНО: Использование индекса для навигации
const [currentIndex, setCurrentIndex] = useState(0)

const handleNext = () => {
  if (currentIndex < remixGroup.length - 1) {
    setCurrentIndex(currentIndex + 1)
  }
}

const handlePrevious = () => {
  if (currentIndex > 0) {
    setCurrentIndex(currentIndex - 1)
  }
}

// Отображение текущего элемента
const currentPost = remixGroup[currentIndex]
```

**Преимущества**:
- Простота реализации
- Предсказуемое поведение
- Легкое тестирование
- Хорошая производительность

### 2. Lifting State Up Pattern
**Описание**: Поднятие состояния в родительский компонент
**Источник**: React официальная документация

```typescript
// ✅ ПРАВИЛЬНО: Состояние в родительском компоненте
function PostCard({ post, onAction }: PostCardProps) {
  const [remixGroup, setRemixGroup] = useState<UnifiedPost[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  return (
    <div>
      <RemixCarousel
        remixGroup={remixGroup}
        currentIndex={currentIndex}
        onNavigate={setCurrentIndex}
        onLoadGroup={setRemixGroup}
      />
    </div>
  )
}
```

**Преимущества**:
- Централизованное управление состоянием
- Легкая передача данных между компонентами
- Предсказуемый flow данных

### 3. Controlled Components Pattern
**Описание**: Управляемые компоненты с внешним состоянием
**Источник**: React официальная документация

```typescript
// ✅ ПРАВИЛЬНО: Управляемый компонент
interface RemixCarouselProps {
  currentIndex: number
  remixGroup: UnifiedPost[]
  onNavigate: (index: number) => void
}

function RemixCarousel({ currentIndex, remixGroup, onNavigate }: RemixCarouselProps) {
  return (
    <div>
      <PostContent post={remixGroup[currentIndex]} />
      <NavigationControls
        currentIndex={currentIndex}
        totalCount={remixGroup.length}
        onPrevious={() => onNavigate(currentIndex - 1)}
        onNext={() => onNavigate(currentIndex + 1)}
      />
    </div>
  )
}
```

**Преимущества**:
- Полный контроль над состоянием
- Легкое тестирование
- Предсказуемое поведение

### 4. Memoization Pattern
**Описание**: Мемоизация для оптимизации производительности
**Источник**: React официальная документация

```typescript
// ✅ ПРАВИЛЬНО: Мемоизация дорогих вычислений
const MemoizedRemixCarousel = memo(RemixCarousel, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.currentIndex === nextProps.currentIndex
  )
})

// ✅ ПРАВИЛЬНО: Мемоизация вычислений
const shouldLoadGroup = useMemo(() => {
  return post.remixId || hasRemixes(post.id)
}, [post.remixId, post.id])

// ✅ ПРАВИЛЬНО: Мемоизация колбэков
const handleNavigate = useCallback((index: number) => {
  setCurrentIndex(index)
}, [])
```

**Преимущества**:
- Оптимизация производительности
- Предотвращение лишних рендеров
- Улучшение пользовательского опыта

### 5. Error Boundary Pattern
**Описание**: Обработка ошибок на уровне компонентов
**Источник**: React официальная документация

```typescript
// ✅ ПРАВИЛЬНО: Error Boundary для карусели
class RemixCarouselErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('RemixCarousel Error:', error, errorInfo)
    // Отправка ошибки в систему мониторинга
  }

  render() {
    if (this.state.hasError) {
      return <PostContent post={this.props.post} />
    }

    return this.props.children
  }
}
```

**Преимущества**:
- Graceful обработка ошибок
- Предотвращение крашей приложения
- Улучшение стабильности

### 6. Custom Hooks Pattern
**Описание**: Вынос логики в переиспользуемые хуки
**Источник**: React официальная документация

```typescript
// ✅ ПРАВИЛЬНО: Custom hook для управления каруселью
function useRemixCarousel(postId: string) {
  const [state, setState] = useState<RemixCarouselState>({
    currentIndex: 0,
    remixGroup: [],
    isLoading: false,
    error: null
  })

  const loadRemixGroup = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`/api/posts/remix-group/${postId}`)
      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        remixGroup: data.remixGroup,
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }))
    }
  }, [postId])

  const navigateTo = useCallback((index: number) => {
    setState(prev => ({ ...prev, currentIndex: index }))
  }, [])

  return {
    ...state,
    loadRemixGroup,
    navigateTo
  }
}
```

**Преимущества**:
- Переиспользуемость логики
- Легкое тестирование
- Разделение ответственности

## ❌ АНТИПАТТЕРНЫ (ИЗБЕГАТЬ)

### 1. Direct DOM Manipulation
**Описание**: Прямое манипулирование DOM элементами
**Проблема**: Нарушение принципов React

```typescript
// ❌ НЕПРАВИЛЬНО: Прямое манипулирование DOM
function RemixCarousel() {
  useEffect(() => {
    const carousel = document.getElementById('remix-carousel')
    carousel.style.transform = `translateX(-${currentIndex * 100}%)`
  }, [currentIndex])

  return <div id="remix-carousel">...</div>
}

// ✅ ПРАВИЛЬНО: Использование React состояния
function RemixCarousel({ currentIndex }: Props) {
  return (
    <div 
      style={{ 
        transform: `translateX(-${currentIndex * 100}%)`,
        transition: 'transform 0.3s ease-in-out'
      }}
    >
      ...
    </div>
  )
}
```

### 2. Mutating State Directly
**Описание**: Прямое изменение состояния
**Проблема**: Нарушение иммутабельности

```typescript
// ❌ НЕПРАВИЛЬНО: Прямое изменение состояния
const handleNext = () => {
  state.currentIndex++ // Мутация состояния
  setState(state)
}

// ✅ ПРАВИЛЬНО: Создание нового состояния
const handleNext = () => {
  setState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }))
}
```

### 3. Missing Dependency Arrays
**Описание**: Неправильные зависимости в useEffect
**Проблема**: Бесконечные циклы или пропущенные обновления

```typescript
// ❌ НЕПРАВИЛЬНО: Отсутствие зависимостей
useEffect(() => {
  loadRemixGroup(post.id)
}, []) // Пропущена зависимость post.id

// ❌ НЕПРАВИЛЬНО: Неправильные зависимости
useEffect(() => {
  loadRemixGroup(post.id)
}, [post]) // post изменяется при каждом рендере

// ✅ ПРАВИЛЬНО: Правильные зависимости
useEffect(() => {
  loadRemixGroup(post.id)
}, [post.id, loadRemixGroup])
```

### 4. Inline Object Creation
**Описание**: Создание объектов в render функции
**Проблема**: Лишние рендеры дочерних компонентов

```typescript
// ❌ НЕПРАВИЛЬНО: Создание объекта в render
function RemixCarousel({ currentIndex }: Props) {
  return (
    <NavigationControls
      config={{ currentIndex, totalCount: remixGroup.length }} // Новый объект каждый раз
    />
  )
}

// ✅ ПРАВИЛЬНО: Мемоизация объекта
function RemixCarousel({ currentIndex }: Props) {
  const config = useMemo(() => ({
    currentIndex,
    totalCount: remixGroup.length
  }), [currentIndex, remixGroup.length])

  return <NavigationControls config={config} />
}
```

### 5. Missing Error Handling
**Описание**: Отсутствие обработки ошибок
**Проблема**: Нестабильное приложение

```typescript
// ❌ НЕПРАВИЛЬНО: Отсутствие обработки ошибок
const loadRemixGroup = async () => {
  const response = await fetch(`/api/posts/remix-group/${postId}`)
  const data = await response.json()
  setRemixGroup(data.remixGroup)
}

// ✅ ПРАВИЛЬНО: Полная обработка ошибок
const loadRemixGroup = async () => {
  try {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    const response = await fetch(`/api/posts/remix-group/${postId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.remixGroup) {
      throw new Error('Invalid response format')
    }
    
    setState(prev => ({
      ...prev,
      remixGroup: data.remixGroup,
      isLoading: false
    }))
  } catch (error) {
    setState(prev => ({
      ...prev,
      error: error.message,
      isLoading: false
    }))
    
    // Логирование ошибки
    console.error('Failed to load remix group:', error)
  }
}
```

### 6. Memory Leaks
**Описание**: Утечки памяти из-за неправильной очистки
**Проблема**: Деградация производительности

```typescript
// ❌ НЕПРАВИЛЬНО: Отсутствие очистки подписок
useEffect(() => {
  const interval = setInterval(() => {
    checkRemixStatus()
  }, 1000)
  
  // Забыли очистить interval
}, [])

// ✅ ПРАВИЛЬНО: Очистка подписок
useEffect(() => {
  const interval = setInterval(() => {
    checkRemixStatus()
  }, 1000)
  
  return () => clearInterval(interval)
}, [])
```

## 🎨 UI/UX Паттерны

### 1. Progressive Enhancement
**Описание**: Постепенное улучшение функциональности

```typescript
// ✅ ПРАВИЛЬНО: Базовый функционал + улучшения
function RemixCarousel({ post }: Props) {
  const [supportsAdvanced, setSupportsAdvanced] = useState(false)
  
  useEffect(() => {
    // Проверяем поддержку продвинутых функций
    const hasIntersectionObserver = 'IntersectionObserver' in window
    const hasTouchEvents = 'ontouchstart' in window
    
    setSupportsAdvanced(hasIntersectionObserver && hasTouchEvents)
  }, [])
  
  return (
    <div>
      <PostContent post={currentPost} />
      
      {/* Базовые кнопки навигации */}
      <NavigationControls />
      
      {/* Продвинутые функции только если поддерживаются */}
      {supportsAdvanced && (
        <>
          <TouchGestures />
          <LazyLoading />
        </>
      )}
    </div>
  )
}
```

### 2. Graceful Degradation
**Описание**: Ухудшение функциональности при проблемах

```typescript
// ✅ ПРАВИЛЬНО: Fallback при проблемах
function RemixCarousel({ post }: Props) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  if (hasError) {
    // Fallback к обычному PostContent
    return <PostContent post={post} />
  }
  
  if (isLoading) {
    // Показываем загрузку
    return <LoadingSpinner />
  }
  
  // Полнофункциональная карусель
  return <FullRemixCarousel post={post} />
}
```

## 🔧 Performance Паттерны

### 1. Virtual Scrolling
**Описание**: Виртуализация для больших списков

```typescript
// ✅ ПРАВИЛЬНО: Виртуализация для больших групп
import { FixedSizeList as List } from 'react-window'

function VirtualizedRemixCarousel({ remixGroup }: Props) {
  const Row = ({ index, style }: { index: number, style: any }) => (
    <div style={style}>
      <PostContent post={remixGroup[index]} />
    </div>
  )
  
  return (
    <List
      height={600}
      itemCount={remixGroup.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

### 2. Lazy Loading
**Описание**: Ленивая загрузка контента

```typescript
// ✅ ПРАВИЛЬНО: Ленивая загрузка изображений
function LazyImage({ src, alt }: { src: string, alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    
    if (imgRef.current) {
      observer.observe(imgRef.current)
    }
    
    return () => observer.disconnect()
  }, [])
  
  return (
    <div ref={imgRef}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          style={{ opacity: isLoaded ? 1 : 0 }}
        />
      )}
    </div>
  )
}
```

## 📱 Mobile Паттерны

### 1. Touch Gestures
**Описание**: Поддержка жестов для мобильных

```typescript
// ✅ ПРАВИЛЬНО: Обработка touch жестов
function TouchNavigation({ onSwipeLeft, onSwipeRight }: Props) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  
  const minSwipeDistance = 50
  
  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }
  
  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) onSwipeLeft()
    if (isRightSwipe) onSwipeRight()
  }
  
  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Контент карусели */}
    </div>
  )
}
```

## 🎯 Заключение

### Рекомендуемые паттерны
1. ✅ **Gallery Pattern** - для навигации между элементами
2. ✅ **Lifting State Up** - для управления состоянием
3. ✅ **Controlled Components** - для предсказуемого поведения
4. ✅ **Memoization** - для оптимизации производительности
5. ✅ **Error Boundaries** - для обработки ошибок
6. ✅ **Custom Hooks** - для переиспользуемой логики

### Избегаемые антипаттерны
1. ❌ **Direct DOM Manipulation** - используйте React состояние
2. ❌ **Mutating State** - создавайте новое состояние
3. ❌ **Missing Dependencies** - правильно указывайте зависимости
4. ❌ **Inline Objects** - мемоизируйте объекты
5. ❌ **Missing Error Handling** - обрабатывайте все ошибки
6. ❌ **Memory Leaks** - очищайте подписки

**Следование этим паттернам обеспечит стабильную, производительную и поддерживаемую реализацию карусели ремиксов.**
