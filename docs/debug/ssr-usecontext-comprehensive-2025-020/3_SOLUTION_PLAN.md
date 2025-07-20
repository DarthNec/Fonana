# 🚀 Solution Plan v1: Comprehensive SSR UseContext Fix

## 📋 Стратегия решения

### Основной подход: "SSR-Safe Wrapper Pattern"
Создание единой системы обёрток для всех SSR-unsafe компонентов и функций.

### Принципы:
1. **Централизация** - все SSR-unsafe импорты в одном месте
2. **Консистентность** - единый паттерн для всех случаев  
3. **Type Safety** - сохранение типизации
4. **Zero Breaking Changes** - постепенная миграция
5. **Performance** - lazy loading где возможно

## 📊 Фазы имплементации

### Phase 0: Подготовка инфраструктуры (2 часа)

#### 0.1 Создание SSR-safe утилит
```typescript
// lib/utils/ssr-safe.ts
export function createSSRSafeComponent<T>(
  importFn: () => Promise<{ default: T }>,
  displayName?: string
): T

export function createSSRSafeHook<T>(
  hook: T,
  fallback: T
): T

export function isSSR(): boolean
```

#### 0.2 Создание wrapper модулей
```
lib/components/
├── ssr-safe-ui/
│   ├── dialog.tsx
│   ├── transition.tsx
│   ├── toast.tsx
│   └── index.ts
└── ssr-safe-wallet/
    ├── hooks.ts
    └── components.tsx
```

### Phase 1: Критические исправления (1 час)

#### 1.1 AppProvider.tsx - убрать прямой импорт Toaster
```typescript
// Было:
import { Toaster } from 'react-hot-toast'

// Станет:
import { SSRSafeToaster } from '@/lib/components/ssr-safe-ui'
```

#### 1.2 Создать SSR-safe toast wrapper
```typescript
// lib/components/ssr-safe-ui/toast.tsx
export const SSRSafeToaster = dynamic(
  () => import('react-hot-toast').then(mod => mod.Toaster),
  { ssr: false }
)

// lib/utils/ssr-safe-toast.ts
let toastModule: any = null

export async function toast(...args: any[]) {
  if (!toastModule) {
    toastModule = await import('react-hot-toast')
  }
  return toastModule.toast(...args)
}
```

### Phase 2: Модальные окна (2 часа)

#### 2.1 ProfileSetupModal - миграция на dynamic imports
```typescript
// components/ProfileSetupModal.tsx
import { SSRSafeDialog } from '@/lib/components/ssr-safe-ui'
```

#### 2.2 SubscriptionModal - миграция на dynamic imports
```typescript
// components/SubscriptionModal.tsx
import { SSRSafeDialog, SSRSafeTransition } from '@/lib/components/ssr-safe-ui'
```

#### 2.3 Создание единого Modal Manager
```typescript
// lib/components/ModalManager.tsx
export const ModalManager = {
  ProfileSetup: dynamic(() => import('@/components/ProfileSetupModal')),
  Subscription: dynamic(() => import('@/components/SubscriptionModal')),
  Purchase: dynamic(() => import('@/components/PurchaseModal')),
  // ... остальные модалки
}
```

### Phase 3: Wallet hooks миграция (3 часа)

#### 3.1 Обновить старые hooks
```typescript
// lib/hooks/useOptimizedPosts.ts
// lib/hooks/useUnifiedPosts.ts
// lib/hooks/useWalletPersistence.ts
import { useWallet } from '@/lib/hooks/useSafeWallet'
```

#### 3.2 Создать SSR-safe useConnection
```typescript
// lib/hooks/useSafeConnection.ts
export function useSafeConnection() {
  if (typeof window === 'undefined') {
    return { connection: null }
  }
  return useConnectionStore()
}
```

#### 3.3 Обновить WalletProvider компоненты
```typescript
// Использовать dynamic imports для wallet-adapter-react-ui
const WalletModalProvider = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(m => m.WalletModalProvider),
  { ssr: false }
)
```

