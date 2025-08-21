'use client'

import { useMemo } from 'react'
import { useWallet } from '@/lib/hooks/useSafeWallet'

/**
 * 🔥 M7 HEAVY ROUTE: Global stable wallet hook
 * Provides stable string representations for useEffect dependencies
 * Eliminates infinite loops caused by publicKey object instability
 * 
 * ROOT CAUSE: @solana/wallet-adapter-react returns NEW objects each render
 * SOLUTION: Memoize string conversions to create stable dependencies
 * 
 * USAGE:
 * // ❌ WRONG: Causes infinite loops
 * const { publicKey } = useWallet()
 * useEffect(() => {}, [publicKey]) // NEW object each render!
 * 
 * // ✅ CORRECT: Stable dependencies
 * const { publicKeyString } = useStableWallet()
 * useEffect(() => {}, [publicKeyString]) // Only changes when wallet actually changes
 */
export function useStableWallet() {
  const wallet = useWallet()
  
  // 🔥 CRITICAL: Memoize string conversion to prevent infinite re-renders
  const publicKeyString = useMemo(() => {
    // 🔥 FALLBACK: Если wallet.publicKey недоступен, используем localStorage
    if (wallet.publicKey) {
      return wallet.publicKey.toBase58()
    }
    
    // 🔥 SAFETY: Fallback на localStorage для предотвращения undefined
    if (typeof window !== 'undefined') {
      const savedWallet = localStorage.getItem('fonana_user_wallet')
      if (savedWallet) {
        console.log('[useStableWallet] Using localStorage fallback for publicKeyString:', savedWallet.substring(0, 8) + '...')
        return savedWallet
      }
    }
    
    console.warn('[useStableWallet] No publicKey available, returning undefined')
    return undefined
  }, [wallet.publicKey])
  
  // 🔥 STABLE: Additional derived values for common use cases
  const walletAddress = useMemo(() => {
    if (wallet.publicKey) {
      return wallet.publicKey.toString()
    }
    
    // 🔥 SAFETY: Fallback на localStorage
    if (typeof window !== 'undefined') {
      const savedWallet = localStorage.getItem('fonana_user_wallet')
      if (savedWallet) {
        return savedWallet
      }
    }
    
    return undefined
  }, [wallet.publicKey])
  
  // 🔥 STABLE: Short address for UI display
  const walletAddressShort = useMemo(() => 
    publicKeyString ? 
      `${publicKeyString.slice(0, 4)}...${publicKeyString.slice(-4)}` : 
      undefined, 
    [publicKeyString]
  )
  
  return {
    ...wallet,
    publicKeyString,      // ← STABLE string for dependencies (most common)
    walletAddress,        // ← STABLE address for API calls
    walletAddressShort    // ← STABLE short version for UI display
  }
} 