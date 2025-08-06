/**
 * Централизованный сервис аутентификации
 * Разрывает циклическую зависимость WebSocket → JWT → UserContext
 */

import { storageService } from './StorageService'

export interface AuthToken {
  token: string
  expiresAt: number
  userId: string
  wallet: string
}

class AuthService {
  private currentToken: AuthToken | null = null
  private refreshTimer: NodeJS.Timeout | null = null
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 минут до истечения

  constructor() {
    this.loadStoredToken()
  }

  /**
   * Загружает токен из кеша
   */
  private loadStoredToken(): void {
    try {
      const storedToken = storageService.getJWTToken()
      if (storedToken) {
        const tokenData = JSON.parse(storedToken) as AuthToken
        if (tokenData.expiresAt > Date.now()) {
          this.currentToken = tokenData
          this.scheduleRefresh()
          console.log('[AuthService] Token loaded from cache')
        } else {
          console.log('[AuthService] Stored token expired')
          this.clearToken()
        }
      }
    } catch (error) {
      console.error('[AuthService] Error loading stored token:', error)
      this.clearToken()
    }
  }

  /**
   * Сохраняет токен в кеш
   */
  private saveToken(token: AuthToken): void {
    try {
      storageService.setJWTToken(JSON.stringify(token))
      this.currentToken = token
      this.scheduleRefresh()
      console.log('[AuthService] Token saved to cache')
    } catch (error) {
      console.error('[AuthService] Error saving token:', error)
    }
  }

  /**
   * Очищает токен
   */
  private clearToken(): void {
    this.currentToken = null
    storageService.clearJWTToken()
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Планирует обновление токена
   */
  private scheduleRefresh(): void {
    if (!this.currentToken || this.refreshTimer) return

    const timeUntilExpiry = this.currentToken.expiresAt - Date.now()
    const refreshTime = Math.max(0, timeUntilExpiry - this.REFRESH_THRESHOLD)

    this.refreshTimer = setTimeout(() => {
      this.refreshToken()
    }, refreshTime)
  }

  /**
   * Получает текущий токен
   */
  async getToken(): Promise<string | null> {
    // Проверяем валидность текущего токена
    if (this.currentToken && this.currentToken.expiresAt > Date.now()) {
      return this.currentToken.token
    }

    // Пытаемся получить новый токен
    const wallet = this.getCurrentWallet()
    if (!wallet) {
      console.log('[AuthService] No wallet available for token request')
      return null
    }

    return this.requestNewToken(wallet)
  }

  /**
   * Запрашивает новый токен
   */
  async requestNewToken(wallet: string): Promise<string | null> {
    try {
      console.log('[AuthService] Requesting new token for wallet:', wallet.substring(0, 8) + '...')

      const response = await fetch(`/api/auth/token?wallet=${wallet}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('[AuthService] Failed to get token:', response.status)
        return null
      }

      const data = await response.json()

      if (!data.token) {
        console.error('[AuthService] Invalid response:', data)
        return null
      }

      // Создаем токен с временем истечения (30 дней по умолчанию)
      const expiresIn = 30 * 24 * 60 * 60 * 1000 // 30 дней
      const expiresAt = Date.now() + expiresIn

      const token: AuthToken = {
        token: data.token,
        expiresAt,
        userId: data.user.id,
        wallet: data.user.wallet
      }

      this.saveToken(token)
      console.log('[AuthService] New token obtained, expires in 30 days')

      return data.token

    } catch (error) {
      console.error('[AuthService] Error requesting token:', error)
      return null
    }
  }

  /**
   * Обновляет токен
   */
  async refreshToken(): Promise<boolean> {
    console.log('[AuthService] Refreshing token...')

    const wallet = this.currentToken?.wallet || this.getCurrentWallet()
    if (!wallet) {
      console.error('[AuthService] Cannot refresh: no wallet')
      this.clearToken()
      return false
    }

    const newToken = await this.requestNewToken(wallet)
    return newToken !== null
  }

  /**
   * Проверяет валидность токена
   */
  async verifyToken(token?: string): Promise<boolean> {
    const tokenToVerify = token || this.currentToken?.token
    if (!tokenToVerify) return false

    try {
      const response = await fetch('/api/auth/wallet', {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      })

      return response.ok
    } catch (error) {
      console.error('[AuthService] Error verifying token:', error)
      return false
    }
  }

  /**
   * Получает текущий wallet из кеша
   */
  getCurrentWallet(): string | null {
    try {
      // Пытаемся получить wallet из кеша пользователя
      const cachedUser = storageService.getUserFromCache('')
      if (cachedUser?.wallet) {
        return cachedUser.wallet
      }

      // Fallback на прямое чтение localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem('fonana_user_wallet')
      }

      return null
    } catch (error) {
      console.error('[AuthService] Error getting current wallet:', error)
      return null
    }
  }

  /**
   * Получает текущий userId
   */
  getCurrentUserId(): string | null {
    return this.currentToken?.userId || null
  }

  /**
   * Проверяет аутентификацию
   */
  isAuthenticated(): boolean {
    return this.currentToken !== null && this.currentToken.expiresAt > Date.now()
  }

  /**
   * Выход из системы
   */
  logout(): void {
    this.clearToken()
    console.log('[AuthService] User logged out')
  }

  /**
   * Получает статистику аутентификации
   */
  getStats() {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasToken: this.currentToken !== null,
      expiresAt: this.currentToken?.expiresAt || null,
      userId: this.currentToken?.userId || null,
      wallet: this.currentToken?.wallet || null
    }
  }
}

// Экспортируем singleton экземпляр
export const authService = new AuthService()

// Экспортируем класс для тестирования
export { AuthService } 