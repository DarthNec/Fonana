'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

interface AuthUser {
  id: string
  wallet: string
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  backgroundImage?: string
  isVerified: boolean
  isCreator: boolean
}

interface UseAuthReturn {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  checkAuth: () => Promise<void>
  logout: () => Promise<void>
  needsWalletConnection: boolean
}

export function useAuth(): UseAuthReturn {
  const { connected, publicKey } = useWallet()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [needsWalletConnection, setNeedsWalletConnection] = useState(false)

  // Проверка авторизации
  const checkAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/wallet')
      const data = await response.json()
      
      if (data.authenticated && data.user) {
        setIsAuthenticated(true)
        setUser(data.user)
        
        // Проверяем, соответствует ли подключенный кошелек авторизованному
        if (publicKey && publicKey.toString() !== data.user.wallet) {
          setNeedsWalletConnection(true)
        } else {
          setNeedsWalletConnection(false)
        }
      } else {
        setIsAuthenticated(false)
        setUser(null)
        setNeedsWalletConnection(false)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [publicKey])

  // Выход из системы
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      })
      
      localStorage.removeItem('fonana-jwt')
      setIsAuthenticated(false)
      setUser(null)
      setNeedsWalletConnection(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [])

  // Проверяем авторизацию при загрузке и изменении кошелька
  useEffect(() => {
    checkAuth()
  }, [checkAuth, connected, publicKey])

  // Проверяем JWT из localStorage при загрузке (fallback)
  useEffect(() => {
    const token = localStorage.getItem('fonana-jwt')
    if (token && !isAuthenticated) {
      checkAuth()
    }
  }, [])

  return {
    isAuthenticated,
    isLoading,
    user,
    checkAuth,
    logout,
    needsWalletConnection
  }
} 