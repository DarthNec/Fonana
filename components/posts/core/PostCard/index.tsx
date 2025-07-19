'use client'

import React, { useState } from 'react'
import { UnifiedPost, PostAction, PostCardVariant } from '@/types/posts'
import { PostHeader } from '../PostHeader'
import { PostContent } from '../PostContent'
import { PostActions } from '../PostActions'
import { PostTierBadge } from '../PostTierBadge'
import { PostFlashSale } from '../PostFlashSale'
import { CommentsSection } from '../CommentsSection'
import { PostMenu } from '../PostMenu'
import { cn } from '@/lib/utils'
import { 
  getPostCardBorderStyle, 
  getPostCardGlowStyle,
  getPostCardBackgroundStyle,
  needsPayment,
  needsSubscription,
  needsTierUpgrade,
  isActiveAuction,
  isPostSold
} from '@/components/posts/utils/postHelpers'
// [content_access_system_2025_017] Добавляем импорты для визуальной системы
import { TIER_VISUAL_DETAILS, TIER_BLUR_STYLES, TIER_DIM_STYLES, SPECIAL_CONTENT_STYLES } from '@/lib/constants/tier-styles'
import { getPostAccessType, PostAccessType } from '@/types/posts/access'
import { normalizeTierName } from '@/lib/utils/access'
import { SparklesIcon, LockClosedIcon } from '@heroicons/react/24/solid'

export interface PostCardProps {
  /** Данные поста */
  post: UnifiedPost
  /** Вариант отображения */
  variant?: PostCardVariant
  /** Показывать ли информацию о создателе */
  showCreator?: boolean
  /** Callback для действий */
  onAction?: (action: PostAction) => void
  /** Дополнительные классы */
  className?: string
}

/**
 * Главный компонент карточки поста
 * [content_access_system_2025_017] Расширен для полной визуальной системы
 */
