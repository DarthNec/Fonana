'use client'

import React, { useState } from 'react'
import { UnifiedPost, PostAction, PostCardVariant } from '@/types/posts'
import { PostHeader } from '../PostHeader'
import { PostContent } from '../PostContent'
import { PostActions } from '../PostActions'
import { PostTierBadge } from '../PostTierBadge'
import { PostFlashSale } from '../PostFlashSale'
import { CommentsSection } from '../CommentsSection'
import { cn } from '@/lib/utils'
import { 
  getPostCardBorderStyle, 
  getPostCardGlowStyle,
  needsPayment,
  needsSubscription,
  needsTierUpgrade,
  isActiveAuction,
  isPostSold
} from '@/components/posts/utils/postHelpers'

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
 * Адаптивный компонент, который может отображаться в разных вариантах
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
  const showTierBadge = !!post.access.tier && (needsSubscription(post) || needsTierUpgrade(post))
  const showAuctionBadge = isActiveAuction(post.commerce)
  const isSold = isPostSold(post.commerce)

  // Стили для разных вариантов
  const getCardStyles = () => {
    const baseStyles = 'relative bg-white dark:bg-slate-900 overflow-hidden transition-all duration-300'
    const borderStyles = getPostCardBorderStyle(post)
    
    switch (variant) {
      case 'full':
        return cn(
          baseStyles,
          'border-y sm:border border-gray-200 dark:border-slate-700/50',
          'rounded-none sm:rounded-3xl',
          borderStyles
        )
      case 'compact':
        return cn(
          baseStyles,
          'border border-gray-200 dark:border-slate-700/50',
          'rounded-xl sm:rounded-2xl',
          borderStyles
        )
      case 'minimal':
        return cn(
          baseStyles,
          'border border-gray-200 dark:border-slate-700/50',
          'rounded-lg',
          borderStyles
        )
      default:
        return baseStyles
    }
  }

  // Hover эффект для платного/премиум контента
  const needsUnlock = needsPayment(post) || needsSubscription(post) || needsTierUpgrade(post)
  
  return (
    <article className={cn(getCardStyles(), className)}>
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
          <div className="bg-gray-900/90 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
            ✅ Продано
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

      {/* Tier Badge */}
      {showTierBadge && !showAuctionBadge && !isSold && (
        <div className="absolute top-4 right-4 z-10">
          <PostTierBadge tier={post.access.tier!} />
        </div>
      )}

      {/* Card Content */}
      <div className={variant === 'minimal' ? 'p-3' : 'p-4 sm:p-6'}>
        {/* Header */}
        {showCreator && (
          <PostHeader 
            post={post}
            variant={variant}
            onAction={onAction}
          />
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