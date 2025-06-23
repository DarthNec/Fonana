'use client'

import { useSolanaRate } from '@/lib/pricing/hooks/usePriceDisplay'
import { useEffect, useState } from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'

export function SolanaRateDisplay() {
  const { rate, display, isLoading } = useSolanaRate()
  const [previousRate, setPreviousRate] = useState<number | null>(null)
  const [trend, setTrend] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (rate && previousRate && rate !== previousRate) {
      setTrend(rate > previousRate ? 'up' : 'down')
      const timer = setTimeout(() => setTrend(null), 3000)
      return () => clearTimeout(timer)
    }
    if (rate) {
      setPreviousRate(rate)
    }
  }, [rate, previousRate])

  // Если система отключена или загружается
  if (!rate && !isLoading) {
    return null
  }

  return (
    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800/50 rounded-2xl">
      {/* Solana Logo */}
      <div className="w-6 h-6 relative">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <defs>
            <linearGradient id="solana-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <path
            fill="url(#solana-gradient)"
            d="M20.47 7.52a.75.75 0 010 1.06l-12 12a.75.75 0 01-1.06 0l-4-4a.75.75 0 111.06-1.06L8 19.06 19.41 7.52a.75.75 0 011.06 0z"
          />
        </svg>
      </div>

      {/* Rate Display */}
      <div className="flex items-center gap-1">
        {isLoading ? (
          <span className="text-sm font-semibold text-gray-600 dark:text-slate-400 animate-pulse">
            Загрузка...
          </span>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {display}
            </span>
            
            {/* Trend Indicator */}
            {trend && (
              <div
                className={`flex items-center ${
                  trend === 'up' ? 'text-green-500' : 'text-red-500'
                } animate-fade-in`}
              >
                {trend === 'up' ? (
                  <ArrowUpIcon className="w-3 h-3" />
                ) : (
                  <ArrowDownIcon className="w-3 h-3" />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Update Indicator */}
      {!isLoading && (
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      )}
    </div>
  )
}

// Мобильная версия для отображения в выпадающем меню
export function SolanaRateMobile() {
  const { rate, display, isLoading } = useSolanaRate()

  if (!rate && !isLoading) {
    return null
  }

  return (
    <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700/50">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600 dark:text-slate-400">Курс Solana</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {isLoading ? 'Загрузка...' : display}
        </span>
      </div>
    </div>
  )
} 