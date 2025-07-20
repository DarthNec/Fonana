# 🔍 SSR UseContext Comprehensive Discovery Report

## 📋 Проблема
Next.js 14 production build завершается с ошибками `Cannot read properties of null (reading 'useContext')` во время server-side rendering (SSR). Проблема блокирует деплой в production.

## 🎯 Цель
Найти ВСЕ источники useContext ошибок, создать комплексный план исправления без последующих сюрпризов.

## 📊 Полный анализ использования Context API

### 1. Прямые использования useContext
```typescript
// Найдено 2 прямых вызова:
- lib/pricing/PricingProvider.tsx:120
- lib/contexts/ThemeContext.tsx:120
```

### 2. Библиотеки с известными SSR проблемами

#### react-hot-toast (v2.5.2)
- **Использует Context внутри**: ДА
- **SSR проблемы**: ПОДТВЕРЖДЕНЫ
- **Статус**: ЧАСТИЧНО ИСПРАВЛЕНО в ClientShell.tsx (dynamic import)
- **Использование**:
  - 25+ компонентов импортируют `toast` функцию
  - `Toaster` компонент в ClientShell.tsx (dynamic import)
  - AppProvider.tsx всё ещё импортирует напрямую

#### @headlessui/react (v1.7.18)
- **Использует Context внутри**: ДА (Dialog, Transition, Menu и др.)
- **SSR проблемы**: ПОДТВЕРЖДЕНЫ
- **Статус**: НЕ ИСПРАВЛЕНО
- **Компоненты с проблемами**:
  - Dialog - используется в ProfileSetupModal, SubscriptionModal
  - Transition - используется в SubscriptionModal
  - Menu, Listbox, Combobox - потенциально используются
- **Критические места**:
  - ProfileSetupModal.tsx - прямой импорт Dialog
  - SubscriptionModal.tsx - прямой импорт Dialog и Transition
  - PurchaseModal.tsx - уже использует dynamic imports (ХОРОШО)

#### @solana/wallet-adapter-react (v0.15.35)
- **Использует Context внутри**: ДА
- **SSR проблемы**: ДА
- **Статус**: ЧАСТИЧНО РЕШЕНО через Zustand proxy
- **Проблемные места**:
  - lib/hooks/useWalletPersistence.ts - всё ещё импортирует оригинальный useWallet
  - lib/hooks/useOptimizedPosts.ts - импортирует из @solana/wallet-adapter-react
  - lib/hooks/useUnifiedPosts.ts - импортирует из @solana/wallet-adapter-react
  - app/messages/[id]/page.tsx - импортирует useConnection из @solana/wallet-adapter-react
  - components/WalletStoreSync.tsx - импортирует оригинальный useWallet

#### @solana/wallet-adapter-react-ui (v0.9.35)
- **Использует Context внутри**: ДА
- **SSR проблемы**: ДА
- **Статус**: НЕ РЕШЕНО
- **Компоненты**:
  - WalletModalProvider - используется в WalletProvider.tsx
  - WalletMultiButton - используется в 4 компонентах
  - useWalletModal - используется в MobileWalletConnect.tsx, BottomNav.tsx

#### @radix-ui/* (множество пакетов)
- **Использует Context внутри**: ДА
- **SSR проблемы**: ВОЗМОЖНЫ
- **Статус**: НЕ ПРОВЕРЕНО
- **Установленные пакеты**:
  - @radix-ui/react-avatar
  - @radix-ui/react-dialog
  - @radix-ui/react-label
  - @radix-ui/react-scroll-area
  - @radix-ui/react-select
  - @radix-ui/react-slot
  - @radix-ui/react-switch
  - @radix-ui/react-tabs
  - @radix-ui/react-toast

### 3. Кастомные Context провайдеры

#### ThemeContext
- **Файл**: lib/contexts/ThemeContext.tsx
- **SSR защита**: ЕСТЬ (проверка typeof window)
- **Проблемы**: useContext вызывается без проверки на сервере

#### PricingContext
- **Файл**: lib/pricing/PricingProvider.tsx
- **SSR защита**: НЕТ
- **Проблемы**: useContext вызывается без защиты

### 4. Модальные окна и UI компоненты

#### Компоненты с модалками:
1. **ProfileSetupModal** - использует @headlessui/react Dialog напрямую
2. **SubscriptionModal** - использует @headlessui/react Dialog и Transition напрямую
3. **PurchaseModal** - УЖЕ использует dynamic imports (хорошо)
4. **SellablePostModal** - кастомная модалка
5. **CreatePostModal** - статус неизвестен
6. **CreateFlashSale** - статус неизвестен
7. **SearchModal** - кастомная модалка
8. **ui/Modal.tsx** - кастомная модалка с createPortal

