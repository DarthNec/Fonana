'use client'

import React from 'react'
import { UnifiedPost, PostAction, PostPageVariant } from '@/types/posts'
import { PostCard } from '../core/PostCard'
import { cn } from '@/lib/utils'

export interface PostGridProps {
  posts: UnifiedPost[]
  variant: PostPageVariant
  showCreator?: boolean
  onAction?: (action: PostAction) => void
  className?: string
}

/**
 * Компонент для отображения постов в виде сетки
 * Используется в Dashboard и Search
 */
export function PostGrid({ 
  posts, 
  variant, 
  showCreator = true, 
  onAction,
  className 
}: PostGridProps) {
  // Определяем количество колонок для разных вариантов
  const gridColumns = {
    search: 'sm:grid-cols-2 lg:grid-cols-3',
    dashboard: 'sm:grid-cols-2 lg:grid-cols-3',
    feed: 'sm:grid-cols-2',
    profile: 'sm:grid-cols-2 lg:grid-cols-3',
    creator: 'sm:grid-cols-2'
  }

  return (
    <div className={cn(
      'grid gap-4 sm:gap-6',
      gridColumns[variant] || 'sm:grid-cols-2 lg:grid-cols-3',
      className
    )}>
      {posts.map(post => (
        <div key={post.id} className="transition-all duration-300 hover:transform hover:scale-[1.02]">
          <PostCard
            post={post}
            variant="compact"
            showCreator={showCreator}
            onAction={onAction}
          />
        </div>
      ))}
    </div>
  )
} 