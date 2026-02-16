'use client'

import React from 'react'
import { UnifiedPost, PostAction, PostCardVariant } from '@/types/posts'
import { 
  needsPayment,
  needsSubscription,
  needsTierUpgrade,
  getTierInfo,
  calculatePriceWithDiscount,
  getActionButtonText,
  formatPrice,
  isPostSold
} from '@/components/posts/utils/postHelpers'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { cn } from '@/lib/utils'
import { TIER_INFO, DEFAULT_TIER_PRICES } from '@/lib/constants/tiers'
import { safeToFixed, formatSolToUsd } from '@/lib/utils/format'

export interface PostLockedProps {
  post: UnifiedPost
  onAction?: (action: PostAction) => void
  variant?: PostCardVariant
  className?: string
  isOverlay?: boolean // Когда true, использует h-full вместо фиксированных высот
}

/**
 * Компонент для отображения заблокированного контента
 */
export function PostLocked({
  post,
  onAction,
  variant = 'full',
  className,
  isOverlay = false
}: PostLockedProps) {
  const { rate: solRate } = useSolRate()

  // Определяем тип блокировки
  const needsPay = needsPayment(post)
  const needsSub = needsSubscription(post)
  const needsUpgrade = needsTierUpgrade(post)
  const tierInfo = getTierInfo(post.access)
  
  // КРИТИЧЕСКИЙ ФИКС: добавляем проверку для продаваемых постов
  const isSellable = post.commerce?.isSellable && !isPostSold(post.commerce)
  const needsPrice = needsPay || isSellable

  // Стили для разных вариантов
  const getContainerHeight = () => {
    // Если это overlay (например, в PostContent), используем h-full для растяжения на весь контейнер
    if (isOverlay) {
      return 'h-full'
    }
    
    switch (variant) {
      case 'minimal': return 'h-48'
      case 'compact': return 'h-auto min-h-[240px]'
      default: return 'h-auto min-h-[280px] max-h-[400px]'
    }
  }

  const getContentPadding = () => {
    switch (variant) {
      case 'minimal': return 'p-4'
      case 'compact': return 'p-6'
      default: return 'p-6'
    }
  }

  // Определяем градиент на основе типа доступа
  const getGradientStyle = () => {
    if (tierInfo?.required) {
      return tierInfo.required.gradient
    }
    if (post.commerce?.isSellable) {
      return 'from-orange-500/20 to-red-500/20'
    }
    if (needsPay) {
      return 'from-yellow-500/20 to-orange-500/20'
    }
    return 'from-purple-500/20 to-pink-500/20'
  }

  const handleUnlock = () => {
    if (!onAction) return

    if (needsPay || post.commerce?.isSellable) {
      // Для продаваемых постов отправляем действие 'bid'
      if (post.commerce?.isSellable) {
        onAction({ type: 'bid', postId: post.id })
      } else {
      onAction({ type: 'purchase', postId: post.id })
      }
    } else if (needsSub || needsUpgrade) {
      onAction({ type: 'subscribe', postId: post.id })
    }
  }

  // Рассчитываем цену с учетом скидки
  // Для подписочных постов используем цену Basic тира
  let finalPrice: number | undefined
  
  if (needsSub || needsUpgrade) {
    // Для подписочных постов всегда берем Basic тир
    finalPrice = DEFAULT_TIER_PRICES.basic
  } else if (post.commerce?.flashSale && post.access.price) {
    // Для платных постов с флеш-распродажей
    finalPrice = calculatePriceWithDiscount(post.access.price, post.commerce.flashSale)
  } else {
    // Для обычных платных постов
    finalPrice = post.access.price
  }

  // КРИТИЧЕСКИЙ ФИКС: логирование для отладки
  if (needsPrice && (finalPrice === undefined || finalPrice === null)) {
    console.error('[PostLocked] No price available:', {
      postId: post.id,
      accessPrice: post.access.price,
      finalPrice,
      commerce: post.commerce,
      needsPay,
      isSellable,
      needsPrice,
      needsSub,
      needsUpgrade
    })
  }

  const buttonText = getActionButtonText(post)

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl sm:rounded-2xl',
      getContainerHeight(),
      className
    )}>
      {/* Background with blur effect */}
      <div className="absolute inset-0">
        {post.media.thumbnail ? (
          <img 
            src={post.media.thumbnail} 
            alt={post.content.title}
            className="w-full h-full object-cover filter blur-2xl opacity-40"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600/30 via-pink-600/30 to-orange-500/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60" /> 
      </div>

      {/* Lock content */}
      <div className={cn(
        'relative h-full flex flex-col items-center justify-center text-center px-8',
        getContentPadding()
      )}>
        {/* Creator Avatar */}
        <div className="mb-4">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white overflow-hidden shadow-2xl">
            {post.creator.avatar ? (
              <img 
                src={post.creator.avatar} 
                alt={post.creator.name || post.creator.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                {(post.creator.name || post.creator.nickname || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Main title */}
        <h2 className="text-white font-bold text-2xl sm:text-3xl mb-4">
          {isSellable ? 'Эксклюзив!' :
           needsPay ? 'Premium!' :
           'Subscribe!'}
        </h2>

        {/* Subscribe button with price */}
        <button
          onClick={handleUnlock}
          className="mb-2 px-6 py-3 rounded-xl font-bold text-base text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transform flex items-center gap-2"
        >
          <span>
            {isSellable ? 'Купить' :
             needsPay ? 'Unlock' :
             'Subscribe to unlock'
             }
          </span>
          {/* Иконка: замочек для всех типов постов */}
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
          </svg>
          {(needsPrice || needsSub || needsUpgrade) && (finalPrice || finalPrice === 0) && (
            <span className="font-bold">
              {parseFloat(safeToFixed(finalPrice, 3))} SOL
            </span>
          )}
        </button>
        
        {/* Price in USD under button */}
        {(needsPrice || needsSub || needsUpgrade) && (finalPrice || finalPrice === 0) && solRate > 0 && (
          <div className="mb-6 text-white/70 text-sm">
            ${safeToFixed(finalPrice * solRate, 2)} USD
          </div>
        )}

        {/* Benefits list */}
        <div className="space-y-2 text-left w-full max-w-sm">
          <div className="flex items-center gap-2 text-white/90">
            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs sm:text-sm">Unlock this post</span>
          </div>
          
          <div className="flex items-center gap-2 text-white/90">
            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs sm:text-sm">
              {(needsSub || needsUpgrade) 
                ? `Access to the feed @${post.creator.nickname || post.creator.name}`
                : 'Send private messages'
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-white/90">
            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs sm:text-sm">
              {(needsSub || needsUpgrade) 
                ? 'Send private messages'
                : 'Access to this content forever'
              }
            </span>
          </div>
        </div>

        {/* Flash sale indicator */}
        {post.commerce?.flashSale && (
          <div className="mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-300 text-sm font-semibold">
              🔥 Скидка {post.commerce.flashSale.discount}%!
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 