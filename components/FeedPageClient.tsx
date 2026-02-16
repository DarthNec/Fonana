'use client'

import { useState, useEffect, useRef, useMemo, useCallback, useTransition } from 'react'
import { useUser, useUserLoading } from '@/lib/store/appStore'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import { useOptimizedRealtimePosts } from '@/lib/hooks/useOptimizedRealtimePosts'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { FullscreenCarousel } from '@/components/feed/FullscreenCarousel'
import { UnifiedPost, PostAction } from '@/types/posts'
import CreatePostModal from '@/components/CreatePostModal'
import CreateStoryModal from '@/components/CreateStoryModal'
import StoryViewPopup from '@/components/StoryViewPopup'
import NewSubscribeModal from '@/components/NewSubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import SellablePostModal from '@/components/SellablePostModal'
import { TipSendModal } from '@/components/TipSendModal'
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
  const [showTipModal, setShowTipModal] = useState(false)
  const [tipCreatorId, setTipCreatorId] = useState<string | null>(null)
  const [tipCreatorName, setTipCreatorName] = useState<string | null>(null)
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
    return;
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
  
  /*
  // Загружаем истории при монтировании
  useEffect(() => {
    loadStories()
  }, [])
  */  


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
    pageSize: 150
  })

  // Real-time обновления
  const {
    posts: realtimePosts,
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

  /*
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      // Показываем кнопку если прокрутили больше 400px
      setShowScrollTop(scrollTop > 400)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  */

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
      
      if(user?.id)
      {
        let followingData = [];
        if(localStorage.getItem('user_following') !== null) {
          followingData = JSON.parse(localStorage.getItem('user_following') || '[]')
        } else {
          const followingResponse = await fetch(`/api/user/follow?userId=${user?.id}&type=following`)
          if (followingResponse.ok) {
            followingData = await followingResponse.json()
            localStorage.setItem('user_following', JSON.stringify(followingData.data || null))
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
            if(post.access.tier && !post.access.price) {
              post.access.shouldHideContent = false;
              post.access.isLocked = false;
            } 
            /*
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
            */
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
      case 'tip':
        setTipCreatorId(post.creator.id)
        setTipCreatorName(post.creator.name || post.creator.nickname || null)
        setShowTipModal(true)
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
      case 'share':
        // Копируем ссылку на пост
        const postUrl = `${window.location.origin}/post/${action.postId}`
        navigator.clipboard.writeText(postUrl)
          .then(() => toast.success('Link copied'))
          .catch(() => toast.error('Failed to copy link'))
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
    <div className="h-screen overflow-hidden bg-white dark:bg-slate-900">
      {/* FullscreenCarousel - показываем все посты */}
      <FullscreenCarousel
        posts={filteredAndSortedPosts}
        initialIndex={0}
        onPostChange={(post, index) => {
          console.log('[Feed] Post changed:', post.id, 'index:', index)
        }}
        onAction={handlePostAction}
        onLoadMore={hasMore && !isLoadingMore ? () => {
          console.log('[Feed] Loading more posts...')
          // Infinite scroll logic handled by useOptimizedPosts
        } : undefined}
        isFullscreen={false} // Для главной страницы нужен отступ max-md:pb-20
      />
      
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
        <NewSubscribeModal
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

      {/* Tip Modal */}
      {showTipModal && tipCreatorId && (
        <TipSendModal
          isOpen={showTipModal}
          onClose={() => {
            setShowTipModal(false)
            setTipCreatorId(null)
            setTipCreatorName(null)
          }}
          creatorId={tipCreatorId}
          creatorName={tipCreatorName || undefined}
        />
      )}
    </div>
  )
} 