'use client'

import { useWalletPersistence } from '@/lib/hooks/useWalletPersistence'

export function WalletPersistenceProvider({ children }: { children: React.ReactNode }) {
  // Просто используем хук для активации функционала сохранения состояния
  useWalletPersistence()
  
  // Рендерим children без изменений
  return <>{children}</>
} 