export function PostCard({
  post,
  variant = 'full',
  showCreator = true,
  onAction,
  className
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false)

  // Обработка действий с добавлением поддержки комментариев
  const handleAction = (action: PostAction) => {
    if (action.type === 'comment') {
      // Переключаем видимость комментариев
      setShowComments(!showComments)
    } else if (onAction) {
      onAction(action)
    }
  }

  // Определяем, нужно ли показывать различные элементы
  const showFlashSale = !!post.commerce?.flashSale && !isPostSold(post.commerce)
  const showTierBadge = !!post?.access?.tier && (needsSubscription(post) || needsTierUpgrade(post))
  const showAuctionBadge = isActiveAuction(post.commerce)
  const isSold = isPostSold(post.commerce)

  // [content_access_system_2025_017] Определяем визуальные параметры
  const accessType = getPostAccessType({
    isLocked: post.access?.isLocked,
    minSubscriptionTier: post.access?.tier,
    price: post.access?.price,
    isSellable: post.commerce?.isSellable
  })
  const shouldBlur = post.access?.shouldBlur || false
  const shouldDim = post.access?.shouldDim || false // [tier_access_visual_fix_2025_017]
  const upgradePrompt = post.access?.upgradePrompt
  const requiredTier = normalizeTierName(post.access?.requiredTier || post.access?.tier)

  // [content_access_system_2025_017] Расширенные стили для 6 типов контента
  const getTierCardStyles = () => {
    const baseStyles = 'relative overflow-hidden transition-all duration-300'
    
    // Определяем визуальный стиль на основе типа доступа
    let visualStyle = null
    
    // Специальные стили для платных и продаваемых постов
    if (post.access?.price && !post.commerce?.isSellable) {
      visualStyle = SPECIAL_CONTENT_STYLES.paid
    } else if (post.commerce?.isSellable) {
      visualStyle = isSold ? SPECIAL_CONTENT_STYLES.sold : SPECIAL_CONTENT_STYLES.sellable
    } else if (requiredTier) {
      visualStyle = TIER_VISUAL_DETAILS[requiredTier]
    }
    
    // Применяем стили
    const borderClasses = visualStyle ? `border-2 ${visualStyle.border}` : 'border border-gray-200 dark:border-slate-700/50'
    const backgroundClasses = visualStyle ? `bg-gradient-to-br ${visualStyle.gradient}` : 'bg-white dark:bg-slate-900'
    
    switch (variant) {
      case 'full':
        return cn(
          baseStyles,
          backgroundClasses,
          borderClasses,
          'rounded-none sm:rounded-3xl',
          'hover:shadow-lg transition-shadow'
        )
      case 'compact':
        return cn(
          baseStyles,
          backgroundClasses,
          borderClasses,
          'rounded-xl sm:rounded-2xl',
          'hover:shadow-md transition-shadow'
        )
      case 'minimal':
        return cn(
          baseStyles,
          backgroundClasses,
          borderClasses,
          'rounded-lg',
          'hover:shadow-sm transition-shadow'
        )
      default:
        return baseStyles
    }
  }

  // Hover эффект для платного/премиум контента
  const needsUnlock = needsPayment(post) || needsSubscription(post) || needsTierUpgrade(post)
  
  return (
    <article className={cn(
      getTierCardStyles(), 
      className,
      shouldDim ? TIER_DIM_STYLES.content : '' // [tier_access_visual_fix_2025_017] Применяем dim к всей карточке
    )}>
      {/* Hover Glow Effect */}
      {needsUnlock && (
        <div className={cn(
          'absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none',
          getPostCardGlowStyle(post)
        )} />
      )}

      {/* Flash Sale Banner */}
      {showFlashSale && post.commerce?.flashSale && (
        <PostFlashSale flashSale={post.commerce.flashSale} />
      )}

      {/* Sold Badge */}
      {isSold && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-green-900/90 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm flex items-center gap-1.5">
            {SPECIAL_CONTENT_STYLES.sold.icon} SOLD
          </div>
        </div>
      )}

      {/* Auction Badge */}
      {showAuctionBadge && !isSold && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-orange-500/90 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm animate-pulse">
            🔥 Аукцион
          </div>
        </div>
      )}

      {/* [content_access_system_2025_017] Tier Badge для всех типов - УБРАНО дублирование */}
      {/* Убираем верхний badge, используем только нижний в PostContent */}
      {false && requiredTier && !post.access?.hasAccess && !isSold && (
        <div className="absolute top-4 left-4 z-10">
          <PostTierBadge tier={requiredTier || 'basic'} size="sm" />
        </div>
      )}

      {/* Card Content */}
      <div className={cn(
        variant === 'minimal' ? 'p-3' : 'p-3 sm:p-6',
        shouldBlur ? TIER_BLUR_STYLES.content : ''
        // [tier_access_visual_fix_2025_017] Dim стили теперь применены к всей карточке
      )}>
          {/* Header */}
          {showCreator && (
            <PostHeader 
              post={post}
              variant={variant}
              onAction={onAction}
            />
          )}

          {/* Post Menu for own posts - show when not showing creator header */}
          {!showCreator && (
            <div className="flex justify-end mb-4">
              <PostMenu 
              post={post}
              onAction={onAction}
            />
          </div>
        )}

        {/* Content */}
        <PostContent 
          post={post}
          variant={variant}
          onAction={onAction}
        />

        {/* Actions */}
        {variant !== 'minimal' && (
          <PostActions
            post={post}
            onAction={handleAction}
            variant={variant}
          />
        )}
      </div>

      {/* [content_access_system_2025_017] Blur Overlay с Upgrade Prompt */}
      {shouldBlur && upgradePrompt && (
        <div className={cn(TIER_BLUR_STYLES.overlay, 'z-20')}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm mx-4 text-center">
            {/* Tier Icon */}
            {requiredTier && TIER_VISUAL_DETAILS[requiredTier] && (
              <div className="text-5xl mb-4">
                {TIER_VISUAL_DETAILS[requiredTier].icon}
              </div>
            )}
            
            {/* Lock Icon for paid content */}
            {accessType === PostAccessType.PAID && (
              <LockClosedIcon className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            )}
            
            {/* Upgrade Message */}
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              {upgradePrompt}
            </h3>
            
            {/* CTA Button */}
            {onAction && (
              <button
                onClick={() => onAction({ 
                  type: needsPayment(post) ? 'purchase' : 'subscribe', 
                  postId: post.id 
                })}
                className={cn(
                  'mt-4 px-6 py-3 rounded-full font-medium transition-all',
                  'transform hover:scale-105 active:scale-95',
                  requiredTier && TIER_VISUAL_DETAILS[requiredTier]
                    ? `bg-gradient-to-r ${TIER_VISUAL_DETAILS[requiredTier].gradient} ${TIER_VISUAL_DETAILS[requiredTier].text}`
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                )}
              >
                <SparklesIcon className="w-5 h-5 inline mr-2" />
                {needsPayment(post) ? 'Purchase Now' : `Upgrade to ${requiredTier?.toUpperCase() || 'Subscribe'}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Секция комментариев */}
      {showComments && (
        <CommentsSection
          postId={post.id}
          onClose={() => setShowComments(false)}
          className="animate-fade-in"
        />
      )}
    </article>
  )
} 