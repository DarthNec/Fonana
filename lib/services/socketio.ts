'use client'

import { io, Socket } from 'socket.io-client'
import { authService } from './AuthService'

export type SocketIOEvent = 
  | { type: 'creator_updated'; creatorId: string; data: any }
  | { type: 'new_subscription'; creatorId: string; userId: string }
  | { type: 'subscription_cancelled'; creatorId: string; userId: string }
  | { type: 'earnings_updated'; creatorId: string; earnings: any }
  | { type: 'flash_sale_created'; creatorId: string; flashSale: any }
  | { type: 'flash_sale_ended'; creatorId: string; flashSaleId: string }
  | { type: 'notification'; userId: string; notification: any }
  | { type: 'notification_read'; userId: string; notificationId: string }
  | { type: 'notifications_cleared'; userId: string }
  | { type: 'post_liked'; postId: string; userId: string; likesCount: number }
  | { type: 'post_unliked'; postId: string; userId: string; likesCount: number }
  | { type: 'post_created'; creatorId: string; post: any }
  | { type: 'post_deleted'; postId: string }
  | { type: 'comment_added'; postId: string; comment: any }
  | { type: 'comment_deleted'; postId: string; commentId: string }
  | { type: 'feed_update'; userId: string; posts: any[] }

export type SubscriptionChannel = 
  | { type: 'creator'; id: string }
  | { type: 'notifications'; userId: string }
  | { type: 'feed'; userId: string }
  | { type: 'post'; postId: string }

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

class SocketIOService extends EventEmitter {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private isConnecting = false
  private subscribedChannels = new Map<string, SubscriptionChannel>()

  constructor() {
    super()
  }

