'use client'

import { useState, useEffect, useRef, useMemo, useCallback, useTransition } from 'react'
import { useUser, useUserLoading } from '@/lib/store/appStore'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import { useOptimizedRealtimePosts } from '@/lib/hooks/useOptimizedRealtimePosts'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { UnifiedPost, PostAction } from '@/types/posts'
import CreatePostModal from '@/components/CreatePostModal'
import CreateStoryModal from '@/components/CreateStoryModal'
import StoryViewPopup from '@/components/StoryViewPopup'
import SubscribeModal from '@/components/SubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import SellablePostModal from '@/components/SellablePostModal'
import FloatingActionButton from '@/components/ui/FloatingActionButton'
import Avatar from '@/components/Avatar'
import { hasAccessToTier } from '@/lib/utils/access'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { jwtManager } from '@/lib/utils/jwt'
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
  ArrowUpIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  // Category icons
  Squares2X2Icon, // All
  PaintBrushIcon, // Art
  MusicalNoteIcon, // Music
  PuzzlePieceIcon, // Gaming
  CpuChipIcon, // GameFi
  HomeIcon, // Lifestyle
  HeartIcon as FitnessIcon, // Fitness
  ComputerDesktopIcon, // Tech
  CurrencyDollarIcon, // DeFi
  PhotoIcon as NFTIcon, // NFT
  ChartBarIcon, // Trading
  LinkIcon, // Blockchain
  HeartIcon as IntimateIcon, // Intimate
  AcademicCapIcon, // Education
  FaceSmileIcon, // Comedy
  CakeIcon, // Food
  BriefcaseIcon, // Work
  UserIcon, // Adult
  UserGroupIcon, // Couple
  UserIcon as SoloIcon // Solo
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

import { useInView } from 'react-intersection-observer'
import { useSubscriptionStore } from '@/lib/store/subscriptionStore'

const categories = [
  'All', 'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 
  'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 
  'Blockchain', 'Intimate', 'Education', 'Comedy',
  'Food', 'Party', 'Landscape', 'Work', 'Adult', 'Couple', 'Solo'
]

// Маппинг категорий к иконкам
const categoryIcons: Record<string, any> = {
  'All': Squares2X2Icon,
  'Art': PaintBrushIcon,
  'Music': MusicalNoteIcon,
  'Gaming': PuzzlePieceIcon,
  'Lifestyle': HomeIcon,
  'Fitness': FitnessIcon,
  'Tech': ComputerDesktopIcon,
  'DeFi': CurrencyDollarIcon,
  'NFT': NFTIcon,
  'Trading': ChartBarIcon,
  'GameFi': CpuChipIcon,
  'Blockchain': LinkIcon,
  'Intimate': IntimateIcon,
  'Education': AcademicCapIcon,
  'Comedy': FaceSmileIcon,
  'Food': CakeIcon,
  'Party': SparklesIcon,
  'Landscape': PhotoIcon,
  'Work': BriefcaseIcon,
  'Adult': UserIcon,
  'Couple': UserGroupIcon,
  'Solo': SoloIcon
}

const sortOptions = [
  { value: 'latest', label: 'Latest', icon: ClockIcon },
  { value: 'popular', label: 'Popular', icon: FireIcon },
  { value: 'trending', label: 'Trending', icon: ArrowTrendingUpIcon },
  { value: 'subscribed', label: 'Following', icon: UsersIcon }
]

