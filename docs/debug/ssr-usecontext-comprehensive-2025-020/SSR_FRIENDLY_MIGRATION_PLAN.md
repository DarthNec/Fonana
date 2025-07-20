# 🚀 SSR-Friendly Migration Plan для Fonana

## Рекомендуемый стек для полной SSR совместимости

### 1. **UI Компоненты**

#### Опция A: Arco Design (Рекомендуется)
```bash
npm install @arco-design/web-react
```

**Преимущества:**
- ✅ Отличная SSR поддержка из коробки
- ✅ Минимальный размер бандла
- ✅ Встроенная темизация
- ✅ TypeScript support
- ✅ Нет проблем с useContext

**Пример миграции:**
```typescript
// Было (@headlessui/react)
import { Dialog } from '@headlessui/react';

// Стало (Arco)
import { Modal } from '@arco-design/web-react';
```

#### Опция B: Mantine (Next.js optimized)
```bash
npm install @mantine/core @mantine/hooks @mantine/next
```

**Преимущества:**
- ✅ Создан специально для Next.js
- ✅ SSR setup guide в документации
- ✅ Emotion-free версия для лучшей производительности
- ✅ Огромный набор компонентов

### 2. **Toast/Notifications**

#### Sonner (Built for Next.js)
```bash
npm install sonner
```

```typescript
// app/layout.tsx
import { Toaster } from 'sonner';

// В любом компоненте
import { toast } from 'sonner';
toast.success('Работает с SSR!');
```

### 3. **Wallet Integration**

#### SSR-Safe Wallet Setup
```typescript
// lib/wallet/provider.tsx
'use client';

import dynamic from 'next/dynamic';
import { WalletProvider } from '@solana/wallet-adapter-react';

const WalletModalProvider = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(m => m.WalletModalProvider),
  { ssr: false }
);

export function SSRWalletProvider({ children }) {
  return (
    <WalletProvider wallets={[]} autoConnect={false}>
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </WalletProvider>
  );
}
```

### 4. **Пошаговый план миграции**

#### Phase 1: Немедленные исправления (1-2 часа)
1. Добавить `export const dynamic = 'force-dynamic'` в layout.tsx
2. Обернуть проблемные компоненты в ClientOnly wrapper
3. Запустить build для проверки

#### Phase 2: Миграция UI (4-6 часов)
1. Установить Arco Design или Mantine
2. Заменить все Dialog/Modal компоненты
3. Мигрировать Transition анимации
4. Обновить стили

#### Phase 3: Wallet refactoring (2-3 часа)
1. Создать SSR-safe wallet provider
2. Обновить все wallet UI компоненты
3. Протестировать функциональность

#### Phase 4: Финальная оптимизация (2-3 часа)
1. Убрать временные workarounds
2. Включить обратно статическую генерацию где возможно
3. Оптимизировать bundle size

### 5. **Альтернатива: Собственная UI библиотека**

Создать минималистичную SSR-safe библиотеку:

```typescript
// components/ui/ssr-safe/index.ts
export { Modal } from './Modal';
export { Toast } from './Toast';
export { Dialog } from './Dialog';
export { Transition } from './Transition';
```

**Преимущества:**
- ✅ Полный контроль над SSR
- ✅ Минимальный размер
- ✅ Нет внешних зависимостей
- ✅ Кастомизация под проект

### 6. **Тестирование SSR**

```bash
# Скрипт для проверки SSR
npm run build && npm run start

# Проверка на hydration errors
curl http://localhost:3000 | grep -i "hydration"
```

### 7. **Метрики успеха**

- ✅ Build проходит без ошибок useContext
- ✅ Нет hydration mismatch warnings
- ✅ Lighthouse SSR score > 95
- ✅ First Contentful Paint < 1.5s
- ✅ Time to Interactive < 3s

## Рекомендация

**Краткосрочно (сегодня):**
1. Использовать `force-dynamic` для деплоя
2. Начать с Sonner для toast (легко)

**Среднесрочно (эта неделя):**
3. Мигрировать на Arco Design
4. Рефакторить wallet components

**Долгосрочно (месяц):**
5. Создать свою SSR-optimized UI библиотеку
6. Полная оптимизация для edge runtime 