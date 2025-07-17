/**
 * UnreadMessagesService - Централизованный сервис для unread messages
 * Устраняет дублирование логики между BottomNav.tsx и Navbar.tsx
 * [critical_regression_infinite_loop_2025_017]
 */

import { conversationsService } from './ConversationsService'

type UnreadCallback = (count: number) => void

class UnreadMessagesService {
  private listeners = new Set<UnreadCallback>()
  private unreadCount = 0
  private intervalId: NodeJS.Timeout | null = null
  private isPolling = false
  
  /**
   * Подписаться на обновления unread count
   * Возвращает функцию для отписки
   */
  subscribe(callback: UnreadCallback): () => void {
    console.log('[UnreadMessagesService] New subscriber added')
    this.listeners.add(callback)
    
    // Сразу отправляем текущее значение
    callback(this.unreadCount)
    
    // Запускаем polling если есть подписчики
    this.startPolling()
    
    // Возвращаем функцию отписки
    return () => {
      console.log('[UnreadMessagesService] Subscriber removed')
      this.listeners.delete(callback)
      
      // Останавливаем polling если нет подписчиков
      if (this.listeners.size === 0) {
        this.stopPolling()
      }
    }
  }
  
  /**
   * Принудительно обновить unread count
   */
  async refresh(): Promise<number> {
    console.log('[UnreadMessagesService] Manual refresh requested')
    return this.fetchAndNotify()
  }
  
  /**
   * Получить текущий unread count (синхронно)
   */
  getCurrentCount(): number {
    return this.unreadCount
  }
  
  /**
   * Запустить автоматический polling
   */
  private startPolling(): void {
    if (this.isPolling || this.intervalId) {
      return // Уже запущен
    }
    
    console.log('[UnreadMessagesService] Starting polling')
    this.isPolling = true
    
    // Сразу делаем первый запрос
    this.fetchAndNotify()
    
    // Затем каждые 30 секунд
    this.intervalId = setInterval(() => {
      this.fetchAndNotify()
    }, 30000)
  }
  
  /**
   * Остановить автоматический polling
   */
  private stopPolling(): void {
    if (!this.isPolling && !this.intervalId) {
      return // Уже остановлен
    }
    
    console.log('[UnreadMessagesService] Stopping polling')
    this.isPolling = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
  
  /**
   * Получить unread count и уведомить всех подписчиков
   */
  private async fetchAndNotify(): Promise<number> {
    try {
      console.log('[UnreadMessagesService] Fetching unread count...')
      
      // Используем существующий ConversationsService с rate limiting
      const count = await conversationsService.getUnreadCount()
      
      // Обновляем локальный счетчик
      if (count !== this.unreadCount) {
        this.unreadCount = count
        console.log('[UnreadMessagesService] Count updated:', count)
        
        // Уведомляем всех подписчиков
        this.listeners.forEach(callback => {
          try {
            callback(count)
          } catch (error) {
            console.error('[UnreadMessagesService] Callback error:', error)
          }
        })
      }
      
      return count
      
    } catch (error) {
      console.error('[UnreadMessagesService] Error fetching count:', error)
      return this.unreadCount // Возвращаем последнее известное значение
    }
  }
  
  /**
   * Получить статистику сервиса (для отладки)
   */
  getStats() {
    return {
      listenersCount: this.listeners.size,
      currentCount: this.unreadCount,
      isPolling: this.isPolling,
      hasInterval: !!this.intervalId,
      conversationServiceStats: conversationsService.getStats()
    }
  }
  
  /**
   * Очистка всех ресурсов (для тестирования)
   */
  cleanup(): void {
    console.log('[UnreadMessagesService] Cleanup requested')
    this.stopPolling()
    this.listeners.clear()
    this.unreadCount = 0
  }
}

// Singleton instance
export const unreadMessagesService = new UnreadMessagesService()

// Для отладки в development
if (typeof window !== 'undefined') {
  (window as any).unreadMessagesService = unreadMessagesService
} 