'use client'

import { storageService } from '@/lib/services/StorageService'

interface StoredToken {
  token: string
  expiresAt: number
  userId: string
  wallet: string
}

const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 минут до истечения

class JWTManager {
  private token: StoredToken | null = null
  private refreshTimer: NodeJS.Timeout | null = null
  
  constructor() {
    // Загружаем токен из localStorage при инициализации
    if (typeof window !== 'undefined') {
      this.loadFromStorage()
    }
  }
  
  private loadFromStorage() {
    console.log('[JWT] Loading token from localStorage...')
    try {
      const stored = storageService.getJWTToken()
      if (stored) {
        console.log('[JWT] Found stored token')
        // Парсим данные токена из StorageService
        const tokenData = JSON.parse(stored)
        if (tokenData.expiresAt > Date.now()) {
          this.token = tokenData
          console.log('[JWT] Token is valid, expires at:', new Date(tokenData.expiresAt).toISOString())
          this.scheduleRefresh()
        } else {
          // Токен истек, удаляем
          console.log('[JWT] Token expired, clearing...')
          this.clearToken()
        }
      } else {
        console.log('[JWT] No token found in encrypted storage, checking localStorage fallback...')
        
        // Fallback на прямое чтение из localStorage
        const fallbackToken = localStorage.getItem('fonana_jwt_token')
        if (fallbackToken) {
          try {
            const tokenData = JSON.parse(fallbackToken)
            if (tokenData.token && tokenData.expiresAt > Date.now()) {
              console.log('[JWT] Found valid fallback token in localStorage')
              this.token = tokenData
              this.scheduleRefresh()
            } else {
              console.log('[JWT] Fallback token expired, clearing...')
              localStorage.removeItem('fonana_jwt_token')
              localStorage.removeItem('fonana_user_wallet')
            }
          } catch (error) {
            console.warn('[JWT] Invalid fallback token format:', error)
            localStorage.removeItem('fonana_jwt_token')
            localStorage.removeItem('fonana_user_wallet')
          }
        } else {
          console.log('[JWT] No token found anywhere')
        }
      }
    } catch (error) {
      console.error('[JWT] Error loading token from storage:', error)
      this.clearToken()
    }
  }
  
  private saveToStorage(token: StoredToken) {
    try {
      console.log('[JWT] saveToStorage called with token:', {
        hasToken: !!token.token,
        userId: token.userId,
        wallet: token.wallet
      })
      
      // Сохраняем через StorageService (зашифровано)
      storageService.setJWTToken(JSON.stringify(token))
      
      // Также сохраняем в localStorage для fallback доступа (незашифровано)
      localStorage.setItem('fonana_jwt_token', JSON.stringify(token))
      localStorage.setItem('fonana_user_wallet', token.wallet)
      
      console.log('[JWT] Token saved to both encrypted storage and localStorage')
      
      // 🔥 DEBUG: Проверяем, что токен действительно сохранился
      const savedToken = localStorage.getItem('fonana_jwt_token')
      console.log('[JWT] Verification - saved token exists:', !!savedToken)
    } catch (error) {
      console.error('[JWT] Error saving token to storage:', error)
    }
  }
  
  private clearToken() {
    this.token = null
    storageService.clearJWTToken()
    
    // Очищаем также localStorage fallback
    localStorage.removeItem('fonana_jwt_token')
    localStorage.removeItem('fonana_user_wallet')
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }
  
  private scheduleRefresh() {
    if (!this.token || this.refreshTimer) return
    
    const timeUntilExpiry = this.token.expiresAt - Date.now()
    const refreshTime = Math.max(0, timeUntilExpiry - TOKEN_REFRESH_THRESHOLD)
    
    this.refreshTimer = setTimeout(() => {
      this.refresh()
    }, refreshTime)
  }
  
    async getToken(): Promise<string | null> {
    console.log('[JWT] getToken called, checking existing token...')
    
    const wallet = localStorage.getItem('fonana_user_wallet')
    console.log('[JWT] Wallet in localStorage:', wallet ? wallet.substring(0, 8) + '...' : 'not found')
    
    if (!wallet) {
      console.log('[JWT] No wallet found in localStorage, cannot get token')
      return null
    }

    // 🔥 ПРОВЕРЯЕМ СУЩЕСТВУЮЩИЙ ТОКЕН
    const savedToken = localStorage.getItem('fonana_jwt_token')
    if (savedToken) {
      try {
        const tokenData = JSON.parse(savedToken)
        console.log('[JWT] Found saved token:', {
          hasToken: !!tokenData.token,
          expiresAt: tokenData.expiresAt,
          currentTime: Date.now(),
          isValid: tokenData.expiresAt > Date.now(),
          wallet: tokenData.wallet
        })
        
        // 🔥 ЕСЛИ ТОКЕН ВАЛИДЕН - ВОЗВРАЩАЕМ ЕГО
        if (tokenData.token && tokenData.expiresAt > Date.now()) {
          console.log('[JWT] Using existing valid token')
          return tokenData.token
        } else {
          console.log('[JWT] Token expired, requesting new one...')
        }
      } catch (error) {
        console.warn('[JWT] Invalid saved token format:', error)
      }
    } else {
      console.log('[JWT] No saved token found, requesting new one...')
    }

    console.log('[JWT] Requesting fresh token...')
    return this.requestNewToken(wallet)
  }
  
