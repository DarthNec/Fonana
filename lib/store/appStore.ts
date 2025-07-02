/**
 * Глобальное хранилище Zustand для централизованного управления состоянием
 * Заменяет UserContext, NotificationContext, CreatorContext
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User, ProfileData } from '@/lib/contexts/UserContext'
import { UnifiedPost } from '@/types/posts'

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
  postsCount: number
  subscriptionType?: 'free' | 'basic' | 'premium' | 'vip'
  tierSettings?: any
}

// User Slice
interface UserSlice {
  // Состояние
  user: User | null
  userLoading: boolean
  isNewUser: boolean
  showProfileForm: boolean
  userError: Error | null
  
  // Действия
  setUser: (user: User | null) => void
  setUserLoading: (loading: boolean) => void
  setNewUser: (isNew: boolean) => void
  setShowProfileForm: (show: boolean) => void
  setUserError: (error: Error | null) => void
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

        setUser: (user) => set({ user }),
        setUserLoading: (userLoading) => set({ userLoading }),
        setNewUser: (isNewUser) => set({ isNewUser }),
        setShowProfileForm: (showProfileForm) => set({ showProfileForm }),
        setUserError: (userError) => set({ userError }),

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
          userError: null 
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

        refreshCreator: async () => {
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
        },

        loadPosts: async () => {
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
        }
      }),
      {
        name: 'fonana-app-store',
        partialize: (state) => ({
          // Сохраняем только пользователя в localStorage
          user: state.user,
          notifications: state.notifications,
          unreadCount: state.unreadCount
        })
      }
    ),
    {
      name: 'fonana-store'
    }
  )
)

// Селекторы для оптимизации производительности
export const useUser = () => useAppStore((state) => state.user)
export const useUserLoading = () => useAppStore((state) => state.userLoading)
export const useUserError = () => useAppStore((state) => state.userError)
export const useIsNewUser = () => useAppStore((state) => state.isNewUser)
export const useShowProfileForm = () => useAppStore((state) => state.showProfileForm)

export const useNotifications = () => useAppStore((state) => state.notifications)
export const useUnreadCount = () => useAppStore((state) => state.unreadCount)
export const useNotificationsLoading = () => useAppStore((state) => state.notificationLoading)
export const useNotificationsError = () => useAppStore((state) => state.notificationError)

export const useCreator = () => useAppStore((state) => state.creator)
export const useCreatorPosts = () => useAppStore((state) => state.posts)
export const useCreatorAnalytics = () => useAppStore((state) => state.analytics)
export const useCreatorLoading = () => useAppStore((state) => state.creatorLoading)
export const useCreatorError = () => useAppStore((state) => state.creatorError)

// Actions
export const useUserActions = () => useAppStore((state) => ({
  setUser: state.setUser,
  setUserLoading: state.setUserLoading,
  setNewUser: state.setNewUser,
  setShowProfileForm: state.setShowProfileForm,
  setUserError: state.setUserError,
  updateProfile: state.updateProfile,
  deleteAccount: state.deleteAccount,
  refreshUser: state.refreshUser,
  clearUser: state.clearUser
}))

export const useNotificationActions = () => useAppStore((state) => ({
  setNotifications: state.setNotifications,
  addNotification: state.addNotification,
  markAsRead: state.markAsRead,
  markAllAsRead: state.markAllAsRead,
  deleteNotification: state.deleteNotification,
  clearNotifications: state.clearNotifications,
  setUnreadCount: state.setUnreadCount,
  setNotificationLoading: state.setNotificationLoading,
  setNotificationError: state.setNotificationError,
  refreshNotifications: state.refreshNotifications
}))

export const useCreatorActions = () => useAppStore((state) => ({
  setCreator: state.setCreator,
  setPosts: state.setPosts,
  addPost: state.addPost,
  updatePost: state.updatePost,
  removePost: state.removePost,
  setAnalytics: state.setAnalytics,
  setCreatorLoading: state.setCreatorLoading,
  setCreatorError: state.setCreatorError,
  refreshCreator: state.refreshCreator,
  loadPosts: state.loadPosts
})) 