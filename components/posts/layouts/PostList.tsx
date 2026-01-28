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
  onPostClick?: (postIndex: number, post: UnifiedPost) => void
  className?: string
}

/**
 * Компонент для отображения постов в виде вертикального списка
 * Унифицированная версия для всех страниц (Feed, Profile, Creator)
 */
export function PostList({ 
  posts, 
  variant, 
  showCreator = true, 
  onAction,
  onPostClick,
  className 
}: PostListProps) {
  // Унифицированные стили для всех вариантов
  const containerStyles = 'space-y-0 sm:space-y-6'

  return (
    <div className={cn(className)}>
      <div className={containerStyles}>
        {posts.map((post, index) => (
          <div 
            key={post.id}
            className={onPostClick ? "cursor-pointer" : undefined}
            onClick={() => onPostClick?.(index, post)}
          >
            <PostCard
              post={post}
              variant="full"
              showCreator={showCreator}
              onAction={onAction}
            />
          </div>
        ))}
      </div>
    </div>
  )
} 