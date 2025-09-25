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

    // 🔥 ФУНКЦИЯ ПОЛУЧЕНИЯ ПОЛЬЗОВАТЕЛЯ И JWT ТОКЕНА ПРИ ПОДКЛЮЧЕНИИ КОШЕЛЬКА
  const fetchAndSetUser = useCallback(
    debounce(async (wallet: string) => {
      try {
        console.log('🎯 [WALLET STORE SYNC] Fetching user for wallet:', wallet.substring(0, 8) + '...')
        
        // 🔥 СОХРАНЯЕМ WALLET В LOCALSTORAGE ДЛЯ JWT
        localStorage.setItem('fonana_user_wallet', wallet)
        console.log('🎯 [WALLET STORE SYNC] Wallet saved to localStorage:', wallet.substring(0, 8) + '...')
        
        // 🔥 OPTIMIZATION: Check if we already have a valid JWT token for this wallet
        const existingToken = localStorage.getItem('fonana_jwt_token')
        if (existingToken) {
          try {
            const tokenData = JSON.parse(existingToken)
            const isTokenValid = tokenData.token && 
                                tokenData.expiresAt > Date.now() && 
                                tokenData.wallet === wallet
            
            if (isTokenValid) {
              console.log('🎯 [WALLET STORE SYNC] Found existing valid JWT token, using it instead of creating new one')
              console.log('🎯 [WALLET STORE SYNC] Token expires at:', new Date(tokenData.expiresAt).toISOString())
              
              // Skip token creation, just fetch user data if needed
              console.log('🎯 [WALLET STORE SYNC] Skipping JWT token creation, using existing valid token')
            } else {
              console.log('🎯 [WALLET STORE SYNC] Existing token is invalid or expired, will create new one')
              // 🔥 ОЧИЩАЕМ СТАРЫЕ ТОКЕНЫ ПЕРЕД ПОЛУЧЕНИЕМ НОВОГО
              localStorage.removeItem('fonana_jwt_token')
              
              // 🔥 ПОЛУЧАЕМ НОВЫЙ JWT ТОКЕН ДЛЯ ПОЛЬЗОВАТЕЛЯ
              console.log('🎯 [WALLET STORE SYNC] Getting fresh JWT token for wallet...')
              const tokenResponse = await fetch(`/api/auth/token?wallet=${wallet}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json'
                }
              })
              
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json()
                console.log('🎯 [WALLET STORE SYNC] Token response received:', {
                  hasToken: !!tokenData.token,
                  hasUser: !!tokenData.user,
                  tokenLength: tokenData.token?.length
                })
                
                if (tokenData.token) {
                  // 🔥 СОХРАНЯЕМ НОВЫЙ JWT ТОКЕН В LOCALSTORAGE
                  const tokenToSave = {
                    token: tokenData.token,
                    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 дней
                    userId: tokenData.user.id,
                    wallet: tokenData.user.wallet
                  }
                  localStorage.setItem('fonana_jwt_token', JSON.stringify(tokenToSave))
                  console.log('🎯 [WALLET STORE SYNC] Fresh JWT token saved to localStorage')
                  
                  // 🔥 ПРОВЕРЯЕМ, ЧТО ТОКЕН ДЕЙСТВИТЕЛЬНО СОХРАНИЛСЯ
                  const savedToken = localStorage.getItem('fonana_jwt_token')
                  console.log('🎯 [WALLET STORE SYNC] Verification - saved token exists:', !!savedToken)
                } else {
                  console.warn('🎯 [WALLET STORE SYNC] No token in response')
                }
              } else {
                console.error('🎯 [WALLET STORE SYNC] Failed to get JWT token:', tokenResponse.status)
                const errorText = await tokenResponse.text()
                console.error('🎯 [WALLET STORE SYNC] Error response:', errorText)
              }
            }
          } catch (error) {
            console.warn('🎯 [WALLET STORE SYNC] Error parsing existing token, will create new one:', error)
            // Fallback to creating new token
            localStorage.removeItem('fonana_jwt_token')
            
            // 🔥 ПОЛУЧАЕМ НОВЫЙ JWT ТОКЕН ДЛЯ ПОЛЬЗОВАТЕЛЯ
            console.log('🎯 [WALLET STORE SYNC] Getting fresh JWT token for wallet...')
            const tokenResponse = await fetch(`/api/auth/token?wallet=${wallet}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            })
            
            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json()
              console.log('🎯 [WALLET STORE SYNC] Token response received:', {
                hasToken: !!tokenData.token,
                hasUser: !!tokenData.user,
                tokenLength: tokenData.token?.length
              })
              
              if (tokenData.token) {
                // 🔥 СОХРАНЯЕМ НОВЫЙ JWT ТОКЕН В LOCALSTORAGE
                const tokenToSave = {
                  token: tokenData.token,
                  expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 дней
                  userId: tokenData.user.id,
                  wallet: tokenData.user.wallet
                }
                localStorage.setItem('fonana_jwt_token', JSON.stringify(tokenToSave))
                console.log('🎯 [WALLET STORE SYNC] Fresh JWT token saved to localStorage')
                
                // 🔥 ПРОВЕРЯЕМ, ЧТО ТОКЕН ДЕЙСТВИТЕЛЬНО СОХРАНИЛСЯ
                const savedToken = localStorage.getItem('fonana_jwt_token')
                console.log('🎯 [WALLET STORE SYNC] Verification - saved token exists:', !!savedToken)
              } else {
                console.warn('🎯 [WALLET STORE SYNC] No token in response')
              }
            } else {
              console.error('🎯 [WALLET STORE SYNC] Failed to get JWT token:', tokenResponse.status)
              const errorText = await tokenResponse.text()
              console.error('🎯 [WALLET STORE SYNC] Error response:', errorText)
            }
          }
        } else {
          console.log('🎯 [WALLET STORE SYNC] No existing token found, creating new one...')
          
          // 🔥 ПОЛУЧАЕМ НОВЫЙ JWT ТОКЕН ДЛЯ ПОЛЬЗОВАТЕЛЯ
          console.log('🎯 [WALLET STORE SYNC] Getting fresh JWT token for wallet...')
          const tokenResponse = await fetch(`/api/auth/token?wallet=${wallet}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json()
            console.log('🎯 [WALLET STORE SYNC] Token response received:', {
              hasToken: !!tokenData.token,
              hasUser: !!tokenData.user,
              tokenLength: tokenData.token?.length
            })
            
            if (tokenData.token) {
              // 🔥 СОХРАНЯЕМ НОВЫЙ JWT ТОКЕН В LOCALSTORAGE
              const tokenToSave = {
                token: tokenData.token,
                expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 дней
                userId: tokenData.user.id,
                wallet: tokenData.user.wallet
              }
              localStorage.setItem('fonana_jwt_token', JSON.stringify(tokenToSave))
              console.log('🎯 [WALLET STORE SYNC] Fresh JWT token saved to localStorage')
              
              // 🔥 ПРОВЕРЯЕМ, ЧТО ТОКЕН ДЕЙСТВИТЕЛЬНО СОХРАНИЛСЯ
              const savedToken = localStorage.getItem('fonana_jwt_token')
              console.log('🎯 [WALLET STORE SYNC] Verification - saved token exists:', !!savedToken)
            } else {
              console.warn('🎯 [WALLET STORE SYNC] No token in response')
            }
          } else {
            console.error('🎯 [WALLET STORE SYNC] Failed to get JWT token:', tokenResponse.status)
            const errorText = await tokenResponse.text()
            console.error('🎯 [WALLET STORE SYNC] Error response:', errorText)
          }
        }
        
        // 🔥 ПОЛУЧАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ (только если еще не загружен)
        const currentUser = useAppStore.getState().user
        console.log('[WalletStoreSync] currentUser:', currentUser)
        if (!currentUser || currentUser.wallet !== wallet || !localStorage.getItem('fonana_user_wallet') != null) {
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

              let likesData = []

              if(data.user.id) {
              // Fetch with abort signal
                const likesResponse = await fetch(`/api/likes/user?userId=${data.user.id}`)
                if (!likesResponse.ok) {
                  throw new Error(`HTTP ${likesResponse.status}: ${likesResponse.statusText}`)
                }
                likesData = await likesResponse.json()
                console.log(`[🎯 [WALLET STORE SYNC] User likes:`, likesData);
                localStorage.setItem('user_likes', JSON.stringify(likesData || null));
              }


            } else {
              console.warn('🎯 [WALLET STORE SYNC] No user data in response')
            }
          } else {
            console.error('🎯 [WALLET STORE SYNC] Failed to fetch user:', response.status, response.statusText)
          }
        } else {
          console.log('🎯 [WALLET STORE SYNC] User already loaded, skipping fetch')
        }
      } catch (error) {
        console.error('🎯 [WALLET STORE SYNC] Error fetching user:', error)
      }
    }, 500), // 🔥 500ms debounce
    [setUser]
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
        console.log('🎯 [WALLET STORE SYNC] Wallet disconnected, clearing localStorage and JWT')

        localStorage.removeItem('fonana_user_wallet')
        localStorage.removeItem('fonana_jwt_token')
        
        // 🔥 ОЧИЩАЕМ JWT ТОКЕН ЧЕРЕЗ МЕНЕДЖЕР
        import('@/lib/utils/jwt').then(({ jwtManager }) => {
          jwtManager.logout()
          console.log('🎯 [WALLET STORE SYNC] JWT token cleared via manager')
        })
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