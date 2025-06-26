'use client'

import React from 'react'
import { UnifiedPost, PostAction, PostLayoutType, PostPageVariant } from '@/types/posts'
import { PostGrid } from './PostGrid'
import { PostList } from './PostList'
import { PostNormalizer } from '@/services/posts/normalizer'
// import { PostMasonry } from './PostMasonry' // Будет добавлен позже

export interface PostsContainerProps {
  /** Массив постов для отображения */
  posts: any[] // Принимаем любые посты для нормализации
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
  // Нормализуем посты если они еще не нормализованы
  let normalizedPosts: UnifiedPost[] = []
  
  try {
    // Проверяем, являются ли посты уже нормализованными
    const isNormalized = posts.length > 0 && posts[0].creator && posts[0].content && posts[0].access
    
    if (isNormalized) {
      normalizedPosts = posts as UnifiedPost[]
    } else {
      // Нормализуем посты
      normalizedPosts = PostNormalizer.normalizeMany(posts)
    }
  } catch (error) {
    console.error('PostsContainer: Error normalizing posts:', error)
    // В случае ошибки показываем пустое состояние
    normalizedPosts = []
  }

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
  if (normalizedPosts.length === 0) {
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
      posts={normalizedPosts}
      variant={variant}
      showCreator={showCreator}
      onAction={onAction}
      className={className}
    />
  )
} 