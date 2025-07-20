'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { priceService } from './services/priceService'
import { PriceData, PRICING_CONFIG } from './config'

interface PricingContextType {
  prices: PriceData | null
  isLoading: boolean
  error: string | null
  lastUpdate: Date | null
  refresh: () => Promise<void>
  isEnabled: boolean
}

const PricingContext = createContext<PricingContextType | null>(null)

interface PricingProviderProps {
  children: React.ReactNode
  enabled?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export function PricingProvider({ 
  children, 
  enabled = true,
  autoRefresh = true,
  refreshInterval = PRICING_CONFIG.CACHE.TTL 
}: PricingProviderProps) {
  const [prices, setPrices] = useState<PriceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchPrices = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const newPrices = await priceService.getAllPrices()
      setPrices(newPrices)
      setLastUpdate(new Date())
      
      // Логируем обновление только в dev режиме
      if (process.env.NODE_ENV === 'development') {
        console.log('Prices updated:', newPrices)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prices'
      setError(errorMessage)
      console.error('Price fetch error:', err)
      
      // Если это первая загрузка, используем fallback цены
      if (!prices) {
        const fallbackPrices: PriceData = {
          ...PRICING_CONFIG.FALLBACK_PRICES,
          timestamp: Date.now(),
          source: 'fallback'
        }
        setPrices(fallbackPrices)
      }
    } finally {
      setIsLoading(false)
    }
  }, [enabled, prices])

  // Начальная загрузка
  useEffect(() => {
    fetchPrices()
  }, []) // Убираем fetchPrices из зависимостей для начальной загрузки

  // Автообновление
  useEffect(() => {
    if (!enabled || !autoRefresh) return

    const interval = setInterval(() => {
      fetchPrices()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [enabled, autoRefresh, refreshInterval])

  // Обновление при изменении видимости страницы
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Обновляем цены когда пользователь возвращается на страницу
        fetchPrices()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled])

  const value: PricingContextType = {
    prices,
    isLoading,
    error,
    lastUpdate,
    refresh: fetchPrices,
    isEnabled: enabled
  }

  return (
    <PricingContext.Provider value={value}>
      {children}
    </PricingContext.Provider>
  )
}

export function usePricing() {
  // SSR safety check
  if (typeof window === 'undefined') {
    return {
      tiers: [],
      exchangeRate: 0,
      getPriceInUSD: () => '0.00',
      formatPrice: () => '0 SOL',
      formatPriceShort: () => '0',
      loading: true,
      error: null
    }
  }
  
  const context = useContext(PricingContext)
  if (!context) {
    throw new Error('usePricing must be used within a PricingProvider')
  }
  return context
} 