### 5. Точки входа SSR проблем

#### Основные источники:
1. **AppProvider.tsx** - импортирует react-hot-toast напрямую (строка 9)
2. **ProfileSetupModal.tsx** - импортирует @headlessui/react напрямую (строка 3)
3. **SubscriptionModal.tsx** - импортирует @headlessui/react напрямую (строка 3)
4. **useWalletPersistence.ts** - импортирует @solana/wallet-adapter-react напрямую
5. **useOptimizedPosts.ts** - импортирует @solana/wallet-adapter-react напрямую
6. **useUnifiedPosts.ts** - импортирует @solana/wallet-adapter-react напрямую
7. **WalletProvider.tsx** - импортирует wallet-adapter-react-ui компоненты

#### Вторичные источники:
- Все 25+ компонентов импортирующие toast
- Компоненты использующие WalletMultiButton
- Компоненты использующие useWalletModal

## 🔬 Анализ текущих попыток исправления

### Что уже сделано:
1. **ClientShell.tsx** - dynamic import для Toaster ✅
2. **PurchaseModal.tsx** - dynamic imports для Dialog/Transition ✅
3. **useSafeWallet hook** - Zustand proxy для wallet ✅
4. **WalletStoreSync** - синхронизация wallet состояния ✅

### Что НЕ сделано:
1. **AppProvider.tsx** - всё ещё импортирует Toaster/toast напрямую ❌
2. **ProfileSetupModal** - импортирует Dialog напрямую ❌
3. **SubscriptionModal** - импортирует Dialog/Transition напрямую ❌
4. **Старые хуки** - useOptimizedPosts, useUnifiedPosts используют оригинальный useWallet ❌
5. **wallet-adapter-react-ui** - компоненты без SSR защиты ❌
6. **@radix-ui** - не проверено на SSR совместимость ❌

## 🎭 Playwright MCP тестирование

### План тестирования:
1. Проверить текущее состояние production build
2. Воспроизвести ошибки в браузере
3. Проверить каждую страницу на console errors
4. Собрать network логи для API вызовов
5. Сделать скриншоты проблемных состояний

### Критические страницы для проверки:
- / (главная)
- /creators
- /feed
- /dashboard
- /messages/[id]
- Модальные окна (subscribe, purchase, profile setup)

## 🏗️ Архитектурные проблемы

### 1. Смешанные подходы
- Частичная миграция на Zustand для wallet
- Некоторые компоненты используют dynamic imports, другие нет
- Нет единого паттерна для SSR-unsafe библиотек

### 2. Глубокие зависимости
- toast функция импортируется в 25+ местах
- wallet hooks используются повсеместно
- Модальные окна разбросаны по всему проекту

### 3. Отсутствие абстракций
- Прямые импорты third-party библиотек
- Нет wrapper компонентов для SSR-unsafe UI
- Нет централизованного управления модалками

## 📈 Оценка масштаба проблемы

### Количество затронутых файлов:
- **react-hot-toast**: 25+ файлов
- **@headlessui/react**: 3-5 файлов
- **@solana/wallet-adapter**: 10+ файлов
- **Кастомные Context**: 2 файла
- **Всего**: ~40-50 файлов требуют изменений

### Риски:
1. **Критические**: SSR сбои блокируют production
2. **Высокие**: Функциональность модалок может сломаться
3. **Средние**: Toast уведомления могут не работать
4. **Низкие**: Возможны проблемы с hydration

## 🎯 Выводы

### Основные источники проблем:
1. **react-hot-toast** - главный виновник (25+ импортов)
2. **@headlessui/react** - вторичный источник (модалки)
3. **@solana/wallet-adapter-react** - частично решено
4. **Кастомные Context** - требуют SSR защиты

### Необходимые действия:
1. Создать единый паттерн для SSR-unsafe импортов
2. Мигрировать ВСЕ проблемные импорты на dynamic
3. Создать wrapper компоненты для часто используемых UI
4. Добавить SSR защиту в кастомные Context
5. Провести полное тестирование через Playwright

### Приоритеты:
1. **P0**: Исправить AppProvider.tsx (блокирует всё)
2. **P1**: Исправить модалки (@headlessui/react)
3. **P2**: Завершить миграцию wallet hooks
4. **P3**: Добавить SSR защиту в кастомные Context
5. **P4**: Проверить @radix-ui компоненты

## 🚀 Следующие шаги
1. Создать ARCHITECTURE_CONTEXT.md с картой всех зависимостей
2. Разработать SOLUTION_PLAN.md с поэтапным планом
3. Провести IMPACT_ANALYSIS.md для оценки рисков
4. Создать IMPLEMENTATION_SIMULATION.md для моделирования
5. Подготовить RISK_MITIGATION.md для критических рисков 