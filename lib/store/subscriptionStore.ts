/**
 * Subscription Store - Zustand store для управления подписками пользователя
 * Методы: clearSubscriptions, loadSubscriptions
 */

'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Типы для подписок
export interface Subscription {
  id: string
  userId: string
  creatorId: string
  creator: {
    id: string
    nickname?: string
    fullName?: string
    avatar?: string
    isVerified: boolean
  }
  subscriptionType: 'free' | 'basic' | 'premium' | 'vip'
  status: 'active' | 'cancelled' | 'expired'
  startDate: string
  endDate?: string
  price?: number
  currency?: string
  createdAt: string
  updatedAt: string
}

interface SubscriptionState {
  // Состояние
  subscriptions: Subscription[]
  loading: boolean
  error: string | null
  lastLoaded: number | null
  
  // Действия
  setSubscriptions: (subscriptions: Subscription[]) => void
  addSubscription: (subscription: Subscription) => void
  updateSubscription: (subscriptionId: string, updates: Partial<Subscription>) => void
  removeSubscription: (subscriptionId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearSubscriptions: () => void
  loadSubscriptions: (userId?: string) => Promise<void>
  refreshSubscriptions: () => Promise<void>
}

export const useSubscriptionStore = create<SubscriptionState>()(
  devtools(
    persist(
      (set, get) => ({
        // === СОСТОЯНИЕ ===
        subscriptions: [],
        loading: false,
        error: null,
        lastLoaded: null,

        // === ДЕЙСТВИЯ ===
        setSubscriptions: (subscriptions) => {
          console.log('[SubscriptionStore] setSubscriptions called:', {
            count: subscriptions.length,
            subscriptions: subscriptions.map(s => ({
              id: s.id,
              creatorId: s.creatorId,
              type: s.subscriptionType,
              status: s.status
            }))
          })
          set({ 
            subscriptions,
            lastLoaded: Date.now(),
            error: null 
          })
        },

        addSubscription: (subscription) => set((state) => ({
          subscriptions: [subscription, ...state.subscriptions]
        })),

        updateSubscription: (subscriptionId, updates) => set((state) => ({
          subscriptions: state.subscriptions.map(sub => 
            sub.id === subscriptionId ? { ...sub, ...updates } : sub
          )
        })),

        removeSubscription: (subscriptionId) => set((state) => ({
          subscriptions: state.subscriptions.filter(sub => sub.id !== subscriptionId)
        })),

        setLoading: (loading) => set({ loading }),

        setError: (error) => set({ error }),

        clearSubscriptions: () => {
          console.log('[SubscriptionStore] clearSubscriptions called')
          set({ 
            subscriptions: [],
            loading: false,
            error: null,
            lastLoaded: null
          })
          // Очищаем localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user_subscriptions')
          }
        },

        loadSubscriptions: async (userId?: string) => {
          const { loading, lastLoaded } = get()
          
          // Предотвращаем частые запросы (не чаще чем раз в 30 секунд)
          if (loading || (lastLoaded && Date.now() - lastLoaded < 30000)) {
            console.log('[SubscriptionStore] Skipping loadSubscriptions - too frequent or already loading')
            return
          }

          try {
            set({ loading: true, error: null })

            // Если userId не передан, пытаемся получить из localStorage или appStore
            let targetUserId = userId
            if (!targetUserId && typeof window !== 'undefined') {
              const userWallet = localStorage.getItem('fonana_user_wallet')
              if (userWallet) {
                // Получаем userId из appStore
                const { useAppStore } = await import('@/lib/store/appStore')
                const user = useAppStore.getState().user
                targetUserId = user?.id
              }
            }

            if (!targetUserId) {
              throw new Error('User ID is required to load subscriptions')
            }

            console.log('[SubscriptionStore] Loading subscriptions for user:', targetUserId)

            const response = await fetch(`/api/subscriptions/check?userId=${targetUserId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            })

            if (!response.ok) {
              throw new Error(`Failed to load subscriptions: HTTP ${response.status}`)
            }

            const data = await response.json()
            console.log('[SubscriptionStore] Subscriptions loaded:', data)
            localStorage.setItem('user_subscriptions', JSON.stringify(data || null))
            // Сохраняем в store
            set({ 
              subscriptions: data || [],
              lastLoaded: Date.now(),
              error: null
            })

            

          } catch (err) {
            const error = err as Error
            console.error('[SubscriptionStore] Error loading subscriptions:', error)
            set({ 
              error: error.message,
              loading: false
            })
          } finally {
            set({ loading: false })
          }
        },

        refreshSubscriptions: async () => {
          console.log('[SubscriptionStore] refreshSubscriptions called')
          const { loadSubscriptions } = get()
          
          // Сбрасываем lastLoaded чтобы принудительно загрузить заново
          set({ lastLoaded: null })
          
          await loadSubscriptions()
        }
      }),
      {
        name: 'fonana-subscription-store',
        partialize: (state) => ({
          // Сохраняем только подписки, не сохраняем loading/error состояния
          subscriptions: state.subscriptions,
          lastLoaded: state.lastLoaded
        })
      }
    ),
    {
      name: 'subscription-store'
    }
  )
)

// === SSR-SAFE HOOKS ===

export const useSubscriptions = () => {
  if (typeof window === 'undefined') return []
  return useSubscriptionStore(state => state.subscriptions)
}

export const useSubscriptionsLoading = () => {
  if (typeof window === 'undefined') return false
  return useSubscriptionStore(state => state.loading)
}

export const useSubscriptionsError = () => {
  if (typeof window === 'undefined') return null
  return useSubscriptionStore(state => state.error)
}

// Hook для получения действий с подписками
export const useSubscriptionActions = () => {
  if (typeof window === 'undefined') {
    return {
      setSubscriptions: () => {},
      addSubscription: () => {},
      updateSubscription: () => {},
      removeSubscription: () => {},
      setLoading: () => {},
      setError: () => {},
      clearSubscriptions: () => {},
      loadSubscriptions: async () => {},
      refreshSubscriptions: async () => {}
    }
  }
  
  return useSubscriptionStore(state => ({
    setSubscriptions: state.setSubscriptions,
    addSubscription: state.addSubscription,
    updateSubscription: state.updateSubscription,
    removeSubscription: state.removeSubscription,
    setLoading: state.setLoading,
    setError: state.setError,
    clearSubscriptions: state.clearSubscriptions,
    loadSubscriptions: state.loadSubscriptions,
    refreshSubscriptions: state.refreshSubscriptions
  }))
}

// Hook для проверки подписки на конкретного создателя
export const useCreatorSubscription = (creatorId: string) => {
  if (typeof window === 'undefined') return null
  
  return useSubscriptionStore(state => 
    state.subscriptions.find(sub => 
      sub.creatorId === creatorId && sub.status === 'active'
    ) || null
  )
}

// Hook для получения активных подписок
export const useActiveSubscriptions = () => {
  if (typeof window === 'undefined') return []
  
  return useSubscriptionStore(state => 
    state.subscriptions.filter(sub => sub.status === 'active')
  )
}
