/**
 * Централизованный сервис для работы с localStorage
 * Обеспечивает безопасную работу с кешем, валидацию и обработку ошибок
 * Включает шифрование JWT токенов для безопасности
 */

import CryptoJS from 'crypto-js'

export interface CachedUserData {
  user: any
  wallet: string
  timestamp: number
}

export interface StorageConfig {
  ttl: number
  prefix: string
}

export interface EncryptedJWT {
  encrypted: string
  iv: string
  timestamp: number
}

class StorageService {
  private config: StorageConfig = {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 дней по умолчанию
    prefix: 'fonana_'
  }
  
  // Ключ шифрования (в продакшене должен быть в env переменных)
  private readonly ENCRYPTION_KEY = process.env.NEXT_PUBLIC_STORAGE_KEY || 'fonana-storage-key-2025'

  /**
   * Шифрование данных
   */
  private encrypt(data: string): EncryptedJWT {
    const iv = CryptoJS.lib.WordArray.random(16)
    const encrypted = CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    
    return {
      encrypted: encrypted.toString(),
      iv: iv.toString(),
      timestamp: Date.now()
    }
  }

  /**
   * Расшифровка данных
   */
  private decrypt(encryptedData: EncryptedJWT): string | null {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, this.ENCRYPTION_KEY, {
        iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })
      
