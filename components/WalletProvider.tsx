'use client'

import { useMemo, useEffect, useState } from 'react'
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'

// Проверка мобильного устройства
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
}

// Проверка, установлен ли Phantom в мобильном браузере
const isPhantomInstalled = (): boolean => {
  if (typeof window === 'undefined') return false
  return !!(window as any).phantom?.solana?.isPhantom
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  
  // Определяем сеть
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' 
    ? WalletAdapterNetwork.Devnet 
    : WalletAdapterNetwork.Mainnet

  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    }
    return clusterApiUrl(network)
  }, [network])

  const wallets = useMemo(() => {
    const walletsArray = []

    // Пока отключаем MWA из-за проблем с типами
    // TODO: Добавить MWA после исправления типов в @solana-mobile/wallet-adapter-mobile

    // Десктопные кошельки
    walletsArray.push(
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
      new TrustWalletAdapter(),
      new TorusWalletAdapter()
    )

    return walletsArray
  }, [network])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={false} // Отключаем автоподключение
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
} 