'use client'

import { authService } from './AuthService'

export type WebSocketEvent = 
  | { type: 'creator_updated'; creatorId: string; data: any }
  | { type: 'new_subscription'; creatorId: string; userId: string }
  | { type: 'subscription_cancelled'; creatorId: string; userId: string }
  | { type: 'earnings_updated'; creatorId: string; earnings: any }
  | { type: 'flash_sale_created'; creatorId: string; flashSale: any }
  | { type: 'flash_sale_ended'; creatorId: string; flashSaleId: string }
  // Новые события для уведомлений
  | { type: 'notification'; userId: string; notification: any }
  | { type: 'notification_read'; userId: string; notificationId: string }
  | { type: 'notifications_cleared'; userId: string }
  // События для ленты постов
  | { type: 'post_liked'; postId: string; userId: string; likesCount: number }
  | { type: 'post_unliked'; postId: string; userId: string; likesCount: number }
  | { type: 'post_created'; creatorId: string; post: any }
  | { type: 'post_deleted'; postId: string }
  | { type: 'comment_added'; postId: string; comment: any }
  | { type: 'comment_deleted'; postId: string; commentId: string }
  | { type: 'feed_update'; userId: string; posts: any[] }

// Типы каналов для подписки
export type SubscriptionChannel = 
  | { type: 'creator'; id: string }
  | { type: 'notifications'; userId: string }
  | { type: 'feed'; userId: string }
  | { type: 'post'; postId: string }

