'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { User } from '@prisma/client'
import { wsService, WebSocketEvent } from '@/lib/services/websocket'

// Расширенный тип создателя с дополнительными данными
interface CreatorData extends Partial<User> {
  id: string
  nickname?: string | null
  avatar?: string | null
  fullName?: string | null
  bio?: string | null
  isVerified?: boolean
  isCreator?: boolean
  followersCount?: number
  followingCount?: number
  postsCount?: number
  backgroundImage?: string | null
  website?: string | null
  twitter?: string | null
  telegram?: string | null
  location?: string | null
  wallet?: string | null
  solanaWallet?: string | null
  referrerId?: string | null
  
  // Дополнительные данные, которые могут быть загружены
  tierSettings?: any
  flashSales?: any[]
  earnings?: any
  subscriptions?: any[]
  subscribers?: any[]
  referrer?: {
    id: string
    wallet?: string | null
    solanaWallet?: string | null
  } | null
}

interface CreatorContextType {
  creator: CreatorData | null
  isLoading: boolean
  error: string | null
  refreshCreator: () => Promise<void>
  setCreator: (creator: CreatorData | null) => void
  updateCreatorLocally: (updates: Partial<CreatorData>) => void
  revertCreator: () => void
}

const CreatorContext = createContext<CreatorContextType | undefined>(undefined)

const CACHE_KEY_PREFIX = 'fonana_creator_'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 дней
const BROADCAST_CHANNEL_NAME = 'fonana_creator_sync'

interface CreatorDataProviderProps {
  children: ReactNode
  creatorId?: string
  initialData?: CreatorData | null
}

