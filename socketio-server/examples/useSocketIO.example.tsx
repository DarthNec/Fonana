/**
 * Пример хука для использования Socket.IO в React компонентах
 * 
 * Использование:
 * 
 * import { useSocketIO } from '@/hooks/useSocketIO'
 * 
 * function MyComponent() {
 *   const { connected, subscribe, unsubscribe } = useSocketIO()
 *   
 *   useEffect(() => {
 *     if (connected) {
 *       subscribe({ type: 'notifications', userId: 'my-user-id' })
 *     }
 *   }, [connected])
 *   
 *   return <div>Connected: {connected ? 'Yes' : 'No'}</div>
 * }
 */

import { useEffect, useState, useCallback } from 'react'
import { socketIOService, SubscriptionChannel } from '@/lib/services/socketio'

export function useSocketIO() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Подключаемся при монтировании
    socketIOService.connect()

    // Слушаем события подключения/отключения
    const handleConnected = () => setConnected(true)
    const handleDisconnected = () => setConnected(false)

    socketIOService.on('connected', handleConnected)
    socketIOService.on('disconnected', handleDisconnected)

    // Проверяем текущее состояние
    setConnected(socketIOService.isConnected())

    // Cleanup
    return () => {
      socketIOService.off('connected', handleConnected)
      socketIOService.off('disconnected', handleDisconnected)
    }
  }, [])

  const subscribe = useCallback((channel: SubscriptionChannel) => {
    socketIOService.subscribe(channel)
  }, [])

  const unsubscribe = useCallback((channel: SubscriptionChannel) => {
    socketIOService.unsubscribe(channel)
  }, [])

  const on = useCallback((event: string, handler: Function) => {
    socketIOService.on(event, handler)
    return () => socketIOService.off(event, handler)
  }, [])

  return {
    connected,
    subscribe,
    unsubscribe,
    on,
    service: socketIOService
  }
}

// ===== ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ =====

/**
 * Пример 1: Компонент уведомлений
 */
export function NotificationsExample({ userId }: { userId: string }) {
  const { connected, subscribe, unsubscribe, on } = useSocketIO()
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (!connected) return

    // Подписываемся на уведомления
    subscribe({ type: 'notifications', userId })

    // Слушаем новые уведомления
    const unsubscribeHandler = on('notification', (data: any) => {
      console.log('New notification:', data)
      setNotifications(prev => [data.notification, ...prev])
    })

    // Cleanup
    return () => {
      unsubscribe({ type: 'notifications', userId })
      unsubscribeHandler()
    }
  }, [connected, userId])

  return (
    <div>
      <h3>Notifications {!connected && '(Offline)'}</h3>
      {notifications.map((notif, i) => (
        <div key={i}>{notif.message}</div>
      ))}
    </div>
  )
}

/**
 * Пример 2: Лайки постов в реальном времени
 */
export function PostLikesExample({ postId }: { postId: string }) {
  const { connected, subscribe, unsubscribe, on } = useSocketIO()
  const [likesCount, setLikesCount] = useState(0)

  useEffect(() => {
    if (!connected) return

    // Подписываемся на пост
    subscribe({ type: 'post', postId })

    // Слушаем лайки
    const unsubLiked = on('post_liked', (data: any) => {
      if (data.postId === postId) {
        setLikesCount(data.likesCount)
      }
    })

    const unsubUnliked = on('post_unliked', (data: any) => {
      if (data.postId === postId) {
        setLikesCount(data.likesCount)
      }
    })

    // Cleanup
    return () => {
      unsubscribe({ type: 'post', postId })
      unsubLiked()
      unsubUnliked()
    }
  }, [connected, postId])

  return (
    <div>
      ❤️ {likesCount} {!connected && '(Offline)'}
    </div>
  )
}

/**
 * Пример 3: Обновления создателя
 */
export function CreatorUpdatesExample({ creatorId }: { creatorId: string }) {
  const { connected, subscribe, unsubscribe, on } = useSocketIO()
  const [latestPost, setLatestPost] = useState<any>(null)
  const [flashSale, setFlashSale] = useState<any>(null)

  useEffect(() => {
    if (!connected) return

    // Подписываемся на создателя
    subscribe({ type: 'creator', id: creatorId })

    // Слушаем новые посты
    const unsubPosts = on('post_created', (data: any) => {
      if (data.creatorId === creatorId) {
        setLatestPost(data.post)
      }
    })

    // Слушаем flash sales
    const unsubFlashSale = on('flash_sale_created', (data: any) => {
      if (data.creatorId === creatorId) {
        setFlashSale(data.flashSale)
      }
    })

    const unsubFlashSaleEnded = on('flash_sale_ended', (data: any) => {
      if (data.creatorId === creatorId) {
        setFlashSale(null)
      }
    })

    // Cleanup
    return () => {
      unsubscribe({ type: 'creator', id: creatorId })
      unsubPosts()
      unsubFlashSale()
      unsubFlashSaleEnded()
    }
  }, [connected, creatorId])

  return (
    <div>
      {flashSale && (
        <div className="flash-sale">
          🔥 Flash Sale: {flashSale.title}
        </div>
      )}
      {latestPost && (
        <div className="latest-post">
          New post: {latestPost.title}
        </div>
      )}
    </div>
  )
}

/**
 * Пример 4: Комментарии в реальном времени
 */
export function CommentsExample({ postId }: { postId: string }) {
  const { connected, subscribe, unsubscribe, on } = useSocketIO()
  const [comments, setComments] = useState<any[]>([])

  useEffect(() => {
    if (!connected) return

    subscribe({ type: 'post', postId })

    const unsubAdded = on('comment_added', (data: any) => {
      if (data.postId === postId) {
        setComments(prev => [...prev, data.comment])
      }
    })

    const unsubDeleted = on('comment_deleted', (data: any) => {
      if (data.postId === postId) {
        setComments(prev => prev.filter(c => c.id !== data.commentId))
      }
    })

    return () => {
      unsubscribe({ type: 'post', postId })
      unsubAdded()
      unsubDeleted()
    }
  }, [connected, postId])

  return (
    <div>
      <h4>Comments {!connected && '(Offline)'}</h4>
      {comments.map(comment => (
        <div key={comment.id}>{comment.text}</div>
      ))}
    </div>
  )
}

/**
 * Пример 5: Индикатор подключения
 */
export function ConnectionIndicator() {
  const { connected } = useSocketIO()

  return (
    <div className={`connection-indicator ${connected ? 'online' : 'offline'}`}>
      {connected ? '🟢 Online' : '🔴 Offline'}
    </div>
  )
}

/**
 * Пример 6: Debug панель
 */
export function SocketIODebugPanel() {
  const { service } = useSocketIO()
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(service.getStats())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!stats) return null

  return (
    <div className="debug-panel">
      <h4>Socket.IO Stats</h4>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
      <button onClick={() => service.ping()}>Send Ping</button>
    </div>
  )
}

