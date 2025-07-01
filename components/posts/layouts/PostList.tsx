'use client'

import React from 'react'
import { UnifiedPost, PostAction, PostPageVariant } from '@/types/posts'
import { PostCard } from '../core/PostCard'
import { cn } from '@/lib/utils'

export interface PostListProps {
  posts: UnifiedPost[]
  variant: PostPageVariant
  showCreator?: boolean
  onAction?: (action: PostAction) => void
  className?: string
}

/**
 * Компонент для отображения постов в виде вертикального списка
 * Используется в Feed, Profile, Creator pages
 */
export function PostList({ 
  posts, 
  variant, 
  showCreator = true, 
  onAction,
  className 
}: PostListProps) {
  // Определяем стили spacing для разных вариантов
  const getContainerStyles = () => {
    switch (variant) {
      case 'feed':
        return 'space-y-0 sm:space-y-6'
      case 'profile':
        return 'space-y-0 sm:space-y-6'
      case 'creator':
        return 'max-w-2xl mx-auto space-y-0 sm:space-y-6'
      default:
        return 'space-y-0 sm:space-y-6'
    }
  }

  // Определяем стили обертки для разных вариантов
  const getWrapperStyles = () => {
    // Убираем специальные стили для профиля - используем единый стиль
    return ''
  }

  const containerStyles = getContainerStyles()
  const wrapperStyles = getWrapperStyles()

  return (
    <div className={cn(wrapperStyles, className)}>
      <div className={containerStyles}>
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            variant="full"
            showCreator={showCreator}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  )
} 