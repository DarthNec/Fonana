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

  // Фоновая подсветка по тиру
  const getTierBackgroundStyle = () => {
    if (!post.access.tier) return ''
    
    switch (post.access.tier.toLowerCase()) {
      case 'basic':
        return 'bg-blue-50/50 dark:bg-blue-900/10'
      case 'premium':
        return 'bg-purple-50/50 dark:bg-purple-900/10'
      case 'vip':
        return 'bg-yellow-50/50 dark:bg-yellow-900/10'
      default:
        return ''
    }
  }

  // Стили для разных вариантов
  const getCardStyles = () => {
    const baseStyles = 'relative overflow-hidden transition-all duration-300'
    const borderStyles = getPostCardBorderStyle(post)
    const backgroundStyles = getPostCardBackgroundStyle(post)
    const tierBackgroundStyle = getTierBackgroundStyle()
    
    switch (variant) {
      case 'full':
        return cn(
          baseStyles,
          backgroundStyles || 'bg-white dark:bg-slate-900',
          tierBackgroundStyle,
          'border-y sm:border border-gray-200 dark:border-slate-700/50',
          'rounded-none sm:rounded-3xl',
          borderStyles
        )
      case 'compact':
        return cn(
          baseStyles,
          backgroundStyles || 'bg-white dark:bg-slate-900',
          tierBackgroundStyle,
          'border border-gray-200 dark:border-slate-700/50',
          'rounded-xl sm:rounded-2xl',
          borderStyles
        )
      case 'minimal':
        return cn(
          baseStyles,
          backgroundStyles || 'bg-white dark:bg-slate-900',
          tierBackgroundStyle,
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



      {/* Card Content */}
      <div className={variant === 'minimal' ? 'p-3' : 'p-3 sm:p-6'}>
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