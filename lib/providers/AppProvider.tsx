/**
 * Главный провайдер приложения
 * Объединяет Zustand store, WebSocket Event Manager и CacheManager
 * Включает Error Boundary для обработки ошибок
 */

'use client'

import React from 'react'
import { useEffect, ReactNode, useState, useRef, useMemo } from 'react'
import { shallow } from 'zustand/shallow'

// Инициализация why-did-you-render для отладки ре-рендеров
// ВРЕМЕННО ОТКЛЮЧЕНО из-за проблем с совместимостью
// if (process.env.NODE_ENV === 'development') {
//   // @ts-ignore
//   import('@welldone-software/why-did-you-render').then(wdyr => {
//     wdyr.default(React, {
//       trackAllPureComponents: true,
//     })
//   })
// }
import dynamic from 'next/dynamic'
import { useAppStore, useUserActions } from '@/lib/store/appStore'
import { setupDefaultHandlers } from '@/lib/services/WebSocketEventManager'
import { cacheManager } from '@/lib/services/CacheManager'
import { LocalStorageCache } from '@/lib/services/CacheManager'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useRetry } from '@/lib/utils/retry'
import { toast } from 'react-hot-toast'
import { jwtManager } from '@/lib/utils/jwt'
import { isPlaywrightTestMode, getPlaywrightTestUser } from '@/lib/test/playwright-detection'

