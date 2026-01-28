'use client'

import { jwtManager } from '@/lib/utils/jwt'

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
    const timestamp = new Date().toISOString()
    console.log(`🔌 [WebSocket] Connection attempt started at ${timestamp}`)
    console.log(`🔌 [WebSocket] Custom URL provided:`, url || 'none')
    
    if (this.isConnecting) {
      console.log('⚠️ [WebSocket] Already connecting, skipping...')
      return
    }
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('✅ [WebSocket] Already connected, skipping...')
      return
    }

    this.isConnecting = true
    console.log(`🔄 [WebSocket] isConnecting set to true, attempt #${this.reconnectAttempts + 1}`)
    
    // Асинхронная функция для получения URL с токеном
    console.log('🔑 [WebSocket] Getting WebSocket URL with auth token...')
    this.getWebSocketUrlWithAuth(url).then(wsUrl => {
      if (!wsUrl) {
        console.error('❌ [WebSocket] Failed to get WebSocket URL with auth')
        this.isConnecting = false
        this.scheduleReconnect()
        return
      }

      console.log('🌐 [WebSocket] WebSocket URL obtained:', wsUrl.substring(0, 50) + '...')

      try {
        console.log('🚀 [WebSocket] Creating WebSocket connection...')
        this.ws = new WebSocket(wsUrl)
        console.log('📡 [WebSocket] WebSocket object created, readyState:', this.ws.readyState)

        this.ws.onopen = () => {
          const connectedAt = new Date().toISOString()
          console.log(`✅ [WebSocket] Connected successfully at ${connectedAt}`)
          console.log(`⏱️ [WebSocket] Connection established after ${this.reconnectAttempts} attempts`)
          
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.emit('connected')
          
          // Переподписываемся на все каналы
          const channelCount = this.subscribedChannels.size
          if (channelCount > 0) {
            console.log(`🔔 [WebSocket] Resubscribing to ${channelCount} channels...`)
            this.subscribedChannels.forEach((channel) => {
              console.log(`  ↳ Subscribing to:`, channel)
              this.sendSubscription(channel)
            })
          } else {
            console.log('📭 [WebSocket] No channels to resubscribe')
          }

          // Отправляем накопившиеся сообщения
          if (this.messageQueue.length > 0) {
            console.log(`📤 [WebSocket] Processing ${this.messageQueue.length} queued messages...`)
            this.processMessageQueue()
          }
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketEvent
            console.log(`📨 [WebSocket] Message received:`, data.type)
            
            // Защита от слишком частых событий
            this.throttleEvent(data.type, () => {
              this.emit(data.type, data)
            })
          } catch (error) {
            console.error('❌ [WebSocket] Error parsing message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('❌ [WebSocket] Error occurred:', error)
          console.log(`🔍 [WebSocket] Error details - readyState: ${this.ws?.readyState}`)
          this.isConnecting = false
        }

        this.ws.onclose = (event) => {
          const closedAt = new Date().toISOString()
          console.log(`🔌 [WebSocket] Disconnected at ${closedAt}`)
          console.log(`🔍 [WebSocket] Close details - code: ${event.code}, reason: ${event.reason || 'none'}, clean: ${event.wasClean}`)
          
          this.isConnecting = false
          this.ws = null
          this.emit('disconnected')
          
          console.log('♻️ [WebSocket] Scheduling reconnection...')
          this.scheduleReconnect()
        }
      } catch (error) {
        console.error('❌ [WebSocket] Error creating WebSocket:', error)
        console.log('📊 [WebSocket] Error stack:', error instanceof Error ? error.stack : 'no stack')
        this.isConnecting = false
        this.scheduleReconnect()
      }
    }).catch(error => {
      console.error('❌ [WebSocket] Error in getWebSocketUrlWithAuth:', error)
      this.isConnecting = false
      this.scheduleReconnect()
    })
  }

  private async getWebSocketUrlWithAuth(customUrl?: string): Promise<string | null> {
    // Если передан кастомный URL, используем его
    if (customUrl) {
      console.log('[WebSocket] Using custom URL:', customUrl)
      return customUrl
    }
    
    // Определяем протокол и хост
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    
    // WebSocket сервер на выделенном IP
    // Development: ws://64.20.37.222:3002
    // Production через Nginx: wss://fonana.me/ws (проксируется на 64.20.37.222:3002)
    let wsHost: string
    let wsPort: string
    let wsPath: string
    
    if (window.location.hostname === 'fonana.me' || window.location.hostname.endsWith('.fonana.me')) {
      // Production: используем домен, Nginx проксирует на 64.20.37.222:3002
      wsHost = window.location.hostname
      wsPort = '' // Nginx слушает на стандартном порту (443 для wss)
      wsPath = '/ws'
      console.log('[WebSocket] Production mode: using Nginx proxy')
    } else {
      // Development: прямое подключение к WebSocket серверу
      wsHost = '127.0.0.1'
      wsPort = ':3003'
      wsPath = '/ws'
      console.log('[WebSocket] Development mode: direct connection to WebSocket server')
    }
    
    let url = `${protocol}//${wsHost}${wsPort}${wsPath}`
    console.log('[WebSocket] Base URL constructed:', url)
    
    console.log('[WebSocket] Getting JWT token for connection...')
    
    // Получаем JWT токен через jwtManager
    const token = await jwtManager.getToken()
    
    if (!token) {
      console.warn('[WebSocket] No JWT token available, connection may fail')
      return url
    }
    
    console.log('[WebSocket] JWT token obtained:', token.substring(0, 20) + '...')
    
    // Добавляем токен как query параметр
    url += `?token=${encodeURIComponent(token)}`
    
    console.log('[WebSocket] Final URL:', url.substring(0, 80) + '...')
    
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
    console.log(`🔄 [WebSocket] scheduleReconnect called, current attempts: ${this.reconnectAttempts}`)
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ [WebSocket] Max reconnection attempts (${this.maxReconnectAttempts}) reached, giving up`)
      this.emit('max_reconnect_reached')
      return
    }

    if (this.reconnectTimeout) {
      console.log('⏰ [WebSocket] Clearing existing reconnect timeout')
      clearTimeout(this.reconnectTimeout)
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++
    
    console.log(`⏳ [WebSocket] Scheduling reconnect attempt #${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms (${(delay / 1000).toFixed(1)}s)`)

    this.reconnectTimeout = setTimeout(() => {
      console.log(`🔄 [WebSocket] Reconnect timeout fired, attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect()
    }, delay)
  }

  disconnect() {
    console.log('🔌 [WebSocket] Disconnect called manually')
    
    if (this.reconnectTimeout) {
      console.log('⏰ [WebSocket] Clearing reconnect timeout')
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      const state = this.ws.readyState
      console.log(`🔌 [WebSocket] Closing connection, readyState: ${state}`)
      this.ws.close()
      this.ws = null
    }

    const channelCount = this.subscribedChannels.size
    const queueCount = this.messageQueue.length
    
    console.log(`🧹 [WebSocket] Cleaning up - channels: ${channelCount}, queued messages: ${queueCount}`)
    this.subscribedChannels.clear()
    this.messageQueue = []
    this.reconnectAttempts = 0
    this.isConnecting = false
    console.log('✅ [WebSocket] Disconnect complete')
  }

  // Унифицированная подписка на каналы
  subscribe(channel: SubscriptionChannel) {
    const key = this.getChannelKey(channel)
    console.log(`🔔 [WebSocket] Subscribe request for channel:`, key)
    
    this.subscribedChannels.set(key, channel)
    console.log(`📝 [WebSocket] Channel saved to local subscriptions (total: ${this.subscribedChannels.size})`)
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`✅ [WebSocket] Connection is open, sending subscription immediately`)
      this.sendSubscription(channel)
    } else {
      console.log(`⏳ [WebSocket] Connection not ready (state: ${this.ws?.readyState}), subscription will be sent on connect`)
    }
  }

  unsubscribe(channel: SubscriptionChannel) {
    const key = this.getChannelKey(channel)
    console.log(`🔕 [WebSocket] Unsubscribe request for channel:`, key)
    
    this.subscribedChannels.delete(key)
    console.log(`📝 [WebSocket] Channel removed from subscriptions (remaining: ${this.subscribedChannels.size})`)
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`✅ [WebSocket] Connection is open, sending unsubscribe message`)
      this.send({
        type: 'unsubscribe',
        channel
      })
    } else {
      console.log(`⏳ [WebSocket] Connection not ready, unsubscribe not sent`)
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

/*
// Auto-connect при загрузке в браузере
if (typeof window !== 'undefined') {
  // Откладываем подключение, чтобы дать время для загрузки JWT
  setTimeout(() => {
    console.log('[WebSocket] Initiating auto-connect to 64.20.37.222:3002...')
    wsService.connect()
  }, 1000)
} 
  */