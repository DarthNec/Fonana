'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import { usePostsCounts } from '@/lib/hooks/usePostsCounts'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { PostAction } from '@/types/posts'
import Avatar from './Avatar'
import ProfileSetupModal from './ProfileSetupModal'
import CreatePostModal from './CreatePostModal'
import SubscribeModal from './SubscribeModal'
import PurchaseModal from './PurchaseModal'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { CheckBadgeIcon, UsersIcon, DocumentTextIcon, CurrencyDollarIcon, PencilIcon, ShareIcon, PhotoIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { jwtManager } from '@/lib/utils/jwt'
import { useRouter } from 'next/navigation'

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
  const [activeTab, setActiveTab] = useState<'all' | 'media'>('all')
  const [isUploadingBackground, setIsUploadingBackground] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  
  // Posts модалки
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showEditPostModal, setShowEditPostModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)
  
  const user = useUser()
  const router = useRouter()
  const { setVisible } = useSafeWalletModal()

  // Определяем, является ли текущий пользователь владельцем профиля
  const isOwner = user?.id === creatorId

  // Проверяем статус фолловинга
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || !creator || isOwner) return
      
      try {
        const token = await jwtManager.getToken()
        if (!token) return
        
        const response = await fetch(`/api/follow?followingId=${creator.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsFollowing(data.isFollowing)
        }
      } catch (error) {
        console.error('Error checking follow status:', error)
      }
    }
    
    checkFollowStatus()
  }, [user, creator, isOwner])

  // Posts data с фильтрацией по создателю
  const postsData = useOptimizedPosts({
    creatorId: creatorId,
    variant: 'creator',
    sortBy: 'latest',
    pageSize: activeTab === 'media' ? 50 : 20 // [media_only_tab_optimization_2025_017] Больше постов для медиа
  })

  // [media_only_tab_optimization_2025_017] Точные счетчики постов по типам
  const postsCountsData = usePostsCounts({
    creatorId: creatorId,
    types: ['image', 'video', 'audio', 'text'],
    enabled: !!creatorId
  })

  // Фильтрация постов по активной табке
  const filteredPosts = useMemo(() => {
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

  // [media_only_tab_optimization_2025_017] Используем точные счетчики вместо фильтрации загруженных постов
  const tabCounts = useMemo(() => {
    if (postsCountsData.counts) {
      return {
        all: postsCountsData.totalPosts,
        media: postsCountsData.mediaPosts
      }
    }
    
    // Fallback на старую логику если API недоступен
    if (postsData.posts) {
      return {
        all: postsData.posts.length,
        media: postsData.posts.filter(p => ['image', 'video', 'audio'].includes(p.media?.type || 'text')).length
      }
    }
    
    return { all: 0, media: 0 }
  }, [postsCountsData.counts, postsCountsData.totalPosts, postsCountsData.mediaPosts, postsData.posts])

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
    if (['subscribe', 'purchase', 'like'].includes(action.type)) {
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
        if (action.data?.post) {
          setSelectedPost(action.data.post)
          setShowEditPostModal(true)
        }
        break
        
      case 'like':
        // Handle like action - already handled by PostActions
        toast.success('Post liked!')
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
        
      default:
        console.warn('[CreatorPageClient] Unhandled post action:', action)
    }
  }

  // Функция для фолловинга/анфолловинга
  const handleFollow = async () => {
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
  const handleStartConversation = async () => {
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
        
        // Перенаправляем на страницу диалога
        router.push(`/messages/${conversationId}`)
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
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
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
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      {/* Background Image */}
      <div className="absolute top-0 left-0 w-full h-80 overflow-hidden">
        {creator.backgroundImage ? (
          <>
            <img 
              src={creator.backgroundImage}
              alt={`${creator.fullName || creator.nickname} background`}
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50 dark:to-slate-900"></div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20" />
        )}
        
        {/* Background Edit Button - only for owner */}
        {isOwner && (
          <button
            onClick={() => backgroundInputRef.current?.click()}
            disabled={isUploadingBackground}
            className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all group"
            title="Change background image"
          >
            <PhotoIcon className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
          </button>
        )}
        
        <input
          ref={backgroundInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleBackgroundUpload}
          disabled={isUploadingBackground}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-6">
          {/* Header Section with Background */}
          <div className="relative">
            {/* Background Image Layer - только для header части */}
            {creator.backgroundImage && (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-10 pointer-events-none"
                style={{ backgroundImage: `url(${creator.backgroundImage})` }}
              />
            )}
            
            {/* Content Overlay */}
            <div className="relative z-10 p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar Section */}
              <div className="flex-shrink-0">
                <Avatar
                  src={creator.avatar}
                  alt={creator.fullName || creator.nickname || 'Creator'}
                  seed={creator.nickname || creator.id}
                  size={120}
                  rounded="3xl"
                  className="border-4 border-white dark:border-slate-800 shadow-lg"
                />
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
                      className="text-blue-500 hover:text-blue-600"
                    >
                      🌐 Website
                    </a>
                  )}
                  {creator.twitter && (
                    <a 
                      href={`https://twitter.com/${creator.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      🐦 Twitter
                    </a>
                  )}
                  {creator.telegram && (
                    <a 
                      href={`https://t.me/${creator.telegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      ✈️ Telegram
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {isOwner ? (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleFollow}
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
                      onClick={handleStartConversation}
                      disabled={isCreatingConversation}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      {isCreatingConversation ? 'Starting...' : 'Message'}
                    </button>
                  </>
                )}
                
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  <ShareIcon className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
            <UsersIcon className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {creator.followersCount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Followers</div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
            <DocumentTextIcon className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {creator.postsCount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Posts</div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center col-span-2 md:col-span-1">
            <CurrencyDollarIcon className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {creator.followingCount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Following</div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          {/* Tabs Header */}
          <div className="flex border-b border-gray-200 dark:border-slate-700">
            {['All Posts', 'Media Only'].map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(index === 0 ? 'all' : 'media')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  (index === 0 && activeTab === 'all') || (index === 1 && activeTab === 'media')
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50 dark:bg-purple-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab}
                <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-full text-xs">
                  {/* [media_only_tab_optimization_2025_017] Используем точные счетчики из API */}
                  {postsCountsData.isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    index === 0 
                      ? tabCounts.all 
                      : tabCounts.media
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Posts Container */}
          <div className="min-h-[200px] px-6 pb-6">
            {postsData.isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredPosts.length > 0 ? (
              <PostsContainer
                posts={filteredPosts}
                layout={activeTab === 'media' ? 'gallery' : 'list'}
                onAction={handlePostAction}
              />
            ) : activeTab === 'media' ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No media posts yet</p>
                <p className="text-sm">This creator hasn't shared any images, videos, or audio content yet.</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No posts yet</p>
                <p className="text-sm">This creator hasn't shared any content yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
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
            postsData.refresh?.()
            toast.success('Post updated successfully!')
          }}
        />
      )}
    </div>
  )
}