  async connect(customUrl?: string, user?: any) {
    const timestamp = new Date().toISOString()
    console.log(`🔌 [Socket.IO] Connection attempt started at ${timestamp}`)
    
    if (this.isConnecting) {
      console.log('⚠️ [Socket.IO] Already connecting, skipping...')
      return
    }
    
    if (this.socket?.connected) {
      console.log('✅ [Socket.IO] Already connected, skipping...')
      return
    }

    this.isConnecting = true
    console.log(`🔄 [Socket.IO] isConnecting set to true, attempt #${this.reconnectAttempts + 1}`)
    
    try {
      // Получаем URL и передаем user объект
      const { url, user: userData } = await this.getConnectionConfig(customUrl, user)
      console.log('🌐 [Socket.IO] Connection config:', { url, hasUser: !!userData })
      
      if (!url) {
        console.error('❌ [Socket.IO] Failed to get connection URL')
        this.isConnecting = false
        return
      }

      console.log('🌐 [Socket.IO] Connecting to:', url)
      console.log('👤 [Socket.IO] User present:', !!userData)
      
      // Создаем Socket.IO соединение
      const socketOptions: any = {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      }
      
      // Добавляем user объект если он есть
      if (userData) {
        socketOptions.auth = { user: userData }
        console.log('✅ [Socket.IO] Connecting with user:', userData.id)
      } else {
        console.log('⚠️  [Socket.IO] Connecting without user (anonymous)')
      }
      
      this.socket = io(url, socketOptions)

      // Добавляем обработчик ошибки подключения для fallback
      this.socket.on('connect_error', (error) => {
        console.error('❌ [Socket.IO] Connect error:', error.message)
        
        // Если это production и ошибка связана с доменом, пробуем IP
        if (window.location.hostname === 'fonana.me' || window.location.hostname.endsWith('.fonana.me')) {
          if (url.includes('fonana.me') && !url.includes('64.20.37.222')) {
            console.log('🔄 [Socket.IO] Domain failed, trying IP fallback...')
            this.socket?.disconnect()
            
            // Пробуем подключиться к IP с правильным SocketIO путем
            const fallbackUrl = 'http://64.20.37.222:3004'
            console.log('🔄 [Socket.IO] Fallback URL:', fallbackUrl)
            
            this.socket = io(fallbackUrl, socketOptions)
            this.setupEventHandlers()
          }
        }
      })

      this.setupEventHandlers()
      
    } catch (error) {
      console.error('❌ [Socket.IO] Connection error:', error)
      this.isConnecting = false
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return

    // Подключение установлено
    this.socket.on('connect', () => {
      const connectedAt = new Date().toISOString()
      console.log(`✅ [Socket.IO] Connected successfully at ${connectedAt}`)
      console.log(`⏱️ [Socket.IO] Socket ID: ${this.socket?.id}`)
      
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.emit('connected')
      
      // Переподписываемся на все каналы
      const channelCount = this.subscribedChannels.size
      if (channelCount > 0) {
        console.log(`🔔 [Socket.IO] Resubscribing to ${channelCount} channels...`)
        this.subscribedChannels.forEach((channel) => {
          console.log(`  ↳ Subscribing to:`, channel)
          this.sendSubscription(channel)
        })
      }
    })

    // Получен ответ о подключении
    this.socket.on('connected', (data) => {
      console.log('📨 [Socket.IO] Connected event:', data)
    })

    // Подтверждение подписки
    this.socket.on('subscribed', (data) => {
      console.log('📨 [Socket.IO] Subscribed to:', data.channel)
    })

    // Подтверждение отписки
    this.socket.on('unsubscribed', (data) => {
      console.log('📨 [Socket.IO] Unsubscribed from:', data.channel)
    })

    // Pong ответ
    this.socket.on('pong', () => {
      console.log('🏓 [Socket.IO] Pong received')
    })

    // Обработка всех событий приложения
    const eventTypes = [
      'creator_updated',
      'new_subscription',
      'subscription_cancelled',
      'earnings_updated',
      'flash_sale_created',
      'flash_sale_ended',
      'notification',
      'notification_read',
      'notifications_cleared',
      'post_liked',
      'post_unliked',
      'post_created',
      'post_deleted',
      'comment_added',
      'comment_deleted',
      'feed_update',
      'ai-post-updated'
    ]

    eventTypes.forEach(eventType => {
      this.socket?.on(eventType, (data) => {
        console.log(`📨 [Socket.IO] Event received: ${eventType}`, data)
        this.emit(eventType, data)
      })
    })

    // Ошибка
    this.socket.on('error', (error) => {
      console.error('❌ [Socket.IO] Error:', error)
    })

    // Отключение
    this.socket.on('disconnect', (reason) => {
      const disconnectedAt = new Date().toISOString()
      console.log(`🔌 [Socket.IO] Disconnected at ${disconnectedAt}`)
      console.log(`🔍 [Socket.IO] Disconnect reason: ${reason}`)
      
      this.isConnecting = false
      this.emit('disconnected')
    })

    // Ошибка подключения
    this.socket.on('connect_error', (error) => {
      console.error('❌ [Socket.IO] Connect error:', error.message)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(`❌ [Socket.IO] Max reconnection attempts reached`)
        this.emit('max_reconnect_reached')
      }
    })

    // Попытка переподключения
    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 [Socket.IO] Reconnection attempt #${attempt}`)
    })

    // Успешное переподключение
    this.socket.io.on('reconnect', (attempt) => {
      console.log(`✅ [Socket.IO] Reconnected after ${attempt} attempts`)
      this.reconnectAttempts = 0
    })
  }

  private async getConnectionConfig(customUrl?: string, user?: any): Promise<{ url: string; user: any | null }> {
    // Если передан кастомный URL, используем его
    if (customUrl) {
      console.log('[Socket.IO] Using custom URL:', customUrl)
      return { url: customUrl, user: user || null }
    }
    
    // Определяем URL в зависимости от окружения
    let url: string
    
    if (window.location.hostname === 'fonana.me' || window.location.hostname.endsWith('.fonana.me')) {
      // Production: пробуем домен, если не работает - используем IP
      url = 'https://fonana.me'
      console.log('[Socket.IO] Production mode - connecting to:', url)
    } else {
      // Development: прямое подключение
      url = 'https://fonana.me'
      console.log('[Socket.IO] Development mode - connecting to:', url)
    }
    
      console.log('[Socket.IO] URL:', url)
      console.log('[Socket.IO] Attempting connection...')
    
    return { url, user: user || null }
  }

  disconnect() {
    console.log('🔌 [Socket.IO] Disconnect called manually')
    
    if (this.socket) {
      console.log('🔌 [Socket.IO] Closing connection')
      this.socket.disconnect()
      this.socket = null
    }

    console.log('🧹 [Socket.IO] Cleaning up')
    this.subscribedChannels.clear()
    this.reconnectAttempts = 0
    this.isConnecting = false
    console.log('✅ [Socket.IO] Disconnect complete')
  }

  // Подписка на канал
  subscribe(channel: SubscriptionChannel) {
    const key = this.getChannelKey(channel)
    console.log(`🔔 [Socket.IO] Subscribe request for channel:`, key)
    
    this.subscribedChannels.set(key, channel)
    console.log(`📝 [Socket.IO] Channel saved (total: ${this.subscribedChannels.size})`)
    
    if (this.socket?.connected) {
      console.log(`✅ [Socket.IO] Connection is ready, sending subscription`)
      this.sendSubscription(channel)
    } else {
      console.log(`⏳ [Socket.IO] Connection not ready, subscription will be sent on connect`)
    }
  }

  // Отписка от канала
  unsubscribe(channel: SubscriptionChannel) {
    const key = this.getChannelKey(channel)
    console.log(`🔕 [Socket.IO] Unsubscribe request for channel:`, key)
    
    this.subscribedChannels.delete(key)
    console.log(`📝 [Socket.IO] Channel removed (remaining: ${this.subscribedChannels.size})`)
    
    if (this.socket?.connected) {
      console.log(`✅ [Socket.IO] Connection is ready, sending unsubscribe`)
      this.socket.emit('unsubscribe', channel)
    }
  }

  // Вспомогательные методы для удобства
  subscribeToCreator(creatorId: string) {
    this.subscribe({ type: 'creator', id: creatorId })
  }

  unsubscribeFromCreator(creatorId: string) {
    this.unsubscribe({ type: 'creator', id: creatorId })
  }

  subscribeToNotifications(userId: string) {
    this.subscribe({ type: 'notifications', userId })
  }

  unsubscribeFromNotifications(userId: string) {
    this.unsubscribe({ type: 'notifications', userId })
  }

  subscribeToFeed(userId: string) {
    this.subscribe({ type: 'feed', userId })
  }

  unsubscribeFromFeed(userId: string) {
    this.unsubscribe({ type: 'feed', userId })
  }

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
    if (this.socket?.connected) {
      this.socket.emit('subscribe', channel)
    }
  }

  // Проверка подключения
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Отправка ping
  ping() {
    if (this.socket?.connected) {
      console.log('🏓 [Socket.IO] Sending ping')
      this.socket.emit('ping')
    }
  }

  // Статистика
  getStats() {
    return {
      connected: this.isConnected(),
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
      subscribedChannels: this.subscribedChannels.size,
      listeners: this.getEvents().reduce((acc, event) => {
        acc[event] = this.getListenerCount(event)
        return acc
      }, {} as Record<string, number>)
    }
  }
}

// Singleton экземпляр
export const socketIOService = new SocketIOService()

// Авто-подключение можно включить позже
/*
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('[Socket.IO] Initiating auto-connect...')
    socketIOService.connect()
  }, 1000)
}
*/

