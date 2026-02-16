'use client'

import React, { useState, useEffect } from 'react'
import { UnifiedPost, PostAction, PostLayoutType, PostPageVariant } from '@/types/posts'
import { PostGrid } from './PostGrid'
import { PostList } from './PostList'
import { PostGallery } from './PostGallery'
import { PostNormalizer } from '@/services/posts/normalizer'
import { useRealtimePosts } from '@/lib/hooks/useRealtimePosts'
// import { PostMasonry } from './PostMasonry' // Будет добавлен позже

export interface PostsContainerProps {
  /** Массив постов для отображения */
  posts: any[] // Принимаем любые посты для нормализации
  /** Тип layout (list, grid, gallery, masonry) */
  layout?: PostLayoutType
  /** Вариант страницы для стилизации */
  variant?: PostPageVariant
  /** Показывать ли информацию о создателе */
  showCreator?: boolean
  /** Callback для действий с постом */
  onAction?: (action: PostAction) => void
  /** Callback для клика на пост (для fullscreen view) */
  onPostClick?: (postIndex: number, post: UnifiedPost) => void
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
  /** Количество колонок для gallery layout */
  columns?: number
  /** Показывать username под карточкой (для Explore) */
  showUsername?: boolean
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
  onPostClick,
  className,
  isLoading = false,
  columns = 3,
  showUsername = false,
  emptyMessage = 'No posts yet',
  emptyComponent,
  enableRealtime = true,
  showNewPostsNotification = true,
  autoUpdateFeed = false
}: PostsContainerProps) {
  const [normalizedPosts, setNormalizedPosts] = useState<UnifiedPost[]>([])
  
  // Нормализуем посты
  useEffect(() => {
    console.log(`[PostsContainer] Posts:`, posts);

    let likesData = [];
    
    if(localStorage.getItem('fonana_user_wallet') !== null) {
      const userLikesStr = localStorage.getItem('user_likes')
      if(userLikesStr && JSON.parse(userLikesStr) !== null) {
        likesData = JSON.parse(userLikesStr)
      } 
      console.log(`[FeedPageClient] User likes:`, likesData);
    }
    posts = posts.map(post => {
      const like = likesData.find((like: any) => like.postId === post.id);
      if(post.engagement) {
        if(post.engagement.isLiked) {
          post.engagement.isLiked = like ? true : false;
        }
      }
      return post;
    })

    setNormalizedPosts(posts)
    /*
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
      */
  }, [posts])
  
  // Используем real-time хук всегда, но с условной логикой внутри
  /*
  const realtimeData = useRealtimePosts({
    posts: normalizedPosts,
    showNewPostsNotification: enableRealtime ? showNewPostsNotification : false,
    autoUpdateFeed: enableRealtime ? autoUpdateFeed : false,
    // Убираем onPostsUpdate чтобы избежать бесконечного цикла
  })
  */
  // Используем посты из real-time хука если включено, иначе используем нормализованные
  const displayPosts = normalizedPosts

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
  /*
  const NewPostsNotification = enableRealtime && realtimeData.hasNewPosts ? (
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
  */
  // Выбор компонента layout
  const LayoutComponent = {
    list: PostList,
    grid: PostGrid,
    gallery: PostGallery,
    masonry: PostList // Временно используем PostList для masonry
  }[layout]

  return (
    <div className={className}>
      {/* {NewPostsNotification} */}
      <LayoutComponent
        posts={displayPosts}
        variant={variant}
        showCreator={showCreator}
        onAction={onAction}
        onPostClick={onPostClick}
        columns={layout === 'gallery' ? columns : undefined}
        showUsername={showUsername}
      />
    </div>
  )
} 