export function CreatorDataProvider({ 
  children, 
  creatorId,
  initialData 
}: CreatorDataProviderProps) {
  const [creator, setCreatorState] = useState<CreatorData | null>(initialData || null)
  const [previousCreator, setPreviousCreator] = useState<CreatorData | null>(null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null)

  // Инициализация BroadcastChannel для синхронизации между вкладками
  useEffect(() => {
    if (typeof window === 'undefined') return

    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      
      channel.onmessage = (event) => {
        if (event.data.type === 'creator_updated' && event.data.creatorId === creatorId) {
          // Обновляем данные из другой вкладки
          setCreatorState(event.data.creator)
          saveToCache(event.data.creatorId, event.data.creator)
        }
      }
      
      setBroadcastChannel(channel)
      
      return () => {
        channel.close()
      }
    } else {
      // Fallback на localStorage events для старых браузеров
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `${CACHE_KEY_PREFIX}${creatorId}` && e.newValue) {
          try {
            const { data } = JSON.parse(e.newValue)
            setCreatorState(data)
          } catch (error) {
            console.error('Error parsing storage event:', error)
          }
        }
      }
      
      const windowObj = window as Window
      windowObj.addEventListener('storage', handleStorageChange)
      return () => windowObj.removeEventListener('storage', handleStorageChange)
    }
  }, [creatorId])

  // Загрузка данных создателя из кеша
  const loadFromCache = useCallback((id: string): CreatorData | null => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${id}`)
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(`${CACHE_KEY_PREFIX}${id}`)
        return null
      }

      return data
    } catch (error) {
      console.error('Error loading creator from cache:', error)
      return null
    }
  }, [])

  // Сохранение данных создателя в кеш
  const saveToCache = useCallback((id: string, data: CreatorData) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      }
      localStorage.setItem(`${CACHE_KEY_PREFIX}${id}`, JSON.stringify(cacheData))
      
      // Оповещаем другие вкладки через BroadcastChannel
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'creator_updated',
          creatorId: id,
          creator: data
        })
      }
    } catch (error) {
      console.error('Error saving creator to cache:', error)
    }
  }, [broadcastChannel])

  // Загрузка данных создателя с API
  const fetchCreatorData = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // Проверяем кеш
      const cached = loadFromCache(id)
      if (cached && retryCount === 0) {
        setCreatorState(cached)
        setIsLoading(false)
        return
      }

      // Загружаем с API
      const response = await fetch(`/api/creators/${id}`)
      
      // Обработка различных типов ошибок
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to load creator data'
        
        switch (response.status) {
          case 401:
          case 403:
            errorMessage = 'Authentication required'
            break
          case 404:
            errorMessage = 'Creator not found'
            break
          case 500:
          case 502:
          case 503:
            errorMessage = 'Server error. Please try again later'
            break
          default:
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorMessage
            } catch {}
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      const creatorData: CreatorData = {
        ...data.creator,
        tierSettings: data.tierSettings,
        flashSales: data.flashSales,
        earnings: data.earnings,
      }

      setCreatorState(creatorData)
      saveToCache(id, creatorData)
      setRetryCount(0) // Сбрасываем счётчик при успехе
    } catch (err) {
      console.error('Error fetching creator data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load creator data'
      setError(errorMessage)
      
      // Ограничиваем количество retry
      if (retryCount < 3 && !errorMessage.includes('not found') && !errorMessage.includes('Authentication')) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => {
          if (creatorId === id) {
            fetchCreatorData(id)
          }
        }, 2000 * (retryCount + 1)) // Увеличиваем интервал с каждой попыткой
      }
    } finally {
      setIsLoading(false)
    }
  }, [creatorId, loadFromCache, saveToCache, retryCount])

  // Обновление данных создателя
  const refreshCreator = useCallback(async () => {
    if (!creatorId) return
    
    // Очищаем кеш
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${creatorId}`)
    setRetryCount(0) // Сбрасываем счётчик при явном обновлении
    
    // Перезагружаем данные
    await fetchCreatorData(creatorId)
  }, [creatorId, fetchCreatorData])

  // Установка данных создателя
  const setCreator = useCallback((newCreator: CreatorData | null) => {
    setCreatorState(newCreator)
    if (newCreator?.id) {
      saveToCache(newCreator.id, newCreator)
    }
  }, [saveToCache])

  // Оптимистичное локальное обновление
  const updateCreatorLocally = useCallback((updates: Partial<CreatorData>) => {
    if (!creator) return
    
    // Сохраняем текущее состояние для возможного отката
    setPreviousCreator(creator)
    
    // Применяем локальные изменения
    const updatedCreator = { ...creator, ...updates }
    setCreatorState(updatedCreator)
    
    // НЕ сохраняем в кеш сразу - ждём подтверждения с сервера
  }, [creator])

  // Откат к предыдущему состоянию
  const revertCreator = useCallback(() => {
    if (previousCreator) {
      setCreatorState(previousCreator)
      setPreviousCreator(null)
    }
  }, [previousCreator])

  // Загружаем данные при монтировании или изменении creatorId
  useEffect(() => {
    if (creatorId && !initialData) {
      fetchCreatorData(creatorId)
    }
  }, [creatorId, initialData, fetchCreatorData])

  // Подписка на WebSocket обновления
  useEffect(() => {
    if (!creatorId) return

    // Подписываемся на обновления создателя
    wsService.subscribeToCreator(creatorId)

    // Обработчики событий
    const handleCreatorUpdate = (event: WebSocketEvent) => {
      if (event.type === 'creator_updated' && event.creatorId === creatorId) {
        console.log('Creator updated via WebSocket:', event)
        refreshCreator()
      }
    }

    const handleEarningsUpdate = (event: WebSocketEvent) => {
      if (event.type === 'earnings_updated' && event.creatorId === creatorId) {
        console.log('Earnings updated via WebSocket:', event)
        // Обновляем только earnings без полной перезагрузки
        setCreatorState(prev => prev ? {
          ...prev,
          earnings: event.earnings
        } : null)
      }
    }

    const handleSubscriptionUpdate = (event: WebSocketEvent) => {
      if ((event.type === 'new_subscription' || event.type === 'subscription_cancelled') && 
          event.creatorId === creatorId) {
        console.log('Subscription updated via WebSocket:', event)
        refreshCreator()
      }
    }

    const handleFlashSaleUpdate = (event: WebSocketEvent) => {
      if ((event.type === 'flash_sale_created' || event.type === 'flash_sale_ended') && 
          event.creatorId === creatorId) {
        console.log('Flash sale updated via WebSocket:', event)
        refreshCreator()
      }
    }

    // Подписываемся на события
    wsService.on('creator_updated', handleCreatorUpdate)
    wsService.on('earnings_updated', handleEarningsUpdate)
    wsService.on('new_subscription', handleSubscriptionUpdate)
    wsService.on('subscription_cancelled', handleSubscriptionUpdate)
    wsService.on('flash_sale_created', handleFlashSaleUpdate)
    wsService.on('flash_sale_ended', handleFlashSaleUpdate)

    // Отписываемся при размонтировании
    return () => {
      wsService.unsubscribeFromCreator(creatorId)
      wsService.off('creator_updated', handleCreatorUpdate)
      wsService.off('earnings_updated', handleEarningsUpdate)
      wsService.off('new_subscription', handleSubscriptionUpdate)
      wsService.off('subscription_cancelled', handleSubscriptionUpdate)
      wsService.off('flash_sale_created', handleFlashSaleUpdate)
      wsService.off('flash_sale_ended', handleFlashSaleUpdate)
    }
  }, [creatorId, refreshCreator])

  const value: CreatorContextType = {
    creator,
    isLoading,
    error,
    refreshCreator,
    setCreator,
    updateCreatorLocally,
    revertCreator,
  }

  return (
    <CreatorContext.Provider value={value}>
      {children}
    </CreatorContext.Provider>
  )
}

// Хук для использования контекста создателя
export function useCreatorData() {
  const context = useContext(CreatorContext)
  
  if (context === undefined) {
    throw new Error('useCreatorData must be used within a CreatorDataProvider')
  }
  
  return context
} 