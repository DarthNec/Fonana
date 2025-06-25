'use client'

import React, { useMemo, useEffect, useState } from 'react'
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'

// Проверка мобильного устройства
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  
  try {
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    const isTablet = /ipad|tablet|playbook|silk/i.test(userAgent)
    
    return isMobile || isTablet
  } catch (error) {
    console.error('Error detecting mobile device:', error)
    return false
  }
}

// Проверка, установлен ли Phantom в мобильном браузере
const isPhantomInstalled = () => {
  if (typeof window === 'undefined') return false
  
  try {
    return !!(window as any).solana?.isPhantom
  } catch (error) {
    console.error('Error checking Phantom installation:', error)
    return false
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [hasError, setHasError] = useState(false)
  
  // Get network from environment or default to mainnet
  const network = WalletAdapterNetwork.Mainnet

  // Use custom RPC endpoint if provided, otherwise use cluster URL
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network),
    [network]
  )

  const wallets = useMemo(() => {
    try {
      const walletsArray = []
      
      // Добавляем Phantom адаптер только если это не мобильное устройство 
      // или если Phantom установлен в мобильном браузере
      if (!isMobileDevice() || isPhantomInstalled()) {
        walletsArray.push(new PhantomWalletAdapter())
      }
      
      walletsArray.push(
        new SolflareWalletAdapter(),
        new TorusWalletAdapter()
      )
      
      return walletsArray
    } catch (error) {
      console.error('Error initializing wallet adapters:', error)
      setHasError(true)
      return []
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  // Если произошла ошибка инициализации, показываем children без wallet провайдера
  if (hasError) {
    console.warn('WalletProvider initialization failed, rendering without wallet support')
    return <>{children}</>
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
} 