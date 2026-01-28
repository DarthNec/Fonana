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
import { useAppStore } from '@/lib/store/appStore'
import { useSubscriptionStore } from '@/lib/store/subscriptionStore'
import { debounce } from 'lodash-es'
import { jwtManager } from '@/lib/utils/jwt'

export function WalletStoreSync() {
  const walletAdapter = useOriginalWallet()
  const { setAdapter, updateState } = useWalletStore()
  const { clearUser } = useAppStore();
  const setUser = useAppStore(state => state.setUser)
  const { loadSubscriptions } = useSubscriptionStore()
  // 🔥 M7 OPTIMIZED CIRCUIT BREAKER
  const updateCountRef = useRef(0)
  const isCircuitOpenRef = useRef(false)
  const isMountedRef = useRef(true)
  
  console.log('[WalletStoreSync] Component mounted')
  
  // 🔥 STABLE CALLBACKS WITH EMPTY DEPENDENCIES
  const stableSetAdapter = useCallback((adapter: any) => {
    // 🔥 ВРЕМЕННО ОТКЛЮЧЕНО: Проверка монтирования блокирует обновления
    // if (!isMountedRef.current) {
    //   console.log('[WalletStoreSync] setAdapter blocked (unmounted)')
    //   return
    // }
    console.log('[WalletStoreSync] Setting adapter:', !!adapter)
    console.log('🎯 [WALLET STORE SYNC] Adapter details:', {
      hasAdapter: !!adapter,
      adapterType: typeof adapter,
      publicKey: adapter?.publicKey?.toBase58(),
      connected: adapter?.connected
    })
    setAdapter(adapter)
  }, []) // 🔥 EMPTY DEPENDENCIES!

  // 🔥 УПРОЩЕНО: Используем jwtManager для получения токена
  // jwtManager.getToken() сам проверяет валидность и запрашивает новый при необходимости
  const fetchAndSetUser = useCallback(
    debounce(async (wallet: string) => {
      try {
        console.log('🎯 [WALLET STORE SYNC] Fetching user for wallet:', wallet.substring(0, 8) + '...')
        
        // 🔥 СОХРАНЯЕМ WALLET В LOCALSTORAGE (jwtManager использует это для получения токена)
        localStorage.setItem('fonana_user_wallet', wallet)
        console.log('🎯 [WALLET STORE SYNC] Wallet saved to localStorage')
        
        // 🔥 jwtManager.getToken() сам решает: использовать существующий или запросить новый
        const token = await jwtManager.getToken()
        if (token) {
          console.log('🎯 [WALLET STORE SYNC] JWT token ready via jwtManager')
          // Устанавливаем jwtReady в store
          useAppStore.getState().setJwtReady(true)
        } else {
          console.warn('🎯 [WALLET STORE SYNC] Failed to get JWT token via jwtManager')
        }
        
        // 🔥 ПОЛУЧАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
        const currentUser = useAppStore.getState().user
        if (!currentUser || currentUser.wallet !== wallet) {
          console.log('🎯 [WALLET STORE SYNC] Fetching user data...')
          const response = await fetch(`/api/user?wallet=${wallet}`)
          
          if (response.ok) {
            const data = await response.json()
            if (data.user) {
              console.log('🎯 [WALLET STORE SYNC] User fetched successfully:', {
                userId: data.user.id,
                userNickname: data.user.nickname,
                userWallet: data.user.wallet
              })
              setUser(data.user)
              loadSubscriptions(data.user.id)

              // Загружаем лайки пользователя
              if (data.user.id) {
                const likesResponse = await fetch(`/api/likes/user?userId=${data.user.id}`)
                if (likesResponse.ok) {
                  const likesData = await likesResponse.json()
                  console.log('🎯 [WALLET STORE SYNC] User likes loaded:', likesData?.length || 0)
                  localStorage.setItem('user_likes', JSON.stringify(likesData || []))
                }
              }
            } else {
              console.warn('🎯 [WALLET STORE SYNC] No user data in response')
            }
          } else {
            console.error('🎯 [WALLET STORE SYNC] Failed to fetch user:', response.status)
          }
        } else {
          console.log('🎯 [WALLET STORE SYNC] User already loaded, skipping fetch')
        }
      } catch (error) {
        console.error('🎯 [WALLET STORE SYNC] Error:', error)
      }
    }, 500),
    [setUser, loadSubscriptions]
  )

  // 🔥 M7 OPTIMIZATION: Debounced state updates with reasonable circuit breaker
  const debouncedUpdateState = useCallback(
    debounce((newState: any) => {
          // 🔥 ВРЕМЕННО ОТКЛЮЧЕНО: Проверка монтирования блокирует обновления
    // if (!isMountedRef.current) {
    //   console.log('[WalletStoreSync] Debounced update blocked (unmounted)')
    //   return
    // }
    
    updateCountRef.current++
    console.log(`[WalletStoreSync] Debounced update ${updateCountRef.current}/10`)
    
    // 🔥 ВРЕМЕННО ОТКЛЮЧЕНО: Circuit breaker блокирует обновления кошелька
    // if (updateCountRef.current >= 10) {
    //   console.warn('[WalletStoreSync] Circuit breaker activated after 10 updates')
    //   isCircuitOpenRef.current = true
    //   
    //   // 🔥 AUTO-RESET CIRCUIT BREAKER after 30 seconds
    //   setTimeout(() => {
    //     // console.log('[WalletStoreSync] Resetting circuit breaker after 30s')
    //     updateCountRef.current = 0
    //     isCircuitOpenRef.current = false
    //   }, 30000)
    //   return
    // }
    
    // console.log('[WalletStoreSync] Updating state:', {
    //   connected: newState.connected,
    //   publicKey: !!newState.publicKey,
    //   connecting: newState.connecting,
    //   disconnecting: newState.disconnecting,
    //   wallet: !!newState.wallet
    // })
    
    // 🔥 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ОБНОВЛЕНИЙ КОШЕЛЬКА
    // console.log('🎯 [WALLET STORE SYNC UPDATE] State update details:', {
    //   updateNumber: updateCountRef.current,
    //   hasPublicKey: !!newState.publicKey,
    //   publicKey: newState.publicKey?.toBase58(),
    //   connected: newState.connected,
    //   connecting: newState.connecting,
    //   disconnecting: newState.disconnecting,
    //   hasWallet: !!newState.wallet,
    //   walletName: newState.wallet?.adapter?.name
    // })
      console.log('[WalletStoreSync] Updating state:', newState)
      updateState(newState)
    }, 250), // 🔥 250ms debounce to prevent rapid firing
    []
  )
  
  // 🔥 MINIMAL useEffect PATTERNS
  useEffect(() => {
    console.log('[WalletStoreSync] Adapter changed, setting adapter')
    console.log('[WalletStoreSync] Wallet adapter state:', {
      hasAdapter: !!walletAdapter,
      adapterConnected: walletAdapter?.connected,
      adapterPublicKey: walletAdapter?.publicKey?.toBase58(),
      adapterConnecting: walletAdapter?.connecting,
      adapterDisconnecting: walletAdapter?.disconnecting,
      adapterWallet: !!walletAdapter?.wallet
    })
    stableSetAdapter(walletAdapter)
  }, [walletAdapter, stableSetAdapter]) // Add stableSetAdapter to deps for completeness
  
  // 🔥 M7 PHASE 3 FIX: Stable publicKey string
  const publicKeyString = walletAdapter.publicKey?.toString() || null
  
  useEffect(() => {
    // 🔥 ВРЕМЕННО ОТКЛЮЧЕНО: Проверка монтирования
    // if (isMountedRef.current) {
      const walletState = {
        connected: walletAdapter.connected,
        publicKey: walletAdapter.publicKey,
        connecting: walletAdapter.connecting,
        disconnecting: walletAdapter.disconnecting,
        wallet: walletAdapter.wallet
      }
      
      console.log('[WalletStoreSync] Wallet state changed, triggering debounced update')
      console.log('[WalletStoreSync] New wallet state:', {
        connected: walletState.connected,
        hasPublicKey: !!walletState.publicKey,
        publicKey: walletState.publicKey?.toBase58(),
        connecting: walletState.connecting,
        disconnecting: walletState.disconnecting
      })

      debouncedUpdateState(walletState)
      
      // 🔥 ПОЛУЧАЕМ ПОЛЬЗОВАТЕЛЯ ПРИ ПОДКЛЮЧЕНИИ КОШЕЛЬКА
      if (walletState.connected && walletState.publicKey) {

        if(localStorage.getItem('need_update_feed') === 'true' || !localStorage.getItem('need_update_feed')) {
          localStorage.setItem('need_update_feed', 'false');
        }
        const walletAddress = walletState.publicKey.toBase58()
        console.log('🎯 [WALLET STORE SYNC] Wallet connected, fetching user for:', walletAddress.substring(0, 8) + '...')
        fetchAndSetUser(walletAddress)
      } else if (!walletState.connected) {
        // 🔥 ОЧИЩАЕМ WALLET ПРИ ОТКЛЮЧЕНИИ КОШЕЛЬКА
        console.log('🎯 [WALLET STORE SYNC] Wallet disconnected, clearing JWT via jwtManager')
        jwtManager.logout()
        useAppStore.getState().setJwtReady(false)
        console.log('🎯 [WALLET STORE SYNC] JWT token cleared')
      }
    // } else {
    //   console.log('[WalletStoreSync] State update skipped (unmounted)')
    // }
  }, [walletAdapter.connected, publicKeyString, debouncedUpdateState, fetchAndSetUser]) // Include debouncedUpdateState in deps
  
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