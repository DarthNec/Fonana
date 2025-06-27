'use client'

import { useState, useEffect } from 'react'
import { PostsContainer, PostsContainerProps } from './PostsContainer'
import { useRealtimePosts } from '@/lib/hooks/useRealtimePosts'
import { PostNormalizer } from '@/services/posts/normalizer'

interface RealtimePostsContainerProps extends PostsContainerProps {
  enableRealtime?: boolean
  autoUpdateFeed?: boolean
  showNewPostsNotification?: boolean
}

export function RealtimePostsContainer({
  posts: initialPosts,
  enableRealtime = true,
  autoUpdateFeed = false,
  showNewPostsNotification = true,
  ...restProps
}: RealtimePostsContainerProps) {
  // Нормализуем посты
  const normalizedPosts = initialPosts.map(post => 
    PostNormalizer.normalize(post)
  ).filter(Boolean)

  const [posts, setPosts] = useState(normalizedPosts)

  // Real-time обновления
  const {
    posts: realtimePosts,
    newPostsCount,
    hasNewPosts,
    loadPendingPosts
  } = useRealtimePosts({
    posts: posts,
    onPostsUpdate: enableRealtime ? setPosts : undefined,
    showNewPostsNotification: enableRealtime && showNewPostsNotification && !autoUpdateFeed,
    autoUpdateFeed: enableRealtime && autoUpdateFeed
  })

  // Обновляем локальное состояние при изменении пропсов
  useEffect(() => {
    const normalized = initialPosts.map(post => 
      PostNormalizer.normalize(post)
    ).filter(Boolean)
    setPosts(normalized)
  }, [initialPosts])

  // Используем real-time посты если включены
  const displayPosts = enableRealtime ? realtimePosts : posts

  // Баннер для новых постов
  const NewPostsBanner = () => {
    if (!hasNewPosts || autoUpdateFeed || !enableRealtime) return null

    return (
      <div className="sticky top-20 z-10 mb-4">
        <button
          onClick={loadPendingPosts}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-6 rounded-lg font-medium shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 group"
        >
          <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>
            Показать {newPostsCount} {newPostsCount === 1 ? 'новый пост' : 'новых постов'}
          </span>
          <div className="absolute top-0 right-4 -mt-1 -mr-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
            </span>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div>
      <NewPostsBanner />
      <PostsContainer
        posts={displayPosts}
        {...restProps}
      />
    </div>
  )
} 