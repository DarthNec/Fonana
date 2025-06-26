'use client'

import React from 'react'
import { UnifiedPost, PostAction, PostCardVariant } from '@/types/posts'
import { 
  needsPayment,
  needsSubscription,
  needsTierUpgrade,
  getTierInfo,
  calculatePriceWithDiscount,
  getActionButtonText
} from '@/components/posts/utils/postHelpers'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { cn } from '@/lib/utils'

export interface PostLockedProps {
  post: UnifiedPost
  onAction?: (action: PostAction) => void
  variant?: PostCardVariant
  className?: string
}

/**
 * Компонент для отображения заблокированного контента
 */
export function PostLocked({
  post,
  onAction,
  variant = 'full',
  className
}: PostLockedProps) {
  const { rate: solRate } = useSolRate()

  // Определяем тип блокировки
  const needsPay = needsPayment(post)
  const needsSub = needsSubscription(post)
  const needsUpgrade = needsTierUpgrade(post)
  const tierInfo = getTierInfo(post.access)

  // Стили для разных вариантов
  const getContainerHeight = () => {
    switch (variant) {
      case 'minimal': return 'h-48'
      case 'compact': return 'h-64'
      default: return 'h-96'
    }
  }

  const getContentPadding = () => {
    switch (variant) {
      case 'minimal': return 'p-4'
      case 'compact': return 'p-6'
      default: return 'p-8'
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
      onAction({ type: 'purchase', postId: post.id })
    } else if (needsSub || needsUpgrade) {
      onAction({ type: 'subscribe', postId: post.id })
    }
  }

  // Рассчитываем цену с учетом скидки
  const finalPrice = post.commerce?.flashSale && post.access.price
    ? calculatePriceWithDiscount(post.access.price, post.commerce.flashSale)
    : post.access.price

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
            className="w-full h-full object-cover filter blur-xl opacity-50"
          />
        ) : (
          <div className={cn(
            'w-full h-full bg-gradient-to-br',
            getGradientStyle()
          )} />
        )}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      </div>

      {/* Lock content */}
      <div className={cn(
        'relative h-full flex flex-col items-center justify-center text-center',
        getContentPadding()
      )}>
        {/* Lock icon */}
        <div className="mb-4">
          {tierInfo?.required ? (
            <div className="text-4xl sm:text-5xl">{tierInfo.required.icon}</div>
          ) : (
            <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>

        {/* Lock message */}
        <h4 className="text-white font-semibold text-lg sm:text-xl mb-2">
          {needsPay ? 'Платный контент' :
           needsUpgrade ? `Требуется ${tierInfo?.required.name} подписка` :
           needsSub ? 'Требуется подписка' :
           post.commerce?.isSellable ? 'Эксклюзивный контент' :
           'Контент недоступен'}
        </h4>

        {/* Price or tier info */}
        {needsPay && finalPrice && (
          <div className="mb-4">
            <div className="text-2xl font-bold text-white">
              {finalPrice.toFixed(2)} {post.access.currency}
            </div>
            {solRate && post.access.currency === 'SOL' && (
              <div className="text-sm text-white/70">
                ≈ ${(finalPrice * solRate).toFixed(2)} USD
              </div>
            )}
            {post.commerce?.flashSale && (
              <div className="mt-1 text-sm text-yellow-400">
                Скидка {post.commerce.flashSale.discount}%!
              </div>
            )}
          </div>
        )}

        {/* Unlock button */}
        {buttonText && (
          <button
            onClick={handleUnlock}
            className={cn(
              'px-6 py-3 rounded-xl font-medium transition-all',
              'bg-white/20 backdrop-blur-sm text-white',
              'hover:bg-white/30 hover:scale-105',
              'border border-white/30'
            )}
          >
            {buttonText}
          </button>
        )}

        {/* Additional info for tier content */}
        {tierInfo && variant === 'full' && (
          <p className="mt-3 text-sm text-white/70 max-w-xs">
            {needsUpgrade 
              ? `Обновите подписку с ${tierInfo.current?.name} до ${tierInfo.required.name}`
              : `Подпишитесь на уровень ${tierInfo.required.name} для доступа`
            }
          </p>
        )}
      </div>
    </div>
  )
} 