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

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css')

// Проверка мобильного устройства
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isTablet = /ipad|tablet|playbook|silk/i.test(userAgent)
  
  return isMobile || isTablet
}

// Проверка, установлен ли Phantom в мобильном браузере
const isPhantomInstalled = () => {
  if (typeof window === 'undefined') return false
  return window.solana && window.solana.isPhantom
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  
  // Get network from environment or default to devnet
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' 
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet

  // Use custom RPC endpoint if provided, otherwise use cluster URL
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network),
    [network]
  )

  const wallets = useMemo(() => {
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
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
} 