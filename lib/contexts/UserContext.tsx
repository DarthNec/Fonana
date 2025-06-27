'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'

// Типы пользователя
export interface User {
  id: string
  wallet: string
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  backgroundImage?: string
  website?: string
  twitter?: string
  telegram?: string
  location?: string
  isVerified: boolean
  isCreator: boolean
  followersCount: number
  followingCount: number
  postsCount: number
  subscriptionType?: 'free' | 'basic' | 'vip'
  createdAt: string
  updatedAt: string
}

export interface ProfileData {
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  backgroundImage?: string
  website?: string
  twitter?: string
  telegram?: string
  location?: string
}

interface UserContextValue {
  user: User | null
  isLoading: boolean
  isNewUser: boolean
  showProfileForm: boolean
  error: Error | null
  setShowProfileForm: (show: boolean) => void
  updateProfile: (data: ProfileData) => Promise<User>
  deleteAccount: () => Promise<boolean>
  refreshUser: () => void
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

// TTL для localStorage кеша - 7 дней
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000

interface CachedUserData {
  user: User
  timestamp: number
}

export function UserContextProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet()
  const router = useRouter()
  
  const [user, setUser] = useState<User | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Загрузка кешированных данных при монтировании
  useEffect(() => {
    if (!user && publicKey && connected) {
      const cached = getCachedUserData(publicKey.toString())
      if (cached) {
        console.log('[UserContext] Restored user data from cache')
        setUser(cached)
      }
    }
  }, [publicKey, connected, user])

  // Автоматическое создание/получение пользователя при подключении кошелька
  useEffect(() => {
    if (connected && publicKey) {
      createOrGetUser(publicKey.toString())
    } else {
      // При отключении кошелька очищаем состояние
      setUser(null)
      setIsNewUser(false)
      setShowProfileForm(false)
      setError(null)
      clearCachedUserData()
    }
  }, [connected, publicKey])

  // Функция для получения кешированных данных с проверкой TTL
  const getCachedUserData = (wallet: string): User | null => {
    try {
      const savedData = localStorage.getItem('fonana_user_data')
      const savedWallet = localStorage.getItem('fonana_user_wallet')
      const savedTimestamp = localStorage.getItem('fonana_user_timestamp')
      
      if (savedData && savedWallet === wallet && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp)
        const now = Date.now()
        
        // Проверяем TTL
        if (now - timestamp < CACHE_TTL) {
          const cached: CachedUserData = {
            user: JSON.parse(savedData),
            timestamp
          }
          return cached.user
        } else {
          console.log('[UserContext] Cache expired')
          clearCachedUserData()
        }
      }
    } catch (e) {
      console.error('[UserContext] Failed to load cached data:', e)
      clearCachedUserData()
    }
    
    return null
  }

  // Сохранение данных в кеш
  const setCachedUserData = (userData: User, wallet: string) => {
    try {
      localStorage.setItem('fonana_user_data', JSON.stringify(userData))
      localStorage.setItem('fonana_user_wallet', wallet)
      localStorage.setItem('fonana_user_timestamp', Date.now().toString())
    } catch (e) {
      console.error('[UserContext] Failed to cache user data:', e)
    }
  }

  // Очистка кеша
  const clearCachedUserData = () => {
    localStorage.removeItem('fonana_user_data')
    localStorage.removeItem('fonana_user_wallet')
    localStorage.removeItem('fonana_user_timestamp')
  }

  const createOrGetUser = async (wallet: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Получаем реферера из localStorage (fallback)
      const referrerFromStorage = localStorage.getItem('fonana_referrer')
      const referrerTimestamp = localStorage.getItem('fonana_referrer_timestamp')
      
      let referrerFromClient: string | undefined
      if (referrerFromStorage && referrerTimestamp) {
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        const isExpired = Date.now() - parseInt(referrerTimestamp) > sevenDays
        
        if (!isExpired) {
          referrerFromClient = referrerFromStorage
        }
      }
      
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          wallet,
          referrerFromClient
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setIsNewUser(data.isNewUser)
        
        // Сохраняем данные пользователя в кеш
        setCachedUserData(data.user, wallet)
        
        // Показываем форму профиля для новых пользователей
        if (data.isNewUser) {
          setShowProfileForm(true)
        }
        
        // Очищаем реферера из localStorage после успешной регистрации
        if (data.isNewUser && referrerFromClient) {
          localStorage.removeItem('fonana_referrer')
          localStorage.removeItem('fonana_referrer_timestamp')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create/get user')
      }
    } catch (err) {
      console.error('[UserContext] Error creating/getting user:', err)
      setError(err as Error)
      
      // Retry logic - попробуем еще раз через 2 секунды
      setTimeout(() => {
        if (connected && publicKey && publicKey.toString() === wallet) {
          createOrGetUser(wallet)
        }
      }, 2000)
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (profileData: ProfileData): Promise<User> => {
    if (!user) throw new Error('No user to update')

    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: user.wallet,
          ...profileData,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setIsNewUser(false)
        setShowProfileForm(false)
        
        // Обновляем кешированные данные
        setCachedUserData(data.user, user.wallet)
        
        return data.user
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }
    } catch (err) {
      console.error('[UserContext] Error updating profile:', err)
      setError(err as Error)
      throw err
    }
  }

  const deleteAccount = async (): Promise<boolean> => {
    if (!user) return false

    try {
      const response = await fetch('/api/user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: user.wallet,
        }),
      })

      if (response.ok) {
        // Сбрасываем состояние пользователя и очищаем кеш
        setUser(null)
        setIsNewUser(false)
        setShowProfileForm(false)
        clearCachedUserData()
        return true
      }
      return false
    } catch (err) {
      console.error('[UserContext] Error deleting account:', err)
      setError(err as Error)
      throw err
    }
  }

  const refreshUser = useCallback(() => {
    if (publicKey && connected) {
      createOrGetUser(publicKey.toString())
    }
  }, [publicKey, connected])

  const value: UserContextValue = {
    user,
    isLoading,
    isNewUser,
    showProfileForm,
    error,
    setShowProfileForm,
    updateProfile,
    deleteAccount,
    refreshUser,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

// Хук для использования контекста
export function useUserContext() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserContextProvider')
  }
  return context
} 