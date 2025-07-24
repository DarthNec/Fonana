/**
 * 🔥 M7 PHASE 3: Protected useState Hook
 * Provides setState protection against unmounted components and global freeze states
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { GlobalStateProtection } from '../utils/global-protection'

export function useProtectedState<T>(
  initialState: T,
  componentName: string
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialState)
  const isMountedRef = useRef(true)
  
  // Track component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])
  
  const protectedSetState = useCallback((value: T | ((prev: T) => T)) => {
    // 🔥 PROTECTION LAYER 1: Component unmount check
    if (!isMountedRef.current) {
      console.log(`[${componentName}] setState blocked - component unmounted`)
      return
    }
    
    // 🔥 PROTECTION LAYER 2: Global freeze check  
    if (!GlobalStateProtection.canSetState(componentName)) {
      return
    }
    
    // 🔥 SAFE setState execution
    setState(value)
  }, [componentName])
  
  return [state, protectedSetState]
}

/**
 * Hook for manual setState protection (for existing useState calls)
 */
export function useSetStateProtection(componentName: string) {
  const isMountedRef = useRef(true)
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])
  
  const canSetState = useCallback(() => {
    if (!isMountedRef.current) {
      console.log(`[${componentName}] setState blocked - component unmounted`)
      return false
    }
    
    if (!GlobalStateProtection.canSetState(componentName)) {
      return false
    }
    
    return true
  }, [componentName])
  
  return { canSetState, isMounted: isMountedRef.current }
} 