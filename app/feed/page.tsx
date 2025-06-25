'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/useUser'
import PostCard from '@/components/PostCard'
import SubscribeModal from '@/components/SubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import EditPostModal from '@/components/EditPostModal'
import SellablePostModal from '@/components/SellablePostModal'
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
  const { user } = useUser()
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending' | 'most-liked' | 'most-commented' | 'following' | 'my-posts'>('latest')
  const scrollPositionRef = useRef(0)
  
  // Состояние для модалок
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showSellableModal, setShowSellableModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [selectedSellablePost, setSelectedSellablePost] = useState<any>(null)
  const [preferredTier, setPreferredTier] = useState<'basic' | 'premium' | 'vip'>('basic')
  
  // Добавляем состояние для редактирования на уровне Feed
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPost, setEditingPost] = useState<any>(null)

  useEffect(() => {
    loadPosts()
  }, [user?.wallet]) // Перезагружаем при изменении wallet

  // Перезагрузка постов при фокусе окна (для обновления после редактирования)
  useEffect(() => {
    const handleFocus = () => {
      loadPosts()
    }
    
    const handlePostsUpdated = () => {
      loadPosts()
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('postsUpdated', handlePostsUpdated)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('postsUpdated', handlePostsUpdated)
    }
  }, [])

  // Функция для точечного обновления поста после покупки
  const updatePostPurchaseStatus = (postId: string, purchased: boolean) => {
    setPosts(prevPosts => prevPosts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            hasPurchased: purchased, 
            shouldHideContent: false,
            isSubscribed: post.isSubscribed || purchased
          }
        : post
    ))
  }

  // Функция для обновления постов после подписки
  const updatePostsAfterSubscription = (creatorId: string, tier: string) => {
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.creator.id === creatorId) {
        const hasAccess = checkTierAccess(post.requiredTier, tier)
        return {
          ...post,
          isSubscribed: true,
          userTier: tier,
          shouldHideContent: post.isLocked && !hasAccess && !post.price
        }
      }
      return post
    }))
  }

  // Проверка доступа к тиру
  const checkTierAccess = (requiredTier: string | null, userTier: string): boolean => {
    if (!requiredTier) return true
    
    const tierHierarchy: { [key: string]: number } = {
      'free': 0,
      'basic': 1,
      'premium': 2,
      'vip': 3
    }
    
    const userLevel = tierHierarchy[userTier.toLowerCase()] || 0
    const requiredLevel = tierHierarchy[requiredTier.toLowerCase()] || 0
    
    return userLevel >= requiredLevel
  }

  const loadPosts = async () => {
    try {
      // Сохраняем позицию скролла
      scrollPositionRef.current = window.scrollY
      
      // Не устанавливаем isLoading в true, если посты уже загружены
      // Это предотвратит unmount компонентов
      if (posts.length === 0) {
        setIsLoading(true)
      }
      
      console.log('[Feed] Loading posts, user:', user?.id, user?.wallet)
      
      // Add current user's wallet to request
      const params = new URLSearchParams()
      if (user?.wallet) {
        params.append('userWallet', user.wallet)
        console.log('[Feed] Sending userWallet:', user.wallet)
      } else {
        console.log('[Feed] No user wallet available')
      }
      
      const response = await fetch(`/api/posts?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to load posts')
      }

      const data = await response.json()
      console.log('Loaded posts:', data.posts)
      
      // Format data for display
      const formattedPosts = data.posts.map((post: any) => ({
        id: post.id,
        creator: {
          id: post.creator.id,
          name: post.creator.nickname || post.creator.wallet.slice(0, 6) + '...',
          username: post.creator.wallet.slice(0, 6) + '...' + post.creator.wallet.slice(-4),
          nickname: post.creator.nickname,
          avatar: post.creator.avatar || '/default-avatar.png',
          isVerified: false
        },
        title: post.title,
        content: post.content,
        category: post.category,
        image: post.mediaUrl || post.thumbnail,
        mediaUrl: post.mediaUrl,  // Передаём оригинальные значения
        thumbnail: post.thumbnail,  // Передаём оригинальные значения
        preview: post.preview,     // Добавляем preview
        type: post.type as 'text' | 'image' | 'video' | 'audio',
        isLocked: post.isLocked,
        isPremium: post.isPremium || false,
        price: post.price,
        currency: post.currency,
        likes: post._count?.likes || 0,
        comments: post._count?.comments || 0,
        createdAt: post.createdAt,
        tags: post.tags || [],
        isSubscribed: post.isSubscribed || false,
        shouldHideContent: post.shouldHideContent || false,
        requiredTier: post.requiredTier || null,
        userTier: post.userTier || null,
        imageAspectRatio: post.imageAspectRatio,
        // Новые поля для продаваемых постов
        isSellable: post.isSellable || false,
        sellType: post.sellType,
        quantity: post.quantity,
        auctionStatus: post.auctionStatus,
        auctionStartPrice: post.auctionStartPrice,
        auctionCurrentBid: post.auctionCurrentBid,
        auctionEndAt: post.auctionEndAt,
        soldAt: post.soldAt,
        soldTo: post.soldTo,
        soldPrice: post.soldPrice,
        flashSale: post.flashSale || null
      }))

      setPosts(formattedPosts)
      
      // Восстанавливаем позицию скролла после загрузки
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current)
      })
    } catch (error) {
      console.error('Error loading posts:', error)
      toast.error('Error loading posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribeClick = (creatorData: any, tier: 'basic' | 'premium' | 'vip' = 'basic') => {
    setSelectedCreator(creatorData)
    setPreferredTier(tier)
    setShowSubscribeModal(true)
  }

  const handlePurchaseClick = (postData: any) => {
    setSelectedPost(postData)
    setShowPurchaseModal(true)
  }
  
  const handleSellableClick = (postData: any) => {
    setSelectedSellablePost(postData)
    setShowSellableModal(true)
  }
  
  const handleEditClick = (postData: any) => {
    console.log('[Feed] handleEditClick called with post:', postData.id)
    setEditingPost(postData)
    setShowEditModal(true)
  }

  const filteredPosts = posts.filter(post => {
    // Фильтр по категории
    const categoryMatch = selectedCategory === 'All' || post.category === selectedCategory
    
    // Фильтр "Мои посты"
    const myPostsMatch = sortBy !== 'my-posts' || (user && post.creator.id === user.id)
    
    return categoryMatch && myPostsMatch
  })

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    } else if (sortBy === 'popular') {
      // Популярность на основе общей активности (лайки + комментарии)
      return (b.likes + b.comments) - (a.likes + a.comments)
    } else if (sortBy === 'trending') {
      // Трендовые - новые посты с высокой активностью
      const ageA = Date.now() - new Date(a.createdAt).getTime()
      const ageB = Date.now() - new Date(b.createdAt).getTime()
      const scoreA = (a.likes + a.comments) / Math.max(ageA / (1000 * 60 * 60), 1) // активность в час
      const scoreB = (b.likes + b.comments) / Math.max(ageB / (1000 * 60 * 60), 1)
      return scoreB - scoreA
    } else if (sortBy === 'most-liked') {
      return b.likes - a.likes
    } else if (sortBy === 'most-commented') {
      return b.comments - a.comments
    }
    return 0
  })

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
    <div className="min-h-screen bg-white dark:bg-slate-900 pt-16 sm:pt-20"> {/* Added pt-16 for navbar offset */}
      <div className="max-w-2xl mx-auto px-0 sm:px-4 py-0 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 px-4 sm:px-0">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Content Feed
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400">Discover amazing content from creators</p>
          </div>
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

        {/* Posts Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-slate-400">Loading posts...</p>
            </div>
          </div>
        ) : sortedPosts.length === 0 ? (
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
        ) : (
          <div className="space-y-0 sm:space-y-8">
            {sortedPosts.map((post) => (
              <PostCard
                key={post.id}
                {...post}
                showCreator={true}
                onSubscribeClick={handleSubscribeClick}
                onPurchaseClick={handlePurchaseClick}
                onSellableClick={handleSellableClick}
                onEditClick={handleEditClick}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {sortedPosts.length > 0 && (
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
            
            // Оптимистичное обновление UI
            if (data?.subscription) {
              updatePostsAfterSubscription(selectedCreator.id, data.subscription.tier || data.subscription.plan)
            }
            
            // Проверяем с сервера через небольшую задержку
            setTimeout(() => {
              console.log('[Feed] Checking posts after subscription')
              loadPosts()
            }, 2000)
          }}
        />
      )}

      {showPurchaseModal && selectedPost && (
        <PurchaseModal
          post={{
            ...selectedPost,
            flashSale: selectedPost.flashSale
          }}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={(data) => {
            setShowPurchaseModal(false)
            
            // Оптимистичное обновление
            if (data?.postId) {
              updatePostPurchaseStatus(data.postId, true)
            }
            
            // Затем проверяем с сервера (без полной перезагрузки)
            setTimeout(() => {
              if (data?.postId && user?.wallet) {
                fetch(`/api/posts/${data.postId}?userWallet=${user.wallet}`)
                  .then(res => res.json())
                  .then(postData => {
                    if (postData.post) {
                      setPosts(prevPosts => prevPosts.map(post => 
                        post.id === data.postId ? { ...postData.post } : post
                      ))
                    }
                  })
                  .catch(err => console.error('Error fetching updated post:', err))
              }
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

      {/* Edit Modal - теперь на уровне Feed */}
      {showEditModal && editingPost && (
        <EditPostModal
          isOpen={showEditModal}
          onClose={() => {
            console.log('[Feed] Closing edit modal')
            setShowEditModal(false)
            setEditingPost(null)
          }}
          post={editingPost}
          onPostUpdated={() => {
            console.log('[Feed] Post updated, reloading posts')
            setShowEditModal(false)
            setEditingPost(null)
            // Обновляем посты с задержкой
            setTimeout(() => {
              loadPosts()
            }, 500)
          }}
        />
      )}
    </div>
  )
} 