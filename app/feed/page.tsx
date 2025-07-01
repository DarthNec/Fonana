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
import Link from 'next/link'

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

  // Очищаем кеш при смене категории или сортировки
  useEffect(() => {
    refresh(true)
  }, [selectedCategory, sortBy])

  // Фильтрация и сортировка
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = [...realtimePosts]

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
        // Для обычных платных постов формируем правильную структуру для PurchaseModal
        const purchasePost = {
          id: post.id,
          title: post.content.title,
          price: post.access?.price || 0, // Берем цену из access
          currency: post.access?.currency || 'SOL',
          creator: {
            id: post.creator.id,
            name: post.creator.name,
            username: post.creator.username,
            avatar: post.creator.avatar,
            isVerified: post.creator.isVerified
          },
          flashSale: post.commerce?.flashSale ? {
            id: post.commerce.flashSale.id,
            discount: post.commerce.flashSale.discount,
            endAt: post.commerce.flashSale.endAt,
            maxRedemptions: post.commerce.flashSale.maxRedemptions,
            usedCount: post.commerce.flashSale.usedCount,
            remainingRedemptions: post.commerce.flashSale.remainingRedemptions,
            timeLeft: post.commerce.flashSale.timeLeft
          } : undefined
        }
        
        console.log('[Feed] Opening purchase modal with price:', purchasePost.price)
        
        setSelectedPost(purchasePost)
        setShowPurchaseModal(true)
        break
      case 'edit':
        setSelectedPost(post)
        setShowEditModal(true)
        break
      case 'bid':
        // КРИТИЧЕСКИЙ ФИКС: после нормализации цена ВСЕГДА в access.price
        const normalizedPrice = post.access?.price
        
        // Валидация цены
        if (normalizedPrice === undefined || normalizedPrice === null || normalizedPrice <= 0) {
          console.error('[Feed] No valid price found for sellable post:', {
            postId: post.id,
            postTitle: post.content?.title,
            accessPrice: post.access?.price,
            commerce: post.commerce
          })
          toast.error('Ошибка: цена поста не найдена')
          return
        }
        
        const sellablePost = {
          id: post.id,
          title: post.content.title,
          price: normalizedPrice, // Используем нормализованную цену
          currency: post.access?.currency || 'SOL',
          sellType: post.commerce?.sellType,
          quantity: post.commerce?.quantity || 1,
          auctionStartPrice: post.commerce?.auctionData?.startPrice,
          auctionCurrentBid: post.commerce?.auctionData?.currentBid,
          auctionEndAt: post.commerce?.auctionData?.endAt,
          creator: {
            id: post.creator.id,
            name: post.creator.name,
            username: post.creator.username,
            avatar: post.creator.avatar,
            isVerified: post.creator.isVerified
          }
        }
        
        console.log('[Feed] Opening sellable modal with price:', normalizedPrice)
        
        setSelectedPost(sellablePost)
        setShowSellableModal(true)
        break
      case 'like':
      case 'unlike':
        // Обрабатываем через handleAction от useOptimizedPosts
        handleAction(action)
        break
    }
  }, [filteredAndSortedPosts, handleAction])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pt-16 sm:pt-20">
      <div className="max-w-2xl mx-auto px-0 sm:px-4 pb-20">
        {/* Banner для новых постов */}
        {hasNewPosts && (
          <div className="mb-4 px-4 sm:px-0">
            <button
              onClick={loadPendingPosts}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
            >
              <SparklesIcon className="w-5 h-5" />
              {newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'} available
            </button>
          </div>
        )}

        {/* Categories - non-sticky horizontal scroll */}
        <div className="mb-4">
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
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  {category}
                </button>
              ))}
            </div>
            
            {/* Gradient для индикации скролла */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Sort options - компактная версия */}
        <div className="mb-6 px-4 sm:px-0">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as any)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${sortBy === option.value
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                <option.icon className="w-4 h-4" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Container */}
        <PostsContainer
          posts={filteredAndSortedPosts}
          layout="list"
          variant="feed"
          showCreator={true}
          onAction={handlePostAction}
          isLoading={isLoading}
          emptyComponent={
            <div className="text-center py-20 px-4">
              <SparklesIcon className="w-16 h-16 text-gray-400 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-slate-300 mb-2">No posts yet</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6">Be the first to create content!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300"
              >
                <PlusIcon className="w-5 h-5" />
                Create first post
              </button>
            </div>
          }
        />

        {/* Infinite scroll trigger */}
        {hasMore && !isLoadingMore && (
          <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
            <div className="text-sm text-gray-500 dark:text-slate-500">
              Scroll to load more
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoadingMore && (
          <div className="py-8 text-center">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => setShowCreateModal(true)}
        label="Create Post"
        hideOnScroll={true}
      />

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={() => {
            setShowCreateModal(false)
            refresh()
          }}
        />
      )}

      {/* Other Modals */}
      {showSubscribeModal && selectedCreator && (
        <SubscribeModal
          onClose={() => {
            setShowSubscribeModal(false)
            setSelectedCreator(null)
            refresh()
          }}
          creator={selectedCreator}
        />
      )}

      {showPurchaseModal && selectedPost && (
        <PurchaseModal
          onClose={() => {
            setShowPurchaseModal(false)
            setSelectedPost(null)
            refresh()
          }}
          post={selectedPost}
        />
      )}

      {showEditModal && selectedPost && (
        <EditPostModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPost(null)
          }}
          post={selectedPost}
          onPostUpdated={() => {
            setShowEditModal(false)
            setSelectedPost(null)
            refresh()
          }}
        />
      )}

      {showSellableModal && selectedPost && (
        <SellablePostModal
          isOpen={showSellableModal}
          onClose={() => {
            setShowSellableModal(false)
            setSelectedPost(null)
          }}
          post={selectedPost}
        />
      )}
    </div>
  )
} 