/**
 * Глобальное хранилище Zustand для централизованного управления состоянием
 * Заменяет UserContext, NotificationContext, CreatorContext
 */

'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { UnifiedPost } from '@/types/posts'
import { throttle } from 'lodash-es' // 🔥 M7 FIX: Throttle for store actions
import { useState, useEffect, useMemo } from 'react'

// Типы пользователя
export interface User {
  id: string
  wallet?: string
  solanaWallet?: string
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  backgroundImage?: string
  isVerified: boolean
  isCreator: boolean
  followersCount: number
  followingCount: number
  postsCount: number
  createdAt: string
  updatedAt: string
  referrerId?: string
  referrer?: {
    id: string
    wallet?: string
    solanaWallet?: string
  } | null
}

export interface ProfileData {
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  backgroundImage?: string
}

// Типы для уведомлений
export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: string
}

// Типы для создателя
export interface Creator {
  id: string
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  backgroundImage?: string
  isVerified: boolean
  isCreator: boolean
  followersCount: number
  followingCount?: number
  postsCount: number
  subscriptionType?: 'free' | 'basic' | 'premium' | 'vip'
  tierSettings?: any
  wallet?: string
  solanaWallet?: string
  website?: string
  twitter?: string
  telegram?: string
  location?: string
  referrerId?: string
  referrer?: {
    id: string
    wallet?: string
    solanaWallet?: string
  } | null
  flashSales?: any[]
  earnings?: any
  subscriptions?: any[]
  subscribers?: any[]
  createdAt?: string | Date
}

// User Slice
interface UserSlice {
  // Состояние
  user: User | null
  userLoading: boolean
  isNewUser: boolean
  showProfileForm: boolean
  userError: Error | null
  
  // JWT Authentication State
  isJwtReady: boolean
  
  // Действия
  setUser: (user: User | null) => void
  setUserLoading: (loading: boolean) => void
  setNewUser: (isNew: boolean) => void
  setShowProfileForm: (show: boolean) => void
  setUserError: (error: Error | null) => void
  setJwtReady: (ready: boolean) => void
  updateProfile: (data: ProfileData) => Promise<User>
  deleteAccount: () => Promise<boolean>
  refreshUser: () => Promise<void>
  clearUser: () => void
}

// Notification Slice
interface NotificationSlice {
  // Состояние
  notifications: Notification[]
  unreadCount: number
  notificationLoading: boolean
  notificationError: string | null
  
  // Действия
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  deleteNotification: (notificationId: string) => void
  clearNotifications: () => void
  setUnreadCount: (count: number) => void
  setNotificationLoading: (loading: boolean) => void
  setNotificationError: (error: string | null) => void
  refreshNotifications: () => Promise<void>
}

// Creator Slice
interface CreatorSlice {
  // Состояние
  creator: Creator | null
  posts: UnifiedPost[]
  analytics: any
  creatorLoading: boolean
  creatorError: string | null
  
  // Действия
  setCreator: (creator: Creator | null) => void
  setPosts: (posts: UnifiedPost[]) => void
  addPost: (post: UnifiedPost) => void
  updatePost: (postId: string, updates: Partial<UnifiedPost>) => void
  removePost: (postId: string) => void
  setAnalytics: (analytics: any) => void
  setCreatorLoading: (loading: boolean) => void
  setCreatorError: (error: string | null) => void
  refreshCreator: () => Promise<void>
  loadCreator: (creatorId: string) => Promise<void>
  loadPosts: () => Promise<void>
}

// Объединенный тип хранилища
type AppStore = UserSlice & NotificationSlice & CreatorSlice

