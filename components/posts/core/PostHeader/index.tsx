'use client'

import React from 'react'
import Link from 'next/link'
import { PostCreator, PostCardVariant, UnifiedPost, PostAction } from '@/types/posts'
import { cn } from '@/lib/utils'
import { PostMenu } from '../PostMenu'
import Avatar from '@/components/Avatar'

export interface PostHeaderProps {
  post: UnifiedPost
  variant?: PostCardVariant
  className?: string
  onAction?: (action: PostAction) => void
  overlay?: boolean // Для Instagram-style на темном фоне
}

/**
 * Простая функция для форматирования даты
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин. назад`
  if (hours < 24) return `${hours} ч. назад`
  if (days < 7) return `${days} дн. назад`
  
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Заголовок поста с информацией о создателе
 */
export function PostHeader({ 
  post,
  variant = 'full',
  className,
  onAction,
  overlay = false
}: PostHeaderProps) {
  const { creator, createdAt } = post
  const getAvatarSize = () => {
    switch (variant) {
      case 'minimal': return 'w-7 h-7 sm:w-8 sm:h-8'
      case 'compact': return 'w-8 h-8 sm:w-10 sm:h-10'
      default: return 'w-9 h-9 sm:w-11 sm:h-11'
    }
  }

  const getAvatarPixelSize = () => {
    switch (variant) {
      case 'minimal': return 30
      case 'compact': return 36
      default: return 40
    }
  }

  const getTextSize = () => {
    switch (variant) {
      case 'minimal': return 'text-xs sm:text-sm'
      case 'compact': return 'text-sm sm:text-base'
      default: return 'text-sm sm:text-base'
    }
  }

  const formattedDate = formatRelativeTime(createdAt)
  
  // Стили для overlay режима (поверх темного фона)
  const getNameStyles = () => {
    return overlay 
      ? 'font-semibold text-white hover:text-gray-200 transition-colors block truncate drop-shadow-lg'
      : cn(
          'font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors block truncate',
          getTextSize(),
          !isValidCreatorId && 'cursor-default hover:text-gray-900 dark:hover:text-white'
        )
  }
  
  const getMetaStyles = () => {
    return overlay
      ? 'flex items-center gap-2 text-[10px] sm:text-xs text-white/90 drop-shadow-md'
      : 'flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-slate-500'
  }

  // Проверяем валидность creator.id для навигации
  const isValidCreatorId = creator.id && creator.id !== 'unknown'
  const creatorUrl = isValidCreatorId ? `/creator/${creator.id}` : '#'

  const handleCreatorClick = (e: React.MouseEvent) => {
    if (!isValidCreatorId) {
      e.preventDefault()
      console.warn('PostHeader: Invalid creator ID, navigation prevented')
    }
  }

  return (
    <div className={cn('flex items-center  gap-3 mb-4', className)}>
      {/* Avatar */}
      <Link 
        href={creatorUrl} 
        onClick={handleCreatorClick}
        className="flex-shrink-0"
      >
        <div className="relative">
          <Avatar
            src={creator.avatar}
            alt={creator.name || 'User'}
            seed={creator.username || creator.id}
            size={getAvatarPixelSize()}
            rounded="full"
            className={cn(
              overlay && 'ring-2 ring-white shadow-lg' // Белая обводка для overlay режима
            )}
          />
          
          {/* Verified Badge */}
          {creator.isVerified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Creator Info - Mobile */}
      <div className="flex-1 min-w-0 flex flex-col gap-0 sm:hidden">
        <div className="flex items-center gap-2 leading-none">
          <Link 
            href={creatorUrl}
            onClick={handleCreatorClick}
            className={cn(getNameStyles(), getTextSize(), 'leading-none')}
          >
            {creator.name}
          </Link>
          {post.content.category && (
            <span className="text-[9px] px-1.5 py-0.5= rounded-full font-medium whitespace-nowrap mb-7 bg-white/20 text-white dark:bg-white/20 dark:text-white">
              {post.content.category}
            </span>
          )}
        </div>
        <div className={cn(getMetaStyles(), 'leading-none mt-0')} style={{ marginTop: '-20px' }}>
          <span className="truncate">@{creator.username}</span>
          <span>•</span>
          <span className="whitespace-nowrap">{formattedDate}</span>
        </div>
      </div>

      {/* Creator Info - Desktop */}
      <div className="flex-1 min-w-0 hidden sm:block">
        <div className="flex items-center gap-2">
          <Link 
            href={creatorUrl}
            onClick={handleCreatorClick}
            className={cn(getNameStyles(), getTextSize())}
          >
            {creator.name}
          </Link>
          {post.content.category && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap bg-white/20 text-white dark:bg-white/20 dark:text-white">
              {post.content.category}
            </span>
          )}
        </div>
        <div className={cn(getMetaStyles(), 'mt-1')}>
          <span className="truncate">@{creator.username}</span>
          <span>•</span>
          <span className="whitespace-nowrap">{formattedDate}</span>
        </div>
      </div>

      {/* Post Menu */}
      <PostMenu 
        post={post}
        onAction={onAction}
        overlay={overlay}
      />
    </div>
  )
} 