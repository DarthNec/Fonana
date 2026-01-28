'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import { usePostsCounts } from '@/lib/hooks/usePostsCounts'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { FullscreenCarousel } from '@/components/feed/FullscreenCarousel'
import { PostAction } from '@/types/posts'
import Avatar from './Avatar'
import ProfileSetupModal from './ProfileSetupModal'
import CreatePostModal from './CreatePostModal'
import SubscribeModal from './SubscribeModal'
import PurchaseModal from './PurchaseModal'
import { TipSendModal } from './TipSendModal'
import { ProfileSharePopup } from './ProfileSharePopup'
import { FollowersPopup } from './FollowersPopup'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { CheckBadgeIcon, UsersIcon, DocumentTextIcon, CurrencyDollarIcon, PencilIcon, ShareIcon, PhotoIcon, ChatBubbleLeftIcon, GlobeAltIcon, HashtagIcon, PaperAirplaneIcon, LockClosedIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { jwtManager } from '@/lib/utils/jwt'
import { useRouter } from 'next/navigation'
import { useInView } from 'react-intersection-observer'
import { 
  needsPayment, 
  needsSubscription, 
  needsTierUpgrade 
} from '@/components/posts/utils/postHelpers'
import { DEFAULT_TIER_PRICES } from '@/lib/constants/tiers'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { safeToFixed } from '@/lib/utils/format'

interface CreatorData {
  id: string
  email?: string
  name?: string
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  backgroundImage?: string
  website?: string
  twitter?: string
  telegram?: string
  location?: string
  isVerified: boolean
  isCreator: boolean
  followersCount: number
  followingCount: number
  postsCount: number
  wallet: string
  solanaWallet?: string
  referrerId?: string
  referrer?: any
  createdAt: string
  updatedAt: string
}

interface CreatorPageClientProps {
  creatorId: string
}


export default function CreatorPageClient({ creatorId }: CreatorPageClientProps) {
  const [creator, setCreator] = useState<CreatorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'store' | 'all' | 'media'>('all')
  const [isUploadingBackground, setIsUploadingBackground] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  // Posts модалки
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showEditPostModal, setShowEditPostModal] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [showProfileSharePopup, setShowProfileSharePopup] = useState(false)
  const [showFollowersPopup, setShowFollowersPopup] = useState(false)
  const [followersPopupType, setFollowersPopupType] = useState<'followers' | 'following'>('followers')
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)
  
  // Fullscreen post viewer
  const [showFullscreenView, setShowFullscreenView] = useState(false)
  const [fullscreenInitialIndex, setFullscreenInitialIndex] = useState(0)
  
  const user = useUser()
  const router = useRouter()
  const { setVisible } = useSafeWalletModal()
  const { rate: solRate } = useSolRate()
  console.log('[CreatorPageClient] creator:', creator);
  // Определяем, является ли текущий пользователь владельцем профиля
  const isOwner = user?.id === creatorId

  // Проверяем статус фолловинга
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || !creator || isOwner) return
      
      try {
        const followData = localStorage.getItem('user_following') ? JSON.parse(localStorage.getItem('user_following') || '[]') : []
        setIsFollowing(followData.some((f: any) => f.user.id === creator.id))

        const subscribeData = localStorage.getItem('user_subscriptions') ? JSON.parse(localStorage.getItem('user_subscriptions') || '[]') : []
        setIsSubscribed(subscribeData.subscribedCreatorIds.some((s: any) => s === creator.id))

      } catch (error) {
        console.error('Error checking follow status:', error)
      }
    }
    
    checkFollowStatus()
  }, [user, creator, isOwner])

  // Posts data с фильтрацией по создателю
  const {
    posts,
    isLoading: postsLoading,
    error: postsError,
    hasMore,
    isLoadingMore,
    loadMore,
    refresh,
    handleAction
  } = useOptimizedPosts({
    creatorId: creatorId,
    variant: 'creator',
    sortBy: 'latest',
    pageSize: 20
  })

  // Infinite scroll hook
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px'
  })

  // [media_only_tab_optimization_2025_017] Точные счетчики постов по типам
  const postsCountsData = usePostsCounts({
    creatorId: creatorId,
    types: ['image', 'video', 'audio', 'text'],
    enabled: !!creatorId
  })

  // Infinite scroll effect - подгрузка постов при достижении конца страницы
  useEffect(() => {
    console.log('[CreatorPageClient] Infinite scroll state:', {
      inView,
      hasMore,
      isLoadingMore,
      postsCount: posts.length
    })
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    
    const distanceFromBottom = documentHeight - (scrollTop + windowHeight)
    
    if (inView && hasMore && !isLoadingMore && distanceFromBottom <= 250) {
      console.log('[CreatorPageClient] 🔥 Triggering loadMore() - Loading more posts...')
      loadMore()
    }
  }, [inView, hasMore, isLoadingMore, loadMore, posts.length])

  /*
  // Фильтрация постов по активной табке
  let filteredPosts = useMemo(() => {
    console.log('[CreatorPageClient] FilteredPosts useMemo triggered:')
    console.log('- activeTab:', activeTab)
    console.log('- postsData.posts length:', postsData.posts?.length)
    
    if (!postsData.posts) return []
    
    if (activeTab === 'media') {
      console.log('[CreatorPageClient] Filtering media posts:')
      console.log('- Total posts loaded:', postsData.posts.length)
      console.log('- First post structure:', JSON.stringify({
        id: postsData.posts[0]?.id, 
        mediaType: postsData.posts[0]?.media?.type,
        hasMedia: !!postsData.posts[0]?.media,
        title: postsData.posts[0]?.content?.title?.slice(0,20)
      }, null, 2))
      
      const mediaFiltered = postsData.posts.filter(post => {
        const hasMediaType = ['image', 'video', 'audio'].includes(post.media?.type || 'text')
        console.log(`Post ${post.id}: media.type=${post.media?.type}, hasMediaType=${hasMediaType}`)
        return hasMediaType
      })
      
      console.log('- Media posts found:', mediaFiltered.length)
      console.log('- Media posts:', mediaFiltered.map(p => ({ id: p.id, title: p.content?.title, mediaType: p.media?.type })))
      
      return mediaFiltered
    }
    
    console.log('[CreatorPageClient] Returning all posts:', postsData.posts.length)
    return postsData.posts
  }, [postsData.posts, activeTab])
  */

  // 🔥 ОПТИМИЗАЦИЯ: useMemo вместо useEffect+useState
  // Пересчитывается только когда posts/activeTab/user реально меняются
  const filteredPosts = useMemo(() => {
    // Пропускаем если постов нет
    if (!posts || posts.length === 0) {
      return []
    }
    
    console.log('[CreatorPageClient] Filtered posts:', posts)
    
    let postsFiltered = posts;
    
    // Обновляем статус покупок из localStorage
    if (typeof window !== 'undefined' && localStorage.getItem('user_purchases') !== null) {
      const purchasesData = JSON.parse(localStorage.getItem('user_purchases') || '[]')
      postsFiltered = postsFiltered.map((p: any) => {
        if (purchasesData.find((purchase: any) => purchase.postId === p.id)) {
          return {
            ...p,
            access: {
              ...p.access,
              isPurchased: true,
              shouldHideContent: false
            }
          }
        }
        return p
      })
    }

    if(localStorage.getItem('user_subscriptions') !== null) {
      const subscriptionsData = JSON.parse(localStorage.getItem('user_subscriptions') || '[]')
      if(subscriptionsData.subscribedCreatorIds.includes(creatorId)) {
        postsFiltered = postsFiltered.map((p: any) => {
          return {
            ...p,
            access: {
              ...p.access,
              isSubscribed: true,
              shouldHideContent: false,
              isLocked: false
            }
          }
        })
      }
    }

    if(user?.id === creatorId) {
      postsFiltered = postsFiltered.map((p: any) => {
        return {
          ...p,
          access: {
            ...p.access,
            isCreatorPost: true,
            shouldHideContent: false,
            isLocked: false
          }
        }
      })
    }

    
    // Фильтруем ai-video посты
    postsFiltered = postsFiltered.filter((post: any) => {
      if (post.media?.type === 'ai-video') {
        if (user?.id) {
          if (user.id !== post.creator?.id) return false
        } else return false
      }
      return true
    })
    
    // Фильтрация по активному табу
    postsFiltered = postsFiltered.filter((post: any) => {
      switch (activeTab) {
        case 'store':
          // Store - только платные посты (нужна покупка)
          return post.access?.price && post.access.price > 0
          
        case 'all':
          // Feed - только подписочные посты (tier без цены)
          return post.access?.tier && !post.access?.price
          
        case 'media':
          // Public - только открытый контент
          return !post.access?.tier && !post.access?.price 
          
        default:
          return true
      }
    })
    
    return postsFiltered
  }, [posts, activeTab, user?.id])


  useEffect(() => {
    fetchCreatorData()
  }, [creatorId])

  const fetchCreatorData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/creators/${creatorId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch creator: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.creator) {
        throw new Error('Creator not found')
      }
      
      setCreator(data.creator)
    } catch (err) {
      console.error('Error fetching creator:', err)
      setError(err instanceof Error ? err.message : 'Failed to load creator')
      toast.error('Failed to load creator profile')
    } finally {
      setLoading(false)
    }
  }

  // [profile_system_expansion_bugs_2025_017] Handler для обновления профиля  
  const handleProfileUpdate = async (profileData: any) => {
    try {
      // Добавляем wallet в запрос - API требует его
      const updateData = {
        ...profileData,
        wallet: creator?.wallet
      }
      
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const data = await response.json()
      
      // Обновляем локальные данные создателя
      setCreator(prev => prev ? { ...prev, ...data.user } : null)
      
      toast.success('Profile updated successfully!')
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    }
  }

  // Handler для загрузки фонового изображения
  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !creator) return

    setIsUploadingBackground(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadResponse = await fetch('/api/upload/background', {
        method: 'POST',
        body: formData
      })
      
      const uploadData = await uploadResponse.json()
      
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload background')
      }
      
      // Обновляем профиль с новым фоном
      const updateResponse = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: creator.wallet,
          backgroundImage: uploadData.backgroundUrl
        }),
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile')
      }

      const updateData = await updateResponse.json()
      
      // Обновляем локальные данные
      setCreator(prev => prev ? { ...prev, backgroundImage: uploadData.backgroundUrl } : null)
      
      toast.success('Background updated successfully!')
    } catch (error) {
      console.error('Error uploading background:', error)
      toast.error('Failed to upload background')
    } finally {
      setIsUploadingBackground(false)
    }
  }

  // [profile_system_expansion_2025_017] Handler для действий с постами
  const handlePostAction = async (action: PostAction) => {
    console.log('[CreatorPageClient] Post action:', action)
    
    // Проверяем аутентификацию для действий, требующих подключения кошелька
    if (['subscribe', 'purchase', 'like', 'add-emotion'].includes(action.type)) {
      if (!user) {
        setVisible(true)
        toast.success('Подключите кошелек для выполнения этого действия')
        return
      }
      
      const token = await jwtManager.getToken()
      if (!token) {
        setVisible(true)
        toast.success('Подключите кошелек для выполнения этого действия')
        return
      }
    }
    
    switch (action.type) {
      case 'subscribe':
        if (action.data?.creator) {
          setSelectedCreator(action.data.creator)
          setShowSubscribeModal(true)
        }
        break
        
      case 'purchase':
        if (action.data?.post) {
          setSelectedPost(action.data.post)
          setShowPurchaseModal(true)
        }
        break
        
      case 'edit':
        const post = filteredPosts.find((p: any) => p.id === action.postId);
        console.log('Edit post:', post);
        if (post != undefined && post != null) {
          setSelectedPost(post);
          setShowEditPostModal(true)
        }
        break
        
      case 'tip':
        setShowTipModal(true)
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
        
      case 'share':
        // Handle share action
        if (navigator.share && action.data?.post) {
          try {
            await navigator.share({
              title: action.data.post.content?.title || 'Check out this post',
              text: action.data.post.content?.text || '',
              url: `${window.location.origin}/post/${action.data.post.id}`
            })
          } catch (err) {
            // Fallback to clipboard copy
            await navigator.clipboard.writeText(`${window.location.origin}/post/${action.data.post.id}`)
            toast.success('Link copied to clipboard!')
          }
        }
        break
      
      case 'delete':
          // handleAction удаляет пост из posts, filteredPosts пересчитается через useMemo
          handleAction(action)
          console.log('Delete action:', action)
          break
      default:
        console.warn('[CreatorPageClient] Unhandled post action:', action)
    }
  }

  // Функция для фолловинга/анфолловинга
  const handleFollowClick = async () => {
    if (!user || !creator) {
      // 🔥 Открываем модальное окно подключения кошелька вместо ошибки
      setVisible(true)
      toast.success('Подключите кошелек для подписки')
      return
    }

    if (isOwner) {
      toast.error('You cannot follow yourself')
      return
    }

    setIsFollowLoading(true)
    
    try {
      const token = await jwtManager.getToken()
      if (!token) {
        // 🔥 Открываем модальное окно подключения кошелька вместо ошибки
        setVisible(true)
        toast.success('Подключите кошелек для подписки')
        return
      }

      const response = await fetch('/api/follow', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          followingId: creator.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setIsFollowing(!isFollowing)
        
        // Обновляем счетчик фолловеров в локальном состоянии
        setCreator(prev => prev ? {
          ...prev,
          followersCount: isFollowing 
            ? prev.followersCount - 1 
            : prev.followersCount + 1
        } : null)
        
        toast.success(isFollowing ? 'Unfollowed successfully!' : 'Followed successfully!')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to follow/unfollow')
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error)
      toast.error('Failed to follow/unfollow')
    } finally {
      setIsFollowLoading(false)
    }
  }

  // Функция для создания или получения диалога
  const handleCreateConversation = async () => {
    if (!user || !creator) {
      // 🔥 Открываем модальное окно подключения кошелька вместо ошибки
      setVisible(true)
      toast.success('Подключите кошелек для отправки сообщений')
      return
    }

    if (user.id === creator.id) {
      toast.error('You cannot message yourself')
      return
    }

    setIsCreatingConversation(true)
    
    try {
      const token = await jwtManager.getToken()
      if (!token) {
        // 🔥 Открываем модальное окно подключения кошелька вместо ошибки
        setVisible(true)
        toast.success('Подключите кошелек для отправки сообщений')
        return
      }

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          participantId: creator.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        const conversationId = data.conversation.id
        
        // Перенаправляем на страницу сообщений с выбранным диалогом
        router.push(`/messages?conversation=${conversationId}`)
        toast.success('Conversation started!')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to start conversation')
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      toast.error('Failed to start conversation')
    } finally {
      setIsCreatingConversation(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-xl p-8 text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Loading Creator Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we load the profile...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !creator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">😞</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Creator Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'The creator profile you\'re looking for doesn\'t exist.'}
            </p>
            <Link 
              href="/creators"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Browse Creators
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ==================== MOBILE HEADER ==================== */}
      <div className="md:hidden">
        {/* Mobile Banner */}
        <div className="relative h-32 w-full overflow-hidden">
          {creator.backgroundImage ? (
            <img 
              src={creator.backgroundImage}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
          )}
        </div>
        
        {/* Mobile Profile Info */}
        <div className="bg-slate-900 px-4 py-4">
          {/* Avatar + Name Row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-shrink-0">
              <Avatar
                src={creator.avatar}
                alt={creator.fullName || creator.nickname || 'Creator'}
                seed={creator.nickname || creator.id}
                size={64}
                rounded="full"
                className="border-2 border-white shadow-lg"
              />
              {!isOwner && (
                <button
                  onClick={handleFollowClick}
                  disabled={isFollowLoading}
                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg transition-all ${
                    isFollowing ? 'bg-green-500' : 'bg-gradient-to-r from-purple-600 to-pink-600'
                  }`}
                >
                  {isFollowLoading ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isFollowing ? (
                    <CheckIcon className="w-3 h-3 text-white" />
                  ) : (
                    <PlusIcon className="w-3 h-3 text-white" />
                  )}
                </button>
              )}
              {isOwner && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold text-white truncate">
                  {creator.fullName || creator.nickname}
                </h1>
                {creator.isVerified && (
                  <CheckBadgeIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-gray-400 text-sm">@{creator.nickname}</p>
            </div>
          </div>
          
          {/* Bio */}
          {creator.bio && (
            <p className="text-gray-300 text-sm leading-relaxed mb-3 line-clamp-2">
              {creator.bio}
            </p>
          )}
          
          {/* Social Links */}
          {(creator.website || creator.twitter || creator.telegram) && (
            /*
            <div className="flex flex-wrap gap-3 mb-3">
              {creator.website && (
                <a href={creator.website} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-purple-400 text-xs">
                  <GlobeAltIcon className="w-3.5 h-3.5" />
                  <span>Website</span>
                </a>
              )}
              {creator.twitter && (
                <a href={`https://twitter.com/${creator.twitter}`} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-purple-400 text-xs">
                  <HashtagIcon className="w-3.5 h-3.5" />
                  <span>Twitter</span>
                </a>
              )}
              {creator.telegram && (
                <a href={`https://t.me/${creator.telegram}`} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-purple-400 text-xs">
                  <PaperAirplaneIcon className="w-3.5 h-3.5" />
                  <span>Telegram</span>
                </a>
              )}
            </div>
          ) */ <div></div>)}
          
          {/* Stats Bar */}
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
            <button onClick={() => { setFollowersPopupType('followers'); setShowFollowersPopup(true); }}>
              <span className="font-semibold text-white">{creator.followersCount}</span> Followers
            </button>
            <div>
              <span className="font-semibold text-white">{filteredPosts.length}</span> Posts
            </div>
            <button onClick={() => { setFollowersPopupType('following'); setShowFollowersPopup(true); }}>
              <span className="font-semibold text-white">{creator.followingCount}</span> Following
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {isOwner ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-semibold"
              >
                <PencilIcon className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowTipModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-semibold"
                >
                  <CurrencyDollarIcon className="w-4 h-4" />
                  Tip
                </button>
                <button
                  onClick={handleCreateConversation}
                  disabled={isCreatingConversation}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 text-white border border-white/20 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  Message
                </button>
              </>
            )}
            <button
              onClick={() => setShowProfileSharePopup(true)}
              className="flex items-center justify-center w-10 h-10 bg-white/10 text-white border border-white/20 rounded-lg"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Hidden file input for mobile */}
        <input
          ref={backgroundInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleBackgroundUpload}
          disabled={isUploadingBackground}
        />
      </div>

      {/* ==================== DESKTOP HEADER ==================== */}
      <div className="hidden md:block">
        <div className="relative h-64 w-full overflow-hidden group">
          {creator.backgroundImage ? (
            <img 
              src={creator.backgroundImage}
              alt="Profile banner"
              className="w-full h-full object-cover object-[center_30%]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
          )}
          
          {/* Upload background button */}
          {isOwner && (
            <button
              onClick={() => backgroundInputRef.current?.click()}
              disabled={isUploadingBackground}
              className="absolute top-4 right-4 z-20 px-4 py-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 flex items-center gap-2"
            >
              <PhotoIcon className="w-5 h-5" />
              {isUploadingBackground ? 'Uploading...' : 'Change Banner'}
            </button>
          )}
          
          {/* Upload background input */}
          <input
            ref={backgroundInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleBackgroundUpload}
            disabled={isUploadingBackground}
          />
          
          {/* Profile Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-800/70 via-slate-800/50 to-transparent pt-16 pb-6 px-6">
            <div className="flex flex-row gap-6 items-end">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar
                  src={creator.avatar}
                  alt={creator.fullName || creator.nickname || 'Creator'}
                  seed={creator.nickname || creator.id}
                  size={120}
                  rounded="full"
                  className="border-4 border-white shadow-xl"
                />
                {!isOwner && (
                  <button
                    onClick={handleFollowClick}
                    disabled={isFollowLoading}
                    className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-all transform hover:scale-110 disabled:opacity-50 ${
                      isFollowing ? 'bg-green-500 hover:bg-green-600' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                    }`}
                  >
                    {isFollowLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isFollowing ? (
                      <CheckIcon className="w-5 h-5 text-white" />
                    ) : (
                      <PlusIcon className="w-5 h-5 text-white" />
                    )}
                  </button>
                )}
                {isOwner && (
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
                )}
              </div>
              
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold text-white">
                    {creator.fullName || creator.nickname}
                  </h1>
                  {creator.isVerified && (
                    <CheckBadgeIcon className="w-7 h-7 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                
                <p className="text-gray-400 text-sm mb-2">@{creator.nickname}</p>
                
                {creator.bio && (
                  <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">{creator.bio}</p>
                )}
                
                {/* Social Links */}
                {(creator.website || creator.twitter || creator.telegram) && (
                  <div className="flex flex-wrap gap-4 mt-3">
                    {creator.website && (
                      <a href={creator.website} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm transition-colors">
                        <GlobeAltIcon className="w-4 h-4" />
                        <span>Website</span>
                      </a>
                    )}
                    {creator.twitter && (
                      <a href={`https://twitter.com/${creator.twitter}`} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm transition-colors">
                        <HashtagIcon className="w-4 h-4" />
                        <span>Twitter</span>
                      </a>
                    )}
                    {creator.telegram && (
                      <a href={`https://t.me/${creator.telegram}`} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm transition-colors">
                        <PaperAirplaneIcon className="w-4 h-4" />
                        <span>Telegram</span>
                      </a>
                    )}
                  </div>
                )}
                
                {/* Stats Bar */}
                <div className="flex items-center gap-6 text-sm text-gray-400 mt-4">
                  <button onClick={() => { setFollowersPopupType('followers'); setShowFollowersPopup(true); }} className="hover:text-white transition-colors">
                    <UsersIcon className="w-4 h-4 inline mr-1" />
                    <span className="font-semibold text-white">{creator.followersCount.toLocaleString()}</span> Followers
                  </button>
                  <div>
                    <DocumentTextIcon className="w-4 h-4 inline mr-1" />
                    <span className="font-semibold text-white">{filteredPosts.length.toLocaleString()}</span> Posts
                  </div>
                  <button onClick={() => { setFollowersPopupType('following'); setShowFollowersPopup(true); }} className="hover:text-white transition-colors">
                    <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
                    <span className="font-semibold text-white">{creator.followingCount.toLocaleString()}</span> Following
                  </button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 flex-shrink-0">
                {isOwner ? (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25"
                  >
                    <PencilIcon className="w-5 h-5" />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowTipModal(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25"
                    >
                      <CurrencyDollarIcon className="w-5 h-5" />
                      Tip
                    </button>
                    <button
                      onClick={handleCreateConversation}
                      disabled={isCreatingConversation}
                      className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 hover:bg-white/20 hover:border-white/30 disabled:opacity-50"
                    >
                      <ChatBubbleLeftIcon className="w-5 h-5" />
                      Message
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowProfileSharePopup(true)}
                  className="flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl transform hover:scale-105 transition-all duration-300 hover:bg-white/20 hover:border-white/30"
                >
                  <ShareIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Content Area with unified Background */}
      <div className="relative bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 overflow-hidden min-h-[60vh]">
        {/* Background blur effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Tabs Navigation */}
        <div className="relative z-10 border-b border-gray-700/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('store')}
                className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'store'
                    ? 'border-pink-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Store
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`py-4 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'all'
                    ? 'border-pink-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <LockClosedIcon className="w-4 h-4" />
                Feed
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'media'
                    ? 'border-pink-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Public
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        {/* Header Card - СТАРАЯ СТРУКТУРА - УДАЛЯЕМ */}
        <div className="hidden">
          {/* Header Section with Background */}
          <div className="relative">
            {/* Background Image Layer - только для header части */}
            
            {creator.backgroundImage && (
              /*
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-10 pointer-events-none"
                style={{ backgroundImage: `url(${creator.backgroundImage})` }}
              />
              */ 
              <></>
            )}
            
            {/* Content Overlay */}
            <div className="relative z-10 p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar Section */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <Avatar
                    src={creator.avatar}
                    alt={creator.fullName || creator.nickname || 'Creator'}
                    seed={creator.nickname || creator.id}
                    size={120}
                    rounded="full"
                    className="border-4 border-white dark:border-slate-800 shadow-lg"
                  />
                  {/* Online Status Indicator */}
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-slate-800"></div>
                </div>
              </div>

              {/* Info Section */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                    {creator.fullName || creator.nickname}
                  </h1>
                  {creator.isVerified && (
                    <CheckBadgeIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  )}
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-1">
                  @{creator.nickname}
                </p>

                {creator.bio && (
                  <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                    {creator.bio}
                  </p>
                )}

                {/* Social Links */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {creator.website && (
                    <a 
                      href={creator.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <GlobeAltIcon className="w-4 h-4" />
                      <span>Website</span>
                    </a>
                  )}
                  {creator.twitter && (
                    <a 
                      href={`https://twitter.com/${creator.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <HashtagIcon className="w-4 h-4" />
                      <span>Twitter</span>
                    </a>
                  )}
                  {creator.telegram && (
                    <a 
                      href={`https://t.me/${creator.telegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      <span>Telegram</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {isOwner ? (
                  <>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit Profile
                    </button>
                    
                    {/* Dashboard кнопка только для мобильного вида */}
                    <Link
                      href="/dashboard"
                      className="sm:hidden flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CurrencyDollarIcon className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedCreator(creator)
                        setShowSubscribeModal(true)
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                    >
                      <CurrencyDollarIcon className="w-5 h-5" />
                      Subscribe
                    </button>
                    
                    <button 
                      onClick={handleFollowClick}
                      disabled={isFollowLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFollowing 
                          ? 'bg-gray-600 text-white hover:bg-gray-700' 
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      <HeartSolidIcon className="w-4 h-4" />
                      {isFollowLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                    
                    <button 
                      onClick={handleCreateConversation}
                      disabled={isCreatingConversation}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      {isCreatingConversation ? 'Starting...' : 'Message'}
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => setShowProfileSharePopup(true)}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 hover:bg-white/20 hover:border-white/30"
                >
                  <ShareIcon className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Subscribe Block for Feed tab - если не подписан */}
        {activeTab === 'all' && !isOwner && !isSubscribed ? (
          <div className="max-w-2xl mx-auto mt-12">
            <div className="bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-purple-900/20 border border-purple-500/30 rounded-2xl p-8 text-center">
              {/* Lock Icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <LockClosedIcon className="w-10 h-10 text-white" />
              </div>
              
              {/* Message */}
              <h3 className="text-2xl font-bold text-white mb-3">
                Subscribe to see my feed and message me
              </h3>
              
              {/* Subscribe Button */}
              <button
                onClick={() => {
                  setSelectedCreator(creator)
                  setShowSubscribeModal(true)
                }}
                className="mt-6 px-8 py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transform inline-flex items-center gap-3"
              >
                <span>Subscribe</span>
                <LockClosedIcon className="w-5 h-5" />
                <span className="font-bold">
                  {parseFloat(safeToFixed(DEFAULT_TIER_PRICES.basic, 3))} SOL
                </span>
              </button>
              
              {/* Price in USD */}
              {solRate > 0 && (
                <div className="mt-3 text-white/70 text-sm">
                  ${safeToFixed(DEFAULT_TIER_PRICES.basic * solRate, 2)} USD
                </div>
              )}
            </div>
          </div>
        ) : postsLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredPosts.length > 0 ? (
          <>
            <PostsContainer
              posts={filteredPosts} // layout={activeTab === 'media' ? 'gallery' : 'grid'}
              layout="gallery"
              variant="creator"
              columns={4}
              onAction={handlePostAction}
              onPostClick={(index, post) => {
                setFullscreenInitialIndex(index)
                setShowFullscreenView(true)
              }}
            />
            
            {/* Infinite scroll trigger */}
            {hasMore && !isLoadingMore && (
              <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                <div className="text-sm text-gray-500">
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
          </>
        ) : activeTab === 'store' ? (
          <div className="text-center py-12 text-gray-400">
            <CurrencyDollarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No paid posts yet</p>
            <p className="text-sm">This creator hasn't created any posts available for purchase.</p>
          </div>
        ) : activeTab === 'media' ? (
          <div className="text-center py-12 text-gray-400">
            <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No public posts yet</p>
            <p className="text-sm">This creator hasn't shared any public content yet.</p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <UsersIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No subscription posts yet</p>
            <p className="text-sm">This creator hasn't created any posts for subscribers.</p>
          </div>
        )}
        </div>
      </div>

      {/* Fullscreen Post Viewer */}
      {showFullscreenView && filteredPosts.length > 0 && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-900">
          <FullscreenCarousel
            posts={filteredPosts}
            initialIndex={fullscreenInitialIndex}
            onAction={handlePostAction}
            showBackButton={true}
            onBack={() => setShowFullscreenView(false)}
          />
        </div>
      )}

      {showEditModal && creator && (
        <ProfileSetupModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onComplete={handleProfileUpdate}
          userWallet={creator.wallet}
          mode="edit"
          initialData={{
            nickname: creator.nickname || '',
            fullName: creator.fullName || '',
            bio: creator.bio || '',
            avatar: creator.avatar,
            website: creator.website,
            twitter: creator.twitter,
            telegram: creator.telegram
          }}
        />
      )}

      {/* Posts модалки */}
      {showSubscribeModal && selectedCreator && (
        <SubscribeModal
          onClose={() => {
            setShowSubscribeModal(false)
            setSelectedCreator(null)
          }}
          creator={selectedCreator}
        />
      )}

      {showPurchaseModal && selectedPost && (
        <PurchaseModal
          onClose={() => {
            setShowPurchaseModal(false)
            setSelectedPost(null)
          }}
          post={selectedPost}
        />
      )}

      {showEditPostModal && selectedPost && (
        <CreatePostModal
          mode="edit"
          postId={selectedPost.id}
          onClose={() => {
            setShowEditPostModal(false)
            setSelectedPost(null)
          }}
          onPostUpdated={() => {
            setShowEditPostModal(false)
            setSelectedPost(null)
            // Перезагружаем посты
            refresh?.()
            toast.success('Post updated successfully!')
          }}
        />
      )}

      {/* Profile Share Popup */}
      {showProfileSharePopup && creator && (
        <ProfileSharePopup
          creator={{
            id: creator.id,
            name: creator.fullName,
            nickname: creator.nickname,
            fullName: creator.fullName,
            avatar: creator.avatar
          }}
          isOpen={showProfileSharePopup}
          onClose={() => setShowProfileSharePopup(false)}
        />
      )}

      {/* Followers/Following Popup */}
      {showFollowersPopup && creator && (
        <FollowersPopup
          userId={creator.id}
          type={followersPopupType}
          isOpen={showFollowersPopup}
          onClose={() => setShowFollowersPopup(false)}
        />
      )}

      {/* Tip Modal */}
      {showTipModal && creator && (
        <TipSendModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          creatorId={creator.id}
          creatorName={creator.fullName || creator.nickname}
        />
      )}
    </div>
  )
}
