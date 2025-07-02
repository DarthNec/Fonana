'use client'

import { useState, useEffect } from 'react'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import { useOptimizedRealtimePosts } from '@/lib/hooks/useOptimizedRealtimePosts'
import { useInView } from 'react-intersection-observer'
import { useUserContext } from '@/lib/contexts/UserContext'
import { UnifiedPost } from '@/types/posts'
import toast from 'react-hot-toast'

export default function OptimizedFeedTestPage() {
  const { user } = useUserContext()
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [showRealtimeUpdates, setShowRealtimeUpdates] = useState(true)
  const [autoLoadNewPosts, setAutoLoadNewPosts] = useState(false)
  
  // Используем оптимизированный хук
  const {
    posts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    handleAction
  } = useOptimizedPosts({
    variant: 'feed',
    category: selectedCategory,
    pageSize: 10,
    enableCache: true
  })
  
  // Real-time обновления с оптимизациями
  const {
    posts: realtimePosts,
    newPostsCount,
    hasNewPosts,
    loadPendingPosts
  } = useOptimizedRealtimePosts({
    posts,
    showNewPostsNotification: showRealtimeUpdates,
    autoUpdateFeed: autoLoadNewPosts,
    maxPendingPosts: 20,
    batchUpdateDelay: 100
  })
  
  // Infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px'
  })
  
  // Автозагрузка при скролле
  useEffect(() => {
    if (inView && hasMore && !isLoadingMore) {
      console.log('[OptimizedFeed] Loading more posts...')
      loadMore()
    }
  }, [inView, hasMore, isLoadingMore, loadMore])
  
  // Метрики производительности
  const [metrics, setMetrics] = useState({
    totalPosts: 0,
    loadTime: 0,
    cacheHits: 0,
    networkRequests: 0
  })
  
  // Обновление метрик
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      totalPosts: realtimePosts.length
    }))
  }, [realtimePosts.length])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Optimized Feed Test Page
        </h1>
        
        {/* Metrics Dashboard */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Performance Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {metrics.totalPosts}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">
                Total Posts
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {newPostsCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">
                Pending Posts
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {hasMore ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">
                Has More
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {isLoading ? 'Loading...' : 'Ready'}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">
                Status
              </div>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Test Controls
          </h2>
          <div className="space-y-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Category Filter
              </label>
              <select
                value={selectedCategory || 'All'}
                onChange={(e) => {
                  const value = e.target.value === 'All' ? undefined : e.target.value
                  setSelectedCategory(value)
                  refresh(true) // Clear cache on category change
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="All">All Categories</option>
                <option value="Art">Art</option>
                <option value="Music">Music</option>
                <option value="Gaming">Gaming</option>
                <option value="Tech">Tech</option>
              </select>
            </div>
            
            {/* Toggles */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showRealtimeUpdates}
                  onChange={(e) => setShowRealtimeUpdates(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">
                  Show Realtime Notifications
                </span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoLoadNewPosts}
                  onChange={(e) => setAutoLoadNewPosts(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">
                  Auto-load New Posts
                </span>
              </label>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => refresh(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Refresh (Keep Cache)
              </button>
              <button
                onClick={() => refresh(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Refresh (Clear Cache)
              </button>
              <button
                onClick={loadMore}
                disabled={!hasMore || isLoadingMore}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Load More
              </button>
              {hasNewPosts && (
                <button
                  onClick={loadPendingPosts}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors animate-pulse"
                >
                  Load {newPostsCount} New Posts
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            <strong>Error:</strong> {error.message}
          </div>
        )}
        
        {/* Posts List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Posts Feed ({realtimePosts.length} posts)
          </h2>
          
          {isLoading && realtimePosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-slate-400">Loading posts...</p>
            </div>
          ) : realtimePosts.length === 0 ? (
            <div className="text-center py-12 text-gray-600 dark:text-slate-400">
              No posts found. Try changing the category filter.
            </div>
          ) : (
            <div className="space-y-4">
              {realtimePosts.map((post: UnifiedPost) => (
                <div
                  key={post.id}
                  className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {post.content.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        by {post.creator.username} • {post.content.category}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">
                      {new Date(post.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 dark:text-slate-300 mb-3 line-clamp-2">
                    {post.content.text}
                  </p>
                  
                  <div className="flex gap-4 text-sm">
                    <button
                      onClick={() => handleAction({ type: 'like', postId: post.id })}
                      className={`flex items-center gap-1 ${
                        post.engagement.isLiked
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400'
                      }`}
                    >
                      <svg className="w-4 h-4" fill={post.engagement.isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {post.engagement.likes}
                    </button>
                    
                    <span className="text-gray-600 dark:text-slate-400">
                      💬 {post.engagement.comments}
                    </span>
                    
                    <span className="text-gray-600 dark:text-slate-400">
                      👁 {post.engagement.views}
                    </span>
                    
                    {post.access.isLocked && (
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        🔒 {post?.access?.tier || 'Paid'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="py-4">
                {isLoadingMore && (
                  <div className="text-center">
                    <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600 dark:text-slate-400 text-sm">Loading more posts...</p>
                  </div>
                )}
                {!hasMore && realtimePosts.length > 0 && (
                  <div className="text-center text-gray-500 dark:text-slate-500 text-sm">
                    You've reached the end of the feed
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 