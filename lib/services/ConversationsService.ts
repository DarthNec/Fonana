/**
 * ConversationsService - Централизованный сервис для работы с conversations API
 * Включает rate limiting, circuit breaker pattern и кеширование
 * [critical_regression_infinite_loop_2025_017]
 */

import { jwtManager } from '@/lib/utils/jwt'

interface CachedData {
  unreadCount: number
  conversations: any[]
  timestamp: number
}

class ConversationsService {
  private lastCall = 0
  private isLoading = false
  private cache: CachedData | null = null
  private readonly RATE_LIMIT = 5000 // 5 seconds minimum between calls
  private readonly CACHE_DURATION = 30000 // 30 seconds cache validity
  
  /**
   * Получить количество непрочитанных сообщений с rate limiting
   */
  async getUnreadCount(): Promise<number> {
    const now = Date.now()
    
    console.log('[ConversationsService] getUnreadCount called, time since last call:', now - this.lastCall)
    
    // Rate limiting - если прошло меньше 5 секунд, возвращаем кеш
    if (now - this.lastCall < this.RATE_LIMIT) {
      console.log('[ConversationsService] Rate limited, returning cached count:', this.cache?.unreadCount || 0)
      return this.cache?.unreadCount || 0
    }
    
    // Prevent duplicate simultaneous calls
    if (this.isLoading) {
      console.log('[ConversationsService] Already loading, returning cached count:', this.cache?.unreadCount || 0)
      return this.cache?.unreadCount || 0
    }
    
    // Check cache validity
    if (this.cache && (now - this.cache.timestamp) < this.CACHE_DURATION) {
      console.log('[ConversationsService] Cache valid, returning cached count:', this.cache.unreadCount)
      return this.cache.unreadCount
    }
    
    console.log('[ConversationsService] Cache invalid or missing, fetching fresh data')
    return this.fetchUnreadCount()
  }
  
  /**
   * Принудительное обновление данных (игнорирует rate limiting)
   */
  async forceRefresh(): Promise<number> {
    console.log('[ConversationsService] Force refresh requested')
    return this.fetchUnreadCount()
  }
  
  /**
   * Получить все conversations с rate limiting
   */
  async getConversations(): Promise<any[]> {
    const now = Date.now()
    
    // Rate limiting
    if (now - this.lastCall < this.RATE_LIMIT && this.cache) {
      console.log('[ConversationsService] Rate limited, returning cached conversations')
      return this.cache.conversations
    }
    
    // Prevent duplicate calls
    if (this.isLoading && this.cache) {
      console.log('[ConversationsService] Already loading, returning cached conversations')
      return this.cache.conversations
    }
    
    await this.fetchUnreadCount() // This updates conversations too
    return this.cache?.conversations || []
  }
  
  /**
   * Внутренний метод для выполнения API запроса
   */
  private async fetchUnreadCount(): Promise<number> {
    const now = Date.now()
    this.isLoading = true
    this.lastCall = now
    
    try {
      console.log('[ConversationsService] Fetching conversations from API...')
      
      const token = await jwtManager.getToken()
      if (!token) {
        console.log('[ConversationsService] No JWT token available')
        this.cache = { unreadCount: 0, conversations: [], timestamp: now }
        return 0
      }
      
      const response = await fetch('/api/conversations', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.error('[ConversationsService] API request failed:', response.status, response.statusText)
        // Не обновляем кеш при ошибке, возвращаем старые данные если есть
        return this.cache?.unreadCount || 0
      }
      
      const data = await response.json()
      const conversations = data.conversations || []
      
      const unreadCount = conversations.reduce(
        (count: number, conv: any) => count + (conv.unreadCount || 0), 
        0
      )
      
      // Обновляем кеш
      this.cache = {
        unreadCount,
        conversations,
        timestamp: now
      }
      
      console.log('[ConversationsService] Successfully fetched:', {
        conversationsCount: conversations.length,
        unreadCount,
        timestamp: new Date(now).toISOString()
      })
      
      return unreadCount
      
    } catch (error) {
      console.error('[ConversationsService] Error fetching conversations:', error)
      // При ошибке не обновляем кеш, возвращаем старые данные
      return this.cache?.unreadCount || 0
    } finally {
      this.isLoading = false
    }
  }
  
  /**
   * Очистка кеша (для тестирования или принудительного обновления)
   */
  clearCache(): void {
    console.log('[ConversationsService] Cache cleared')
    this.cache = null
    this.lastCall = 0
  }
  
  /**
   * Получить статистику сервиса (для отладки)
   */
  getStats() {
    const now = Date.now()
    return {
      isLoading: this.isLoading,
      lastCall: this.lastCall,
      timeSinceLastCall: now - this.lastCall,
      rateLimitRemaining: Math.max(0, this.RATE_LIMIT - (now - this.lastCall)),
      cacheAge: this.cache ? now - this.cache.timestamp : null,
      cacheValid: this.cache ? (now - this.cache.timestamp) < this.CACHE_DURATION : false,
      cachedUnreadCount: this.cache?.unreadCount || 0
    }
  }
}

// Singleton instance
export const conversationsService = new ConversationsService()

// Для отладки в development
if (typeof window !== 'undefined') {
  (window as any).conversationsService = conversationsService
} 