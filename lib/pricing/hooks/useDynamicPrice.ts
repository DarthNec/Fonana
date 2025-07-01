'use client'

import { useMemo } from 'react'
import { usePricing } from '../PricingProvider'
import { PRICING_CONFIG } from '../config'

interface UseDynamicPriceResult {
  sol: number
  usd: number | null
  displayPrice: string
  displayPriceShort: string
  isLoading: boolean
  error: string | null
  source: 'dynamic' | 'fallback' | 'static'
}

export function useDynamicPrice(amountInSol: number): UseDynamicPriceResult {
  const { prices, isLoading, error, isEnabled } = usePricing()
  
  const result = useMemo(() => {
    // Если система отключена, возвращаем только SOL
    if (!isEnabled) {
      return {
        sol: amountInSol,
        usd: null,
        displayPrice: `${amountInSol} SOL`,
        displayPriceShort: `${amountInSol} SOL`,
        isLoading: false,
        error: null,
        source: 'static' as const
      }
    }

    // Если загрузка
    if (isLoading && !prices) {
      return {
        sol: amountInSol,
        usd: null,
        displayPrice: `${amountInSol} SOL`,
        displayPriceShort: `${amountInSol} SOL`,
        isLoading: true,
        error: null,
        source: 'static' as const
      }
    }

    // Если есть цены
    if (prices?.SOL_USD) {
      const usdAmount = amountInSol * prices.SOL_USD
      const formattedUSD = usdAmount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })

      return {
        sol: amountInSol,
        usd: usdAmount,
        displayPrice: `${amountInSol} SOL (${formattedUSD})`,
        displayPriceShort: formattedUSD,
        isLoading: false,
        error: error,
        source: (prices.source === 'fallback' ? 'fallback' : 'dynamic') as 'dynamic' | 'fallback'
      }
    }

    // Fallback
    return {
      sol: amountInSol,
      usd: null,
      displayPrice: `${amountInSol} SOL`,
      displayPriceShort: `${amountInSol} SOL`,
      isLoading: false,
      error: error || 'Price data unavailable',
      source: 'static' as const
    }
  }, [amountInSol, prices, isLoading, error, isEnabled])

  return result
}

// Хелпер для форматирования SOL
export function formatSolAmount(amount: number | null | undefined): string {
  const safeAmount = Number(amount) || 0
  if (safeAmount === 0) return '0 SOL'
  if (safeAmount < 0.001) return '<0.001 SOL'
  if (safeAmount < 1) return `${safeAmount.toFixed(3)} SOL`
  if (safeAmount < 10) return `${safeAmount.toFixed(2)} SOL`
  return `${safeAmount.toFixed(1)} SOL`
}

// Хелпер для форматирования USD
export function formatUsdAmount(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount < 1 ? 2 : 0,
    maximumFractionDigits: 2
  })
} 