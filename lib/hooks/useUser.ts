'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

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

export function useUser() {
  const { publicKey, connected } = useWallet()
  const [user, setUser] = useState<User | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showProfileForm, setShowProfileForm] = useState(false)

  // Автоматическое создание/получение пользователя при подключении кошелька
  useEffect(() => {
    if (connected && publicKey) {
      createOrGetUser(publicKey.toString())
    } else {
      setUser(null)
      setIsNewUser(false)
      setShowProfileForm(false)
    }
  }, [connected, publicKey])

  const createOrGetUser = async (wallet: string) => {
    setIsLoading(true)
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
          referrerFromClient // Передаем реферера из localStorage как fallback
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setIsNewUser(data.isNewUser)
        
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
        console.error('[useUser] Failed to create/get user:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error creating/getting user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (profileData: {
    nickname?: string
    fullName?: string
    bio?: string
    avatar?: string
    backgroundImage?: string
    website?: string
    twitter?: string
    telegram?: string
    location?: string
  }) => {
    if (!user) return

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
        return data.user
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  const deleteAccount = async () => {
    if (!user) return

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
        // Сбрасываем состояние пользователя
        setUser(null)
        setIsNewUser(false)
        setShowProfileForm(false)
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting account:', error)
      throw error
    }
  }

  return {
    user,
    isNewUser,
    isLoading,
    showProfileForm,
    setShowProfileForm,
    updateProfile,
    deleteAccount,
    refreshUser: () => {
      if (publicKey) {
        createOrGetUser(publicKey.toString())
      }
    },
  }
} 