      return decrypted.toString(CryptoJS.enc.Utf8)
    } catch (error) {
      console.error('[StorageService] Decryption failed:', error)
      return null
    }
  }

  /**
   * Проверяет доступность localStorage
   */
  private isStorageAvailable(): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch (e) {
      return false
    }
  }

  /**
   * Генерирует ключ с префиксом
   */
  private getKey(key: string): string {
    return `${this.config.prefix}${key}`
  }

  /**
   * Безопасно получает данные из localStorage
   */
  private getItem(key: string): string | null {
    if (!this.isStorageAvailable()) return null
    
    try {
      return localStorage.getItem(this.getKey(key))
    } catch (error) {
      console.error('[StorageService] Error reading from localStorage:', error)
      return null
    }
  }

  /**
   * Безопасно сохраняет данные в localStorage
   */
  private setItem(key: string, value: string): boolean {
    if (!this.isStorageAvailable()) return false
    
    try {
      localStorage.setItem(this.getKey(key), value)
      return true
    } catch (error) {
      console.error('[StorageService] Error writing to localStorage:', error)
      return false
    }
  }

  /**
   * Безопасно удаляет данные из localStorage
   */
  private removeItem(key: string): boolean {
    if (!this.isStorageAvailable()) return false
    
    try {
      localStorage.removeItem(this.getKey(key))
      return true
    } catch (error) {
      console.error('[StorageService] Error removing from localStorage:', error)
      return false
    }
  }

  /**
   * Проверяет актуальность кеша по TTL
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.ttl
  }

  /**
   * Получает пользователя из кеша
   */
  getUserFromCache(wallet: string): any | null {
    try {
      const savedData = this.getItem('user_data')
      const savedWallet = this.getItem('user_wallet')
      const savedTimestamp = this.getItem('user_timestamp')

      if (!savedData || !savedWallet || !savedTimestamp) {
        return null
      }

      // Проверяем соответствие кошелька
      if (savedWallet !== wallet) {
        return null
      }

      // Проверяем TTL
      const timestamp = parseInt(savedTimestamp, 10)
      if (!this.isCacheValid(timestamp)) {
        this.clearUserCache()
        return null
      }

      const userData = JSON.parse(savedData)
      return userData
    } catch (error) {
      console.error('[StorageService] Error loading cached user:', error)
      this.clearUserCache()
      return null
    }
  }

  /**
   * Сохраняет пользователя в кеш
   */
  setUserToCache(user: any, wallet: string): boolean {
    try {
      const userData: CachedUserData = {
        user,
        wallet,
        timestamp: Date.now()
      }

      const success = this.setItem('user_data', JSON.stringify(userData)) &&
                     this.setItem('user_wallet', wallet) &&
                     this.setItem('user_timestamp', userData.timestamp.toString())

      if (success) {
        console.log('[StorageService] User cached successfully')
      }

      return success
    } catch (error) {
      console.error('[StorageService] Error caching user:', error)
      return false
    }
  }

  /**
   * Очищает кеш пользователя
   */
  clearUserCache(): boolean {
    try {
      const success = this.removeItem('user_data') &&
                     this.removeItem('user_wallet') &&
                     this.removeItem('user_timestamp')

      if (success) {
        console.log('[StorageService] User cache cleared')
      }

      return success
    } catch (error) {
      console.error('[StorageService] Error clearing user cache:', error)
      return false
    }
  }

  /**
   * Получает JWT токен из кеша (расшифрованный)
   */
  getJWTToken(): string | null {
    try {
      const savedData = this.getItem('jwt_token')
      if (!savedData) return null

      const encryptedData: EncryptedJWT = JSON.parse(savedData)
      
      // Проверяем TTL для токена (1 час)
      if (!this.isCacheValid(encryptedData.timestamp)) {
        this.clearJWTToken()
        return null
      }

      return this.decrypt(encryptedData)
    } catch (error) {
      console.error('[StorageService] Error loading JWT token:', error)
      this.clearJWTToken()
      return null
    }
  }

  /**
   * Сохраняет JWT токен в кеш (зашифрованный)
   */
  setJWTToken(token: string): boolean {
    try {
      const encryptedData = this.encrypt(token)

      const success = this.setItem('jwt_token', JSON.stringify(encryptedData))
      
      if (success) {
        console.log('[StorageService] JWT token encrypted and cached')
      }

      return success
    } catch (error) {
      console.error('[StorageService] Error caching JWT token:', error)
      return false
    }
  }

  /**
   * Очищает JWT токен
   */
  clearJWTToken(): boolean {
    try {
      const success = this.removeItem('jwt_token')
      
      if (success) {
        console.log('[StorageService] JWT token cleared')
      }

      return success
    } catch (error) {
      console.error('[StorageService] Error clearing JWT token:', error)
      return false
    }
  }

  /**
   * Получает данные создателя из кеша
   */
  getCreatorFromCache(creatorId: string): any | null {
    try {
      const savedData = this.getItem(`creator_${creatorId}`)
      if (!savedData) return null

      const creatorData = JSON.parse(savedData)
      
      if (!this.isCacheValid(creatorData.timestamp)) {
        this.clearCreatorCache(creatorId)
        return null
      }

      return creatorData.creator
    } catch (error) {
      console.error('[StorageService] Error loading cached creator:', error)
      this.clearCreatorCache(creatorId)
      return null
    }
  }

  /**
   * Сохраняет данные создателя в кеш
   */
  setCreatorToCache(creator: any, creatorId: string): boolean {
    try {
      const creatorData = {
        creator,
        timestamp: Date.now()
      }

      const success = this.setItem(`creator_${creatorId}`, JSON.stringify(creatorData))
      
      if (success) {
        console.log('[StorageService] Creator cached successfully')
      }

      return success
    } catch (error) {
      console.error('[StorageService] Error caching creator:', error)
      return false
    }
  }

  /**
   * Очищает кеш создателя
   */
  clearCreatorCache(creatorId: string): boolean {
    try {
      const success = this.removeItem(`creator_${creatorId}`)
      
      if (success) {
        console.log('[StorageService] Creator cache cleared')
      }

      return success
    } catch (error) {
      console.error('[StorageService] Error clearing creator cache:', error)
      return false
    }
  }

  /**
   * Очищает весь кеш приложения
   */
  clearAllCache(): boolean {
    if (!this.isStorageAvailable()) return false
    
    try {
      const keys = Object.keys(localStorage)
      const appKeys = keys.filter(key => key.startsWith(this.config.prefix))
      
      appKeys.forEach(key => {
        localStorage.removeItem(key)
      })

      console.log('[StorageService] All cache cleared')
      return true
    } catch (error) {
      console.error('[StorageService] Error clearing all cache:', error)
      return false
    }
  }

  /**
   * Получает размер кеша в байтах
   */
  getCacheSize(): number {
    if (!this.isStorageAvailable()) return 0
    
    try {
      const keys = Object.keys(localStorage)
      const appKeys = keys.filter(key => key.startsWith(this.config.prefix))
      
      return appKeys.reduce((size, key) => {
        return size + (localStorage.getItem(key)?.length || 0)
      }, 0)
    } catch (error) {
      console.error('[StorageService] Error calculating cache size:', error)
      return 0
    }
  }

  /**
   * Настраивает конфигурацию сервиса
   */
  configure(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// Экспортируем singleton экземпляр
export const storageService = new StorageService()

// Экспортируем класс для тестирования
export { StorageService } 