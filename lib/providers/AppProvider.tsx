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
import { useOptimizedPosts } from '../hooks/useOptimizedPosts'
import { cacheManager } from '@/lib/services/CacheManager'
import { LocalStorageCache } from '@/lib/services/CacheManager'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useRetry } from '@/lib/utils/retry'
import { toast } from 'react-hot-toast'
import { jwtManager } from '@/lib/utils/jwt'
import { isPlaywrightTestMode, getPlaywrightTestUser } from '@/lib/test/playwright-detection'
import { socketIOService } from '@/lib/services/socketio'

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

  const { loadPosts } = useOptimizedPosts()
  
  // 🔥 M7 PHASE 2: Enhanced lifecycle management 
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const refreshUserCount = useRef(0);

  useEffect(() => {
    console.log('[AppProvider] Try refresh user')
    if(refreshUserCount.current == 0) {
      console.log('[AppProvider] Refresh user count:', refreshUserCount.current)
      refreshUserCount.current++;
      refreshUser();
      console.log('[AppProvider] user changed:', user);
    }
  }, [])


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

  // 🔥 УПРОЩЕНО: JWT теперь полностью управляется через jwtManager
  // WalletStoreSync сохраняет wallet в localStorage при подключении
  // jwtManager.getToken() сам решает, нужен ли новый токен
  useEffect(() => {
    console.log(`[AppProvider][JWT] Wallet state changed:`, { 
      connected, 
      hasPublicKey: !!publicKey, 
      isInitialized
    })
    
    // При отключении кошелька - очищаем токен
    if (!connected && isInitialized) {
      console.log('[AppProvider] Wallet disconnected, clearing JWT token...')
      if (isMountedRef.current) {
        setJwtReady(false)
      }
      jwtManager.logout()
      console.log('[AppProvider] JWT token cleared via jwtManager')
    }
    
    // При подключении - jwtManager сам получит токен при первом вызове getToken()
    // Нет необходимости вызывать его здесь, WalletStoreSync это сделает
    if (connected && publicKey && isInitialized) {
      console.log('[AppProvider] Wallet connected, JWT will be handled by WalletStoreSync')
    }
  }, [connected, publicKey, isInitialized])

  // 🔌 Socket.IO подключение (работает как для авторизованных, так и для анонимных пользователей)
  useEffect(() => {
    console.log('[AppProvider][Socket.IO] Socket.IO useEffect triggered', {
      hasUser: !!user,
      userId: user?.id,
      isInitialized
    })
    
    // Проверяем, что мы на клиенте
    if (typeof window === 'undefined' || !isInitialized) {
      console.log('[AppProvider][Socket.IO] Skipping Socket.IO connection:', {
        isClient: typeof window !== 'undefined',
        isInitialized
      })
      return
    }

    if (user && user.id) {
      console.log('🔌 [Socket.IO] Connecting to Socket.IO server for authenticated user:', user.id)
      // Подключаемся к Socket.IO с объектом пользователя
      socketIOService.connect(undefined, user)
    } else {
      console.log('🔌 [Socket.IO] Connecting to Socket.IO server anonymously')
      // Подключаемся без пользователя
      socketIOService.connect()
    }
    
    // Обработчик успешного подключения
    const handleConnected = () => {
      console.log('✅ [Socket.IO] Connected successfully!')
      
      // Подписываемся на каналы только если пользователь авторизован
      if (user && user.id) {
        console.log('🔔 [Socket.IO] Subscribing to notifications for user:', user.id)
        socketIOService.subscribeToNotifications(user.id)
        
        console.log('📰 [Socket.IO] Subscribing to feed for user:', user.id)
        socketIOService.subscribeToFeed(user.id)
      } else {
        console.log('👤 [Socket.IO] Connected anonymously (no user subscriptions)')
      }
    }
    
    // Обработчик отключения
    const handleDisconnected = () => {
      console.log('🔌 [Socket.IO] Disconnected from server')
    }
    
    // Обработчик новых уведомлений
    const handleNotification = (data: any) => {
      console.log('📨 [Socket.IO] New notification received:', data)
      
      // Показываем уведомление пользователю
      if (data.notification?.message) {
        toast.success(data.notification.message, {
          duration: 5000,
          icon: '🔔'
        })
      }
      
      // Здесь можно добавить обновление store уведомлений
      // Например: setNotifications([data.notification, ...notifications])
    }
    
    // Обработчик обновления ленты
    const handleFeedUpdate = (data: any) => {
      console.log('📰 [Socket.IO] Feed update received:', data)
      // Здесь можно обновить ленту постов
    }
    
    // Обработчик обновления AI-постов
    const handleAIPostUpdated = (data: any) => {
      console.log('🤖 [Socket.IO] AI Post update received:', data)
      console.log('   Post ID:', data.postId)
      console.log('   Status:', data.status)
      console.log('   Timestamp:', data.timestamp)
      toast.success(`Sora генерация завершена! ${window.location.href == '/feed' ? 'Обновляем ленту...' : ''}`, {
        duration: 3000,
        icon: '🎉'
      })
      if(window.location.href == '/feed') {
        window.location.reload();
      } else {
        window.location.href = '/feed';
      }
      // TODO: Показать уведомление и обновить список постов
      // if (data.status === 'completed') {
      //   showNotification('Пост готов!');
      //   refreshPosts();
      // }
    }
    
    // Регистрируем обработчики событий
    socketIOService.on('connected', handleConnected)
    socketIOService.on('disconnected', handleDisconnected)
    socketIOService.on('notification', handleNotification)
    socketIOService.on('feed_update', handleFeedUpdate)
    socketIOService.on('ai-post-updated', handleAIPostUpdated)
    
    // Если уже подключены, сразу подписываемся
    if (socketIOService.isConnected()) {
      console.log('✅ [Socket.IO] Already connected, subscribing immediately')
      handleConnected()
    }
    
    // Cleanup при размонтировании
    return () => {
      console.log('🧹 [Socket.IO] Cleaning up Socket.IO connection')
      
      // Отписываемся от событий
      socketIOService.off('connected', handleConnected)
      socketIOService.off('disconnected', handleDisconnected)
      socketIOService.off('notification', handleNotification)
      socketIOService.off('feed_update', handleFeedUpdate)
      socketIOService.off('ai-post-updated', handleAIPostUpdated)
      
      // Отписываемся от каналов если пользователь был авторизован
      if (user?.id) {
        socketIOService.unsubscribeFromNotifications(user.id)
        socketIOService.unsubscribeFromFeed(user.id)
      }
      
      // Отключаемся при размонтировании провайдера
      if (!isMountedRef.current) {
        console.log('🔌 [Socket.IO] Disconnecting from server')
        socketIOService.disconnect()
      }
    }
  }, [isInitialized])

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