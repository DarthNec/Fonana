'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useUserContext } from '@/lib/contexts/UserContext'
import { useUnifiedPosts } from '@/lib/hooks/useUnifiedPosts'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { UnifiedPost, PostAction } from '@/types/posts'
import SubscribeModal from '@/components/SubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import CreatePostModal from '@/components/CreatePostModal'
import SellablePostModal from '@/components/SellablePostModal'
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
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import SearchBar from '@/components/SearchBar'

const categories = [
  'All', 'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 
  'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 
  'Blockchain', 'Intimate', 'Education', 'Comedy'
]

export default function FeedPage() {
  const { user } = useUserContext()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending' | 'most-liked' | 'most-commented' | 'following' | 'my-posts'>('latest')
  const scrollPositionRef = useRef(0)
  
  // Используем унифицированный хук для загрузки постов
  const { posts, isLoading, refresh, handleAction } = useUnifiedPosts({
    variant: 'feed'
  })
  
  // Состояние для модалок
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showSellableModal, setShowSellableModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [selectedSellablePost, setSelectedSellablePost] = useState<any>(null)
  const [preferredTier, setPreferredTier] = useState<'basic' | 'premium' | 'vip'>('basic')
  
  // Состояние для редактирования
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPost, setEditingPost] = useState<any>(null)

  useEffect(() => {
    // Очищаем сохраненный wallet при отключении
    if (!user?.wallet) {
      localStorage.removeItem('fonana_user_wallet')
    }
  }, [user?.wallet])

  // Перезагрузка постов при фокусе окна
  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        if (!user || user.wallet) {
          refresh()
        }
      }, 100)
    }
    
    const handlePostsUpdated = () => {
      refresh()
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('postsUpdated', handlePostsUpdated)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('postsUpdated', handlePostsUpdated)
    }
  }, [user, refresh])

  // Обработка действий с постами
  const handlePostAction = async (action: PostAction) => {
    switch (action.type) {
      case 'subscribe':
        const post = posts.find(p => p.id === action.postId)
        if (post) {
          const tier = post?.access?.tier || 'basic'
          handleSubscribeClick(post.creator, tier as 'basic' | 'premium' | 'vip')
        }
        break
        
      case 'purchase':
        const purchasePost = posts.find(p => p.id === action.postId)
        if (purchasePost) {
          if (purchasePost.commerce?.isSellable) {
            handleSellableClick(purchasePost)
          } else {
            handlePurchaseClick(purchasePost)
          }
        }
        break
        
      case 'edit':
        const editPost = posts.find(p => p.id === action.postId)
        if (editPost) {
          handleEditClick(editPost)
        }
        break
        
      default:
        // Остальные действия обрабатываются хуком
        await handleAction(action)
    }
  }

  const handleSubscribeClick = (creatorData: any, tier: 'basic' | 'premium' | 'vip' = 'basic') => {
    setSelectedCreator(creatorData)
    setPreferredTier(tier)
    setShowSubscribeModal(true)
  }

  const handlePurchaseClick = (postData: UnifiedPost) => {
    setSelectedPost({
      id: postData.id,
      title: postData.content.title,
      content: postData.content.text,
      price: postData.access.price,
      currency: postData.access.currency,
      flashSale: postData.commerce?.flashSale,
      creator: {
        id: postData.creator.id,
        name: postData.creator.name,
        username: postData.creator.username,
        avatar: postData.creator.avatar,
        isVerified: postData.creator.isVerified
      }
    })
    setShowPurchaseModal(true)
  }
  
  const handleSellableClick = (postData: UnifiedPost) => {
    setSelectedSellablePost({
      id: postData.id,
      title: postData.content.title,
      content: postData.content.text,
      type: postData.media.type,
      mediaUrl: postData.media.url,
      thumbnail: postData.media.thumbnail,
      price: postData.access.price,
      currency: postData.access.currency,
      sellType: postData.commerce?.sellType,
      quantity: postData.commerce?.quantity,
      auctionStatus: postData.commerce?.auctionData?.status,
      auctionStartPrice: postData.commerce?.auctionData?.startPrice,
      auctionCurrentBid: postData.commerce?.auctionData?.currentBid,
      auctionEndAt: postData.commerce?.auctionData?.endAt,
      soldAt: postData.commerce?.soldAt,
      soldTo: postData.commerce?.soldTo,
      soldPrice: postData.commerce?.soldPrice
    })
    setShowSellableModal(true)
  }
  
  const handleEditClick = (postData: UnifiedPost) => {
    console.log('[Feed] handleEditClick called with post:', postData.id)
    setEditingPost({
      id: postData.id,
      title: postData.content.title,
      content: postData.content.text,
      category: postData.content.category,
      type: postData.media.type,
      mediaUrl: postData.media.url,
      thumbnail: postData.media.thumbnail,
      isLocked: postData.access.isLocked,
      price: postData.access.price,
      currency: postData.access.currency,
      minSubscriptionTier: postData.access.tier,
      tags: postData.content.tags,
      imageAspectRatio: postData.media.aspectRatio
    })
    setShowEditModal(true)
  }

  // Фильтрация и сортировка постов
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = posts.filter(post => {
      // Фильтр по категории
      const categoryMatch = selectedCategory === 'All' || post.content.category === selectedCategory
      
      // Фильтр "Мои посты"
      const myPostsMatch = sortBy !== 'my-posts' || (user && post.creator.id === user.id)
      
      return categoryMatch && myPostsMatch
    })

    // Сортировка
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          
        case 'popular':
          return (b.engagement.likes + b.engagement.comments) - (a.engagement.likes + a.engagement.comments)
          
        case 'trending':
          const ageA = Date.now() - new Date(a.createdAt).getTime()
          const ageB = Date.now() - new Date(b.createdAt).getTime()
          const scoreA = (a.engagement.likes + a.engagement.comments) / Math.max(ageA / (1000 * 60 * 60), 1)
          const scoreB = (b.engagement.likes + b.engagement.comments) / Math.max(ageB / (1000 * 60 * 60), 1)
          return scoreB - scoreA
          
        case 'most-liked':
          return b.engagement.likes - a.engagement.likes
          
        case 'most-commented':
          return b.engagement.comments - a.engagement.comments
          
        default:
          return 0
      }
    })

    return sorted
  }, [posts, selectedCategory, sortBy, user])

  const sortOptions = [
    { id: 'latest', label: 'Latest', icon: ClockIcon },
    { id: 'popular', label: 'Popular', icon: FireIcon },
    { id: 'trending', label: 'Trending', icon: ArrowTrendingUpIcon },
    { id: 'most-liked', label: 'Most Liked', icon: HeartIcon },
    { id: 'most-commented', label: 'Most Discussed', icon: ChatBubbleLeftIcon },
    { id: 'following', label: 'Following', icon: UsersIcon },
    ...(user ? [{ id: 'my-posts', label: 'My Posts', icon: SparklesIcon }] : [])
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pt-16 sm:pt-20">
      <div className="max-w-2xl mx-auto px-0 sm:px-4 py-0 sm:py-8">
        {/* Header - Create button only */}
        <div className="flex items-center justify-end mb-4 sm:mb-6 px-4 sm:px-0">
          <Link
            href="/create"
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm sm:text-base rounded-xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25 flex items-center gap-2"
          >
            <PlusIcon className="w-4 sm:w-5 h-4 sm:h-5" />
            <span className="hidden sm:inline">Create</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-4 sm:mb-6 px-4 sm:px-0">
          <SearchBar 
            placeholder="Поиск по постам и создателям..."
            showFilters={true}
            className="max-w-2xl mx-auto"
          />
        </div>

        {/* Filters and Sort */}
        <div className="mb-4 sm:mb-6 space-y-4">
          {/* Sort Options */}
          <div className="px-4 sm:px-0 overflow-x-auto">
            <div className="flex items-center gap-2 pb-2 mb-2 sm:mb-4">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id as any)}
                  className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 text-xs sm:text-sm ${
                    sortBy === option.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-gray-100 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <option.icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  <span className="whitespace-nowrap">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-3 px-4 sm:px-0">
            <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400 text-sm">
              <FunnelIcon className="w-4 h-4" />
              <span className="font-medium">Categories</span>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="flex gap-2 pb-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex-shrink-0 px-3 py-1.5 text-xs sm:text-sm rounded-full transition-all ${
                      selectedCategory === category
                        ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/50'
                        : 'bg-gray-100 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Posts Container - используем унифицированную систему */}
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
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300"
              >
                <PlusIcon className="w-5 h-5" />
                Create first post
              </Link>
            </div>
          }
        />

        {/* Load More */}
        {filteredAndSortedPosts.length > 0 && (
          <div className="text-center mt-8 sm:mt-12">
            <button className="px-8 py-3 bg-gray-100 dark:bg-slate-800/50 hover:bg-gray-200 dark:hover:bg-slate-700/50 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white rounded-xl font-medium transition-all">
              Load more
            </button>
          </div>
        )}
      </div>

      {/* Modals moved outside */}
      {showSubscribeModal && selectedCreator && (
        <SubscribeModal
          creator={selectedCreator}
          preferredTier={preferredTier}
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={(data) => {
            setShowSubscribeModal(false)
            
            // Оптимистичное обновление для подписки
            if (data?.subscription) {
              const newTier = data.subscription.plan?.toLowerCase() || 'basic'
              
              // Обновляем посты локально
              const updatedPosts = posts.map(post => {
                if (post.creator.id === selectedCreator.id) {
                  const hasAccess = hasAccessToTier(newTier, post?.access?.tier)
                  return {
                    ...post,
                    access: {
                      ...post.access,
                      hasSubscription: true,
                      userTier: newTier,
                      isLocked: post.access.isLocked && !hasAccess && !post.access.price
                    }
                  }
                }
                return post
              })
              
              // Это обновит UI мгновенно (нужно добавить setPosts в хук)
              // События subscription-updated обработаются автоматически через хук
            }
            
            // Проверяем с сервера через небольшую задержку
            setTimeout(() => {
              console.log('[Feed] Checking posts after subscription')
              refresh()
            }, 2000)
          }}
        />
      )}

      {showPurchaseModal && selectedPost && (
        <PurchaseModal
          post={selectedPost}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={(data) => {
            setShowPurchaseModal(false)
            
            // Оптимистичное обновление для покупки
            if (data?.postId) {
              // События post-purchased обработаются автоматически через хук
              // Дополнительно можно обновить UI здесь если нужно
            }
            
            // Затем проверяем с сервера
            setTimeout(() => {
              refresh()
            }, 1000)
          }}
        />
      )}

      {showSellableModal && selectedSellablePost && (
        <SellablePostModal
          isOpen={showSellableModal}
          post={selectedSellablePost}
          onClose={() => setShowSellableModal(false)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingPost && (
        <CreatePostModal
          mode="edit"
          postId={editingPost.id}
          onClose={() => {
            console.log('[Feed] Closing edit modal')
            setShowEditModal(false)
            setEditingPost(null)
          }}
          onPostUpdated={() => {
            console.log('[Feed] Post updated, reloading posts')
            setShowEditModal(false)
            setEditingPost(null)
            // Обновляем посты с задержкой
            setTimeout(() => {
              refresh()
            }, 500)
          }}
        />
      )}
    </div>
  )
} 