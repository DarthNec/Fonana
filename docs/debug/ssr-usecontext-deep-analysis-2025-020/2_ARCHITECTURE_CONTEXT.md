# 🏗️ ARCHITECTURE CONTEXT: Third-Party Library SSR Issue

## 📅 Date: 2025-01-20
## 🎯 Focus: react-hot-toast и @headlessui/react SSR compatibility

---

## 🔍 **ТЕКУЩЕЕ СОСТОЯНИЕ**

### **ClientShell.tsx - Центральный компонент**
```tsx
// components/ClientShell.tsx
'use client'

import { Toaster } from 'react-hot-toast'  // ⚠️ ПРОБЛЕМА!
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import { ErrorBoundary } from './ErrorBoundary'
import { WalletProvider } from './WalletProvider'
import { WalletPersistenceProvider } from './WalletPersistenceProvider'
import { AppProvider } from '@/lib/providers/AppProvider'

export default function ClientShell({ children }) {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <WalletProvider>
          <WalletPersistenceProvider>
            <AppProvider>
              <Toaster /> {/* ⚡ SSR CRASH POINT */}
              {children}
            </AppProvider>
          </WalletPersistenceProvider>
        </WalletProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
```

### **layout.tsx - Root Layout**
```tsx
// app/layout.tsx
import ClientShell from '@/components/ClientShell'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ClientShell>
          {children}
        </ClientShell>
      </body>
    </html>
  )
}
```

---

## 🔴 **ПРОБЛЕМА**

### **Root Cause Chain**
1. `layout.tsx` импортирует `ClientShell`
2. `ClientShell` импортирует `Toaster` из `react-hot-toast`
3. `Toaster` использует `useContext` внутри
4. Next.js пытается pre-render страницы на сервере
5. `useContext` = null на сервере → CRASH

### **Почему не помогает 'use client'?**
- `'use client'` НЕ отключает SSR полностью
- Компонент все равно pre-renders на сервере для initial HTML
- Только после hydration на клиенте начинает работать как CSR

---

## 📦 **ЗАВИСИМОСТИ С ПРОБЛЕМАМИ**

### **1. react-hot-toast**
- **Версия**: ^2.4.1 (из package.json)
- **Проблема**: Toaster component использует Context API без SSR guards
- **Использование**: 
  - ClientShell.tsx
  - Множество компонентов используют `toast()` функцию

### **2. @headlessui/react**
- **Версия**: ^1.7.0
- **Проблема**: Dialog/Transition могут использовать Portal с Context
- **Использование**:
  - SubscriptionModal.tsx
  - ProfileSetupModal.tsx
  - PurchaseModal.tsx

### **3. @solana/wallet-adapter-react** ✅
- **Статус**: УЖЕ МИГРИРОВАНО на Zustand wrapper
- **Решение**: useSafeWallet hook

---

## 🏗️ **АРХИТЕКТУРНАЯ КАРТА**

```mermaid
graph TD
    A[pages/*.tsx] --> B[layout.tsx]
    B --> C[ClientShell.tsx]
    C --> D[Toaster Component]
    D --> E[react-hot-toast Context]
    E --> F[useContext Hook]
    F -->|SSR| G[NULL CRASH]
    
    H[Modal Components] --> I[@headlessui/react]
    I --> J[Portal/Dialog Context]
    J --> K[useContext Hook]
    K -->|SSR| L[POTENTIAL CRASH]
```

---

## 🔄 **FLOW ДАННЫХ**

### **Build Time**
1. Next.js начинает build с `npm run build`
2. Пытается pre-render все страницы
3. Загружает layout.tsx → ClientShell.tsx
4. Встречает `<Toaster />` компонент
5. react-hot-toast пытается вызвать useContext
6. React.useContext = null (server environment)
7. **CRASH** в chunks/5834.js

### **Runtime (dev mode)**
- Работает потому что Fast Refresh и HMR
- Ошибки могут быть скрыты error boundaries
- Client-side rendering маскирует проблему

---

## 💡 **КЛЮЧЕВЫЕ ИНСАЙТЫ**

1. **Проблема НЕ в нашем коде напрямую**
   - Мы правильно используем 'use client'
   - Наши контексты имеют проверки

2. **Проблема в third-party libraries**
   - react-hot-toast не готов к SSR
   - @headlessui/react может иметь похожие проблемы

3. **Next.js App Router особенности**
   - 'use client' ≠ отключение SSR
   - Pre-rendering происходит даже для client components

4. **Webpack chunk 5834**
   - Содержит скомпилированный код react-hot-toast
   - Минифицированные функции g() и p() - это их внутренние функции

---

## 🎯 **ТОЧКИ ВМЕШАТЕЛЬСТВА**

### **Option 1: Dynamic Import Toaster**
```tsx
const Toaster = dynamic(
  () => import('react-hot-toast').then(mod => mod.Toaster),
  { ssr: false }
)
```

### **Option 2: Conditional Rendering**
```tsx
{typeof window !== 'undefined' && <Toaster />}
```

### **Option 3: Custom Toast Provider**
Создать свой SSR-safe toast provider на базе Zustand

### **Option 4: Alternative Libraries**
- sonner (SSR-friendly)
- react-toastify с SSR config
- notistack

---

## ✅ **ПРОВЕРЕННЫЕ ФАКТЫ**

1. **chunk 5834.js содержит react-hot-toast код**
2. **ClientShell.tsx - точка входа проблемы**
3. **Toaster рендерится на каждой странице**
4. **'use client' не решает проблему SSR**
5. **Проблема воспроизводится только при build** 