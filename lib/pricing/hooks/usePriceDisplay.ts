'use client'

import { usePricing } from '../PricingProvider'
import { PRICING_CONFIG } from '../config'

interface PriceDisplayOptions {
  showSol?: boolean
  showUsd?: boolean
  showBoth?: boolean
  format?: 'full' | 'short' | 'compact'
  showUpdateIndicator?: boolean
}

interface PriceDisplayResult {
  display: string
  isUpdating: boolean
  lastUpdate: Date | null
  source: string
}

export function usePriceDisplay(
  amountInSol: number, 
  options: PriceDisplayOptions = {}
): PriceDisplayResult {
  const { prices, isLoading, lastUpdate } = usePricing()
  
  const {
    showSol = true,
    showUsd = true,
    showBoth = true,
    format = 'full',
    showUpdateIndicator = PRICING_CONFIG.DISPLAY.UPDATE_INDICATOR
  } = options

  // Форматирование SOL
  const formatSol = (amount: number | null | undefined): string => {
    const safeAmount = Number(amount) || 0
    switch (format) {
      case 'compact':
        return safeAmount < 1 ? `${safeAmount.toFixed(3)}` : `${safeAmount.toFixed(2)}`
      case 'short':
        return `${safeAmount} SOL`
      default:
        return `${safeAmount} SOL`
    }
  }

  // Форматирование USD
  const formatUsd = (amount: number | null | undefined): string => {
    const safeAmount = Number(amount) || 0
    switch (format) {
      case 'compact':
        return `$${safeAmount.toFixed(0)}`
      case 'short':
        return `$${safeAmount.toFixed(2)}`
      default:
        return safeAmount.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD'
        })
    }
  }

  // Основная логика отображения
  let display = ''
  
  if (!prices?.SOL_USD || !showUsd) {
    // Показываем только SOL
    display = formatSol(amountInSol)
  } else {
    const usdAmount = amountInSol * prices.SOL_USD
    
    if (showBoth && showSol) {
      // Показываем оба значения
      switch (format) {
        case 'compact':
          display = `${formatSol(amountInSol)} ≈ ${formatUsd(usdAmount)}`
          break
        case 'short':
          display = `${formatSol(amountInSol)} (${formatUsd(usdAmount)})`
          break
        default:
          display = `${formatSol(amountInSol)} (≈ ${formatUsd(usdAmount)})`
      }
    } else if (showUsd) {
      // Показываем только USD
      display = formatUsd(usdAmount)
    } else {
      // Показываем только SOL
      display = formatSol(amountInSol)
    }
  }

  // Добавляем индикатор обновления
  if (showUpdateIndicator && isLoading) {
    display += ' ⟳'
  }

  return {
    display,
    isUpdating: isLoading,
    lastUpdate,
    source: prices?.source || 'static'
  }
}

// Компонент для отображения курса в навбаре
export function useSolanaRate() {
  const { prices, isLoading, error } = usePricing()
  
  if (!prices?.SOL_USD) {
    return {
      rate: null,
      display: '',
      isLoading,
      error
    }
  }

  return {
    rate: prices.SOL_USD,
    display: `1 SOL = $${(Number(prices.SOL_USD) || 0).toFixed(2)}`,
    shortDisplay: `$${(Number(prices.SOL_USD) || 0).toFixed(0)}`,
    isLoading,
    error
  }
} 