// Создание хранилища
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // === USER SLICE ===
        user: null,
        userLoading: false,
        isNewUser: false,
        showProfileForm: false,
        userError: null,
        
        // JWT Authentication State
        isJwtReady: false,

        setUser: (user) => {
          console.log('[AppStore] setUser called:', { 
            hasUser: !!user, 
            avatar: user?.avatar, 
            nickname: user?.nickname,
            timestamp: Date.now() 
          })
          
          // 🔥 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ В ZUSTAND STORE
          if (user) {
            console.log('🎯 [ZUSTAND STORE] Setting user in global store:')
            console.log('📊 User Object in Store:', {
              id: user.id,
              wallet: user.wallet,
              solanaWallet: user.solanaWallet,
              nickname: user.nickname,
              fullName: user.fullName,
              bio: user.bio,
              avatar: user.avatar,
              backgroundImage: user.backgroundImage,
              isVerified: user.isVerified,
              isCreator: user.isCreator,
              followersCount: user.followersCount,
              followingCount: user.followingCount,
              postsCount: user.postsCount,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              referrerId: user.referrerId,
              referrer: user.referrer
            })
            console.log('🔍 Complete User Object:', JSON.stringify(user, null, 2))
            console.log('🎯 [ZUSTAND STORE] User set successfully')
          } else {
            console.log('🎯 [ZUSTAND STORE] Clearing user from store (user = null)')
          }
          
          set({ user })
        },
        setUserLoading: (userLoading) => set({ userLoading }),
        setNewUser: (isNewUser) => set({ isNewUser }),
        setShowProfileForm: (showProfileForm) => set({ showProfileForm }),
        setUserError: (userError) => set({ userError }),
        
        setJwtReady: (isJwtReady) => {
          console.log('[AppStore] setJwtReady called with:', isJwtReady)
          console.log('[AppStore] Previous isJwtReady state:', get().isJwtReady)
          set({ isJwtReady })
          console.log('[AppStore] New isJwtReady state:', get().isJwtReady)
        },

        updateProfile: async (profileData) => {
          const { user } = get()
          if (!user) throw new Error('No user to update')

          try {
            const response = await fetch('/api/user', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wallet: user.wallet, ...profileData }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Failed to update profile')
            }

            const data = await response.json()
            set({ 
              user: data.user, 
              isNewUser: false, 
              showProfileForm: false 
            })
            
            return data.user
          } catch (err) {
            const error = err as Error
            set({ userError: error })
            throw error
          }
        },

        deleteAccount: async () => {
          const { user } = get()
          if (!user) return false

          try {
            const response = await fetch('/api/user', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wallet: user.wallet }),
            })

            if (response.ok) {
              set({ 
                user: null, 
                isNewUser: false, 
                showProfileForm: false 
              })
              return true
            }
            return false
          } catch (err) {
            const error = err as Error
            set({ userError: error })
            throw error
          }
        },

        refreshUser: async () => {
          const { user } = get()
          if (!user) return

          try {
            set({ userLoading: true, userError: null })
            
            const response = await fetch('/api/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wallet: user.wallet }),
            })

            if (response.ok) {
              const data = await response.json()
              set({ 
                user: data.user, 
                isNewUser: data.isNewUser 
              })
            }
          } catch (err) {
            const error = err as Error
            set({ userError: error })
          } finally {
            set({ userLoading: false })
          }
        },

        clearUser: () => set({ 
          user: null, 
          isNewUser: false, 
          showProfileForm: false, 
          userError: null,
          isJwtReady: false 
        }),

        // === NOTIFICATION SLICE ===
        notifications: [],
        unreadCount: 0,
        notificationLoading: false,
        notificationError: null,

        setNotifications: (notifications) => set({ notifications }),
        addNotification: (notification) => set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1
        })),
        markAsRead: (notificationId) => set((state) => ({
          notifications: state.notifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        })),
        markAllAsRead: () => set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0
        })),
        deleteNotification: (notificationId) => set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId)
          return {
            notifications: state.notifications.filter(n => n.id !== notificationId),
            unreadCount: notification?.isRead ? state.unreadCount : Math.max(0, state.unreadCount - 1)
          }
        }),
        clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
        setUnreadCount: (unreadCount) => set({ unreadCount }),
        setNotificationLoading: (notificationLoading) => set({ notificationLoading }),
        setNotificationError: (notificationError) => set({ notificationError }),

        refreshNotifications: async () => {
          const { user } = get()
          if (!user?.id) return

          try {
            set({ notificationLoading: true, notificationError: null })
            
            const response = await fetch('/api/user/notifications', {
              headers: { 'Content-Type': 'application/json' }
            })

            if (response.ok) {
              const data = await response.json()
              set({ 
                notifications: data.notifications, 
                unreadCount: data.unreadCount 
              })
            }
          } catch (err) {
            set({ notificationError: (err as Error).message })
          } finally {
            set({ notificationLoading: false })
          }
        },

        // === CREATOR SLICE ===
        creator: null,
        posts: [],
        analytics: null,
        creatorLoading: false,
        creatorError: null,

        setCreator: (creator) => set({ creator }),
        setPosts: (posts) => set({ posts }),
        addPost: (post) => set((state) => ({
          posts: [post, ...state.posts]
        })),
        updatePost: (postId, updates) => set((state) => ({
          posts: state.posts.map(post => 
            post.id === postId ? { ...post, ...updates } : post
          )
        })),
        removePost: (postId) => set((state) => ({
          posts: state.posts.filter(post => post.id !== postId)
        })),
        setAnalytics: (analytics) => set({ analytics }),
        setCreatorLoading: (creatorLoading) => set({ creatorLoading }),
        setCreatorError: (creatorError) => set({ creatorError }),

        refreshCreator: throttle(async () => {
          const { creator } = get()
          if (!creator?.id) return

          try {
            set({ creatorLoading: true, creatorError: null })
            
            const response = await fetch(`/api/creators/${creator.id}`)
            if (response.ok) {
              const data = await response.json()
              set({ creator: data.creator })
            }
          } catch (err) {
            set({ creatorError: (err as Error).message })
          } finally {
            set({ creatorLoading: false })
          }
        }, 5000), // 🔥 M7 FIX: Throttle to once per 5 seconds

        loadCreator: throttle(async (creatorId: string) => {
          try {
            set({ creatorLoading: true, creatorError: null })
            
            const response = await fetch(`/api/creators/${creatorId}`)
            if (response.ok) {
              const data = await response.json()
              set({ creator: data.creator })
            } else {
              throw new Error('Failed to load creator')
            }
          } catch (err) {
            set({ creatorError: (err as Error).message })
          } finally {
            set({ creatorLoading: false })
          }
        }, 5000), // 🔥 M7 FIX: Throttle to once per 5 seconds

        loadPosts: throttle(async () => { // 🔥 M7 FIX: Throttle posts loading
          const { creator } = get()
          if (!creator?.id) return

          try {
            set({ creatorLoading: true, creatorError: null })
            
            const response = await fetch(`/api/creators/${creator.id}/posts`)
            if (response.ok) {
              const data = await response.json()
              set({ posts: data.posts })
            }
          } catch (err) {
            set({ creatorError: (err as Error).message })
          } finally {
            set({ creatorLoading: false })
          }
        }, 5000) // 🔥 M7 FIX: Throttle to once per 5 seconds
      }),
      {
        name: 'fonana-app-store',
        partialize: (state) => ({
          // ❌ ИСПРАВЛЕНО: НЕ сохраняем уведомления в localStorage - они должны загружаться с сервера
          user: state.user
        })
      }
    ),
    {
      name: 'fonana-store'
    }
  )
)

