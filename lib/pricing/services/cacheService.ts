import { PRICING_CONFIG, PriceData } from '../config'

interface CacheEntry {
  data: PriceData
  timestamp: number
}

class CacheService {
  private cache: Map<string, CacheEntry> = new Map()
  private static instance: CacheService

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  set(key: string, data: PriceData): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  get(key: string): PriceData | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    
    // Если данные свежие
    if (age < PRICING_CONFIG.CACHE.TTL) {
      return entry.data
    }
    
    // Если данные устарели, но не критично
    if (age < PRICING_CONFIG.CACHE.STALE_TTL) {
      return {
        ...entry.data,
        isStale: true
      }
    }
    
    // Данные слишком старые
    this.cache.delete(key)
    return null
  }

  clear(): void {
    this.cache.clear()
  }

  getAge(key: string): number | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    return Date.now() - entry.timestamp
  }

  // Получить все закэшированные данные для дебага
  getAll(): Record<string, { data: PriceData; age: number }> {
    const result: Record<string, { data: PriceData; age: number }> = {}
    
    this.cache.forEach((entry, key) => {
      result[key] = {
        data: entry.data,
        age: Date.now() - entry.timestamp
      }
    })
    
    return result
  }
}

export const cacheService = CacheService.getInstance() 