### Phase 4: Mass toast migration (2 часа)

#### 4.1 Создать migration script
```bash
# scripts/migrate-toast-imports.js
// Автоматически заменит все импорты toast
```

#### 4.2 Обновить все 25+ файлов
```typescript
// Было:
import { toast } from 'react-hot-toast'

// Станет:
import { toast } from '@/lib/utils/ssr-safe-toast'
```

### Phase 5: Context providers защита (1 час)

#### 5.1 ThemeContext SSR защита
```typescript
export function useTheme() {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_VALUE
  }
  const context = useContext(ThemeContext)
  // ...
}
```

#### 5.2 PricingContext SSR защита
```typescript
export function usePricing() {
  if (typeof window === 'undefined') {
    return DEFAULT_PRICING_VALUE
  }
  const context = useContext(PricingContext)
  // ...
}
```

### Phase 6: Testing & Validation (2 часа)

#### 6.1 Playwright автоматизация
```typescript
// tests/ssr-validation.spec.ts
- Проверка всех страниц
- Проверка модалок
- Проверка toast уведомлений
- Проверка wallet функций
```

#### 6.2 Production build тестирование
```bash
npm run build
npm run start
# Проверка отсутствия SSR ошибок
```

## 🗓️ Timeline

### День 1 (8 часов):
- **09:00-11:00**: Phase 0 - Инфраструктура
- **11:00-12:00**: Phase 1 - Критические фиксы
- **13:00-15:00**: Phase 2 - Модалки
- **15:00-18:00**: Phase 3 - Wallet hooks

### День 2 (5 часов):
- **09:00-11:00**: Phase 4 - Mass migration
- **11:00-12:00**: Phase 5 - Context защита
- **13:00-15:00**: Phase 6 - Testing

## 📊 Метрики успеха

### Обязательные:
- ✅ Production build без ошибок
- ✅ Все страницы загружаются
- ✅ Модалки работают
- ✅ Toast уведомления отображаются
- ✅ Wallet функционал работает

### Желательные:
- 📈 Улучшение производительности SSR
- 📈 Уменьшение bundle size за счёт lazy loading
- 📈 Улучшение Time to Interactive

## 🚨 Риски и митигация

### Risk 1: Breaking changes в компонентах
- **Митигация**: Постепенная миграция с fallbacks
- **План B**: Rollback отдельных компонентов

### Risk 2: TypeScript ошибки
- **Митигация**: Сохранение оригинальных типов
- **План B**: Временные @ts-ignore с TODO

### Risk 3: Пропущенные импорты
- **Митигация**: Автоматизированный поиск и замена
- **План B**: Runtime error monitoring

### Risk 4: Performance degradation
- **Митигация**: Профилирование и оптимизация
- **План B**: Selective SSR отключение

## 🎯 Конечное состояние

### Архитектура после исправлений:
```
lib/
├── components/ssr-safe-ui/     # Все UI обёртки
├── hooks/ssr-safe/             # Все безопасные хуки  
├── utils/ssr-safe.ts           # Утилиты
└── providers/                  # Защищённые провайдеры

components/
├── Все модалки используют SSR-safe импорты
└── Все компоненты используют безопасные хуки
```

### Паттерн использования:
```typescript
// Везде в коде:
import { Dialog, Transition } from '@/lib/components/ssr-safe-ui'
import { toast } from '@/lib/utils/ssr-safe-toast'
import { useWallet } from '@/lib/hooks/useSafeWallet'
```

## 📝 Чеклист готовности

### Pre-implementation:
- [ ] Backup текущего кода
- [ ] Создание feature branch
- [ ] Настройка тестового окружения

### Post-implementation:
- [ ] Все SSR ошибки исправлены
- [ ] Production build успешен
- [ ] Все функции работают
- [ ] Документация обновлена
- [ ] Миграция завершена 