// Простая реализация EventEmitter для браузера
class EventEmitter {
  protected events: { [key: string]: Function[] } = {}

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
  }

  off(event: string, listener: Function) {
    if (!this.events[event]) return
    this.events[event] = this.events[event].filter(l => l !== listener)
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return
    this.events[event].forEach(listener => listener(...args))
  }

  removeAllListeners(event?: string) {
    if (event) {
      delete this.events[event]
    } else {
      this.events = {}
    }
  }

  getListenerCount(event?: string): number {
    if (event) {
      return this.events[event]?.length || 0
    }
    return Object.values(this.events).reduce((acc, listeners) => acc + listeners.length, 0)
  }

  getEvents(): string[] {
    return Object.keys(this.events)
  }
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private subscribedChannels = new Map<string, SubscriptionChannel>()
  private messageQueue: any[] = []
  private isProcessingQueue = false

  constructor() {
    super()
  }

  connect(url?: string) {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true
    
    // Асинхронная функция для получения URL с токеном
    this.getWebSocketUrlWithAuth(url).then(wsUrl => {
      if (!wsUrl) {
        console.error('Failed to get WebSocket URL with auth')
        this.isConnecting = false
        this.scheduleReconnect()
        return
      }

      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.emit('connected')
          
          // Переподписываемся на все каналы
          this.subscribedChannels.forEach((channel) => {
            this.sendSubscription(channel)
          })

          // Отправляем накопившиеся сообщения
          this.processMessageQueue()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketEvent
            
            // Защита от слишком частых событий
            this.throttleEvent(data.type, () => {
              this.emit(data.type, data)
            })
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnecting = false
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.isConnecting = false
          this.ws = null
          this.emit('disconnected')
          this.scheduleReconnect()
        }
      } catch (error) {
        console.error('Error creating WebSocket:', error)
        this.isConnecting = false
        this.scheduleReconnect()
      }
    })
  }

  private async getWebSocketUrlWithAuth(customUrl?: string): Promise<string | null> {
    // Если передан кастомный URL, используем его
    if (customUrl) {
      return customUrl
    }
    
    // В production используем WSS, в development - WS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname  // hostname without port
    // WebSocket всегда на порту 3002, независимо от окружения
    const wsPort = '3002'
    let url = `${protocol}//${host}:${wsPort}/ws`
    
    console.log('[WebSocket] Getting JWT token for connection...')
    
    // Получаем JWT токен через AuthService
    const token = await authService.getToken()
    
    if (!token) {
      console.warn('[WebSocket] No JWT token available, connection may fail')
      return url
    }
    
    console.log('[WebSocket] JWT token obtained:', token.substring(0, 20) + '...')
    
    // Добавляем токен как query параметр
    url += `?token=${encodeURIComponent(token)}`
    
    console.log('[WebSocket] Final URL:', url.substring(0, 50) + '...')
    
    return url
  }

  private getWebSocketUrl(): string {
    // Этот метод больше не используется, но оставлен для обратной совместимости
    console.warn('[WebSocket] getWebSocketUrl is deprecated, use getWebSocketUrlWithAuth')
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/ws`
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('max_reconnect_reached')
      return
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect()
    }, delay)
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.subscribedChannels.clear()
    this.messageQueue = []
    this.reconnectAttempts = 0
    this.isConnecting = false
  }

  // Унифицированная подписка на каналы
  subscribe(channel: SubscriptionChannel) {
    const key = this.getChannelKey(channel)
    this.subscribedChannels.set(key, channel)
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscription(channel)
    }
  }

  unsubscribe(channel: SubscriptionChannel) {
    const key = this.getChannelKey(channel)
    this.subscribedChannels.delete(key)
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'unsubscribe',
        channel
      })
    }
  }

  // Обратная совместимость для создателей
  subscribeToCreator(creatorId: string) {
    this.subscribe({ type: 'creator', id: creatorId })
  }

  unsubscribeFromCreator(creatorId: string) {
    this.unsubscribe({ type: 'creator', id: creatorId })
  }

  // Новые методы для уведомлений
  subscribeToNotifications(userId: string) {
    this.subscribe({ type: 'notifications', userId })
  }

  unsubscribeFromNotifications(userId: string) {
    this.unsubscribe({ type: 'notifications', userId })
  }

  // Новые методы для ленты
  subscribeToFeed(userId: string) {
    this.subscribe({ type: 'feed', userId })
  }

  unsubscribeFromFeed(userId: string) {
    this.unsubscribe({ type: 'feed', userId })
  }

  // Подписка на конкретный пост
  subscribeToPost(postId: string) {
    this.subscribe({ type: 'post', postId })
  }

  unsubscribeFromPost(postId: string) {
    this.unsubscribe({ type: 'post', postId })
  }

  private getChannelKey(channel: SubscriptionChannel): string {
    switch (channel.type) {
      case 'creator':
        return `creator_${channel.id}`
      case 'notifications':
        return `notifications_${channel.userId}`
      case 'feed':
        return `feed_${channel.userId}`
      case 'post':
        return `post_${channel.postId}`
      default:
        return `unknown_${JSON.stringify(channel)}`
    }
  }

  private sendSubscription(channel: SubscriptionChannel) {
    this.send({
      type: 'subscribe',
      channel
    })
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      // Добавляем в очередь если соединение не готово
      this.messageQueue.push(data)
    }
  }

  private processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true
    const queue = [...this.messageQueue]
    this.messageQueue = []

    queue.forEach(message => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message))
      }
    })

    this.isProcessingQueue = false
  }

  // Защита от слишком частых событий
  private eventThrottles = new Map<string, number>()
  private throttleEvent(eventType: string, callback: Function, delay = 100) {
    const now = Date.now()
    const lastEmit = this.eventThrottles.get(eventType) || 0

    if (now - lastEmit >= delay) {
      this.eventThrottles.set(eventType, now)
      callback()
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // Метод для получения статистики
  getStats() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      subscribedChannels: this.subscribedChannels.size,
      queuedMessages: this.messageQueue.length,
      listeners: this.getEvents().reduce((acc, event) => {
        acc[event] = this.getListenerCount(event)
        return acc
      }, {} as Record<string, number>)
    }
  }
}

// Singleton экземпляр
export const wsService = new WebSocketService()

// ВРЕМЕННО ОТКЛЮЧЕНО: Автоматически подключаемся при загрузке в браузере
// [critical_regression_2025_017] Отключено для остановки infinite reconnect loop
/*
if (typeof window !== 'undefined') {
  // Откладываем подключение, чтобы дать время для загрузки JWT
  setTimeout(() => {
    console.log('[WebSocket] Initiating auto-connect...')
    wsService.connect()
  }, 1000)
} 
*/

console.log('[WebSocket] Auto-connect disabled for emergency stabilization [critical_regression_2025_017]') 