# 📋 SOLUTION PLAN: Fix Third-Party SSR Issues

## 📅 Date: 2025-01-20
## 🎯 Version: 1.0

---

## 🎯 **ЦЕЛЬ**

Исправить SSR useContext ошибки, вызванные react-hot-toast и потенциально @headlessui/react, чтобы успешно собрать production build.

---

## 🚀 **ПЛАН РЕШЕНИЯ**

### **PHASE 1: Quick Fix - Dynamic Import (15 минут)**

#### Step 1.1: Update ClientShell.tsx
```tsx
// components/ClientShell.tsx
'use client'

import dynamic from 'next/dynamic'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import { ErrorBoundary } from './ErrorBoundary'
import { WalletProvider } from './WalletProvider'
import { WalletPersistenceProvider } from './WalletPersistenceProvider'
import { AppProvider } from '@/lib/providers/AppProvider'

// Dynamic import с отключенным SSR
const Toaster = dynamic(
  () => import('react-hot-toast').then(mod => mod.Toaster),
  { 
    ssr: false,
    loading: () => null // Не показываем ничего во время загрузки
  }
)

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <WalletProvider>
          <WalletPersistenceProvider>
            <AppProvider>
              <Toaster 
                position="bottom-right"
                reverseOrder={false}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1F2937',
                    color: '#F3F4F6',
                    borderRadius: '0.5rem',
                  },
                }}
              />
              {children}
            </AppProvider>
          </WalletPersistenceProvider>
        </WalletProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
```

#### Step 1.2: Test Build
```bash
npm run build
# Ожидаем успешную сборку без useContext errors
```

---

### **PHASE 2: Check Modal Components (20 минут)**

#### Step 2.1: Analyze @headlessui/react Usage
```bash
# Проверить все модальные окна
grep -r "Dialog\|Transition" --include="*.tsx" components/
```

#### Step 2.2: Dynamic Import для Modal (если нужно)
```tsx
// components/SubscriptionModal.tsx
import dynamic from 'next/dynamic'

const Dialog = dynamic(
  () => import('@headlessui/react').then(mod => mod.Dialog),
  { ssr: false }
)

const Transition = dynamic(
  () => import('@headlessui/react').then(mod => mod.Transition),
  { ssr: false }
)
```

---

### **PHASE 3: Long-term Solution - Custom Toast System (Optional, 1-2 часа)**

#### Step 3.1: Create Zustand Toast Store
```typescript
// lib/store/toastStore.ts
import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }))
    
    // Auto remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter(t => t.id !== id)
        }))
      }, toast.duration || 4000)
    }
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  }
}))

// Helper functions to match react-hot-toast API
export const toast = {
  success: (message: string) => useToastStore.getState().addToast({ message, type: 'success' }),
  error: (message: string) => useToastStore.getState().addToast({ message, type: 'error' }),
  info: (message: string) => useToastStore.getState().addToast({ message, type: 'info' }),
  warning: (message: string) => useToastStore.getState().addToast({ message, type: 'warning' }),
}
```

#### Step 3.2: Create SSR-Safe Toast Component
```tsx
// components/ToastContainer.tsx
'use client'

import { useToastStore } from '@/lib/store/toastStore'
import { useEffect, useState } from 'react'

export function ToastContainer() {
  const [mounted, setMounted] = useState(false)
  const toasts = useToastStore(state => state.toasts)
  const removeToast = useToastStore(state => state.removeToast)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // SSR safety - не рендерим на сервере
  if (!mounted) return null
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            p-4 rounded-lg shadow-lg transition-all
            ${toast.type === 'success' ? 'bg-green-600' : ''}
            ${toast.type === 'error' ? 'bg-red-600' : ''}
            ${toast.type === 'info' ? 'bg-blue-600' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-600' : ''}
            text-white
          `}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
```

#### Step 3.3: Replace react-hot-toast imports
```bash
# Автоматическая замена всех импортов
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/from '\''react-hot-toast'\''/from '\''@\/lib\/store\/toastStore'\''/g'
```

---

### **PHASE 4: Alternative - Use SSR-Friendly Library (30 минут)**

#### Option A: Sonner (Recommended)
```bash
npm uninstall react-hot-toast
npm install sonner
```

```tsx
// components/ClientShell.tsx
import { Toaster } from 'sonner'

// Sonner работает с SSR из коробки!
<Toaster 
  theme="dark"
  position="bottom-right"
/>
```

#### Option B: React-Toastify with SSR
```bash
npm install react-toastify
```

```tsx
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// В ClientShell.tsx
<ToastContainer 
  position="bottom-right"
  theme="dark"
  autoClose={4000}
/>
```

---

## 🔄 **МИГРАЦИОННАЯ СТРАТЕГИЯ**

### **Recommended Path:**
1. **Сначала Quick Fix** (Phase 1) - чтобы разблокировать build
2. **Проверить modals** (Phase 2) - убедиться что нет других проблем  
3. **Потом решить**:
   - Остаться с dynamic import (простое решение)
   - Мигрировать на Sonner (лучшая совместимость)
   - Создать custom solution (полный контроль)

### **Rollback Plan:**
Если что-то пойдет не так:
```bash
git checkout components/ClientShell.tsx
npm run build
```

---

## ✅ **КРИТЕРИИ УСПЕХА**

1. ✅ `npm run build` завершается без ошибок
2. ✅ Нет "Cannot read properties of null (reading 'useContext')"
3. ✅ .next/standalone/ создается успешно
4. ✅ Toast уведомления работают на клиенте
5. ✅ Никаких регрессий в функциональности

---

## 📊 **ВРЕМЕННЫЕ ОЦЕНКИ**

- **Quick Fix**: 15 минут ⚡
- **Full Migration to Sonner**: 30 минут 
- **Custom Zustand Solution**: 1-2 часа
- **Testing**: 15 минут

**Total**: 15 минут - 2.5 часа (в зависимости от выбранного подхода) 