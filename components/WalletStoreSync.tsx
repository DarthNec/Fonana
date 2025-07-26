/**
 * 🔥 M7 PHASE 1 + OPTIMIZATION: WALLETSTONESYNC STABILIZATION
 * 
 * CRITICAL CHANGES:
 * - Reasonable circuit breaker threshold (10 vs 3)
 * - Debounced state updates to prevent rapid firing  
 * - Auto-reset circuit breaker mechanism
 * - Enhanced logging for debugging
 * - Stable callbacks with minimal dependencies
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useWallet as useOriginalWallet } from '@solana/wallet-adapter-react'
import { useWalletStore } from '@/lib/store/walletStore'
import { debounce } from 'lodash-es'

export function WalletStoreSync() {
  const walletAdapter = useOriginalWallet()
  const { setAdapter, updateState } = useWalletStore()
  
  // 🔥 M7 OPTIMIZED CIRCUIT BREAKER
  const updateCountRef = useRef(0)
  const isCircuitOpenRef = useRef(false)
  const isMountedRef = useRef(true)
  
  console.log('[WalletStoreSync] M7 Optimized - Component mounted with reasonable circuit breaker (10 updates)')
  
  // 🔥 STABLE CALLBACKS WITH EMPTY DEPENDENCIES
  const stableSetAdapter = useCallback((adapter: any) => {
    if (isCircuitOpenRef.current || !isMountedRef.current) {
      console.log('[WalletStoreSync] setAdapter blocked (circuit open or unmounted)')
      return
    }
    console.log('[WalletStoreSync] Setting adapter:', !!adapter)
    setAdapter(adapter)
  }, []) // 🔥 EMPTY DEPENDENCIES!

  // 🔥 M7 OPTIMIZATION: Debounced state updates with reasonable circuit breaker
  const debouncedUpdateState = useCallback(
    debounce((newState: any) => {
      if (isCircuitOpenRef.current || !isMountedRef.current) {
        console.log('[WalletStoreSync] Debounced update blocked (circuit open or unmounted)')
        return
      }
      
      updateCountRef.current++
      console.log(`[WalletStoreSync] Debounced update ${updateCountRef.current}/10`)
      
      // 🔥 REASONABLE CIRCUIT BREAKER (10 vs 3)
      if (updateCountRef.current >= 10) {
        console.warn('[WalletStoreSync] Circuit breaker activated after 10 updates')
        isCircuitOpenRef.current = true
        
        // 🔥 AUTO-RESET CIRCUIT BREAKER after 30 seconds
        setTimeout(() => {
          console.log('[WalletStoreSync] Resetting circuit breaker after 30s')
          updateCountRef.current = 0
          isCircuitOpenRef.current = false
        }, 30000)
        return
      }
      
      console.log('[WalletStoreSync] Updating state:', {
        connected: newState.connected,
        publicKey: !!newState.publicKey,
        connecting: newState.connecting,
        disconnecting: newState.disconnecting,
        wallet: !!newState.wallet
      })
      updateState(newState)
    }, 250), // 🔥 250ms debounce to prevent rapid firing
    []
  )
  
  // 🔥 MINIMAL useEffect PATTERNS
  useEffect(() => {
    console.log('[WalletStoreSync] Adapter changed, setting adapter')
    stableSetAdapter(walletAdapter)
  }, [walletAdapter, stableSetAdapter]) // Add stableSetAdapter to deps for completeness
  
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
      
      console.log('[WalletStoreSync] Wallet state changed, triggering debounced update')
      debouncedUpdateState(walletState)
    } else {
      console.log('[WalletStoreSync] State update skipped (circuit open or unmounted)')
    }
  }, [walletAdapter.connected, publicKeyString, debouncedUpdateState]) // Include debouncedUpdateState in deps
  
  // 🔥 CLEANUP
  useEffect(() => {
    return () => {
      console.log('[WalletStoreSync] Component unmounting, setting isMountedRef to false')
      isMountedRef.current = false
      
      // 🔥 Cancel any pending debounced updates
      debouncedUpdateState.cancel()
    }
  }, [debouncedUpdateState])
  
  return null
} 