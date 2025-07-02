'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { UnifiedPost, PostAction, PostCardVariant } from '@/types/posts'
import { PostLocked } from '../PostLocked'
import { TierBadge } from '../TierBadge'
import { 
  needsPayment, 
  needsSubscription, 
  needsTierUpgrade,
  isPostSold 
} from '@/components/posts/utils/postHelpers'
import { cn } from '@/lib/utils'

export interface PostContentProps {
  post: UnifiedPost
  variant?: PostCardVariant
  onAction?: (action: PostAction) => void
  className?: string
}

/**
 * Компонент для отображения контента поста
 */
export function PostContent({
  post,
  variant = 'full',
  onAction,
  className
}: PostContentProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Проверяем, нужно ли скрывать контент
  // Автор всегда видит свой контент
  const shouldHideContent = post.access.isCreatorPost ? false : (
    post.access.shouldHideContent || 
    (post.access.isLocked && !post.access.isPurchased && !post.access.isSubscribed)
  )
  
  const isLocked = post.access.isCreatorPost ? false : (
    needsPayment(post) || needsSubscription(post) || needsTierUpgrade(post)
  )
  const isSold = isPostSold(post.commerce)

  // Размеры текста для разных вариантов
  const getTitleSize = () => {
    switch (variant) {
      case 'minimal': return 'text-base'
      case 'compact': return 'text-lg'
      default: return 'text-xl sm:text-2xl'
    }
  }

  const getContentSize = () => {
    switch (variant) {
      case 'minimal': return 'text-sm'
      case 'compact': return 'text-sm'
      default: return 'text-base'
    }
  }

  // Aspect ratio классы
  const getAspectRatioClass = () => {
    switch (post.media.aspectRatio) {
      case 'vertical': return 'aspect-3/4'
      case 'square': return 'aspect-square'
      case 'horizontal': return 'aspect-video'
      default: return 'aspect-video'
    }
  }

  const handleClick = () => {
    if (onAction) {
      // Открываем пост в отдельной странице
      window.location.href = `/post/${post.id}`
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Title */}
      <h3 className={cn(
        'font-bold text-gray-900 dark:text-white',
        getTitleSize(),
        variant !== 'full' && 'line-clamp-2'
      )}>
        {post.content.title}
      </h3>

      {/* Media Content */}
      {post.media.url && (
        <div className="relative">
          {shouldHideContent || isLocked ? (
            <PostLocked
              post={post}
              onAction={onAction}
              variant={variant}
            />
          ) : (
            <div 
              className={cn(
                'relative overflow-hidden rounded-xl sm:rounded-2xl cursor-pointer',
                'bg-gray-100 dark:bg-slate-800',
                getAspectRatioClass()
              )}
              onClick={handleClick}
            >
              {/* Media based on type */}
              {post.media.type === 'image' && (
                <>
                  {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                  )}
                  <img
                    src={post.media.url}
                    alt={post.content.title}
                    className={cn(
                      'w-full h-full object-cover transition-opacity duration-300',
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                  />
                  {imageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-slate-800">
                      <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </>
              )}

              {post.media.type === 'video' && (
                <video
                  src={post.media.url}
                  poster={post.media.thumbnail}
                  className="w-full h-full object-cover"
                  controls={false}
                  muted
                  playsInline
                />
              )}

              {post.media.type === 'audio' && (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-500 to-pink-500">
                  <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              )}

              {/* Play button overlay for video */}
              {post.media.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 bg-black/70 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Sold overlay */}
              {isSold && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-2xl font-bold">ПРОДАНО</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Text Content */}
      {!shouldHideContent && post.content.text && (
        <p className={cn(
          'text-gray-700 dark:text-slate-300',
          getContentSize(),
          variant !== 'full' && 'line-clamp-3'
        )}>
          {post.content.text}
        </p>
      )}

      {/* Category & Tags & Tier */}
      {variant === 'full' && (post.content.category || post.content.tags.length > 0 || post.access.tier) && (
        <div className="flex flex-wrap items-center gap-2">
          {post.content.category && (
            <Link
              href={`/category/${post.content.category.toLowerCase()}`}
              className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              {post.content.category}
            </Link>
          )}
          {post.content.tags.map(tag => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-full text-xs"
            >
              #{tag}
            </span>
          ))}
          {/* Tier Badge */}
          <TierBadge tier={post.access.tier} />
        </div>
      )}
    </div>
  )
} 