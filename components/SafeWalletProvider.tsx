'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Динамически загружаем WalletProvider только на клиенте
const WalletProvider = dynamic(
  () => import('./WalletProvider').then(mod => ({ default: mod.WalletProvider })),
  { 
    ssr: false,
    loading: () => null 
  }
)

export function SafeWalletProvider({ children }: { children: React.ReactNode }) {
  const [shouldRender, setShouldRender] = useState(false)
  
  useEffect(() => {
    // Проверяем что мы на клиенте и DOM готов
    if (typeof window !== 'undefined') {
      setShouldRender(true)
    }
  }, [])
  
  // На сервере и во время загрузки просто рендерим детей без провайдера
  if (!shouldRender) {
    return <>{children}</>
  }
  
  // На клиенте оборачиваем в WalletProvider
  return <WalletProvider>{children}</WalletProvider>
} 