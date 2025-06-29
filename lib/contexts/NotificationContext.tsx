'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { NotificationType } from '@prisma/client'
import { useUserContext } from '@/lib/contexts/UserContext'
import { wsService, WebSocketEvent } from '@/lib/services/websocket'
import toast from 'react-hot-toast'
import { getJWTToken } from '@/lib/utils/jwt'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  metadata?: any
  createdAt: string
  fromUser?: {
    id: string
    nickname?: string
    avatar?: string
  }
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  refreshNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  clearAll: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Создаем аудио объекты для звуков
const createAudioElements = () => {
  if (typeof window === 'undefined') return null
  
  const sounds = {
    single: new Audio('/sounds/notification-single.m4a'),
    trill: new Audio('/sounds/notification-trill.m4a')
  }
  
  // Предзагружаем звуки
  Object.values(sounds).forEach(audio => {
    audio.preload = 'auto'
    audio.volume = 0.5 // 50% громкости для приятного звучания
  })
  
  return sounds
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useUserContext()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null)
  const soundsRef = React.useRef(createAudioElements())
  
  // Звуковое уведомление
  const playNotificationSound = useCallback(() => {
    if (audioEnabled && typeof window !== 'undefined') {
      const audio = new Audio('/sounds/notification-single.m4a')
      audio.volume = 0.5
      audio.play().catch(err => console.log('Audio play failed:', err))
    }
  }, [audioEnabled])
  
  // Загрузка уведомлений
  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      // Получаем JWT токен
      const token = await getJWTToken()
      
      const headers: HeadersInit = {}
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      } else if (user.wallet) {
        // Fallback на wallet для обратной совместимости
        headers['x-user-wallet'] = user.wallet
      }

      const response = await fetch('/api/user/notifications', {
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to load notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Error loading notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [user])
  
  // Обработка нового уведомления через WebSocket
  const handleNewNotification = useCallback((event: WebSocketEvent) => {
    if (event.type === 'notification' && event.userId === user?.id) {
      const newNotification = event.notification as Notification
      
      // Проверяем, что это действительно новое уведомление
      if (newNotification.id !== lastNotificationId) {
        setLastNotificationId(newNotification.id)
        
        // Добавляем уведомление в начало списка
        setNotifications(prev => [newNotification, ...prev])
        
        // Увеличиваем счётчик непрочитанных
        if (!newNotification.isRead) {
          setUnreadCount(prev => prev + 1)
        }
        
        // Показываем toast и играем звук
        showNotificationToast(newNotification)
        playNotificationSound()
      }
    }
  }, [user?.id, lastNotificationId, playNotificationSound])
  
  // Обработка прочитанного уведомления
  const handleNotificationRead = useCallback((event: WebSocketEvent) => {
    if (event.type === 'notification_read' && event.userId === user?.id) {
      setNotifications(prev => 
        prev.map(n => n.id === event.notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [user?.id])
  
  // Обработка очистки уведомлений
  const handleNotificationsCleared = useCallback((event: WebSocketEvent) => {
    if (event.type === 'notifications_cleared' && event.userId === user?.id) {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [user?.id])
  
  // Показать уведомление в toast
  const showNotificationToast = (notification: Notification) => {
    const icon = getNotificationIcon(notification.type)
    const message = notification.fromUser?.nickname 
      ? `${notification.fromUser.nickname} ${notification.message}`
      : notification.message

    toast(message, {
      icon,
      duration: 4000,
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      }
    })
  }
  
  // Получить иконку для типа уведомления
  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      case 'LIKE_POST':
      case 'LIKE_COMMENT':
        return '❤️'
      case 'COMMENT_POST':
      case 'REPLY_COMMENT':
        return '💬'
      case 'NEW_SUBSCRIBER':
        return '👤'
      case 'POST_PURCHASE':
        return '💰'
      case 'NEW_MESSAGE':
        return '✉️'
      case 'TIP_RECEIVED':
        return '💎'
      default:
        return '🔔'
    }
  }
  
  // Отметить как прочитанное
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return

    // Оптимистичное обновление
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      // Получаем JWT токен
      const token = await getJWTToken()
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      } else if (user.wallet) {
        headers['x-user-wallet'] = user.wallet
      }

      const response = await fetch(`/api/user/notifications`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ notificationId, isRead: true })
      })

      if (!response.ok) {
        // Откатываем при ошибке
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: false } : n)
        )
        setUnreadCount(prev => prev + 1)
        throw new Error('Failed to mark as read')
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [user])
  
  // Отметить все как прочитанные
  const markAllAsRead = useCallback(async () => {
    if (!user?.id || unreadCount === 0) return

    // Оптимистичное обновление
    const previousNotifications = notifications
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)

    try {
      // Получаем JWT токен
      const token = await getJWTToken()
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      } else if (user.wallet) {
        headers['x-user-wallet'] = user.wallet
      }

      const response = await fetch(`/api/user/notifications`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ markAllAsRead: true })
      })

      if (!response.ok) {
        // Откатываем при ошибке
        setNotifications(previousNotifications)
        setUnreadCount(previousNotifications.filter(n => !n.isRead).length)
        throw new Error('Failed to mark all as read')
      }
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }, [user, notifications, unreadCount])
  
  // Удалить уведомление
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return

    // Оптимистичное удаление
    const deletedNotification = notifications.find(n => n.id === notificationId)
    if (!deletedNotification) return

    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    if (!deletedNotification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    try {
      const response = await fetch(`/api/user/notifications`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-wallet': user.wallet || ''
        },
        body: JSON.stringify({ notificationId })
      })

      if (!response.ok) {
        // Восстанавливаем при ошибке
        setNotifications(prev => [...prev, deletedNotification].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ))
        if (!deletedNotification.isRead) {
          setUnreadCount(prev => prev + 1)
        }
        throw new Error('Failed to delete notification')
      }
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }, [user, notifications])
  
  // Очистить все уведомления
  const clearAll = useCallback(async () => {
    if (!user?.id || notifications.length === 0) return

    // Оптимистичная очистка
    const previousNotifications = notifications
    const previousUnreadCount = unreadCount
    setNotifications([])
    setUnreadCount(0)

    try {
      const response = await fetch(`/api/user/notifications`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-wallet': user.wallet || ''
        },
        body: JSON.stringify({ clearAll: true })
      })

      if (!response.ok) {
        // Восстанавливаем при ошибке
        setNotifications(previousNotifications)
        setUnreadCount(previousUnreadCount)
        throw new Error('Failed to clear notifications')
      }
    } catch (err) {
      console.error('Error clearing notifications:', err)
    }
  }, [user, notifications, unreadCount])
  
  // Подписка на WebSocket события
  useEffect(() => {
    if (!user?.id) return

    // Подписываемся на канал уведомлений
    wsService.subscribeToNotifications(user.id)

    // Обработчики событий
    wsService.on('notification', handleNewNotification)
    wsService.on('notification_read', handleNotificationRead)
    wsService.on('notifications_cleared', handleNotificationsCleared)

    // Загружаем начальные уведомления
    refreshNotifications()

    // Отписываемся при размонтировании
    return () => {
      wsService.unsubscribeFromNotifications(user.id)
      wsService.off('notification', handleNewNotification)
      wsService.off('notification_read', handleNotificationRead)
      wsService.off('notifications_cleared', handleNotificationsCleared)
    }
  }, [user?.id, handleNewNotification, handleNotificationRead, handleNotificationsCleared, refreshNotifications])
  
  // Периодическое обновление для fallback (каждые 30 секунд)
  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      // Обновляем только если WebSocket отключен
      if (!wsService.isConnected()) {
        refreshNotifications()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [user?.id, refreshNotifications])
  
  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  }
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
} 