'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Squares2X2Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { FullscreenCarousel } from '@/components/feed/FullscreenCarousel'
import { SharePopup } from '@/components/posts/core/SharePopup'
import { PostAction, UnifiedPost } from '@/types/posts'
import toast from 'react-hot-toast'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useUser } from '@/lib/store/appStore'
import NewSubscribeModal from '@/components/NewSubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import { TipSendModal } from '@/components/TipSendModal'
import Avatar from '@/components/Avatar'
import { jwtManager } from '@/lib/utils/jwt'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'

interface Creator {
  id: string
  nickname: string
  fullName?: string
  avatar?: string
  isVerified?: boolean
  postsCount?: number
}

export default function ExplorePageClient() {
  const router = useRouter()
  const user = useUser()
  const { publicKey } = useWallet()
  const { setVisible } = useSafeWalletModal()
  const userWallet = publicKey?.toBase58() || null
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState(0)
  const [fullscreenPosts, setFullscreenPosts] = useState<UnifiedPost[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [sharePost, setSharePost] = useState<UnifiedPost | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Creator[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Модалки
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)
  const [selectedTipCreator, setSelectedTipCreator] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [userWallet])

  // Определяем мобилку
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Закрытие поискового dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-container')) {
        setShowSearchResults(false)
      }
    }

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchResults])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Загружаем ВСЕ посты через /api/posts (не explore)
      const postsUrl = '/api/posts?limit=100'
        
      const postsResponse = await fetch(postsUrl)
      if (postsResponse.ok) {
        const data = await postsResponse.json()
        console.log(`[ExplorePageClient] Posts loaded:`, {
          posts: data.posts?.length || 0
        })
        
        const rawPosts = data.posts || []
        
        // Обрабатываем посты
        const processed = rawPosts
          .filter((post: any) => post.media?.type !== 'ai-video')
          .map((post: any) => {
            return { 
              ...post,
              engagement: post.engagement || {
                likes: post.likesCount || post.likes || 0,
                comments: post.commentsCount || post.comments || 0,
                views: post.viewsCount || post.views || 0,
                isLiked: post.isLiked || false
              }
            }
          })

        setPosts(processed)
        console.log('[ExplorePageClient] Processed posts:', processed.length)
      }

      // Загружаем креаторов
      const creatorsResponse = await fetch('/api/creators?limit=20')
      if (creatorsResponse.ok) {
        const creatorsData = await creatorsResponse.json()
        const creatorsArray = creatorsData.creators || []
        
        const sortedCreators = creatorsArray.sort((a: Creator, b: Creator) => {
          const hasAvatarA = a.avatar && 
                            a.avatar.trim() !== '' && 
                            !a.avatar.includes('dicebear.com')
          const hasAvatarB = b.avatar && 
                            b.avatar.trim() !== '' && 
                            !b.avatar.includes('dicebear.com')
          
          if (hasAvatarA && !hasAvatarB) return -1
          if (!hasAvatarA && hasAvatarB) return 1
          return 0
        })
        
        setCreators(sortCreatorsByPriority(sortedCreators))
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // Сортировка создателей: приоритетные (@mia-, @nana, @-chnytng, @priya-4) всегда первыми
  const sortCreatorsByPriority = (creatorsArray: Creator[]) => {
    const priorityNicknames = ['mia-', 'nana', '-chnytng', 'priya-4']
    
    return creatorsArray.sort((a, b) => {
      const aPriority = priorityNicknames.indexOf(a.nickname)
      const bPriority = priorityNicknames.indexOf(b.nickname)
      
      const aIsPriority = aPriority !== -1
      const bIsPriority = bPriority !== -1
      
      // Приоритетные креаторы всегда первыми
      if (aIsPriority && !bIsPriority) return -1
      if (!aIsPriority && bIsPriority) return 1
      
      // Если оба приоритетные - сортируем по порядку в массиве
      if (aIsPriority && bIsPriority) return aPriority - bPriority
      
      // Остальные - по наличию аватара (как было раньше)
      const hasAvatarA = a.avatar && 
                        a.avatar.trim() !== '' && 
                        !a.avatar.includes('dicebear.com')
      const hasAvatarB = b.avatar && 
                        b.avatar.trim() !== '' && 
                        !b.avatar.includes('dicebear.com')
      
      if (hasAvatarA && !hasAvatarB) return -1
      if (!hasAvatarA && hasAvatarB) return 1
      return 0
    })
  }

  // Сортировка платных постов: контент от приоритетных креаторов первым (в рандомном порядке)
  const sortLockedPostsByPriority = (posts: UnifiedPost[]) => {
    const priorityNicknames = ['mia-', 'nana', '-chnytng', 'priya-4']
    const priorityPosts: UnifiedPost[] = []
    const regularPosts: UnifiedPost[] = []
    
    posts.forEach(post => {
      const nickname = post.creator.nickname || ''
      if (priorityNicknames.includes(nickname)) {
        priorityPosts.push(post)
      } else {
        regularPosts.push(post)
      }
    })
    
    // Рандомизируем приоритетные посты
    const shuffledPriority = priorityPosts.sort(() => Math.random() - 0.5)
    
    // Возвращаем: сначала приоритетные (рандом), потом остальные
    return [...shuffledPriority, ...regularPosts]
  }

  // Поиск по создателям
  const handleSearch = (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    
    // Локальная фильтрация по nickname, fullName
    const filtered = creators.filter(creator => {
      const searchLower = query.toLowerCase().trim()
      const nickname = creator.nickname?.toLowerCase() || ''
      const fullName = creator.fullName?.toLowerCase() || ''
      
      return nickname.includes(searchLower) || fullName.includes(searchLower)
    })
    
    setSearchResults(filtered)
    setShowSearchResults(true)
    setIsSearching(false)
  }

  // Функция для создания или получения диалога
  const handleCreateConversation = async (creatorId: string) => {
    if (!user) {
      // Показываем toast с иконкой успеха (не ошибки)
      toast.success('Log in to start a conversation', {
        icon: '💬',
        duration: 3000,
      })
      return
    }

    if (user.id === creatorId) {
      toast.error('You cannot message yourself')
      return
    }

    setIsCreatingConversation(true)
    
    try {
      const token = await jwtManager.getToken()
      if (!token) {
        toast.success('Log in to start a conversation', {
          icon: '💬',
          duration: 3000,
        })
        return
      }

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          participantId: creatorId
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
      console.error('Error creating conversation:', error)
      toast.error('Failed to start conversation')
    } finally {
      setIsCreatingConversation(false)
    }
  }

  // Открытый контент (все посты без фильтрации)
  const publicPosts = useMemo(() => {
    if (!posts.length) return []
    
    // Показываем все посты без фильтрации
    return posts
  }, [posts])

  // Закрытый контент (платный и подписочный)
  const lockedPosts = useMemo(() => {
    if (!posts.length) return []
    
    const filtered = posts.filter(post => 
      post.access?.price || post.commerce?.isSellable || post.access?.tier
    )
    
    // Сортируем: контент от приоритетных креаторов первым (в рандомном порядке)
    return sortLockedPostsByPriority(filtered)
  }, [posts])

  const handlePostAction = async (action: PostAction) => {
    const post = posts.find(p => p.id === action.postId)
    
    switch (action.type) {
      case 'subscribe':
        if (!post) return
        setSelectedPost(post)
        setSelectedCreator(post.creator)
        setShowSubscribeModal(true)
        break
        
      case 'purchase':
        if (!post) return
        const purchasePost = {
          id: post.id,
          title: post.content.title,
          price: post.access?.price || 0,
          currency: post.access?.currency || 'SOL',
          creator: {
            id: post.creator.id,
            name: post.creator.name,
            username: post.creator.username,
            avatar: post.creator.avatar,
            isVerified: post.creator.isVerified
          }
        }
        setSelectedPost(purchasePost)
        setShowPurchaseModal(true)
        break

      case 'tip':
        const tipPost = posts.find(p => p.id === action.postId)
        if (tipPost && tipPost.creator) {
          setSelectedTipCreator(tipPost.creator)
          setShowTipModal(true)
        }
        break
        
      case 'share':
        const postUrl = `${window.location.origin}/post/${action.postId}`
        try {
          await navigator.clipboard.writeText(postUrl)
          toast.success('Link copied to clipboard!', {
            duration: 2000,
            position: 'top-center',
          })
        } catch (err) {
          console.error('Error copying link:', err)
          toast.error('Failed to copy link', {
            duration: 2000,
            position: 'top-center',
          })
        }
        // Открываем SharePopup
        const sharePostData = posts.find(p => p.id === action.postId)
        if (sharePostData) {
          setSharePost(sharePostData)
        }
        break
      
      case 'delete':
        try {
          if (!userWallet) {
            toast.error('Wallet not connected')
            return
          }
          
          const response = await fetch(`/api/posts/${action.postId}?userWallet=${userWallet}`, {
            method: 'DELETE'
          })
          
          if (response.ok) {
            setPosts(prev => prev.filter(p => p.id !== action.postId))
            toast.success('Post deleted successfully')
            
            if (showFullscreen) {
              setShowFullscreen(false)
            }
          } else {
            const errorData = await response.json()
            toast.error(errorData.error || 'Failed to delete post')
          }
        } catch (error) {
          console.error('[ExplorePageClient] Delete error:', error)
          toast.error('Failed to delete post')
        }
        break
    }
  }

  const handlePostClick = (postsList: UnifiedPost[], postIndex: number) => {
    setFullscreenPosts(postsList)
    setFullscreenIndex(postIndex)
    setShowFullscreen(true)
  }

  const handleCreatorClick = (creatorId: string) => {
    router.push(`/creator/${creatorId}`)
  }

  // Горизонтальный скролл колесиком мыши
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    e.currentTarget.scrollLeft += e.deltaY
  }

  // Fullscreen view
  if (showFullscreen) {
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-900">
          <FullscreenCarousel
            posts={fullscreenPosts}
            initialIndex={fullscreenIndex}
            onAction={handlePostAction}
            showBackButton={true}
            onBack={() => setShowFullscreen(false)}
            isFullscreen={true}
          />
        </div>

        {showSubscribeModal && selectedCreator && (
          <NewSubscribeModal
            onClose={() => {
              setShowSubscribeModal(false)
              setSelectedCreator(null)
            }}
            onSuccess={async () => {
              localStorage.removeItem('user_subscriptions')
              loadData()
              setShowFullscreen(false)
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
            onSuccess={() => {
              localStorage.removeItem('user_purchases')
              loadData()
              setShowPurchaseModal(false)
              setSelectedPost(null)
              setShowFullscreen(false)
              toast.success('Purchase successful!')
            }}
            post={selectedPost}
          />
        )}

        {showTipModal && selectedTipCreator && (
          <div className="fixed inset-0 z-[500]">
            <TipSendModal
              isOpen={showTipModal}
              onClose={() => {
                setShowTipModal(false)
                setSelectedTipCreator(null)
              }}
              creatorId={selectedTipCreator.id}
              creatorName={selectedTipCreator.name || selectedTipCreator.nickname}
            />
          </div>
        )}

        {/* Share Popup */}
        {sharePost && (
          <div className="fixed inset-0 z-[500]">
            <SharePopup
              post={sharePost}
              isOpen={!!sharePost}
              onClose={() => setSharePost(null)}
            />
          </div>
        )}
      </>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 overflow-x-hidden">
      {/* Content */}
      <div className={`${isMobile ? 'p-3' : 'p-6'} max-w-full`}>
        {/* Search Bar */}
        <div className="mb-6 search-container relative">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search creators or content..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value
                setSearchQuery(value)
                
                // Очищаем предыдущий таймаут
                if (searchTimeoutRef.current) {
                  clearTimeout(searchTimeoutRef.current)
                }
                
                // Дебаунс 300мс
                searchTimeoutRef.current = setTimeout(() => {
                  handleSearch(value)
                }, 300)
              }}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 max-h-96 overflow-y-auto z-50">
              {isSearching ? (
                <div className="p-4 text-center">
                  <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((creator) => (
                    <button
                      key={creator.id}
                      onClick={() => {
                        handleCreatorClick(creator.id)
                        setShowSearchResults(false)
                        setSearchQuery('')
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Avatar
                        src={creator.avatar}
                        alt={creator.nickname}
                        seed={creator.id}
                        size={40}
                        className="rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          @{creator.nickname}
                        </div>
                        {creator.fullName && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {creator.fullName}
                          </div>
                        )}
                      </div>
                      {creator.isVerified && (
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No creators found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fonana Exclusive (открытые посты) */}
        {publicPosts.length > 0 && (
          <div className="mb-8 max-w-full">
            <div className={`${isMobile ? 'mb-4' : 'mb-6'} flex items-center justify-between`}>
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
                Fonana Exclusive
              </h2>
              <button 
                onClick={() => router.push('/creators?filter=public')}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-9'} ${isMobile ? 'gap-2.5' : 'gap-3'}`}>
              {publicPosts.slice(0, 24).map((post, index) => (
                  <button
                    key={post.id}
                    onClick={() => handlePostClick(publicPosts, index)}
                    className="group w-full"
                  >
                  {/* Post Card */}
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gray-200 dark:bg-slate-800 mb-2">
                    {/* Media */}
                    {post.media.type === 'image' && post.media.url && (
                      <img
                        src={post.media.url}
                        alt={post.content.title || 'Post'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    {post.media.type === 'video' && post.media.url && (
                      <video
                        src={post.media.url}
                        poster={post.media.preview}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Likes */}
                    {post.engagement?.likes > 0 && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white text-xs font-medium">
                          {post.engagement.likes > 999 ? `${(post.engagement.likes / 1000).toFixed(1)}k` : post.engagement.likes}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Creator Info */}
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={post.creator.avatar}
                      alt={post.creator.nickname || post.creator.name}
                      seed={post.creator.id}
                      size={24}
                      className="rounded-full flex-shrink-0"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      @{post.creator.nickname || post.creator.name}
                    </span>
                  </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Creators Grid */}
        {creators.length > 0 && (
          <div className="mb-8 max-w-full">
            <div className={`${isMobile ? 'mb-4' : 'mb-6'} flex items-center justify-between`}>
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
                Creators
              </h2>
              <button 
                onClick={() => router.push('/creators')}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <div className={`grid ${isMobile ? 'grid-cols-4' : 'grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12'} ${isMobile ? 'gap-3' : 'gap-4'}`}>
              {creators.slice(0, 24).map((creator, index) => {
                // LiveChat badge для первых 4-х пользователей (индексы 0, 1, 2, 3)
                const hasLiveChat = index < 4
                
                return (
                  <button
                    key={creator.id}
                    onClick={() => handleCreatorClick(creator.id)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="relative">
                      <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} rounded-full flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden`}>
                        <Avatar
                          src={creator.avatar}
                          alt={creator.nickname}
                          seed={creator.id}
                          size={isMobile ? 64 : 80}
                          className="rounded-full"
                        />
                      </div>
                      {/* Live Chat badge */}
                      {hasLiveChat && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCreateConversation(creator.id)
                          }}
                          disabled={isCreatingConversation}
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full px-2.5 py-1 flex items-center gap-1 shadow-lg border-2 border-white dark:border-slate-900 hover:from-green-500 hover:to-emerald-600 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                          <span className="text-white text-[9px] font-bold uppercase tracking-tight leading-none py-0.5">Live chat</span>
                        </button>
                      )}
                    </div>
                    <span className={`text-gray-900 dark:text-white ${isMobile ? 'text-xs' : 'text-sm'} truncate w-full text-center`}>
                      @{creator.nickname}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Premium Content (платные/подписочные посты) */}
        {lockedPosts.length > 0 && (
          <div className="mb-8 max-w-full">
            <div className={`${isMobile ? 'mb-4' : 'mb-6'} flex items-center justify-between`}>
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
                Premium Content
              </h2>
              <button 
                onClick={() => router.push('/creators?filter=premium')}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-9'} ${isMobile ? 'gap-2.5' : 'gap-3'}`}>
              {lockedPosts.slice(0, 24).map((post, index) => (
                  <button
                    key={post.id}
                    onClick={() => handlePostClick(lockedPosts, index)}
                    className="group w-full"
                  >
                  {/* Post Card */}
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gray-200 dark:bg-slate-800 mb-2">
                    {/* Media */}
                    {post.media.type === 'image' && post.media.url && (
                      <img
                        src={post.media.thumbnail || post.media.url}
                        alt={post.content.title || 'Post'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 blur-sm"
                      />
                    )}
                    {post.media.type === 'video' && post.media.url && (
                      <video
                        src={post.media.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    )}

                    {/* Lock overlay */}
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                      <div className="bg-white/90 dark:bg-slate-900/90 rounded-full p-3 shadow-lg">
                        <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>

                    {/* Price tag */}
                    {post.access?.price && (
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-1 rounded-full shadow-lg">
                        <span className="text-xs font-bold">
                          {post.access.price} SOL
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Creator Info */}
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={post.creator.avatar}
                      alt={post.creator.nickname || post.creator.name}
                      seed={post.creator.id}
                      size={24}
                      className="rounded-full flex-shrink-0"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      @{post.creator.nickname || post.creator.name}
                    </span>
                  </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Empty State */}
        {publicPosts.length === 0 && lockedPosts.length === 0 && (
          <div className="text-center py-20">
            <Squares2X2Icon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No posts yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Check back later for new content
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSubscribeModal && selectedCreator && (
        <NewSubscribeModal
          onClose={() => {
            setShowSubscribeModal(false)
            setSelectedCreator(null)
          }}
          onSuccess={async () => {
            localStorage.removeItem('user_subscriptions')
            loadData()
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
          onSuccess={() => {
            localStorage.removeItem('user_purchases')
            loadData()
            setShowPurchaseModal(false)
            setSelectedPost(null)
            toast.success('Purchase successful!')
          }}
          post={selectedPost}
        />
      )}

      {showTipModal && selectedTipCreator && (
        <div className="fixed inset-0 z-[500]">
          <TipSendModal
            isOpen={showTipModal}
            onClose={() => {
              setShowTipModal(false)
              setSelectedTipCreator(null)
            }}
            creatorId={selectedTipCreator.id}
            creatorName={selectedTipCreator.name || selectedTipCreator.nickname}
          />
        </div>
      )}

      {/* Share Popup */}
      {sharePost && (
        <SharePopup
          post={sharePost}
          isOpen={!!sharePost}
          onClose={() => setSharePost(null)}
        />
      )}
    </div>
  )
}
