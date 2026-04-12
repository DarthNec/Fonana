'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { FullscreenCarousel } from '@/components/feed/FullscreenCarousel'
import { PostAction, UnifiedPost } from '@/types/posts'
import toast from 'react-hot-toast'
import { useUser } from '@/lib/store/appStore'
import NewSubscribeModal from '@/components/NewSubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import { TipSendModal } from '@/components/TipSendModal'
import Avatar from '@/components/Avatar'
import { cn } from '@/lib/utils'
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

export default function ExplorePageClientMobile() {
  const router = useRouter()
  const user = useUser()
  const { setVisible } = useSafeWalletModal()
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState(0)
  const [fullscreenPosts, setFullscreenPosts] = useState<UnifiedPost[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Creator[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  
  // Модалки
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)
  const [selectedTipCreator, setSelectedTipCreator] = useState<any>(null)

  useEffect(() => {
    console.log('[ExplorePageClientMobile] useEffect')
    loadData()
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
      // Загружаем посты (initial load: 40 вместо 150 для быстрой загрузки)
      const postsResponse = await fetch('/api/posts?limit=40')
      if (postsResponse.ok) {
        const postsData = await postsResponse.json()
        const rawPosts = postsData.posts || []
        
        // Получаем подписки и покупки из localStorage
        let subscriptions: any = []
        if (localStorage.getItem('user_subscriptions') !== null) {
          subscriptions = JSON.parse(localStorage.getItem('user_subscriptions') || '[]')
        }

        let purchasesData: any[] = []
        if (localStorage.getItem('user_purchases') !== null) {
          purchasesData = JSON.parse(localStorage.getItem('user_purchases') || '[]')
        }

        // Обрабатываем посты
        const processed = rawPosts
          // ✅ ФИЛЬТР: Исключаем ai-video посты (на Explore показываем только готовый контент)
          .filter((post: any) => post.media?.type !== 'ai-video')
          .map((post: any) => {
          const updatedPost = { 
            ...post, 
            access: { ...post.access },
            requestId: post.requestId || null,
            media: {
              ...post.media,
              requestId: post.requestId || null,
            },
            engagement: {
              likes: post.likesCount || post.likes || 0,
              comments: post.commentsCount || post.comments || 0,
              views: post.viewsCount || post.views || 0,
              isLiked: post.isLiked || false
            }
          }
          
          // Проверяем подписки
          if (subscriptions?.subscriptions?.length > 0) {
            const sub = subscriptions.subscriptions.find((s: any) => s.creatorId === post.creator.id)
            if (sub?.isActive && post.access?.tier && !post.access?.price) {
              updatedPost.access.shouldHideContent = false
              updatedPost.access.isLocked = false
            }
          }

          // Проверяем покупки
          if (purchasesData.length > 0) {
            const purchase = purchasesData.find((p: any) => p.postId === post.id)
            if (purchase) {
              updatedPost.access.isPurchased = true
              updatedPost.access.isLocked = false
              updatedPost.access.shouldHideContent = false
            }
          }

          if(post.creator.id === user?.id) {
            updatedPost.access.isCreatorPost = true
            updatedPost.access.shouldHideContent = false
            updatedPost.access.isLocked = false
          }

          return updatedPost
        })

        setPosts(processed)
        console.log('[ExplorePageClientMobile] Processed posts:', processed)
      }

      // Загружаем креаторов
      const creatorsResponse = await fetch('/api/creators?limit=20')
      if (creatorsResponse.ok) {
        const creatorsData = await creatorsResponse.json()
        const creatorsArray = creatorsData.creators || []
        
        // Сортируем: сначала с аватарами, потом без
        const sortedCreators = creatorsArray.sort((a: Creator, b: Creator) => {
          const hasAvatarA = a.avatar && 
                            a.avatar.trim() !== '' && 
                            !a.avatar.includes('dicebear.com')
          const hasAvatarB = b.avatar && 
                            b.avatar.trim() !== '' && 
                            !b.avatar.includes('dicebear.com')
          
          // Если у A есть аватар, а у B нет → A идёт первым (-1)
          if (hasAvatarA && !hasAvatarB) return -1
          // Если у B есть аватар, а у A нет → B идёт первым (1)
          if (!hasAvatarA && hasAvatarB) return 1
          // Если оба с аватарами или оба без → сохраняем исходный порядок
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

  // Открытый контент (бесплатный)
  const publicPosts = useMemo(() => {
    if (!posts.length) return []
    
    return posts.filter(post => 
      !post.access?.isLocked && 
      !post.access?.price && 
      !post.commerce?.isSellable
    )
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
        // Копируем ссылку на пост
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
        break
      
      case 'delete':
        // Удаляем пост напрямую без confirmation
        try {
          if (!user?.wallet) {
            toast.error('Wallet not connected')
            return
          }
          
          const response = await fetch(`/api/posts/${action.postId}?userWallet=${user.wallet}`, {
            method: 'DELETE'
          })
          
          if (response.ok) {
            setPosts(prev => prev.filter(p => p.id !== action.postId))
            toast.success('Post deleted successfully')
            
            // Если в fullscreen режиме - закрываем
            if (showFullscreen) {
              setShowFullscreen(false)
            }
          } else {
            const errorData = await response.json()
            toast.error(errorData.error || 'Failed to delete post')
          }
        } catch (error) {
          console.error('[ExplorePageClientMobile] Delete error:', error)
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
    setShowSearchResults(false)
    setSearchQuery('')
  }

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
      // Открываем модальное окно подключения кошелька
      setVisible(true)
      toast.success('Подключите кошелек для отправки сообщений')
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
    <div className="w-screen min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 overflow-x-hidden">
      {/* Search Bar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700 w-full">
        <div className="w-full px-3 py-3">
          <div className="relative search-container">
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 min-w-0 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 z-10" />
                <input
                  type="text"
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearchQuery(value)
                    
                    // Очищаем предыдущий таймер
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current)
                    }
                    
                    // Если меньше 2 символов - очищаем результаты
                    if (value.trim().length < 2) {
                      setSearchResults([])
                      setShowSearchResults(false)
                      setIsSearching(false)
                      return
                    }
                    
                    // Показываем loader
                    setIsSearching(true)
                    
                    // Debounce 300ms
                    searchTimeoutRef.current = setTimeout(() => {
                      handleSearch(value)
                    }, 300)
                  }}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  className="w-full bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                    setShowSearchResults(false)
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition-all flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 max-h-[400px] overflow-y-auto z-50">
                {searchResults.map((creator) => (
                  <button
                    key={creator.id}
                    onClick={() => handleCreatorClick(creator.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-0"
                  >
                    <Avatar
                      src={creator.avatar}
                      alt={creator.nickname}
                      seed={creator.id}
                      size={40}
                      className="rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {creator.fullName || creator.nickname}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        @{creator.nickname}
                      </p>
                    </div>
                    {creator.isVerified && (
                      <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 p-6 text-center z-50">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400 text-sm">No creators found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lottery Button */}
      <div className="mb-4 w-full flex justify-center px-3 mt-4">
        <button
          onClick={() => {
            // Проверяем авторизацию
            if (!user) {
              setVisible(true) // Открываем модалку выбора метода входа
              return
            }
            // Переход на страницу лотереи
            router.push('/lottery')
          }}
          className="w-[95%] py-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 hover:from-yellow-500 hover:via-orange-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span className="text-xl">🎰</span>
          <span className="text-sm">Try Your Luck - Spin the Wheel!</span>
          <span className="text-xl">✨</span>
        </button>
      </div>

      {/* Creators Horizontal Scroll */}
      {creators.length > 0 && (
        <div className="mb-6 mt-4 w-full max-w-full">
          <div className="px-3 mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Creators
            </h2>
            <button 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('[ExplorePageClientMobile] Navigating to all creators')
                router.push('/creators')
              }}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-3 pb-2 pt-1">
              {creators.map((creator, index) => {
                // Рандомные креаторы с Live Chat (индексы 0, 1, 3 например)
                const hasLiveChat = [0, 1, 3].includes(index)
                
                return (
                  <button
                    key={creator.id}
                    onClick={() => handleCreatorClick(creator.id)}
                    className="flex flex-col items-center gap-2 flex-shrink-0 group"
                  >
                    {/* Avatar with Live Chat badge */}
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                        <Avatar
                          src={creator.avatar}
                          alt={creator.nickname}
                          seed={creator.id}
                          size={96}
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
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full px-2.5 py-0 flex items-center gap-1 shadow-lg border-2 border-white dark:border-slate-900 hover:from-green-500 hover:to-emerald-600 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                          <span className="text-white text-[9px] font-bold uppercase tracking-tight leading-none py-0.5">Live chat</span>
                        </button>
                      )}
                    </div>
                    {/* Username */}
                    <span className="text-gray-900 dark:text-white text-[11px] max-w-[96px] truncate">
                      @{creator.nickname}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fonana Exclusive (открытые посты) - Horizontal Scroll */}
      {publicPosts.length > 0 && (
        <div className="mb-6 w-full max-w-full">
          <div className="px-3 mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Fonana Exclusive
            </h2>
            <button 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('[ExplorePageClientMobile] Navigating to public posts')
                router.push('/creators?filter=public')
              }}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex gap-2.5 px-3 pb-2">
              {publicPosts.slice(0, 20).map((post, index) => (
                <button
                  key={post.id}
                  onClick={() => handlePostClick(publicPosts, index)}
                  className="flex-shrink-0 w-28 group"
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
        </div>
      )}

      {/* Locked Content (платные/подписочные посты) - Horizontal Scroll */}
      {lockedPosts.length > 0 && (
        <div className="mb-6 w-full max-w-full">
          <div className="px-3 mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Premium Content
            </h2>
            <button 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('[ExplorePageClientMobile] Navigating to premium posts')
                router.push('/creators?filter=premium')
              }}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex gap-2.5 px-3 pb-2">
              {lockedPosts.slice(0, 20).map((post, index) => (
                <button
                  key={post.id}
                  onClick={() => handlePostClick(lockedPosts, index)}
                  className="flex-shrink-0 w-28 group"
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
        </div>
      )}

      {/* Empty State */}
      {publicPosts.length === 0 && lockedPosts.length === 0 && (
        <div className="text-center py-20 px-3">
          <svg className="w-20 h-20 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No posts yet</h2>
          <p className="text-gray-600 dark:text-gray-400">Check back later for new content</p>
        </div>
      )}

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
    </div>
  )
}
