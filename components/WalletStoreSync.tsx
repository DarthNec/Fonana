'use client'

import { useEffect } from 'react'
import { useWallet as useOriginalWallet } from '@solana/wallet-adapter-react'
import { useWalletStore } from '@/lib/store/walletStore'

/**
 * Syncs wallet-adapter state to Zustand store
 * Must be placed inside WalletProvider
 */
export function WalletStoreSync() {
  const walletAdapter = useOriginalWallet()
  const { setAdapter, updateState } = useWalletStore()
  
  // Initial sync
  useEffect(() => {
    setAdapter(walletAdapter)
  }, [walletAdapter, setAdapter])
  
  // State sync
  useEffect(() => {
    updateState({
      publicKey: walletAdapter.publicKey,
      connected: walletAdapter.connected,
      connecting: walletAdapter.connecting,
      disconnecting: walletAdapter.disconnecting,
      wallet: walletAdapter.wallet
    })
  }, [
    walletAdapter.publicKey,
    walletAdapter.connected,
    walletAdapter.connecting,
    walletAdapter.disconnecting,
    walletAdapter.wallet,
    updateState
  ])
  
  return null
} 