// Dynamic import Toaster to prevent SSR useContext errors
const Toaster = dynamic(
  () => import('react-hot-toast').then(mod => mod.Toaster),
  { ssr: false }
)

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  
  // 🔥 CRITICAL DEBUG: Счетчик рендеров и отслеживание бесконечных циклов
  const renderCountRef = useRef(0)
  const lastRenderTimeRef = useRef(Date.now())
  renderCountRef.current += 1
  
  const currentTime = Date.now()
  const timeSinceLastRender = currentTime - lastRenderTimeRef.current
  lastRenderTimeRef.current = currentTime
  
  console.log(`[AppProvider][CRITICAL DEBUG] Render #${renderCountRef.current} at ${new Date().toISOString()}, time since last: ${timeSinceLastRender}ms`)
  
  // 🔥 БЕСКОНЕЧНЫЙ ЦИКЛ ДЕТЕКТОР
  if (renderCountRef.current > 50) {
    console.error(`🚨 [INFINITE LOOP DETECTED] AppProvider rendered ${renderCountRef.current} times!`)
    console.error('🚨 [INFINITE LOOP] Stack trace:', new Error().stack)
  }
  const { publicKey, connected } = useWallet()
  // 🔥 ВРЕМЕННО ОТКЛЮЧЕНО: Все селекторы действий для предотвращения бесконечных циклов
  const user = useAppStore((state: any) => {
    // console.log(`[AppProvider][SELECTOR DEBUG] user selector called (render #${renderCountRef.current})`)
    return state.user
  })
  
  const userLoading = useAppStore((state: any) => {
    // console.log(`[AppProvider][SELECTOR DEBUG] userLoading selector called (render #${renderCountRef.current})`)
    return state.userLoading
  })
  
  // 🔥 ИСПРАВЛЕНО: Используем стабильные селекторы для действий
  const setUser = useAppStore((state: any) => state.setUser)
  const setUserLoading = useAppStore((state: any) => state.setUserLoading)
  const setUserError = useAppStore((state: any) => state.setUserError)
  const refreshUser = useAppStore((state: any) => state.refreshUser)
  
  // 🔥 ИСПРАВЛЕНО: Используем стабильный селектор для setNotifications
  const setNotifications = useAppStore((state: any) => state.setNotifications)
  // 🔥 ИСПРАВЛЕНО: Используем стабильный селектор для setJwtReady
  const setJwtReady = useAppStore((state: any) => state.setJwtReady)
  
  // 🔥 M7 PHASE 2: Enhanced lifecycle management 
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 🔥 CRITICAL DEBUG: Отслеживаем все изменения состояния
  useEffect(() => {
    console.log(`[AppProvider][CRITICAL DEBUG] State update useEffect triggered (render #${renderCountRef.current}):`, {
      user: user?.id ? 'User ' + user.id : 'No user',
      userLoading,
      connected,
      publicKey: publicKey?.toBase58() || 'No publicKey',
      isInitialized,
      window: typeof window !== 'undefined' ? 'Client' : 'SSR',
      timestamp: Date.now(),
      dependenciesChanged: {
        userId: user?.id,
        userLoading,
        connected,
        publicKeyString: publicKey?.toBase58(),
        isInitialized
      }
    })
    
    // 🔥 ДОПОЛНИТЕЛЬНОЕ ЛОГИРОВАНИЕ ПОДКЛЮЧЕНИЯ КОШЕЛЬКА (только при изменении)
    if (connected && publicKey) {
      // console.log('🎯 [WALLET CONNECTION DETECTED] Wallet connected:')
      // console.log('📊 Wallet Info:', {
      //   connected,
      //   publicKey: publicKey.toBase58(),
      //   publicKeyLength: publicKey.toBase58().length,
      //   isInitialized,
      //   hasUser: !!user,
      //   userLoading
      // })
      // console.log('🎯 [WALLET CONNECTION DETECTED] End of wallet logging')
    }
  }, [user?.id, userLoading, connected, publicKey?.toBase58(), isInitialized])

  // Инициализация приложения
  useEffect(() => {
    console.log(`[AppProvider][INIT DEBUG] Initialization useEffect triggered (render #${renderCountRef.current})`)
    console.log('[AppProvider] Initializing application...')
    
    // Проверяем, что мы на клиенте
    if (typeof window === 'undefined') {
      console.log('[AppProvider] SSR detected, skipping initialization')
      return
    }
    
    console.log('🎯 [INITIALIZATION] Starting app initialization...')
    
    // 🔥 ТЕСТОВАЯ ПРОВЕРКА СИСТЕМЫ
    console.log('🎯 [SYSTEM CHECK] Running system diagnostics...')
    
    // Проверяем localStorage
    try {
      const testKey = 'test_wallet_connection'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      console.log('✅ localStorage available')
    } catch (error) {
      console.error('❌ localStorage not available:', error)
    }
    
    // Проверяем наличие кошелька
    if (window.solana) {
      console.log('✅ Solana wallet detected')
      console.log('📊 Solana wallet info:', {
        isConnected: window.solana.isConnected,
        publicKey: window.solana.publicKey?.toBase58(),
        walletName: window.solana.name
      })
    } else {
      console.log('❌ Solana wallet not detected')
    }
    
    // Проверяем Zustand store
    if (window.__ZUSTAND__) {
      console.log('✅ Zustand store detected')
    } else {
      console.log('❌ Zustand store not detected')
    }
    
    console.log('🎯 [SYSTEM CHECK] System diagnostics completed')
    
    // Настройка WebSocket Event Manager
    setupDefaultHandlers()
    
    // Инициализация пользователя из кеша
    initializeUserFromCache()
    
    // 🔥 M7 PHASE 2: Enhanced cleanup при размонтировании
    return () => {
      console.log('[AppProvider] Cleaning up...')
      isMountedRef.current = false // 🔥 Mark as unmounted
      
      // 🔥 M7 PHASE 2: Abort any running operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      cacheManager.cleanup()
    }
  }, [])

  // 🔥 M7 PHASE 2: JWT токен creation с AbortController protection
  useEffect(() => {
    console.log(`[AppProvider][JWT DEBUG] JWT useEffect triggered (render #${renderCountRef.current}):`, { 
      connected, 
      hasPublicKey: !!publicKey, 
      publicKeyString: publicKey?.toBase58(),
      isInitialized,
      dependenciesChanged: {
        connected,
        publicKeyString: publicKey?.toBase58(),
        isInitialized
      }
    })
    console.log(`[AppProvider][JWT DEBUG] Conditions check:`, {
      connected,
      hasPublicKey: !!publicKey,
      isInitialized,
      allConditionsMet: connected && publicKey && isInitialized
    })
    
    // Abort previous operation if running
    if (abortControllerRef.current) {
      console.log('[AppProvider] Aborting previous JWT operation')
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this operation  
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    console.log('🎯 [JWT CONDITION] Checking conditions:', {
      connected,
      hasPublicKey: !!publicKey,
      isInitialized,
      allConditionsMet: connected && publicKey && isInitialized,
      renderCount: renderCountRef.current
    })
    
    if (connected && publicKey && isInitialized) {
      console.log('🎯 [JWT CONDITION] All conditions met, starting JWT authentication')
      console.log('🎯 [JWT CONDITION] Wallet address:', publicKey.toBase58())
      console.log('[AppProvider] Wallet connected, ensuring JWT token exists...')
      console.log('[AppProvider] 🔥 CRITICAL: About to call ensureJWTTokenForWallet!')
      
      const performJWTWithAbort = async () => {
        console.log('[AppProvider] performJWTWithAbort called')
        try {
          if (signal.aborted || !isMountedRef.current) {
            console.log('[AppProvider] JWT operation cancelled due to abort/unmount')
            return
          }
          console.log('[AppProvider] Calling ensureJWTTokenForWallet...')
          await ensureJWTTokenForWallet(publicKey.toBase58())
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log('[AppProvider] JWT operation was aborted')
          } else {
            console.error('[AppProvider] JWT operation failed:', error)
          }
        }
      }
      
      performJWTWithAbort()
    } else {
      console.log('🎯 [JWT CONDITION] Conditions not met:', {
        connected,
        hasPublicKey: !!publicKey,
        isInitialized,
        reason: !connected ? 'not connected' : !publicKey ? 'no publicKey' : 'not initialized',
        renderCount: renderCountRef.current
      })
    }
    
    if (!connected && isInitialized) {
      console.log('[AppProvider] Wallet disconnected, clearing JWT token...')
      // Clear JWT ready state on disconnect (только если компонент смонтирован)
      if (isMountedRef.current) {
        console.log(`[AppProvider][ACTION DEBUG] setJwtReady(false) on disconnect called (render #${renderCountRef.current})`)
        setJwtReady(false)
      }
      // Очищаем токен при отключении кошелька
      localStorage.removeItem('fonana_jwt_token')
      localStorage.removeItem('fonana_user_wallet')
      jwtManager.logout()
      console.log('[AppProvider] JWT token cleared via manager')
    }

    // 🔥 M7 PHASE 2: Enhanced cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [connected, publicKey, isInitialized])

  /**
   * Обеспечивает существование JWT токена для подключенного кошелька
   * 🔥 M7 PHASE 2: Enhanced with AbortController support
   */
  const ensureJWTTokenForWallet = async (walletAddress: string) => {
    console.log('🎯 [JWT FUNCTION] ensureJWTTokenForWallet called with wallet:', walletAddress.substring(0, 8) + '...')
    console.log('🎯 [JWT FUNCTION] Making request to /api/auth/wallet')
    console.log('🎯 [JWT FUNCTION] Starting JWT authentication process...')
    console.log('[AppProvider] 🔥 CRITICAL: ensureJWTTokenForWallet function started!')
    const signal = abortControllerRef.current?.signal
    try {
      // 🔥 PRODUCTION MODE FIX: Check if component is still mounted
      if (!isMountedRef.current) {
        console.log('[AppProvider] Component unmounted, aborting JWT creation')
        return
      }
      
      // 🔥 M7 PHASE 2: Check for abort before setState
      if (signal?.aborted) {
        console.log('[AppProvider] Operation aborted before setJwtReady(false)')
        return
      }
      
      // Set JWT as not ready at start (только если не прервано)
      if (!signal?.aborted) {
        console.log(`[AppProvider][ACTION DEBUG] setJwtReady(false) at start called (render #${renderCountRef.current})`)
        setJwtReady(false)
      }
      
      // 🔥 ВСЕГДА СОЗДАЕМ НОВЫЙ ТОКЕН ПРИ ПОДКЛЮЧЕНИИ КОШЕЛЬКА
      console.log('[AppProvider] Always creating fresh JWT token for wallet connection')
      
      // Очищаем старые токены
      localStorage.removeItem('fonana_jwt_token')
      
      console.log('[AppProvider] Creating JWT token for wallet:', walletAddress.substring(0, 8) + '...')
      
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('JWT creation timeout')), 10000)
      )
      
      console.log('🎯 [FETCH REQUEST] Making fetch to /api/auth/token with wallet:', walletAddress.substring(0, 8) + '...')
      
      const tokenPromise = fetch(`/api/auth/token?wallet=${walletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal // 🔥 M7 PHASE 2: AbortController integration
      })
      
      console.log('🎯 [FETCH REQUEST] Fetch request sent, waiting for response...')
      
      const response = await Promise.race([tokenPromise, timeoutPromise])
      
      console.log('🎯 [FETCH RESPONSE] Response received:', {
        status: (response as Response).status,
        statusText: (response as Response).statusText,
        ok: (response as Response).ok,
        headers: Object.fromEntries((response as Response).headers.entries())
      })
      
      if (!(response as Response).ok) {
        console.error('[AppProvider] Failed to create JWT token:', (response as Response).status)
        const errorText = await (response as Response).text()
        console.error('[AppProvider] Error response:', errorText)
        return
      }
      
      const data = await (response as Response).json()
      
      console.log('🎯 [JWT RESPONSE] Raw response data:', {
        hasData: !!data,
        hasToken: !!data?.token,
        hasUser: !!data?.user,
        dataKeys: Object.keys(data || {})
      })
      
      if (data.token && data.user) {
        console.log('[AppProvider] JWT token created successfully, saving to localStorage')
        console.log('🎯 [JWT SUCCESS] User data received:', {
          hasToken: !!data.token,
          tokenLength: data.token?.length,
          hasUser: !!data.user,
          userId: data.user?.id,
          userWallet: data.user?.wallet,
          userNickname: data.user?.nickname
        })
        
        // 🔥 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ПОЛЬЗОВАТЕЛЯ ПРИ ПОДКЛЮЧЕНИИ КОШЕЛЬКА
        console.log('🎯 [WALLET CONNECTION] User data received from API:')
        console.log('📊 User Object Structure:', {
          id: data.user.id,
          wallet: data.user.wallet,
          nickname: data.user.nickname,
          fullName: data.user.fullName,
          avatar: data.user.avatar,
          isCreator: data.user.isCreator,
          isVerified: data.user.isVerified,
          // Дополнительные поля если есть
          bio: data.user.bio,
          backgroundImage: data.user.backgroundImage,
          followersCount: data.user.followersCount,
          followingCount: data.user.followingCount,
          postsCount: data.user.postsCount,
          createdAt: data.user.createdAt,
          updatedAt: data.user.updatedAt,
          referrerId: data.user.referrerId,
          referrer: data.user.referrer
        })
        console.log('🔍 Raw API Response:', JSON.stringify(data.user, null, 2))
        console.log('🎯 [WALLET CONNECTION] End of user data logging')
        
        // Сохраняем токен в localStorage для jwtManager
        const tokenData = {
          token: data.token,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 дней
          userId: data.user.id,
          wallet: data.user.wallet
        }
        
        localStorage.setItem('fonana_jwt_token', JSON.stringify(tokenData))
        localStorage.setItem('fonana_user_wallet', data.user.wallet)
        
        // Обновляем пользователя в store если еще нет
        if (!user && isMountedRef.current) {
          console.log(`[AppProvider][ACTION DEBUG] setUser(data.user) in JWT creation called (render #${renderCountRef.current})`)
          setUser(data.user)
        }
        
        // 🔥 PRODUCTION MODE FIX: Check if still mounted before setState
        if (!isMountedRef.current) {
          console.log('[AppProvider] Component unmounted during JWT creation, skipping setState')
          return
        }
        
        // CRITICAL: Set JWT ready AFTER token is saved
        // Добавляем дополнительную проверку чтобы избежать бесконечного цикла
        if (signal?.aborted) {
          console.log('[AppProvider] Operation aborted before setJwtReady(true)')
          return
        }
        
        console.log(`[AppProvider][ACTION DEBUG] setJwtReady(true) after token creation called (render #${renderCountRef.current})`)
        console.log('[AppProvider] 🔥 CRITICAL: Setting JWT ready to true!')
        setJwtReady(true)
        
        // Обновляем jwtManager чтобы он сразу подхватил новый токен из storage
        // jwtManager автоматически загрузит токен из localStorage при следующем обращении
        
        console.log('[AppProvider] JWT token ready for components')
      } else {
        console.error('[AppProvider] Invalid JWT response - missing token or user:', {
          hasToken: !!data?.token,
          hasUser: !!data?.user,
          data: data
        })
      }
      
    } catch (error) {
      console.error('[AppProvider] JWT creation failed:', error)
      
      // 🔥 PRODUCTION MODE FIX: Check if still mounted before setState
      if (!isMountedRef.current) {
        console.log('[AppProvider] Component unmounted during JWT error, skipping setState')
        return
      }
      
      // Добавляем дополнительную проверку чтобы избежать бесконечного цикла
      if (signal?.aborted) {
        console.log('[AppProvider] Operation aborted before setJwtReady(false)')
        return
      }
      
      console.log(`[AppProvider][ACTION DEBUG] setJwtReady(false) on error called (render #${renderCountRef.current})`)
      setJwtReady(false)
      
      // Show user-friendly error after a delay to avoid flooding
      setTimeout(() => {
        toast.error('Authentication failed. Please try reconnecting your wallet.')
      }, 1000)
    }
  }

  /**
   * Validate JWT token availability and correctness
   */
  const validateJwtToken = async () => {
    try {
      const token = await jwtManager.getToken()
      if (!token) {
        console.warn('[AppProvider] JWT validation failed - no token')
        if (isMountedRef.current) {
          console.log(`[AppProvider][ACTION DEBUG] setJwtReady(false) in validateJwtToken called (render #${renderCountRef.current})`)
          setJwtReady(false)
        }
        return false
      }
      
      console.log('[AppProvider] JWT token validation passed')
      return true
    } catch (error) {
      console.error('[AppProvider] JWT validation error:', error)
      if (isMountedRef.current) {
        console.log(`[AppProvider][ACTION DEBUG] setJwtReady(false) in validateJwtToken catch called (render #${renderCountRef.current})`)
        setJwtReady(false)
      }
      return false
    }
  }

  /**
   * Инициализация пользователя из кеша
   */
  const initializeUserFromCache = async () => {
    try {
              if (isMountedRef.current) {
          console.log(`[AppProvider][ACTION DEBUG] setUserLoading(true) called (render #${renderCountRef.current})`)
          setUserLoading(true)
        }
      
      // [NEW] Check for Playwright test mode first
      if (isPlaywrightTestMode()) {
        console.log('[Playwright] Test mode detected, using test user')
        const testUser = getPlaywrightTestUser()
        if (testUser) {
          // 🔥 ЛОГИРОВАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ
          console.log('🎯 [PLAYWRIGHT TEST] Loading test user:')
          console.log('📊 Test User Object:', {
            id: testUser.id,
            wallet: testUser.wallet,
            nickname: testUser.nickname,
            fullName: testUser.fullName,
            avatar: testUser.avatar,
            isCreator: testUser.isCreator,
            isVerified: testUser.isVerified,
            bio: testUser.bio,
            backgroundImage: testUser.backgroundImage,
            followersCount: testUser.followersCount,
            followingCount: testUser.followingCount,
            postsCount: testUser.postsCount
          })
          console.log('🔍 Complete Test User Object:', JSON.stringify(testUser, null, 2))
          console.log('🎯 [PLAYWRIGHT TEST] End of test user logging')
          
          if (isMountedRef.current) {
            console.log(`[AppProvider][ACTION DEBUG] setUser(testUser) called (render #${renderCountRef.current})`)
            setUser(testUser)
          }
                    console.log('[AppProvider] Setting isInitialized to true (test user)')
          setIsInitialized(true)
          if (isMountedRef.current) {
            console.log(`[AppProvider][ACTION DEBUG] setUserLoading(false) called (render #${renderCountRef.current})`)
            setUserLoading(false)
          }
          return
        }
      }
      
      // Попытка получить пользователя из localStorage
      const cachedUser = LocalStorageCache.get<any>('user')
      if (cachedUser && typeof cachedUser === 'object' && cachedUser.id) {
        console.log('[AppProvider] Found cached user, setting immediately to prevent race conditions...')
        
        // 🔥 ЛОГИРОВАНИЕ КЕШИРОВАННОГО ПОЛЬЗОВАТЕЛЯ
        console.log('🎯 [CACHE INITIALIZATION] Loading user from localStorage cache:')
        console.log('📊 Cached User Object:', {
          id: cachedUser.id,
          wallet: cachedUser.wallet,
          nickname: cachedUser.nickname,
          fullName: cachedUser.fullName,
          avatar: cachedUser.avatar,
          isCreator: cachedUser.isCreator,
          isVerified: cachedUser.isVerified,
          bio: cachedUser.bio,
          backgroundImage: cachedUser.backgroundImage,
          followersCount: cachedUser.followersCount,
          followingCount: cachedUser.followingCount,
          postsCount: cachedUser.postsCount,
          createdAt: cachedUser.createdAt,
          updatedAt: cachedUser.updatedAt
        })
        console.log('🔍 Complete Cached User Object:', JSON.stringify(cachedUser, null, 2))
        console.log('🎯 [CACHE INITIALIZATION] End of cached user logging')
        
        if (isMountedRef.current) {
          console.log(`[AppProvider][ACTION DEBUG] setUser(cachedUser) called (render #${renderCountRef.current})`)
          setUser(cachedUser)
        }
        console.log('[AppProvider] Setting isInitialized to true (cached user)')
        setIsInitialized(true) // Сразу помечаем как инициализированный
        
        // Обновить данные с сервера в фоне (только если компонент все еще смонтирован)
        // Убираем refreshUser чтобы избежать бесконечного цикла
        console.log('[AppProvider] Skipping refreshUser to prevent infinite loop')
      } else {
        console.log('[AppProvider] No cached user found, marking as initialized')
        console.log('[AppProvider] Setting isInitialized to true (no cached user)')
        setIsInitialized(true)
      }
    } catch (error) {
      console.error('[AppProvider] Error initializing user:', error)
      if (isMountedRef.current) {
        console.log(`[AppProvider][ACTION DEBUG] setUserError called (render #${renderCountRef.current})`)
        setUserError(error as Error)
      }
      console.log('[AppProvider] Setting isInitialized to true (error case)')
      setIsInitialized(true) // Всегда помечаем как инициализированный
    } finally {
      if (isMountedRef.current) {
        console.log(`[AppProvider][ACTION DEBUG] setUserLoading(false) in finally called (render #${renderCountRef.current})`)
        setUserLoading(false)
      }
    }
  }

  // SSR fallback: возвращаем минимальный Provider без инициализации
  if (typeof window === 'undefined') {
    return (
      <ErrorBoundary>
        <div className="app-provider">
          {children}
        </div>
      </ErrorBoundary>
    )
  }

  // Soft guard: показываем loading до полной инициализации
  if (!isInitialized && typeof window !== 'undefined') {
    return (
      <ErrorBoundary>
        <div className="app-provider">
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-slate-400">Initializing application...</p>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="app-provider">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </ErrorBoundary>
  )
}