export default function FeedPageClient() {
  const user = useUser()
  const userLoading = useUserLoading()
  const { setVisible } = useSafeWalletModal()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending' | 'subscribed'>('latest')
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  // 🔥 M7 PHASE 3: React 18 useTransition for filter updates
  const [isPending, startTransition] = useTransition()
  
  // Флаг для отслеживания первой загрузки
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Модалки
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSellableModal, setShowSellableModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)
  const [filteredAndSortedPosts, setFilteredAndSortedPosts] = useState<UnifiedPost[]>([])
  
  // Stories
  const [stories, setStories] = useState<any[]>([])
  const [isLoadingStories, setIsLoadingStories] = useState(false)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0)
  const [selectedUserStories, setSelectedUserStories] = useState<any[]>([]) // Истории выбранного пользователя

  // Scroll to Top button
  const [showScrollTop, setShowScrollTop] = useState(false)

  console.log('[FeedPageClient] user:', user);
  
  // Функция для загрузки историй
  const loadStories = async () => {
    try {
      setIsLoadingStories(true)
      console.log('[FeedPageClient] Loading stories...')
      
      const response = await fetch('/api/stories')
      if (!response.ok) {
        throw new Error('Failed to load stories')
      }
      
      const data = await response.json()
      console.log('[FeedPageClient] Stories loaded:', data.stories)
      setStories(data.stories || [])
    } catch (error) {
      console.error('[FeedPageClient] Error loading stories:', error)
    } finally {
      setIsLoadingStories(false)
    }
  }
  
  // Загружаем истории при монтировании
  useEffect(() => {
    loadStories()
  }, [])

  // Группируем истории по пользователям
  const groupedStories = useMemo(() => {
    const grouped = new Map<string, { user: any, stories: any[], firstIndex: number }>()
    
    stories.forEach((story, index) => {
      const userId = story.userId
      if (!grouped.has(userId)) {
        grouped.set(userId, {
          user: story.user,
          stories: [story],
          firstIndex: index
        })
      } else {
        grouped.get(userId)!.stories.push(story)
      }
    })
    
    return Array.from(grouped.values())
  }, [stories])
  
  // Функция для проверки аутентификации перед созданием поста
  const handleCreatePost = async () => {
    console.log('[FeedPageClient] handleCreatePost');
    if (!user) {
      // 🔥 Открываем модальное окно подключения кошелька вместо ошибки
      setVisible(true)
      toast.success('Подключите кошелек для создания поста')
      return
    }

    const token = await jwtManager.getToken()
    if (!token) {
      // 🔥 Открываем модальное окно подключения кошелька вместо ошибки
      setVisible(true)
      toast.success('Подключите кошелек для создания поста')
      return
    }

    setShowCreateModal(true)
  }

  // Оптимизированная загрузка постов с пагинацией
  const {
    posts,
    isLoading,
    loadPosts,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    refresh,
    refreshWithoutCache,
    handleAction,
  } = useOptimizedPosts({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    variant: 'feed',
    sortBy: sortBy,
    pageSize: 20
  })

  // Real-time обновления
  const {
    posts: realtimePosts,
    newPostsCount,
    hasNewPosts,
    loadPendingPosts
  } = useOptimizedRealtimePosts({
    posts,
    autoUpdateFeed: user?.id ? true : false, // NEW: Auto-update для logged-in users
    showNewPostsNotification: true, // Показываем уведомления о новых постах от других
    maxPendingPosts: 50,
    batchUpdateDelay: 100
  })
  
  // Infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px'
  })

  // Отслеживание скролла страницы
  /*
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // Проверяем, находимся ли мы в 100px от низа страницы
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight)
      console.log('[FeedPageClient] Distance from bottom:', distanceFromBottom);
      if (distanceFromBottom <= 350) {
        console.log('[FeedPageClient] Скролл: 100px от низа страницы достигнуто', {
          scrollTop,
          windowHeight,
          documentHeight,
          distanceFromBottom
        })
        loadMore()
      }
    }

    // Добавляем обработчик скролла
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Очищаем обработчик при размонтировании
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])
  */
  
  useEffect(() => {
    console.log('[FeedPageClient] inView:', inView);
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
      
      // Проверяем, находимся ли мы в 100px от низа страницы
    const distanceFromBottom = documentHeight - (scrollTop + windowHeight)
    if (inView && hasMore && !isLoadingMore && distanceFromBottom <= 250) {
      loadMore()
    }
  }, [inView, hasMore, isLoadingMore, loadMore])
  // Инициализация при первой загрузке
  useEffect(() => {
    if (!isInitialized) {
      console.log('[FeedPage] Initializing with sortBy:', sortBy)
      refresh(true)
      setIsInitialized(true)
    }
  }, [isInitialized, sortBy, refresh])

  // Очищаем кеш при смене категории или сортировки (только после инициализации)
  useEffect(() => {
    if (isInitialized) {
      console.log('[FeedPage] Filter changed - refreshing posts:', { selectedCategory, sortBy })
      refresh(true)
    }
  }, [selectedCategory, sortBy, isInitialized, refresh])

  // Отслеживание скролла для кнопки Scroll to Top
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      // Показываем кнопку если прокрутили больше 400px
      setShowScrollTop(scrollTop > 400)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  

  useEffect(() => {
    console.log(`[FeedPageClient] useEffect filteredAndSortedPosts`, realtimePosts);
    const fetchAndProcess = async () => {
      if(realtimePosts.length <= 0) {
        setFilteredAndSortedPosts(realtimePosts);
        return;
      } 
      let subscriptions = [];
      
      if(localStorage.getItem('fonana_user_wallet') !== null) {
        if (localStorage.getItem("user_subscriptions") === null) {
          const response = await fetch(`/api/subscriptions/check?userId=${user?.id}`);
          if (!response.ok) {
            throw new Error(`Failed to load subscriptions: HTTP ${response.status}`);
          }
          const data = await response.json();
          console.log("[SubscriptionStore] Subscriptions loaded:", data);
          localStorage.setItem("user_subscriptions", JSON.stringify(data || null));
          subscriptions = data;
        } else {
          subscriptions = JSON.parse(localStorage.getItem("user_subscriptions") || "[]");
        }
      }
  
      console.log("[SUBSCRIPTIONS]", subscriptions);
      let likesData = [];
      if(user?.id) {
        if(localStorage.getItem('fonana_user_wallet') !== null) {
          const userLikesData = localStorage.getItem('user_likes')
          if(userLikesData !== null && JSON.parse(userLikesData) !== null) {
            likesData = JSON.parse(userLikesData || '[]')
          } else {
            const likesResponse = await fetch(`/api/likes/user?userId=${user.id}`, {
            })
            if (!likesResponse.ok) {
              throw new Error(`HTTP ${likesResponse.status}: ${likesResponse.statusText}`)
            }
            likesData = await likesResponse.json()
            localStorage.setItem('user_likes', JSON.stringify(likesData || null))
          }
          console.log(`[FeedPageClient] User likes:`, likesData);
        }
      }

      let purshasesData = [];
      if(user?.id) {
      if(localStorage.getItem('user_purchases') !== null) {
        purshasesData = JSON.parse(localStorage.getItem('user_purchases') || '[]')
      } else {
        const purchasesResponse = await fetch(`/api/posts/purchases?userId=${user.id}`)
        if (purchasesResponse.ok) {
          const purchasesData = await purchasesResponse.json()
          purshasesData = purchasesData.purchases || []
          console.log(`[FeedPageClient] User purchases:`, purshasesData);
            localStorage.setItem('user_purchases', JSON.stringify(purshasesData))
          }
        }
      }
  
      const processedPosts = realtimePosts.filter((post) => {
        // Пропускаем ai-video, если не подходит
        if (post.media.type === 'ai-video') {
          if (user?.id) {
            if (user.id !== post.creator.id) return false;
          } else return false;
        }
    
        // можно добавить другие фильтры, если нужно
        return true;
      })
      .map((post) => {
        if (subscriptions?.subscriptions?.length > 0) {
          const sub = subscriptions.subscriptions.find((sub: any) => sub.creatorId === post.creator.id);
          console.log("[SUBSCRIPTION] sub:", sub);
          if (sub?.isActive) {
            if (sub.plan === "VIP") {
              post.access.shouldHideContent = false;
              post.access.isLocked = false;
            } else if (
              post.access.tier === "basic" &&
              ["Basic", "Premium", "VIP"].includes(sub.plan)
            ) {
              post.access.shouldHideContent = false;
              post.access.isLocked = false;
            } else if (
              post.access.tier === "premium" &&
              ["Premium", "VIP"].includes(sub.plan)
            ) {
              post.access.shouldHideContent = false;
              post.access.isLocked = false;
            }
          }
        }
        if(likesData.length > 0) {
          const like = likesData.find((like: any) => like.postId === post.id);
          if(post.engagement) {
            post.engagement.isLiked = like ? true : false;
          }
        }
        if(purshasesData.length > 0) {
          const purchase = purshasesData.find((purchase: any) => purchase.postId === post.id);
          if(purchase) {
            post.access.isPurchased = true;
            post.access.isLocked = false;
            post.access.shouldHideContent = false;
          }
        }
        
        console.log(`[POST] post:`, post);
        return post;
      });
  
      console.log("[FILTERED AND SORTED POSTS]", processedPosts);
      setFilteredAndSortedPosts(processedPosts);
    };
  
    fetchAndProcess();
  }, [realtimePosts, refresh]);


  useEffect(() => {
    const handlePostCreated = () => {
      console.log('[FeedPage] Post created event received')
      refresh(true)
      loadPosts();
    }
    
    window.addEventListener('post-created', handlePostCreated)
    return () => window.removeEventListener('post-created', handlePostCreated)
  }, [refresh])


  // Посты уже отсортированы на сервере в зависимости от sortBy
  /*
  const filteredAndSortedPosts = useMemo(async () => {
    let subscriptions = [];
    if(localStorage.getItem('user_subscriptions') === null) {
      const response = await fetch(`/api/subscriptions/check?userId=${user?.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load subscriptions: HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('[SubscriptionStore] Subscriptions loaded:', data)
      localStorage.setItem('user_subscriptions', JSON.stringify(data || null))
      subscriptions = data;
    } else {
      subscriptions = JSON.parse(localStorage.getItem('user_subscriptions') || '[]')
    }

    console.log(`[SUBSCRIPTIONS]`, subscriptions);

    const processedPosts = realtimePosts.map(post => {
      if(subscriptions?.subscriptions?.length > 0) {
        const index = subscriptions.subscriptions.findIndex((sub: any) => sub.creatorId === post.creator.id);
        console.log(`[SUBSCRIPTION] index:`, index);
        console.log(`[SUBSCRIPTION] post.creator.id:`, post.creator.id);
        if(index !== -1) {
          if(subscriptions.subscriptions[index].isActive) {
            if(subscriptions.subscriptions[index].plan === 'VIP') {
              post.access.shouldHideContent = false;
              post.access.isLocked = false;
              return post;
            }
            else if(post.access.tier === 'basic' && (subscriptions.subscriptions[index].plan === 'Basic' 
              || subscriptions.subscriptions[index].plan === 'VIP' || subscriptions.subscriptions[index].plan === 'Premium')) {
              post.access.shouldHideContent = false;
              post.access.isLocked = false;
              return post;
            }
            else if(post.access.tier === 'premium' && (subscriptions.subscriptions[index].plan === 'Premium' 
              || subscriptions.subscriptions[index].plan === 'VIP')) {
              post.access.shouldHideContent = false;
              post.access.isLocked = false;
              return post;
            }
          }
        }
      }
      /*
      if (subscriptions.includes(post.creator.id)) {
        return {
          ...post,
          access: {
            ...post.access,
            shouldHideContent: false
          }
        }
      }
      
      return post
    })
    console.log(`[FILTERED AND SORTED POSTS]`, processedPosts);
    return processedPosts
  }, [realtimePosts])
  */
  // Обработка действий с постами
  const handlePostAction = useCallback((action: PostAction) => {
    const post = filteredAndSortedPosts.find(p => p.id === action.postId)
    if (!post) return

    switch (action.type) {
      case 'subscribe':
        setSelectedPost(post);
        setSelectedCreator(post.creator)
        console.log('[FeedPage] post:', post);
        console.log('[FeedPage] selectedPost:', selectedPost);
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
      case 'add-emotion':
      case 'remove-emotion':
        // Обрабатываем через handleAction от useOptimizedPosts
        handleAction(action)
        break
      case 'delete':
        // Обрабатываем через handleAction от useOptimizedPosts
        handleAction(action)
        break
      case 'adminDelete':
        // Административное удаление через handleAction от useOptimizedPosts
        console.log('[Feed] Admin delete action:', action)
        handleAction(action)
        break
    }
  }, [filteredAndSortedPosts, handleAction])

  console.log(`[FILTERED AND SORTED POSTS]`, filteredAndSortedPosts);
  console.log(`[HAS MORE]`, hasMore);
  console.log(`[IS LOADING MORE] `, isLoadingMore);
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pt-12 sm:-mt-14">
      <div className="max-w-2xl mx-auto px-0 sm:px-4 pb-20">
        {/* Stories Section - показываем только после загрузки постов */}
        {!isLoading && (
        <div className="mb-4 px-4 sm:px-0 pt-4">
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {/* Add Story Button */}
            <button
              onClick={() => {
                if (!user) {
                  setVisible(true)
                  toast.success('Подключите кошелек для создания истории')
                  return
                }
                setShowCreateStoryModal(true)
              }}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-purple-500 dark:border-purple-400 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all group-hover:scale-105">
                <PlusIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                Add Story
              </span>
            </button>

            {/* Real stories from users */}
            {isLoadingStories ? (
              // Loading skeleton
              <div className="flex gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-slate-700" />
                    <div className="w-12 h-3 bg-gray-300 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              groupedStories.map((group) => (
                <button
                  key={group.user.id}
                  onClick={() => {
                    // Передаем только истории выбранного пользователя
                    console.log('[FeedPageClient] Opening stories for user:', group.user.nickname || group.user.fullName)
                    console.log('[FeedPageClient] User stories count:', group.stories.length)
                    console.log('[FeedPageClient] User stories:', group.stories)
                    setSelectedUserStories(group.stories)
                    setSelectedStoryIndex(0) // Начинаем с первой истории пользователя
                    setShowStoryViewer(true)
                  }}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group relative"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 p-[2px] group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 p-[2px]">
                      <Avatar
                        src={group.user.avatar}
                        alt={group.user.fullName || group.user.nickname}
                        seed={group.user.nickname || group.user.id}
                        size={56}
                        rounded="full"
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                  
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-300 max-w-[64px] truncate">
                    {group.user.fullName || group.user.nickname || 'User'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
        )}

        {/* 🎯 NEW: Compact Filters Bar под Stories (non-sticky) - показываем только после загрузки постов */}
        {!isLoading && (
        <div className="mb-4 px-4 sm:px-0">
          <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 py-3">
            <div className="flex items-center gap-3">
              
              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => startTransition(() => setSelectedCategory(e.target.value))}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer"
              >
                {categories.map((category) => {
                  const icons: Record<string, string> = {
                    'All': '📚', 'Art': '🎨', 'Music': '🎵', 'Gaming': '🎮',
                    'Lifestyle': '🏠', 'Fitness': '💪', 'Tech': '💻', 'DeFi': '💰',
                    'NFT': '🖼️', 'Trading': '📊', 'GameFi': '🎲', 'Blockchain': '🔗',
                    'Intimate': '❤️', 'Education': '🎓', 'Comedy': '😂', 'Food': '🍰',
                    'Party': '🎉', 'Landscape': '🏞️', 'Work': '💼', 'Adult': '🔞',
                    'Couple': '👫', 'Solo': '🧍'
                  }
                  return (
                    <option key={category} value={category}>
                      {icons[category] || '📚'} {category}
                    </option>
                  )
                })}
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => startTransition(() => setSortBy(e.target.value as any))}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer"
              >
                {sortOptions.map((option) => {
                  const icons: Record<string, string> = {
                    'latest': '🕒', 'popular': '🔥', 'trending': '📈', 'subscribed': '👥'
                  }
                  return (
                    <option key={option.value} value={option.value}>
                      {icons[option.value]} {option.label}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        </div>
        )}

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
        {/* <div className="mb-4">
          <div className="relative">
            <div 
              ref={categoryScrollRef}
              className="flex gap-2 px-4 pb-3 pt-3 overflow-x-auto scrollbar-hide scroll-smooth"
            >
              {categories.map((category) => {
                const IconComponent = categoryIcons[category]
                return (
                  <button
                    key={category}
                    onClick={() => startTransition(() => setSelectedCategory(category))}
                    className={`
                      px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all
                      ${selectedCategory === category
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }
                    `}
                    title={category} // Добавляем tooltip с названием категории
                  >
                    {/* Показываем иконку на мобильных устройствах */}
                    {/* <div className="md:hidden flex items-center justify-center">
                      <div className="w-10">
                        <IconComponent className="w-5 h-5" />
                      </div>
                    </div> */}
                    {/* Показываем текст на десктопе */}
                    {/* <span className="hidden md:inline">{category}</span>
                  </button>
                )
              })}
            </div>
            
            {/* Gradient для индикации скролла */}
            {/* <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none" />
          </div>
        </div> */}

        {/* Sort options - компактная версия */}
        {/* <div className="mb-6 px-4 sm:px-0">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  const newSortBy = option.value as 'latest' | 'popular' | 'trending' | 'subscribed'
                  console.log('[FeedPage] Sort filter clicked:', { from: sortBy, to: newSortBy })
                  startTransition(() => setSortBy(newSortBy))
                }}
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
        </div> */}

        {/* Posts Container */}
        <div style={{ 
          opacity: isPending ? 0.6 : 1,
          transition: 'opacity 0.2s ease-in-out'
        }}>
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
                onClick={handleCreatePost}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300"
              >
                <PlusIcon className="w-5 h-5" />
                Create first post
              </button>
            </div>
          }
          />
        </div>

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

      {/* Scroll to Top Button - показывается при скролле вниз */}
      {showScrollTop && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="fixed bottom-24 right-6 z-50 p-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 md:bottom-32 md:right-8"
          aria-label="Scroll to top"
        >
          <ArrowUpIcon className="w-6 h-6" />
        </button>
      )}

      {/* Floating Action Button - скрыт на мобильных устройствах */}
      <div className="hidden md:block">
        <FloatingActionButton
          onClick={handleCreatePost}
          label="Create Post"
          hideOnScroll={true}
          offset={{ bottom: 32, right: 32 }}
        />
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={(createdPost) => {
            console.log('[FeedPage] Post created successfully, refreshing feed...')
            setShowCreateModal(false)
            loadPosts();
            // 🔥 OPTIMIZATION: Refresh feed to show new post immediately
            if (refresh) {
              console.log('[FeedPage] Calling refresh() to update feed...')
              
              // 🔥 SAFETY: Добавляем небольшую задержку перед refresh,
              // чтобы real-time обновление успело сработать
              setTimeout(() => {
                console.log('[FeedPage] Executing delayed refresh...')
                refresh(true) // clearCache = true для получения свежих данных
              }, 500) // 500ms задержка
              
            } else {
              console.warn('[FeedPage] refresh function not available')
            }
            
            // Показываем уведомление об успешном создании
            toast.success('Пост успешно создан! Обновляем ленту...', {
              duration: 3000,
              icon: '🎉'
            })
          }}
        />
      )}

      {/* Create Story Modal */}
      {showCreateStoryModal && (
        <CreateStoryModal
          onClose={() => setShowCreateStoryModal(false)}
          onStoryCreated={() => {
            console.log('[FeedPage] Story created successfully')
            setShowCreateStoryModal(false)
            // Обновляем список историй
            loadStories()
            toast.success('История успешно создана!', {
              duration: 3000,
              icon: '📸'
            })
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
          onSuccess={async () => {
            localStorage.removeItem("user_subscriptions");
            loadPosts();
          }}
          creator={selectedCreator}
          post={selectedPost}
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
        <CreatePostModal
          mode="edit"
          postId={selectedPost.id}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPost(null)
          }}
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

      {/* Story Viewer Popup */}
      {showStoryViewer && selectedUserStories.length > 0 && (
        <StoryViewPopup
          stories={selectedUserStories}
          initialStoryIndex={selectedStoryIndex}
          onClose={() => setShowStoryViewer(false)}
        />
      )}
    </div>
  )
} 