// ===== SSR-SAFE HOOKS =====
// Обертки для всех хуков с защитой от SSR

export const useUser = () => {
  if (typeof window === 'undefined') return null
  return useAppStore(state => state.user)
}

export const useUserLoading = () => {
  if (typeof window === 'undefined') return false
  return useAppStore(state => state.userLoading)
}

export const useUserError = () => {
  if (typeof window === 'undefined') return null
  return useAppStore(state => state.userError)
}

// JWT Ready State Hook
export const useJwtReady = () => {
  if (typeof window === 'undefined') return false // SSR guard
  
  const { setJwtReady, user, isJwtReady: storeJwtReady } = useAppStore(state => ({
    setJwtReady: state.setJwtReady,
    user: state.user,
    isJwtReady: state.isJwtReady
  }))
  
  // 🔥 ИСПОЛЬЗУЕМ useState И useEffect ДЛЯ АСИНХРОННОЙ ПРОВЕРКИ
  const [isReady, setIsReady] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)
  
  useEffect(() => {
    // 🔥 ЖДЕМ, ПОКА ПОЛЬЗОВАТЕЛЬ ЗАГРУЗИТСЯ
    if (!user) {
      console.log('[useJwtReady] Waiting for user to load...')
      return
    }
    
    if (hasChecked) {
      console.log('[useJwtReady] Already checked, skipping...')
      return // Уже проверили
    }
    
    // 🔥 ПРОВЕРЯЕМ, НЕ ГОТОВ ЛИ УЖЕ JWT В STORE
    if (storeJwtReady) {
      console.log('[useJwtReady] JWT already ready in store, setting local state...')
      setIsReady(true)
      setHasChecked(true)
      return
    }
    
    console.log('[useJwtReady] User loaded, starting token check and creation...')
    
    const createOrValidateToken = async () => {
      try {
        // 🔥 ПРОВЕРЯЕМ ТОКЕН В LOCALSTORAGE
        const savedToken = localStorage.getItem('fonana_jwt_token')
        console.log('[useJwtReady] Checking existing token:', !!savedToken)
        
        let isValidToken = false
        
                  if (savedToken) {
            try {
              const tokenData = JSON.parse(savedToken)
              
              // 🔥 ПРОВЕРЯЕМ ТОЛЬКО НАЛИЧИЕ ТОКЕНА И ВАЛИДНОСТЬ ПО ВРЕМЕНИ
              isValidToken = tokenData.token && tokenData.expiresAt > Date.now()
              
              console.log('[useJwtReady] Token validation:', {
                hasToken: !!tokenData.token,
                isValid: tokenData.expiresAt > Date.now(),
                isValidToken
              })
            } catch (error) {
              console.warn('[useJwtReady] Error parsing token:', error)
            }
          }
        
        // 🔥 ЕСЛИ ТОКЕН НЕВАЛИДЕН - СОЗДАЕМ НОВЫЙ
        if (!isValidToken) {
          const currentWallet = localStorage.getItem('fonana_user_wallet')
          if (currentWallet) {
            // 🔥 ПРОВЕРЯЕМ, НЕ СОЗДАЕМ ЛИ МЫ УЖЕ ТОКЕН
            if (hasChecked) {
              console.log('[useJwtReady] Already tried to create token, skipping...')
              return
            }
            
            console.log('[useJwtReady] Creating new token for wallet:', currentWallet.substring(0, 8) + '...')
            
            const response = await fetch(`/api/auth/token?wallet=${currentWallet}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            })
            
            if (response.ok) {
              const tokenData = await response.json()
              if (tokenData.token) {
                // 🔥 СОХРАНЯЕМ НОВЫЙ ТОКЕН
                const tokenToSave = {
                  token: tokenData.token,
                  expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 дней
                  userId: tokenData.user.id,
                  wallet: tokenData.user.wallet
                }
                localStorage.setItem('fonana_jwt_token', JSON.stringify(tokenToSave))
                console.log('[useJwtReady] New token created and saved!')
                setJwtReady(true)
                setIsReady(true)
                setHasChecked(true)
                return
              }
            } else {
              console.error('[useJwtReady] Failed to create token:', response.status)
            }
          } else {
            console.log('[useJwtReady] No wallet found, cannot create token')
          }
        } else {
          // 🔥 ТОКЕН ВАЛИДЕН - ИСПОЛЬЗУЕМ ЕГО
          console.log('[useJwtReady] Valid token found! Setting ready to true')
          setJwtReady(true)
          setIsReady(true)
          setHasChecked(true)
          return
        }
        
        // 🔥 ЕСЛИ НЕ УДАЛОСЬ СОЗДАТЬ ТОКЕН - ПРОБУЕМ ЕЩЕ РАЗ ЧЕРЕЗ 1 СЕКУНДУ
        if (!hasChecked) {
          console.log('[useJwtReady] Token creation failed, retrying in 1s...')
          setTimeout(createOrValidateToken, 1000)
        }
        
      } catch (error) {
        console.warn('[useJwtReady] Error in token creation:', error)
        // Повторяем попытку через 1 секунду
        if (!hasChecked) {
          setTimeout(createOrValidateToken, 1000)
        }
      }
    }
    
    // Запускаем создание/проверку токена
    createOrValidateToken()
    
    // Останавливаем через 10 секунд
    const timeout = setTimeout(() => {
      console.log('[useJwtReady] Token creation timeout, giving up')
      setHasChecked(true)
    }, 10000)
    
    return () => clearTimeout(timeout)
  }, [setJwtReady, hasChecked, user])
  
  return isReady
}

// ✅ ИСПРАВЛЕНО: Мемоизируем selector для userActions
const userActionsSelector = (state: AppStore) => ({
  setUser: state.setUser,
  setUserLoading: state.setUserLoading,
  setUserError: state.setUserError,
  setJwtReady: state.setJwtReady,
  refreshUser: state.refreshUser,
  updateProfile: state.updateProfile,
  deleteAccount: state.deleteAccount,
  clearUser: state.clearUser
})

export const useUserActions = () => {
  if (typeof window === 'undefined') {
    return useMemo(() => ({
      setUser: () => {},
      setUserLoading: () => {},
      setUserError: () => {},
      setJwtReady: () => {},
      refreshUser: async () => {},
      updateProfile: async () => {},
      deleteAccount: async () => {},
      clearUser: () => {}
    }), [])
  }
  return useAppStore(userActionsSelector)
}

// ✅ ИСПРАВЛЕНО: Простые селекторы для уведомлений
export const useNotifications = () => {
  if (typeof window === 'undefined') return []
  return useAppStore(state => state.notifications)
}

export const useUnreadCount = () => {
  if (typeof window === 'undefined') return 0
  return useAppStore(state => state.unreadCount)
}

export const useNotificationsLoading = () => {
  if (typeof window === 'undefined') return false
  return useAppStore(state => state.notificationLoading)
}

// ✅ ИСПРАВЛЕНО: Мемоизируем selector для notificationActions
const notificationActionsSelector = (state: AppStore) => ({
  addNotification: state.addNotification,
  setNotifications: state.setNotifications,
  markAsRead: state.markAsRead,
  markAllAsRead: state.markAllAsRead,
  deleteNotification: state.deleteNotification,
  clearNotifications: state.clearNotifications
})

export const useNotificationActions = () => {
  if (typeof window === 'undefined') {
    return useMemo(() => ({
      addNotification: () => {},
      setNotifications: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      deleteNotification: () => {},
      clearNotifications: () => {}
    }), [])
  }
  return useAppStore(notificationActionsSelector)
}

export const useCreator = () => {
  if (typeof window === 'undefined') return null
  return useAppStore(state => state.creator)
}

export const useCreatorLoading = () => {
  if (typeof window === 'undefined') return false
  return useAppStore(state => state.creatorLoading)
}

export const useCreatorError = () => {
  if (typeof window === 'undefined') return null
  return useAppStore(state => state.creatorError)
}

export const useCreatorPosts = () => {
  if (typeof window === 'undefined') return []
  return useAppStore(state => state.posts)
}

// ✅ ИСПРАВЛЕНО: Мемоизируем selector для creatorActions  
const creatorActionsSelector = (state: AppStore) => ({
  loadCreator: state.loadCreator,
  refreshCreator: state.refreshCreator,
  setCreator: state.setCreator,
  setCreatorLoading: state.setCreatorLoading,
  setCreatorError: state.setCreatorError
})

export const useCreatorActions = () => {
  if (typeof window === 'undefined') {
    return useMemo(() => ({
      loadCreator: async () => {},
      refreshCreator: async () => {},
      setCreator: () => {},
      setCreatorLoading: () => {},
      setCreatorError: () => {}
    }), [])
  }
  return useAppStore(creatorActionsSelector)
} 