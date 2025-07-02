/**
 * Централизованный менеджер кеша с TTL и LRU эвикшеном
 * Заменяет разрозненные кеши в UserContext, CreatorContext, StorageService
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

interface CacheConfig {
  maxSize: number
  defaultTTL: number
  cleanupInterval: number
}

class CacheManager {
  private cache = new Map<string, CacheEntry>()
  private config: CacheConfig
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 дней
      cleanupInterval: 5 * 60 * 1000, // 5 минут
      ...config
    }

    this.startCleanupTimer()
  }

  /**
   * Получить данные из кеша
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Проверка TTL
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    // Обновление статистики доступа
    entry.accessCount++
    entry.lastAccessed = Date.now()
    
    return entry.data
  }

  /**
   * Сохранить данные в кеш
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 1,
      lastAccessed: Date.now()
    }

    // Проверка размера кеша
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, entry)
  }

  /**
   * Проверить существование ключа
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Удалить конкретный ключ
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Инвалидировать кеш по паттерну
   */
  invalidate(pattern: string | RegExp): number {
    let deletedCount = 0
    
    for (const key of Array.from(this.cache.keys())) {
      if (typeof pattern === 'string') {
        if (key.includes(pattern)) {
          this.cache.delete(key)
          deletedCount++
        }
      } else {
        if (pattern.test(key)) {
          this.cache.delete(key)
          deletedCount++
        }
      }
    }
    
    return deletedCount
  }

  /**
   * Очистить весь кеш
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Получить статистику кеша
   */
  getStats() {
    const now = Date.now()
    let expiredCount = 0
    let totalSize = 0
    
    for (const entry of Array.from(this.cache.values())) {
      if (this.isExpired(entry)) {
        expiredCount++
      }
      totalSize += JSON.stringify(entry.data).length
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      expiredCount,
      totalSizeBytes: totalSize,
      hitRate: this.calculateHitRate()
    }
  }

  /**
   * Принудительная очистка истекших записей
   */
  cleanup(): number {
    let deletedCount = 0
    const now = Date.now()
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        deletedCount++
      }
    }
    
    return deletedCount
  }

  /**
   * Проверка истечения TTL
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  /**
   * LRU эвикшен
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Запуск таймера очистки
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * Расчет hit rate (упрощенная версия)
   */
  private calculateHitRate(): number {
    // В реальной реализации здесь была бы логика подсчета hits/misses
    return 0.85 // Заглушка
  }

  /**
   * Остановка таймера очистки
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.cache.clear()
  }
}

// Создание глобального экземпляра
export const cacheManager = new CacheManager()

// Утилиты для работы с localStorage
export class LocalStorageCache {
  private static readonly PREFIX = 'fonana_cache_'
  private static readonly TTL_SUFFIX = '_ttl'

  /**
   * Сохранить в localStorage с TTL
   */
  static set<T>(key: string, data: T, ttl: number = 7 * 24 * 60 * 60 * 1000): void {
    try {
      const fullKey = this.PREFIX + key
      const ttlKey = fullKey + this.TTL_SUFFIX
      const expiry = Date.now() + ttl
      
      localStorage.setItem(fullKey, JSON.stringify(data))
      localStorage.setItem(ttlKey, expiry.toString())
    } catch (error) {
      console.warn('[CacheManager] Failed to save to localStorage:', error)
    }
  }

  /**
   * Получить из localStorage с проверкой TTL
   */
  static get<T>(key: string): T | null {
    try {
      const fullKey = this.PREFIX + key
      const ttlKey = fullKey + this.TTL_SUFFIX
      
      const ttlValue = localStorage.getItem(ttlKey)
      if (!ttlValue) return null
      
      const expiry = parseInt(ttlValue)
      if (Date.now() > expiry) {
        this.delete(key)
        return null
      }
      
      const data = localStorage.getItem(fullKey)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.warn('[CacheManager] Failed to read from localStorage:', error)
      return null
    }
  }

  /**
   * Удалить из localStorage
   */
  static delete(key: string): void {
    try {
      const fullKey = this.PREFIX + key
      const ttlKey = fullKey + this.TTL_SUFFIX
      
      localStorage.removeItem(fullKey)
      localStorage.removeItem(ttlKey)
    } catch (error) {
      console.warn('[CacheManager] Failed to delete from localStorage:', error)
    }
  }

  /**
   * Очистить все кеши localStorage
   */
  static clear(): void {
    try {
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.warn('[CacheManager] Failed to clear localStorage:', error)
    }
  }

  /**
   * Проверить существование ключа
   */
  static has(key: string): boolean {
    try {
      const fullKey = this.PREFIX + key
      const ttlKey = fullKey + this.TTL_SUFFIX
      
      const ttlValue = localStorage.getItem(ttlKey)
      if (!ttlValue) return false
      
      const expiry = parseInt(ttlValue)
      if (Date.now() > expiry) {
        this.delete(key)
        return false
      }
      
      return localStorage.getItem(fullKey) !== null
    } catch (error) {
      return false
    }
  }
}

// Экспорт типов
export type { CacheEntry, CacheConfig }

// Экспорт по умолчанию
export default cacheManager 