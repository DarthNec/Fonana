'use client'

import React, { useState, useEffect } from 'react'
import { FlashSaleData } from '@/types/posts'
import { cn } from '@/lib/utils'

export interface PostFlashSaleProps {
  flashSale: FlashSaleData
  className?: string
}

/**
 * Компонент для отображения Flash Sale баннера с таймером
 */
export function PostFlashSale({
  flashSale,
  className
}: PostFlashSaleProps) {
  const [timeLeft, setTimeLeft] = useState(flashSale.timeLeft)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}ч ${minutes}м`
    }
    if (minutes > 0) {
      return `${minutes}м ${secs}с`
    }
    return `${secs}с`
  }

  const isExpiring = timeLeft < 3600 // Менее часа

  return (
    <div className={cn(
      'absolute top-0 left-0 right-0 z-20',
      className
    )}>
      <div className={cn(
        'bg-gradient-to-r py-2 px-4',
        isExpiring 
          ? 'from-red-500 to-orange-500 animate-pulse' 
          : 'from-purple-500 to-pink-500'
      )}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <span className="font-bold text-sm sm:text-base">
                FLASH SALE -{flashSale.discount}%
              </span>
              {flashSale.maxRedemptions && (
                <span className="text-xs sm:text-sm opacity-90 ml-2">
                  ({flashSale.remainingRedemptions || 0} осталось)
                </span>
              )}
            </div>
          </div>
          
          <div className={cn(
            'flex items-center gap-1 text-sm sm:text-base font-mono',
            isExpiring && 'animate-bounce'
          )}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-bold">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-black/20">
        <div
          className={cn(
            'h-full transition-all duration-1000',
            isExpiring ? 'bg-red-400' : 'bg-white/50'
          )}
          style={{
            width: `${(timeLeft / flashSale.timeLeft) * 100}%`
          }}
        />
      </div>
    </div>
  )
} 