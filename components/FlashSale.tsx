'use client'

import React, { useEffect, useState } from 'react'
import { 
  ClockIcon, 
  BoltIcon, 
  ShoppingCartIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { useSolRate } from '@/lib/hooks/useSolRate'

interface FlashSaleProps {
  flashSale: {
    id: string
    discount: number
    endAt: string
    maxRedemptions?: number
    usedCount: number
    remainingRedemptions?: number
    timeLeft: number
    post?: {
      id: string
      title: string
      price?: number
      currency?: string
    }
    subscriptionPlan?: string
  }
  onUse?: () => void
  className?: string
}

export default function FlashSale({ flashSale, onUse, className = '' }: FlashSaleProps) {
  const [timeLeft, setTimeLeft] = useState(flashSale.timeLeft)
  const [isExpired, setIsExpired] = useState(false)
  const { rate: solRate } = useSolRate()

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          setIsExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Expired'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const getProgressPercentage = () => {
    if (!flashSale.maxRedemptions) return 0
    return (flashSale.usedCount / flashSale.maxRedemptions) * 100
  }

  const getSaleTitle = () => {
    if (flashSale.post) {
      return flashSale.post.title
    } else if (flashSale.subscriptionPlan) {
      const planNames = {
        basic: 'Basic Subscription',
        premium: 'Premium Subscription',
        vip: 'VIP Subscription'
      }
      return planNames[flashSale.subscriptionPlan as keyof typeof planNames]
    }
    return 'Flash Sale'
  }

  const getOriginalPrice = () => {
    if (flashSale.post?.price) {
      return flashSale.post.price
    }
    // Для подписок цены нужно будет получать из другого места
    return 0
  }

  const getDiscountedPrice = () => {
    const original = getOriginalPrice()
    return original * (1 - flashSale.discount / 100)
  }

  if (isExpired) return null

  return (
    <div className={`
      relative rounded-2xl 
      bg-gradient-to-r from-orange-500 to-pink-500 p-[2px]
      animate-pulse-slow ${className}
    `}>
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-4 overflow-visible">
        {/* Flash icon animation */}
        <div className="absolute -top-2 -right-2 animate-bounce z-10">
          <div className="bg-yellow-400 rounded-full p-2 shadow-lg">
            <BoltIcon className="w-6 h-6 text-gray-900" />
          </div>
        </div>

        {/* Sale info */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            🔥 {flashSale.discount}% OFF
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
            {getSaleTitle()}
          </p>
        </div>

        {/* Price comparison */}
        {getOriginalPrice() > 0 && (
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-gray-500 line-through text-sm">
              {getOriginalPrice().toFixed(2)} {flashSale.post?.currency || 'SOL'}
            </span>
            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {getDiscountedPrice().toFixed(2)} {flashSale.post?.currency || 'SOL'}
            </span>
          </div>
        )}
        
        {/* USD Price */}
        {getOriginalPrice() > 0 && (flashSale.post?.currency === 'SOL' || !flashSale.post?.currency) && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            <span className="line-through">≈ ${(getOriginalPrice() * solRate).toFixed(2)}</span>
            {' → '}
            <span className="font-bold text-orange-600 dark:text-orange-400">
              ≈ ${(getDiscountedPrice() * solRate).toFixed(2)} USD
            </span>
            <span className="ml-1 text-xs text-green-600 dark:text-green-400">
              (Save ${((getOriginalPrice() - getDiscountedPrice()) * solRate).toFixed(2)})
            </span>
          </div>
        )}

        {/* Timer */}
        <div className="flex items-center gap-2 mb-3">
          <ClockIcon className="w-5 h-5 text-gray-500" />
          <span className={`font-mono font-bold ${
            timeLeft < 300 ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'
          }`}>
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm text-gray-500">left</span>
        </div>

        {/* Redemption progress */}
        {flashSale.maxRedemptions && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                <UserGroupIcon className="w-4 h-4 inline mr-1" />
                {flashSale.usedCount} / {flashSale.maxRedemptions} claimed
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {flashSale.remainingRedemptions} left
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Action button */}
        {onUse && (
          <button
            onClick={onUse}
            disabled={flashSale.remainingRedemptions === 0}
            className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-pink-500 
                     text-white font-bold rounded-xl hover:from-orange-600 hover:to-pink-600 
                     transition-all transform hover:scale-105 disabled:opacity-50 
                     disabled:cursor-not-allowed disabled:hover:scale-100
                     flex items-center justify-center gap-2"
          >
            <ShoppingCartIcon className="w-5 h-5" />
            {flashSale.remainingRedemptions === 0 ? 'Sold Out' : 'Claim Now'}
          </button>
        )}
      </div>
    </div>
  )
} 