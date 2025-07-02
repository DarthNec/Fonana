'use client'

import React, { useMemo, useEffect, useState } from 'react'
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  // SolflareWalletAdapter,
  // TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'
import { useWallet } from '@solana/wallet-adapter-react'

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const { connected, publicKey } = useWallet()
  
  // Get network from environment or default to mainnet
  const network = WalletAdapterNetwork.Mainnet

  // Use custom RPC endpoint if provided, otherwise use cluster URL
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network),
    [network]
  )

  const wallets = useMemo(() => {
    try {
      // Временно используем только PhantomWalletAdapter для диагностики SSR ошибки
      const walletsArray = [
        new PhantomWalletAdapter(),
        // new SolflareWalletAdapter(),
        // new TorusWalletAdapter(),
      ]
      console.log('[WalletProvider] Initialized wallets:', walletsArray.map(w => w.name))
      return walletsArray
    } catch (error) {
      console.error('[WalletProvider] Error initializing wallet adapters:', error)
      setHasError(true)
      return []
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    
    // Логируем информацию о среде
    if (typeof window !== 'undefined') {
      console.log('[WalletProvider] Environment:', {
        userAgent: window.navigator.userAgent,
        isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(window.navigator.userAgent.toLowerCase()),
        hasPhantom: !!(window as any).solana?.isPhantom,
        hasSolana: !!(window as any).solana,
        endpoint
      })
    }
  }, [endpoint])

  if (typeof window === 'undefined') {
    console.error('[SSR Guard] WalletProvider rendered on server')
    return <>{children}</>
  }

  if (!mounted) {
    return null
  }

  if (hasError) {
    console.warn('[WalletProvider] initialization failed, rendering without wallet support')
    return <>{children}</>
  }

  console.log('[WalletProvider] Rendered')

  return (
    <ConnectionProvider 
      endpoint={endpoint}
      config={{
        commitment: 'confirmed',
        wsEndpoint: process.env.NEXT_PUBLIC_SOLANA_WS_URL
      }}
    >
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={true}
        localStorageKey="fonanaWallet"
        onError={(error) => {
          console.error('Wallet error:', error)
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
} 