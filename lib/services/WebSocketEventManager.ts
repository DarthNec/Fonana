/**
 * Централизованный менеджер WebSocket событий
 * Заменяет разрозненные обработчики в NotificationContext, PostCard, CommentSection
 */

import { wsService } from './websocket'
import { useAppStore } from '@/lib/store/appStore'

export interface WebSocketEvent {
  type: string
  data: any
  timestamp: number
  id?: string
}

export interface EventHandler {
  (event: WebSocketEvent): void
}

export interface EventSubscription {
  channel: string
  handler: EventHandler
  id: string
}

class WebSocketEventManager {
  private subscriptions = new Map<string, EventSubscription[]>()
  private eventQueue: WebSocketEvent[] = []
  private processingQueue = false
  private throttleMap = new Map<string, number>()
  private dedupMap = new Map<string, number>()
  
  // Конфигурация
  private readonly THROTTLE_DELAY = 100 // 100ms между одинаковыми событиями
  private readonly DEDUP_WINDOW = 5000 // 5 секунд для дедупликации
  private readonly MAX_QUEUE_SIZE = 1000
  private readonly PROCESSING_INTERVAL = 50 // 50ms между обработкой очереди

  constructor() {
    this.setupWebSocketListeners()
  }

  /**
   * Подписаться на события канала
   */
  subscribe(channel: string, handler: EventHandler): string {
    const subscriptionId = this.generateId()
    
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, [])
    }
    
    const subscription: EventSubscription = {
      channel,
      handler,
      id: subscriptionId
    }
    
    this.subscriptions.get(channel)!.push(subscription)
    
    console.log(`[WebSocketEventManager] Subscribed to ${channel} with ID: ${subscriptionId}`)
    return subscriptionId
  }

  /**
   * Отписаться от событий
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [channel, subscriptions] of Array.from(this.subscriptions.entries())) {
      const index = subscriptions.findIndex((sub: EventSubscription) => sub.id === subscriptionId)
      if (index !== -1) {
        subscriptions.splice(index, 1)
        
        // Удалить пустой канал
        if (subscriptions.length === 0) {
          this.subscriptions.delete(channel)
        }
        
        console.log(`[WebSocketEventManager] Unsubscribed from ${channel} with ID: ${subscriptionId}`)
        return true
      }
    }
    
    return false
  }

  /**
   * Отписаться от всех событий канала
   */
  unsubscribeFromChannel(channel: string): number {
    const subscriptions = this.subscriptions.get(channel)
    if (!subscriptions) return 0
    
    const count = subscriptions.length
    this.subscriptions.delete(channel)
    
    console.log(`[WebSocketEventManager] Unsubscribed ${count} handlers from ${channel}`)
    return count
  }

  /**
   * Отправить событие
   */
  emit(event: WebSocketEvent): void {
    // Проверка throttling
    if (this.isThrottled(event)) {
      console.log(`[WebSocketEventManager] Event throttled: ${event.type}`)
      return
    }

    // Проверка дедупликации
    if (this.isDuplicate(event)) {
      console.log(`[WebSocketEventManager] Event deduplicated: ${event.type}`)
      return
    }

    // Добавить в очередь
    this.eventQueue.push(event)
    
    // Ограничить размер очереди
    if (this.eventQueue.length > this.MAX_QUEUE_SIZE) {
      this.eventQueue.shift()
      console.warn('[WebSocketEventManager] Queue overflow, dropped oldest event')
    }

    // Запустить обработку очереди
    if (!this.processingQueue) {
      this.processQueue()
    }
  }

  /**
   * Обработать событие немедленно (без очереди)
   */
  emitImmediate(event: WebSocketEvent): void {
    this.processEvent(event)
  }

  /**
   * Получить статистику
   */
  getStats() {
    const channelStats: Record<string, number> = {}
    
    for (const [channel, subscriptions] of Array.from(this.subscriptions.entries())) {
      channelStats[channel] = subscriptions.length
    }

    return {
      subscriptions: channelStats,
      queueSize: this.eventQueue.length,
      throttleMapSize: this.throttleMap.size,
      dedupMapSize: this.dedupMap.size
    }
  }

  /**
   * Очистить все подписки
   */
  clear(): void {
    this.subscriptions.clear()
    this.eventQueue = []
    this.throttleMap.clear()
    this.dedupMap.clear()
    console.log('[WebSocketEventManager] All subscriptions cleared')
  }

  /**
   * Настройка WebSocket слушателей
   */
  private setupWebSocketListeners(): void {
    // Слушатель подключения
    wsService.on('connect', () => {
      console.log('[WebSocketEventManager] WebSocket connected, resubscribing to channels')
      this.resubscribeToChannels()
    })

    // Слушатель отключения
    wsService.on('disconnect', () => {
      console.log('[WebSocketEventManager] WebSocket disconnected')
    })

    // Слушатель ошибок
    wsService.on('error', (error: any) => {
      console.error('[WebSocketEventManager] WebSocket error:', error)
    })
  }

  /**
   * Переподписка на каналы при переподключении
   */
  private resubscribeToChannels(): void {
    // В реальной реализации здесь была бы логика переподписки
    // на основе сохраненных каналов
    console.log('[WebSocketEventManager] Resubscribing to channels...')
  }

  /**
   * Обработка очереди событий
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) {
      return
    }

    this.processingQueue = true

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!
      this.processEvent(event)
      
      // Небольшая задержка между обработкой событий
      if (this.eventQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.PROCESSING_INTERVAL))
      }
    }

    this.processingQueue = false
  }

  /**
   * Обработка одного события
   */
  private processEvent(event: WebSocketEvent): void {
    const channel = event.type
    const subscriptions = this.subscriptions.get(channel)
    
    if (!subscriptions || subscriptions.length === 0) {
      return
    }

    console.log(`[WebSocketEventManager] Processing event: ${channel} for ${subscriptions.length} handlers`)

    // Вызвать все обработчики
    for (const subscription of subscriptions) {
      try {
        subscription.handler(event)
      } catch (error) {
        console.error(`[WebSocketEventManager] Handler error for ${channel}:`, error)
      }
    }

    // Обновить throttling
    this.updateThrottle(event)
    
    // Обновить дедупликацию
    this.updateDedup(event)
  }

  /**
   * Проверка throttling
   */
  private isThrottled(event: WebSocketEvent): boolean {
    const key = `${event.type}_${JSON.stringify(event.data)}`
    const lastTime = this.throttleMap.get(key)
    
    if (!lastTime) return false
    
    return Date.now() - lastTime < this.THROTTLE_DELAY
  }

  /**
   * Обновление throttling
   */
  private updateThrottle(event: WebSocketEvent): void {
    const key = `${event.type}_${JSON.stringify(event.data)}`
    this.throttleMap.set(key, Date.now())
    
    // Очистка старых записей
    setTimeout(() => {
      this.throttleMap.delete(key)
    }, this.THROTTLE_DELAY)
  }

  /**
   * Проверка дедупликации
   */
  private isDuplicate(event: WebSocketEvent): boolean {
    const key = `${event.type}_${event.id || JSON.stringify(event.data)}`
    const lastTime = this.dedupMap.get(key)
    
    if (!lastTime) return false
    
    return Date.now() - lastTime < this.DEDUP_WINDOW
  }

  /**
   * Обновление дедупликации
   */
  private updateDedup(event: WebSocketEvent): void {
    const key = `${event.type}_${event.id || JSON.stringify(event.data)}`
    this.dedupMap.set(key, Date.now())
    
    // Очистка старых записей
    setTimeout(() => {
      this.dedupMap.delete(key)
    }, this.DEDUP_WINDOW)
  }

  /**
   * Генерация уникального ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }
}

// Создание глобального экземпляра
export const wsEventManager = new WebSocketEventManager()

// Предустановленные обработчики для основных событий
export const setupDefaultHandlers = () => {
  // Обработчик уведомлений
  wsEventManager.subscribe('notification', (event) => {
    const { addNotification, setUnreadCount } = useAppStore.getState()
    
    addNotification({
      id: event.data.id,
      userId: event.data.userId,
      type: event.data.type,
      title: event.data.title,
      message: event.data.message,
      data: event.data.data,
      isRead: false,
      createdAt: new Date().toISOString()
    })
    
    setUnreadCount(event.data.unreadCount || 0)
  })

  // Обработчик обновления постов
  wsEventManager.subscribe('post_updated', (event) => {
    const { updatePost } = useAppStore.getState()
    updatePost(event.data.postId, event.data.updates)
  })

  // Обработчик новых постов
  wsEventManager.subscribe('post_created', (event) => {
    const { addPost } = useAppStore.getState()
    addPost(event.data.post)
  })

  // Обработчик удаления постов
  wsEventManager.subscribe('post_deleted', (event) => {
    const { removePost } = useAppStore.getState()
    removePost(event.data.postId)
  })

  // Обработчик обновления создателя
  wsEventManager.subscribe('creator_updated', (event) => {
    const { setCreator } = useAppStore.getState()
    setCreator(event.data.creator)
  })

  console.log('[WebSocketEventManager] Default handlers setup complete')
}

// Утилиты для работы с событиями
export const emitPostLiked = (postId: string, likesCount: number, userId?: string) => {
  wsEventManager.emit({
    type: 'post_liked',
    data: { postId, likesCount, userId },
    timestamp: Date.now()
  })
}

export const emitPostCommented = (postId: string, commentId: string, userId?: string) => {
  wsEventManager.emit({
    type: 'post_commented',
    data: { postId, commentId, userId },
    timestamp: Date.now()
  })
}

export const emitPostPurchased = (postId: string, userId: string, amount: number) => {
  wsEventManager.emit({
    type: 'post_purchased',
    data: { postId, userId, amount },
    timestamp: Date.now()
  })
}

export const emitSubscriptionUpdated = (creatorId: string, userId: string, tier: string) => {
  wsEventManager.emit({
    type: 'subscription_updated',
    data: { creatorId, userId, tier },
    timestamp: Date.now()
  })
}

export const emitNotification = (userId: string, notification: any) => {
  wsEventManager.emit({
    type: 'notification',
    data: { userId, notification },
    timestamp: Date.now()
  })
}

// Экспорт по умолчанию
export default wsEventManager 