/**
 * 🔥 M7 PHASE 1: ULTRA-CONSERVATIVE WALLETSTONESYNC STABILIZATION
 * 
 * CRITICAL CHANGES:
 * - Empty dependency arrays for useCallback (prevent re-renders)
 * - Ultra-low circuit breaker threshold (3 updates vs 15)
 * - Ref-based state (no setState on unmounted components)
 * - Minimal useEffect dependencies
 * - Enhanced logging for debugging
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useWallet as useOriginalWallet } from '@solana/wallet-adapter-react'
import { useWalletStore } from '@/lib/store/walletStore'

export function WalletStoreSync() {
  const walletAdapter = useOriginalWallet()
  const { setAdapter, updateState } = useWalletStore()
  
  // 🔥 M7 ULTRA-CONSERVATIVE CIRCUIT BREAKER
  const updateCountRef = useRef(0)
  const isCircuitOpenRef = useRef(false)
  const isMountedRef = useRef(true)
  
  console.log('[WalletStoreSync] M7 Phase 1 - Component mounted with ultra-conservative circuit breaker')
  
  // 🔥 STABLE CALLBACKS WITH EMPTY DEPENDENCIES
  const stableSetAdapter = useCallback((adapter: any) => {
    if (isCircuitOpenRef.current || !isMountedRef.current) {
      console.log('[WalletStoreSync] M7 Phase 1 - setAdapter blocked (circuit open or unmounted)')
      return
    }
    console.log('[WalletStoreSync] M7 Phase 1 - Setting adapter:', !!adapter)
    setAdapter(adapter)
  }, []) // 🔥 EMPTY DEPENDENCIES!

  const stableUpdateState = useCallback((newState: any) => {
    if (isCircuitOpenRef.current || !isMountedRef.current) {
      console.log('[WalletStoreSync] M7 Phase 1 - updateState blocked (circuit open or unmounted)')
      return
    }
    
    updateCountRef.current++
    console.log(`[WalletStoreSync] M7 Phase 1 - Update ${updateCountRef.current}/3`)
    
    if (updateCountRef.current >= 3) { // 🔥 ULTRA-LOW THRESHOLD (was 15)
      console.warn('[WalletStoreSync] M7 Phase 1 - CIRCUIT BREAKER: 3 updates reached, stopping all further updates')
      isCircuitOpenRef.current = true
      return
    }
    
    console.log('[WalletStoreSync] M7 Phase 1 - Updating state:', {
      connected: newState.connected,
      publicKey: !!newState.publicKey,
      connecting: newState.connecting,
      disconnecting: newState.disconnecting,
      wallet: !!newState.wallet
    })
    updateState(newState)
  }, []) // 🔥 EMPTY DEPENDENCIES!
  
  // 🔥 MINIMAL useEffect PATTERNS
  useEffect(() => {
    console.log('[WalletStoreSync] M7 Phase 1 - Adapter changed, setting adapter')
    stableSetAdapter(walletAdapter)
  }, [walletAdapter]) // 🔥 ONLY walletAdapter dependency
  
  // 🔥 M7 PHASE 3 FIX: Stable publicKey string
  const publicKeyString = walletAdapter.publicKey?.toString() || null
  
  useEffect(() => {
    if (!isCircuitOpenRef.current && isMountedRef.current) {
      const walletState = {
        connected: walletAdapter.connected,
        publicKey: walletAdapter.publicKey,
        connecting: walletAdapter.connecting,
        disconnecting: walletAdapter.disconnecting,
        wallet: walletAdapter.wallet
      }
      
      console.log('[WalletStoreSync] M7 Phase 1 - Wallet state changed, updating store')
      stableUpdateState(walletState)
    } else {
      console.log('[WalletStoreSync] M7 Phase 1 - State update skipped (circuit open or unmounted)')
    }
  }, [walletAdapter.connected, publicKeyString]) // 🔥 M7 PHASE 3 FIX: Stable string dependency!
  
  // 🔥 CLEANUP
  useEffect(() => {
    return () => {
      console.log('[WalletStoreSync] M7 Phase 1 - Component unmounting, setting isMountedRef to false')
      isMountedRef.current = false
    }
  }, [])
  
  return null
} 