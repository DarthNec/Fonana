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
      // Phantom будет первым в списке для приоритета отображения
      const walletsArray = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new TorusWalletAdapter()
      ]
      
      console.log('Initialized wallets:', walletsArray.map(w => w.name))
      
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