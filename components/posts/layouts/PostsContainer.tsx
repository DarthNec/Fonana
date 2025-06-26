'use client'

import React from 'react'
import { UnifiedPost, PostAction, PostLayoutType, PostPageVariant } from '@/types/posts'
import { PostGrid } from './PostGrid'
import { PostList } from './PostList'
// import { PostMasonry } from './PostMasonry' // Будет добавлен позже

export interface PostsContainerProps {
  /** Массив постов для отображения */
  posts: UnifiedPost[]
  /** Тип layout (list, grid, masonry) */
  layout?: PostLayoutType
  /** Вариант страницы для стилизации */
  variant?: PostPageVariant
  /** Показывать ли информацию о создателе */
  showCreator?: boolean
  /** Callback для действий с постом */
  onAction?: (action: PostAction) => void
  /** Дополнительные CSS классы */
  className?: string
  /** Показывать ли skeleton при загрузке */
  isLoading?: boolean
  /** Сообщение при отсутствии постов */
  emptyMessage?: string
  /** Компонент для отображения при отсутствии постов */
  emptyComponent?: React.ReactNode
}

/**
 * Главный контейнер для отображения постов
 * Поддерживает различные layouts и варианты отображения
 */
export function PostsContainer({
  posts,
  layout = 'list',
  variant = 'feed',
  showCreator = true,
  onAction,
  className,
  isLoading = false,
  emptyMessage = 'No posts yet',
  emptyComponent
}: PostsContainerProps) {
  // Загрузка
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Loading posts...</p>
        </div>
      </div>
    )
  }

  // Нет постов
  if (posts.length === 0) {
    if (emptyComponent) {
      return <>{emptyComponent}</>
    }

    return (
      <div className="text-center py-20 px-4">
        <p className="text-gray-600 dark:text-slate-400 text-lg">{emptyMessage}</p>
      </div>
    )
  }

  // Выбор компонента layout
  const LayoutComponent = {
    list: PostList,
    grid: PostGrid,
    masonry: PostList // Временно используем PostList для masonry
  }[layout]

  return (
    <LayoutComponent
      posts={posts}
      variant={variant}
      showCreator={showCreator}
      onAction={onAction}
      className={className}
    />
  )
}

// Re-export layouts для удобства
export { PostGrid } from './PostGrid'
export { PostList } from './PostList' 