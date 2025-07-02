/**
 * Главный провайдер приложения
 * Объединяет Zustand store, WebSocket Event Manager и CacheManager
 * Включает Error Boundary для обработки ошибок
 */

'use client'

import { useEffect, ReactNode, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAppStore } from '@/lib/store/appStore'
import { setupDefaultHandlers } from '@/lib/services/WebSocketEventManager'
import { cacheManager } from '@/lib/services/CacheManager'
import { LocalStorageCache } from '@/lib/services/CacheManager'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useWallet } from '@solana/wallet-adapter-react'

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const { 
    setUser, 
    setUserLoading, 
    setUserError,
    refreshUser,
    user,
    userLoading
  } = useAppStore()
  
  const { connected, publicKey } = useWallet()
  const [isInitialized, setIsInitialized] = useState(false)

  // Debug логирование для отслеживания race conditions
  useEffect(() => {
    console.log('[AppProvider][Debug] State update:', {
      user: user?.id ? `User ${user.id}` : 'No user',
      userLoading,
      connected,
      publicKey: publicKey?.toBase58() ? 'Has publicKey' : 'No publicKey',
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

  /**
   * Инициализация пользователя из кеша
   */
  const initializeUserFromCache = async () => {
    try {
      setUserLoading(true)
      
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

  // Soft guard: показываем loading до полной инициализации
  if (!isInitialized && typeof window !== 'undefined') {
    return (
      <ErrorBoundary
        onError={(error, errorInfo) => {
          console.error('[AppProvider] Error caught by boundary:', error, errorInfo)
        }}
      >
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
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[AppProvider] Error caught by boundary:', error, errorInfo)
      }}
    >
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