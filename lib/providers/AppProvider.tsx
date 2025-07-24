/**
 * Главный провайдер приложения
 * Объединяет Zustand store, WebSocket Event Manager и CacheManager
 * Включает Error Boundary для обработки ошибок
 */

'use client'

import { useEffect, ReactNode, useState, useRef } from 'react'
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
  // 🔥 M7 PHASE 2: Global App State Coordination
  const [isStable, setIsStable] = useState(false)
  const [initializationPhase, setInitializationPhase] = useState<'mounting' | 'initializing' | 'stable'>('mounting')
  
  const { publicKey, connected } = useWallet()
  
  // 🔥 CRITICAL FIX: Stable publicKey string for dependencies
  const publicKeyString = publicKey?.toBase58()
  
  const { 
    user, 
    setUser, 
    setUserLoading, 
    setUserError,
    refreshUser,
    setNotifications,
    userLoading
  } = useAppStore()
  const { setJwtReady } = useUserActions()
  
  // 🔥 M7 PHASE 2: Enhanced lifecycle management 
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 🔥 FIXED: Debug логирование с stable dependencies
  useEffect(() => {
    console.log('[AppProvider][Debug] State update:', {
      user: user?.id ? `User ${user.id}` : 'No user',
      userLoading,
      connected,
      publicKey: publicKeyString || 'No publicKey',
      isInitialized,
      window: typeof window !== 'undefined' ? 'Client' : 'SSR'
    })
  }, [user?.id, userLoading, connected, publicKeyString, isInitialized])

  // 🔥 M7 PHASE 2: Coordinated initialization sequence
  useEffect(() => {
    console.log('[AppProvider] Starting coordinated initialization sequence...')
    
    // Проверяем, что мы на клиенте
    if (typeof window === 'undefined') {
      console.log('[AppProvider] SSR detected, skipping initialization')
      return
    }
    
    const initSequence = async () => {
      try {
        console.log('[AppProvider] Phase: mounting → initializing')
        setInitializationPhase('initializing')
        
        // 🔥 Wait for critical dependencies (wallet sync)
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 🔥 Initialize core services in order
        console.log('[AppProvider] Setting up WebSocket handlers...')
        setupDefaultHandlers()
        
        console.log('[AppProvider] Initializing user from cache...')
        await initializeUserFromCache()
        
        // 🔥 Mark as stable and signal to DOM
        console.log('[AppProvider] Phase: initializing → stable')
        setInitializationPhase('stable')
        setIsStable(true)
        
        // 🔥 Signal to ServiceWorker that app is ready
        document.body.setAttribute('data-app-initialized', 'true')
        console.log('[AppProvider] Initialization complete - app stable and ready')
        
      } catch (error) {
        console.error('[AppProvider] Initialization failed:', error)
        // Still mark as stable to prevent hanging
        setInitializationPhase('stable')
        setIsStable(true)
        document.body.setAttribute('data-app-initialized', 'true')
      }
    }
    
    initSequence()
    
    // 🔥 M7 PHASE 2: Enhanced cleanup при размонтировании
    return () => {
      console.log('[AppProvider] Cleaning up...')
      isMountedRef.current = false // 🔥 Mark as unmounted
      
      // 🔥 M7 PHASE 2: Abort any running operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Clear stability signal
      document.body.removeAttribute('data-app-initialized')
      
      cacheManager.cleanup()
    }
  }, [])

  // 🔥 M7 PHASE 2: JWT операции только после app stability - FIXED DEPENDENCIES
  useEffect(() => {
    // 🔥 Only proceed if app is stable
    if (!isStable || initializationPhase !== 'stable') {
      console.log('[AppProvider] Deferring JWT operations - app not stable yet', {
        isStable,
        initializationPhase
      })
      return
    }

    // Abort previous operation if running
    if (abortControllerRef.current) {
      console.log('[AppProvider] Aborting previous JWT operation')
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this operation  
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    if (connected && publicKeyString && isInitialized) {
      console.log('[AppProvider] App stable - proceeding with JWT creation for wallet:', 
        publicKeyString.substring(0, 8) + '...')
      
      const performJWTWithAbort = async () => {
        try {
          if (signal.aborted || !isMountedRef.current) {
            console.log('[AppProvider] JWT operation cancelled due to abort/unmount')
            return
          }
          await ensureJWTTokenForWallet(publicKeyString)
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log('[AppProvider] JWT operation was aborted')
          } else {
            console.error('[AppProvider] JWT operation failed:', error)
          }
        }
      }
      
      performJWTWithAbort()
    } else if (!connected && isInitialized) {
      console.log('[AppProvider] Wallet disconnected, clearing JWT token...')
      // Clear JWT ready state on disconnect
      setJwtReady(false)
      // Очищаем токен при отключении кошелька
      localStorage.removeItem('fonana_jwt_token')
      localStorage.removeItem('fonana_user_wallet')
      jwtManager.logout()
    }

    // 🔥 M7 PHASE 2: Enhanced cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [connected, publicKeyString, isInitialized, isStable, initializationPhase])

  /**
   * Обеспечивает существование JWT токена для подключенного кошелька
   * 🔥 M7 PHASE 2: Enhanced with AbortController support
   */
  const ensureJWTTokenForWallet = async (walletAddress: string) => {
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
      
      // Set JWT as not ready at start
      setJwtReady(false)
      
      // Проверяем, есть ли валидный токен в localStorage
      const savedToken = localStorage.getItem('fonana_jwt_token')
      if (savedToken) {
        try {
          const tokenData = JSON.parse(savedToken)
          if (tokenData.token && tokenData.expiresAt > Date.now() && tokenData.wallet === walletAddress) {
            console.log('[AppProvider] Valid JWT token already exists for this wallet')
            
            // 🔥 M7 PHASE 2: Check for abort before setState
            if (signal?.aborted) {
              console.log('[AppProvider] Operation aborted before setJwtReady(true)')
              return
            }
            
            setJwtReady(true) // Set ready immediately for existing valid token
            return
          }
        } catch (error) {
          console.warn('[AppProvider] Invalid token format in localStorage, creating new one')
        }
      }
      
      console.log('[AppProvider] Creating JWT token for wallet:', walletAddress.substring(0, 8) + '...')
      
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('JWT creation timeout')), 10000)
      )
      
      const tokenPromise = fetch('/api/auth/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet: walletAddress }),
        signal // 🔥 M7 PHASE 2: AbortController integration
      })
      
      const response = await Promise.race([tokenPromise, timeoutPromise])
      
      if (!response.ok) {
        console.error('[AppProvider] Failed to create JWT token:', response.status)
        return
      }
      
      const data = await response.json()
      
      if (data.token && data.user) {
        console.log('[AppProvider] JWT token created successfully, saving to localStorage')
        
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
        if (!user) {
          setUser(data.user)
        }
        
        // 🔥 PRODUCTION MODE FIX: Check if still mounted before setState
        if (!isMountedRef.current) {
          console.log('[AppProvider] Component unmounted during JWT creation, skipping setState')
          return
        }
        
        // CRITICAL: Set JWT ready AFTER token is saved
        setJwtReady(true)
        
        // Обновляем jwtManager чтобы он сразу подхватил новый токен из storage
        // jwtManager автоматически загрузит токен из localStorage при следующем обращении
        
        console.log('[AppProvider] JWT token ready for components')
      }
      
    } catch (error) {
      console.error('[AppProvider] JWT creation failed:', error)
      
      // 🔥 PRODUCTION MODE FIX: Check if still mounted before setState
      if (!isMountedRef.current) {
        console.log('[AppProvider] Component unmounted during JWT error, skipping setState')
        return
      }
      
      setJwtReady(false) // Ensure false on failure
      
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
        setJwtReady(false)
        return false
      }
      
      console.log('[AppProvider] JWT token validation passed')
      return true
    } catch (error) {
      console.error('[AppProvider] JWT validation error:', error)
      setJwtReady(false)
      return false
    }
  }

  /**
   * Инициализация пользователя из кеша
   */
  const initializeUserFromCache = async () => {
    try {
      setUserLoading(true)
      
      // [NEW] Check for Playwright test mode first
      if (isPlaywrightTestMode()) {
        console.log('[Playwright] Test mode detected, using test user')
        const testUser = getPlaywrightTestUser()
        if (testUser) {
          setUser(testUser)
          setIsInitialized(true)
          setUserLoading(false)
          return
        }
      }
      
      // Попытка получить пользователя из localStorage
      const cachedUser = LocalStorageCache.get<any>('user')
      if (cachedUser && typeof cachedUser === 'object' && cachedUser.id) {
        console.log('[AppProvider] Found cached user, setting immediately to prevent race conditions...')
        setUser(cachedUser)
        setIsInitialized(true) // Сразу помечаем как инициализированный
        
        // Обновить данные с сервера в фоне
        setTimeout(() => {
          refreshUser().catch(error => {
            console.warn('[AppProvider] Failed to refresh user:', error)
          })
        }, 1000)
      } else {
        console.log('[AppProvider] No cached user found, marking as initialized')
        setIsInitialized(true)
      }
    } catch (error) {
      console.error('[AppProvider] Error initializing user:', error)
      setUserError(error as Error)
      setIsInitialized(true) // Всегда помечаем как инициализированный
    } finally {
      setUserLoading(false)
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

// Хук для доступа к состоянию приложения
export const useApp = () => {
  return useAppStore()
}

// Хук для проверки готовности приложения
export const useAppReady = () => {
  const { user, userLoading, userError } = useAppStore()
  
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