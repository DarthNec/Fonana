/**
 * Главный провайдер приложения
 * Объединяет Zustand store, WebSocket Event Manager и CacheManager
 * Включает Error Boundary для обработки ошибок
 */

'use client'

import { useEffect, ReactNode, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAppStore } from '@/lib/store/appStore'
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
  const { publicKey, connected } = useWallet()
  const { 
    user, 
    setUser, 
    setUserLoading, 
    setUserError,
    refreshUser,
    setNotifications,
    userLoading
  } = useAppStore()

  // Debug логирование для отслеживания race conditions
  useEffect(() => {
    console.log('[AppProvider][Debug] State update:', {
      user: user?.id ? `User ${user.id}` : 'No user',
      userLoading,
      connected,
      publicKey: publicKey?.toBase58() || 'No publicKey',
      isInitialized,
      window: typeof window !== 'undefined' ? 'Client' : 'SSR'
    })
  }, [user, userLoading, connected, publicKey, isInitialized])

  // Инициализация приложения
  useEffect(() => {
    console.log('[AppProvider] Initializing application...')
    
    // Проверяем, что мы на клиенте
    if (typeof window === 'undefined') {
      console.log('[AppProvider] SSR detected, skipping initialization')
      return
    }
    
    // Настройка WebSocket Event Manager
    setupDefaultHandlers()
    
    // Инициализация пользователя из кеша
    initializeUserFromCache()
    
    // Очистка при размонтировании
    return () => {
      console.log('[AppProvider] Cleaning up...')
      cacheManager.cleanup()
    }
  }, [])

  // JWT токен creation при подключении кошелька
  useEffect(() => {
    if (connected && publicKey && isInitialized) {
      console.log('[AppProvider] Wallet connected, ensuring JWT token exists...')
      ensureJWTTokenForWallet(publicKey.toBase58())
    } else if (!connected && isInitialized) {
      console.log('[AppProvider] Wallet disconnected, clearing JWT token...')
      // Очищаем токен при отключении кошелька
      localStorage.removeItem('fonana_jwt_token')
      localStorage.removeItem('fonana_user_wallet')
      jwtManager.logout()
    }
  }, [connected, publicKey, isInitialized])

  /**
   * Обеспечивает существование JWT токена для подключенного кошелька
   */
  const ensureJWTTokenForWallet = async (walletAddress: string) => {
    try {
      // Проверяем, есть ли валидный токен в localStorage
      const savedToken = localStorage.getItem('fonana_jwt_token')
      if (savedToken) {
        try {
          const tokenData = JSON.parse(savedToken)
          if (tokenData.token && tokenData.expiresAt > Date.now() && tokenData.wallet === walletAddress) {
            console.log('[AppProvider] Valid JWT token already exists for this wallet')
            return
          }
        } catch (error) {
          console.warn('[AppProvider] Invalid token format in localStorage, creating new one')
        }
      }
      
      console.log('[AppProvider] Creating JWT token for wallet:', walletAddress.substring(0, 8) + '...')
      
      const response = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet: walletAddress })
      })
      
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
        
        // Обновляем jwtManager чтобы он сразу подхватил новый токен из storage
        // jwtManager автоматически загрузит токен из localStorage при следующем обращении
        
        console.log('[AppProvider] JWT token and user data saved successfully')
      }
      
    } catch (error) {
      console.error('[AppProvider] Error ensuring JWT token:', error)
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