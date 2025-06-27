'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useUserContext } from '@/lib/contexts/UserContext'
import { toast } from 'react-hot-toast'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  metadata?: any
  createdAt: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: () => Promise<void>
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  clearReadNotifications: () => Promise<void>
  playNotificationSound: (count?: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Создаем аудио объекты для звуков
const createAudioElements = () => {
  if (typeof window === 'undefined') return null
  
  const sounds = {
    single: new Audio('/sounds/notification-single.mp3'),
    trill: new Audio('/sounds/notification-trill.mp3')
  }
  
  // Предзагружаем звуки
  Object.values(sounds).forEach(audio => {
    audio.preload = 'auto'
    audio.volume = 0.5 // 50% громкости для приятного звучания
  })
  
  return sounds
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUserContext()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null)
  const soundsRef = useRef(createAudioElements())
  const pollingIntervalRef = useRef<NodeJS.Timeout>()
  
  // Функция воспроизведения звука
  const playNotificationSound = useCallback((count: number = 1) => {
    if (!soundsRef.current) return
    
    try {
      if (count > 1) {
        // Для нескольких уведомлений играем трель
        soundsRef.current.trill.currentTime = 0
        soundsRef.current.trill.play().catch(console.error)
      } else {
        // Для одного уведомления играем одиночный звук
        soundsRef.current.single.currentTime = 0
        soundsRef.current.single.play().catch(console.error)
      }
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }, [])
  
  // Функция загрузки уведомлений
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/user/notifications?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
        
        // Проверяем новые уведомления для звукового оповещения
        if (data.notifications.length > 0) {
          const newestId = data.notifications[0].id
          if (lastNotificationId && newestId !== lastNotificationId) {
            // Есть новые уведомления
            const newNotificationsCount = data.notifications.findIndex(
              (n: Notification) => n.id === lastNotificationId
            )
            
            if (newNotificationsCount > 0) {
              // Воспроизводим звук для новых уведомлений
              playNotificationSound(newNotificationsCount)
              
              // Показываем toast для первого нового уведомления
              const newestNotification = data.notifications[0]
              toast.success(newestNotification.title, {
                duration: 4000,
                icon: '🔔'
              })
            }
          }
          setLastNotificationId(newestId)
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [user?.id, lastNotificationId, playNotificationSound])
  
  // Пометить как прочитанные
  const markAsRead = async (notificationIds: string[]) => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/user/notifications?userId=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, isRead: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }
  
  // Пометить все как прочитанные
  const markAllAsRead = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/user/notifications?userId=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      })
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }
  
  // Удалить уведомление
  const deleteNotification = async (notificationId: string) => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/user/notifications?userId=${user.id}&id=${notificationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        const notification = notifications.find(n => n.id === notificationId)
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }
  
  // Очистить прочитанные уведомления
  const clearReadNotifications = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/user/notifications?userId=${user.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => !n.isRead))
      }
    } catch (error) {
      console.error('Error clearing read notifications:', error)
    }
  }
  
  // Начальная загрузка и polling
  useEffect(() => {
    if (user?.id) {
      // Начальная загрузка
      setLoading(true)
      fetchNotifications().finally(() => setLoading(false))
      
      // Настраиваем polling каждые 30 секунд
      pollingIntervalRef.current = setInterval(fetchNotifications, 30000)
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [user?.id, fetchNotifications])
  
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearReadNotifications,
        playNotificationSound
      }}
    >
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