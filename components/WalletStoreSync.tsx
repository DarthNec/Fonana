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
  
  // 🔍 DEBUG: Логирование состояния синхронизации
  useEffect(() => {
    console.log('[WalletStoreSync DEBUG] Wallet adapter state:', {
      connected: walletAdapter.connected,
      publicKey: !!walletAdapter.publicKey,
      publicKeyString: walletAdapter.publicKey?.toString().slice(0, 10) + '...',
      connecting: walletAdapter.connecting,
      disconnecting: walletAdapter.disconnecting,
      wallet: !!walletAdapter.wallet,
      walletName: walletAdapter.wallet?.adapter?.name,
      timestamp: new Date().toISOString()
    })
  }, [
    walletAdapter.connected,
    walletAdapter.publicKey,
    walletAdapter.connecting,
    walletAdapter.disconnecting,
    walletAdapter.wallet
  ])
  
  // Initial sync
  useEffect(() => {
    console.log('[WalletStoreSync] Setting adapter:', !!walletAdapter)
    setAdapter(walletAdapter)
  }, [walletAdapter, setAdapter])
  
  // State sync
  useEffect(() => {
    console.log('[WalletStoreSync] Updating store state:', {
      connected: walletAdapter.connected,
      publicKey: !!walletAdapter.publicKey,
      connecting: walletAdapter.connecting,
      disconnecting: walletAdapter.disconnecting,
      wallet: !!walletAdapter.wallet
    })
    
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