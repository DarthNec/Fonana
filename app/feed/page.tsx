'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useUserContext } from '@/lib/contexts/UserContext'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import { useOptimizedRealtimePosts } from '@/lib/hooks/useOptimizedRealtimePosts'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { UnifiedPost, PostAction } from '@/types/posts'
import CreatePostModal from '@/components/CreatePostModal'
import SubscribeModal from '@/components/SubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import EditPostModal from '@/components/EditPostModal'
import SellablePostModal from '@/components/SellablePostModal'
import FloatingActionButton from '@/components/ui/FloatingActionButton'
import { hasAccessToTier } from '@/lib/utils/access'
import { 
  SparklesIcon, 
  FireIcon, 
  ClockIcon, 
  UsersIcon,
  FunnelIcon,
  PlusIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ArrowTrendingUpIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

import { useInView } from 'react-intersection-observer'

const categories = [
  'All', 'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 
  'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 
  'Blockchain', 'Intimate', 'Education', 'Comedy'
]

const sortOptions = [
  { value: 'latest', label: 'Latest', icon: ClockIcon },
  { value: 'popular', label: 'Popular', icon: FireIcon },
  { value: 'trending', label: 'Trending', icon: ArrowTrendingUpIcon },
  { value: 'subscribed', label: 'Following', icon: UsersIcon }
]

export default function RevampedFeedPage() {
  const { user, isLoading: userLoading } = useUserContext()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('latest')
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  
  // Модалки
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSellableModal, setShowSellableModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)

  // Quick create menu для мобильных
  const [showQuickCreate, setShowQuickCreate] = useState(false)

  // Оптимизированная загрузка постов с пагинацией
  const {
    posts,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    refresh,
    handleAction
  } = useOptimizedPosts({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    variant: 'feed',
    pageSize: 20
  })

  // Real-time обновления
  const {
    posts: realtimePosts,
    newPostsCount,
    hasNewPosts,
    loadPendingPosts
  } = useOptimizedRealtimePosts({
    posts
  })

  // Infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px'
  })

  useEffect(() => {
    if (inView && hasMore && !isLoadingMore) {
      loadMore()
    }
  }, [inView, hasMore, isLoadingMore, loadMore])

  // Фильтрация и сортировка
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = [...realtimePosts]

    // Фильтр по подпискам - пока пропускаем, так как subscriptions не доступны в User типе
    // TODO: Добавить поддержку фильтрации по подпискам когда будет доступно

    // Сортировка
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.engagement.likes + b.engagement.comments) - (a.engagement.likes + a.engagement.comments))
        break
      case 'trending':
        // Trending = likes + comments в последние 24 часа
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        filtered = filtered.filter(post => new Date(post.createdAt) > dayAgo)
        filtered.sort((a, b) => (b.engagement.likes + b.engagement.comments) - (a.engagement.likes + a.engagement.comments))
        break
      default:
        // latest - уже отсортировано по дате
        break
    }

    return filtered
  }, [realtimePosts, sortBy])

  // Обработка действий с постами
  const handlePostAction = useCallback((action: PostAction) => {
    const post = filteredAndSortedPosts.find(p => p.id === action.postId)
    if (!post) return

    switch (action.type) {
      case 'subscribe':
        setSelectedCreator(post.creator)
        setShowSubscribeModal(true)
        break
      case 'purchase':
        setSelectedPost(post)
        setShowPurchaseModal(true)
        break
      case 'edit':
        setSelectedPost(post)
        setShowEditModal(true)
        break
      case 'bid':
        setSelectedPost(post)
        setShowSellableModal(true)
        break
      case 'like':
      case 'unlike':
        // Обрабатываем через handleAction от useOptimizedPosts
        handleAction(action)
        break
    }
  }, [filteredAndSortedPosts, handleAction])

  // Quick create content types
  const quickCreateOptions = [
    { type: 'image', label: 'Photo', icon: PhotoIcon, color: 'from-green-500 to-emerald-500' },
    { type: 'video', label: 'Video', icon: VideoCameraIcon, color: 'from-purple-500 to-pink-500' },
    { type: 'text', label: 'Text', icon: DocumentTextIcon, color: 'from-blue-500 to-cyan-500' }
  ]

  // Обработка создания поста
  const handlePostCreated = () => {
    setShowCreateModal(false)
    setShowQuickCreate(false)
    toast.success('Пост успешно создан!')
    refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="container mx-auto px-0 sm:px-4 pt-16 sm:pt-20 pb-20 max-w-4xl">
        {/* Header с улучшенной мобильной версией */}
        <div className="sticky top-16 sm:top-20 z-30 bg-gray-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">
          {/* Categories - горизонтальный скролл на мобильных */}
          <div className="relative">
            <div 
              ref={categoryScrollRef}
              className="flex gap-2 px-4 pb-3 pt-3 overflow-x-auto scrollbar-hide scroll-smooth"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all
                    ${selectedCategory === category
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  {category}
                </button>
              ))}
            </div>
            
            {/* Gradient для индикации скролла */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 dark:from-slate-950 to-transparent pointer-events-none" />
          </div>

          {/* Sort options - упрощенная версия */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${sortBy === option.value
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }
                `}
              >
                <option.icon className="w-4 h-4" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* New Posts Notification - улучшенный дизайн */}
        {hasNewPosts && (
          <div className="sticky top-48 z-40 px-4 mb-4">
            <button
              onClick={loadPendingPosts}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{newPostsCount} {newPostsCount === 1 ? 'новый пост' : 'новых постов'}</span>
            </button>
          </div>
        )}

        {/* Posts Container с улучшенной мобильной версией */}
        <PostsContainer
          posts={filteredAndSortedPosts}
          layout="list"
          variant="feed"
          showCreator={true}
          onAction={handlePostAction}
          isLoading={isLoading}
          enableRealtime={false} // Мы уже используем real-time хук
          emptyComponent={
            <div className="text-center py-20 px-4">
              <SparklesIcon className="w-16 h-16 text-gray-400 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-slate-300 mb-2">Нет постов</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6">Будьте первым, кто создаст контент!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300"
              >
                <PlusIcon className="w-5 h-5" />
                Создать первый пост
              </button>
            </div>
          }
        />

        {/* Infinite scroll trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {isLoadingMore ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <span className="text-gray-600 dark:text-slate-400">Загружаем посты...</span>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-slate-500 text-sm">
                Прокрутите для загрузки
              </div>
            )}
          </div>
        )}

        {/* End of feed */}
        {!hasMore && filteredAndSortedPosts.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-slate-500">
              Вы просмотрели все посты ✨
            </p>
          </div>
        )}
      </div>

      {/* Floating Action Button с улучшенным поведением */}
      <FloatingActionButton
        onClick={() => setShowQuickCreate(true)}
        label="Создать пост"
        hideOnScroll={true}
        offset={{ bottom: 80, right: 20 }}
      />

      {/* Quick Create Menu для мобильных */}
      {showQuickCreate && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowQuickCreate(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 pb-8 sm:pb-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Создать контент
              </h3>
              <button
                onClick={() => setShowQuickCreate(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {quickCreateOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => {
                    setShowQuickCreate(false)
                    setShowCreateModal(true)
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all group"
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${option.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <option.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowQuickCreate(false)
                setShowCreateModal(true)
              }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all"
            >
              Расширенное создание
            </button>
          </div>
        </div>
      )}

      {/* Модалки */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      {showSubscribeModal && selectedCreator && (
        <SubscribeModal
          creator={selectedCreator}
          onClose={() => {
            setShowSubscribeModal(false)
            setSelectedCreator(null)
          }}
          onSuccess={() => {
            refresh()
            toast.success('Подписка оформлена!')
          }}
        />
      )}

      {showPurchaseModal && selectedPost && (
        <PurchaseModal
          post={selectedPost}
          onClose={() => {
            setShowPurchaseModal(false)
            setSelectedPost(null)
          }}
          onSuccess={() => {
            refresh()
            toast.success('Контент куплен!')
          }}
        />
      )}

      {showEditModal && selectedPost && (
        <EditPostModal
          post={selectedPost}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPost(null)
          }}
          onPostUpdated={() => {
            refresh()
            toast.success('Пост обновлен!')
          }}
        />
      )}

      {showSellableModal && selectedPost && (
        <SellablePostModal
          post={selectedPost}
          isOpen={showSellableModal}
          onClose={() => {
            setShowSellableModal(false)
            setSelectedPost(null)
          }}
        />
      )}
    </div>
  )
} 