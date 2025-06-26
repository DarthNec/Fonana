'use client'

import React from 'react'
import Link from 'next/link'
import { PostCreator, PostCardVariant } from '@/types/posts'
import { cn } from '@/lib/utils'

export interface PostHeaderProps {
  creator: PostCreator
  createdAt: string
  variant?: PostCardVariant
  className?: string
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
  creator, 
  createdAt, 
  variant = 'full',
  className 
}: PostHeaderProps) {
  const getAvatarSize = () => {
    switch (variant) {
      case 'minimal': return 'w-8 h-8'
      case 'compact': return 'w-10 h-10'
      default: return 'w-12 h-12'
    }
  }

  const getTextSize = () => {
    switch (variant) {
      case 'minimal': return 'text-sm'
      case 'compact': return 'text-base'
      default: return 'text-base'
    }
  }

  const formattedDate = formatRelativeTime(createdAt)

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
    <div className={cn('flex items-center gap-3 mb-4', className)}>
      {/* Avatar */}
      <Link 
        href={creatorUrl} 
        onClick={handleCreatorClick}
        className="flex-shrink-0"
      >
        <div className={cn(
          'relative rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500',
          getAvatarSize()
        )}>
          {creator.avatar ? (
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-semibold">
              {creator.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          
          {/* Verified Badge */}
          {creator.isVerified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Creator Info */}
      <div className="flex-1 min-w-0">
        <Link 
          href={creatorUrl}
          onClick={handleCreatorClick}
          className={cn(
            'font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors block truncate',
            getTextSize(),
            !isValidCreatorId && 'cursor-default hover:text-gray-900 dark:hover:text-white'
          )}
        >
          {creator.name}
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-500">
          <span className="truncate">@{creator.username}</span>
          <span>•</span>
          <span className="whitespace-nowrap">{formattedDate}</span>
        </div>
      </div>

      {/* Menu Button (optional) */}
      {variant === 'full' && (
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      )}
    </div>
  )
} 