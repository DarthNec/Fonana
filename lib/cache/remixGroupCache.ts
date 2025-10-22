// lib/cache/remixGroupCache.ts
// Кэширование групп ремиксов для оптимизации производительности

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

class RemixGroupCache {
  private cache = new Map<string, CacheEntry>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 минут
  private readonly MAX_SIZE = 100 // Максимальное количество записей в кэше

  /**
   * Получить данные из кэша
   */
  get(key: string): any | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // Проверяем, не истек ли TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  /**
   * Сохранить данные в кэш
   */
  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    // Очищаем истекшие записи перед добавлением новой
    this.cleanExpired()
    
    // Если кэш превышает максимальный размер, удаляем самые старые записи
    if (this.cache.size >= this.MAX_SIZE) {
      this.evictOldest()
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Удалить запись из кэша
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Очистить истекшие записи
   */
  private cleanExpired(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Удалить самые старые записи
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    // Удаляем 20% самых старых записей
    const toDelete = Math.ceil(entries.length * 0.2)
    
    for (let i = 0; i < toDelete; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  /**
   * Получить статистику кэша
   */
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Реализовать подсчет hit rate
    }
  }

  /**
   * Создать ключ для группы ремиксов
   */
  static createRemixGroupKey(postId: string, includeOriginal: boolean = false, limit: number = 10, offset: number = 0): string {
    return `remix-group:${postId}:${includeOriginal}:${limit}:${offset}`
  }

  /**
   * Создать ключ для ремиксов поста
   */
  static createRemixesKey(postId: string, sortBy: string = 'createdAt', sortOrder: string = 'asc', limit: number = 10, offset: number = 0): string {
    return `remixes:${postId}:${sortBy}:${sortOrder}:${limit}:${offset}`
  }
}

// Создаем единственный экземпляр кэша
export const remixGroupCache = new RemixGroupCache()

// Экспортируем класс для тестирования
export { RemixGroupCache }
