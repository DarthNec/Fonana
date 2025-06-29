'use client'

interface StoredToken {
  token: string
  expiresAt: number
  userId: string
  wallet: string
}

const TOKEN_KEY = 'fonana_jwt_token'
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
      const stored = localStorage.getItem(TOKEN_KEY)
      if (stored) {
        console.log('[JWT] Found stored token')
        const data = JSON.parse(stored) as StoredToken
        if (data.expiresAt > Date.now()) {
          this.token = data
          console.log('[JWT] Token is valid, expires at:', new Date(data.expiresAt).toISOString())
          this.scheduleRefresh()
        } else {
          // Токен истек, удаляем
          console.log('[JWT] Token expired, clearing...')
          this.clearToken()
        }
      } else {
        console.log('[JWT] No token found in localStorage')
      }
    } catch (error) {
      console.error('[JWT] Error loading token from storage:', error)
      this.clearToken()
    }
  }
  
  private saveToStorage(token: StoredToken) {
    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
    } catch (error) {
      console.error('[JWT] Error saving token to storage:', error)
    }
  }
  
  private clearToken() {
    this.token = null
    localStorage.removeItem(TOKEN_KEY)
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
    console.log('[JWT] getToken called, checking current token...')
    
    // Проверяем, есть ли валидный токен
    if (this.token && this.token.expiresAt > Date.now()) {
      console.log('[JWT] Valid token found in memory')
      return this.token.token
    }
    
    console.log('[JWT] No valid token in memory, checking wallet...')
    
    // Пытаемся обновить токен
    const wallet = localStorage.getItem('fonana_user_wallet')
    if (!wallet) {
      console.log('[JWT] No wallet found in localStorage, cannot get token')
      return null
    }
    
    console.log('[JWT] Wallet found:', wallet.substring(0, 8) + '...')
    
    return this.requestNewToken(wallet)
  }
  
  async requestNewToken(wallet: string): Promise<string | null> {
    try {
      const response = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet })
      })
      
      if (!response.ok) {
        console.error('[JWT] Failed to get token:', response.status)
        return null
      }
      
      const data = await response.json()
      
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