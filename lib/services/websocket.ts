'use client'

export type WebSocketEvent = 
  | { type: 'creator_updated'; creatorId: string; data: any }
  | { type: 'new_subscription'; creatorId: string; userId: string }
  | { type: 'subscription_cancelled'; creatorId: string; userId: string }
  | { type: 'earnings_updated'; creatorId: string; earnings: any }
  | { type: 'flash_sale_created'; creatorId: string; flashSale: any }
  | { type: 'flash_sale_ended'; creatorId: string; flashSaleId: string }

// Простая реализация EventEmitter для браузера
class EventEmitter {
  private events: { [key: string]: Function[] } = {}

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
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private subscribedCreators = new Set<string>()

  constructor() {
    super()
  }

  connect(url?: string) {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true
    const wsUrl = url || this.getWebSocketUrl()

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.emit('connected')
        
        // Переподписываемся на всех создателей
        this.subscribedCreators.forEach(creatorId => {
          this.subscribeToCreator(creatorId)
        })
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketEvent
          this.emit(data.type, data)
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
  }

  private getWebSocketUrl(): string {
    // В production используем WSS, в development - WS
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

    this.subscribedCreators.clear()
    this.reconnectAttempts = 0
    this.isConnecting = false
  }

  subscribeToCreator(creatorId: string) {
    this.subscribedCreators.add(creatorId)
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe_creator',
        creatorId
      })
    }
  }

  unsubscribeFromCreator(creatorId: string) {
    this.subscribedCreators.delete(creatorId)
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'unsubscribe_creator',
        creatorId
      })
    }
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Singleton экземпляр
export const wsService = new WebSocketService()

// Автоматически подключаемся при загрузке в браузере
if (typeof window !== 'undefined') {
  wsService.connect()
} 