  async requestNewToken(wallet: string): Promise<string | null> {
    console.log('[JWT] requestNewToken called for wallet:', wallet.substring(0, 8) + '...')
    try {
      console.log('[JWT] Making request to /api/auth/token...')
      const response = await fetch(`/api/auth/token?wallet=${wallet}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log('[JWT] Response status:', response.status)
      
      if (!response.ok) {
        console.error('[JWT] Failed to get token:', response.status)
        const errorText = await response.text()
        console.error('[JWT] Error response:', errorText)
        return null
      }
      
      const data = await response.json()
      console.log('[JWT] Response data:', {
        hasToken: !!data.token,
        hasUser: !!data.user,
        tokenLength: data.token?.length
      })
      
      if (!data.token) {
        console.error('[JWT] Invalid response:', data)
        return null
      }
      
      // Парсим время истечения - по умолчанию 30 дней как в API
      const expiresIn = 30 * 24 * 60 * 60 * 1000 // 30 дней в миллисекундах
      const expiresAt = Date.now() + expiresIn
      
      // Сохраняем токен
      this.token = {
        token: data.token,
        expiresAt,
        userId: data.user.id,
        wallet: data.user.wallet
      }
      
      console.log('[JWT] Token object created:', {
        hasToken: !!this.token.token,
        expiresAt: this.token.expiresAt,
        userId: this.token.userId,
        wallet: this.token.wallet
      })
      
      this.saveToStorage(this.token)
      this.scheduleRefresh()
      
      console.log('[JWT] New token obtained, expires in 30 days')
      
      return data.token
      
    } catch (error) {
      console.error('[JWT] Error requesting token:', error)
      return null
    }
  }
  
  private parseExpiresIn(expiresIn: string): number {
    // Парсим строки вида "30m", "1h", "24h"
    const match = expiresIn.match(/^(\d+)([mhd])$/)
    if (!match) {
      console.warn('[JWT] Invalid expiresIn format:', expiresIn)
      return 30 * 60 * 1000 // По умолчанию 30 минут
    }
    
    const value = parseInt(match[1])
    const unit = match[2]
    
    switch (unit) {
      case 'm': return value * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      default: return 30 * 60 * 1000
    }
  }
  
  async refresh(): Promise<boolean> {
    console.log('[JWT] Refreshing token...')
    
    const wallet = this.token?.wallet || localStorage.getItem('fonana_user_wallet')
    if (!wallet) {
      console.error('[JWT] Cannot refresh: no wallet')
      this.clearToken()
      return false
    }
    
    const newToken = await this.requestNewToken(wallet)
    return newToken !== null
  }
  
  async verifyToken(token?: string): Promise<boolean> {
    const tokenToVerify = token || this.token?.token
    if (!tokenToVerify) return false
    
    try {
      const response = await fetch('/api/auth/wallet', {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      })
      
      return response.ok
    } catch (error) {
      console.error('[JWT] Error verifying token:', error)
      return false
    }
  }
  
  logout() {
    this.clearToken()
  }
  
  getCurrentUserId(): string | null {
    return this.token?.userId || null
  }
  
  getCurrentWallet(): string | null {
    return this.token?.wallet || null
  }
  
  isAuthenticated(): boolean {
    return this.token !== null && this.token.expiresAt > Date.now()
  }
  
  getStats() {
    if (!this.token) {
      return {
        userId: null,
        wallet: null,
        expiresAt: 0,
        isAuthenticated: false
      }
    }
    
    return {
      userId: this.token.userId,
      wallet: this.token.wallet,
      expiresAt: this.token.expiresAt,
      isAuthenticated: this.isAuthenticated()
    }
  }
}

// Singleton экземпляр
export const jwtManager = new JWTManager()

// Экспортируем удобные функции
export async function getJWTToken(): Promise<string | null> {
  return jwtManager.getToken()
}

export async function refreshJWTToken(): Promise<boolean> {
  return jwtManager.refresh()
}

export function logoutJWT() {
  jwtManager.logout()
}

export function isJWTAuthenticated(): boolean {
  return jwtManager.isAuthenticated()
} 