// Включаем why-did-you-render для AppProvider
// ВРЕМЕННО ОТКЛЮЧЕНО
// ;(AppProvider as any).whyDidYouRender = true

// Хук для доступа к состоянию приложения
export const useApp = () => {
  return useAppStore(state => state)
}

// Хук для проверки готовности приложения
export const useAppReady = () => {
  const { user, userLoading, userError } = useAppStore(state => ({
    user: state.user,
    userLoading: state.userLoading,
    userError: state.userError
  }))
  
  return {
    isReady: !userLoading && (user !== null || userError !== null),
    isLoading: userLoading,
    hasError: userError !== null,
    error: userError
  }
}

// Хук для работы с кешем
export const useCache = () => {
  return {
    get: cacheManager.get.bind(cacheManager),
    set: cacheManager.set.bind(cacheManager),
    has: cacheManager.has.bind(cacheManager),
    delete: cacheManager.delete.bind(cacheManager),
    invalidate: cacheManager.invalidate.bind(cacheManager),
    clear: cacheManager.clear.bind(cacheManager),
    getStats: cacheManager.getStats.bind(cacheManager)
  }
}

// Хук для работы с localStorage кешем
export const useLocalStorageCache = () => {
  return {
    get: LocalStorageCache.get,
    set: LocalStorageCache.set,
    has: LocalStorageCache.has,
    delete: LocalStorageCache.delete,
    clear: LocalStorageCache.clear
  }
} 