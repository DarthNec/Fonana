'use client'

import React, { useState, useEffect } from 'react'
import { UnifiedPost, PostAction, PostLayoutType, PostPageVariant } from '@/types/posts'
import { PostGrid } from './PostGrid'
import { PostList } from './PostList'
import { PostNormalizer } from '@/services/posts/normalizer'
import { useRealtimePosts } from '@/lib/hooks/useRealtimePosts'
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
  /** Включить real-time обновления */
  enableRealtime?: boolean
  /** Показывать уведомления о новых постах */
  showNewPostsNotification?: boolean
  /** Автоматически обновлять ленту */
  autoUpdateFeed?: boolean
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
  emptyComponent,
  enableRealtime = true,
  showNewPostsNotification = true,
  autoUpdateFeed = false
}: PostsContainerProps) {
  const [normalizedPosts, setNormalizedPosts] = useState<UnifiedPost[]>([])
  
  // Нормализуем посты
  useEffect(() => {
    try {
      // Проверяем, являются ли посты уже нормализованными
      const isNormalized = posts.length > 0 && posts[0].creator && posts[0].content && posts[0].access
      
      if (isNormalized) {
        setNormalizedPosts(posts as UnifiedPost[])
      } else {
        // Нормализуем посты
        setNormalizedPosts(PostNormalizer.normalizeMany(posts))
      }
    } catch (error) {
      console.error('PostsContainer: Error normalizing posts:', error)
      setNormalizedPosts([])
    }
  }, [posts])
  
  // Используем real-time хук если включено
  const realtimeData = enableRealtime ? useRealtimePosts({
    posts: normalizedPosts,
    showNewPostsNotification,
    autoUpdateFeed,
    // Убираем onPostsUpdate чтобы избежать бесконечного цикла
  }) : null
  
  // Используем посты из real-time хука если доступны
  const displayPosts = realtimeData?.posts || normalizedPosts

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
  if (displayPosts.length === 0) {
    if (emptyComponent) {
      return <>{emptyComponent}</>
    }

    return (
      <div className="text-center py-20 px-4">
        <p className="text-gray-600 dark:text-slate-400 text-lg">{emptyMessage}</p>
      </div>
    )
  }

  // Компонент для уведомления о новых постах
  const NewPostsNotification = realtimeData && realtimeData.hasNewPosts ? (
    <div className="sticky top-20 z-40 mb-4">
      <button
        onClick={realtimeData.loadPendingPosts}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{realtimeData.newPostsCount} new {realtimeData.newPostsCount === 1 ? 'post' : 'posts'} available</span>
      </button>
    </div>
  ) : null

  // Выбор компонента layout
  const LayoutComponent = {
    list: PostList,
    grid: PostGrid,
    masonry: PostList // Временно используем PostList для masonry
  }[layout]

  return (
    <div className={className}>
      {NewPostsNotification}
      <LayoutComponent
        posts={displayPosts}
        variant={variant}
        showCreator={showCreator}
        onAction={onAction}
      />
    </div>
  )
} 