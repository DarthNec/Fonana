'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Squares2X2Icon, LockClosedIcon, CurrencyDollarIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { FullscreenCarousel } from '@/components/feed/FullscreenCarousel'
import { SharePopup } from '@/components/posts/core/SharePopup'
import { PostAction, UnifiedPost } from '@/types/posts'
import toast from 'react-hot-toast'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useUser } from '@/lib/store/appStore'
import NewSubscribeModal from '@/components/NewSubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import { TipSendModal } from '@/components/TipSendModal'

type ContentTab = 'public' | 'feed' | 'store'

export default function ExplorePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useUser()
  const { publicKey } = useWallet()
  const userWallet = publicKey?.toBase58() || null
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<ContentTab>('public')
  const [isMobile, setIsMobile] = useState(false)
  const [sharePost, setSharePost] = useState<UnifiedPost | null>(null)
  
  // Модалки
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)
  const [selectedTipCreator, setSelectedTipCreator] = useState<any>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  // Определяем мобилку
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Проверяем filter из query параметров
  useEffect(() => {
    const filter = searchParams.get('filter')
    if (filter === 'public') {
      setActiveTab('public')
    } else if (filter === 'premium') {
      setActiveTab('store')
    }
  }, [searchParams])

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/posts?limit=150')

      if (response.ok) {
        const data = await response.json()
        console.log(`[ExplorePageClient] Posts loaded:`, data)
        
        const rawPosts = data.posts || []
        
        // Получаем подписки из localStorage
        let subscriptions: any = []
        if (localStorage.getItem('user_subscriptions') !== null) {
          subscriptions = JSON.parse(localStorage.getItem('user_subscriptions') || '[]')
        }
        console.log('[ExplorePageClient] SUBSCRIPTIONS:', subscriptions)

        // Получаем покупки из localStorage
        let purchasesData: any[] = []
        if (localStorage.getItem('user_purchases') !== null) {
          purchasesData = JSON.parse(localStorage.getItem('user_purchases') || '[]')
        }
        console.log('[ExplorePageClient] PURCHASES:', purchasesData)

        // Обрабатываем посты
        const processed = rawPosts.map((post: any) => {
          const updatedPost = { 
            ...post, 
            access: { ...post.access },
            // 🔥 Создаём объект engagement для UnifiedPost
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
            if (sub?.isActive) {
              if (post.access?.tier && !post.access?.price) {
                updatedPost.access.shouldHideContent = false
                updatedPost.access.isLocked = false
              }
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

        console.log('[ExplorePageClient] Processed posts:', processed.length)
        setPosts(processed)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to load posts')
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }

  // Фильтрация постов по типу контента
  const filteredPosts = useMemo(() => {
    if (!posts.length) return []
    
    let filtered: UnifiedPost[] = []
    
    switch (activeTab) {
      case 'public':
        // Открытый контент - бесплатный, без подписки
        filtered = posts.filter(post => 
          !post.access?.isLocked && 
          !post.access?.price && 
          !post.commerce?.isSellable
        )
        break
      case 'feed':
        // Контент по подпискам - требует подписку, но не платный
        filtered = posts.filter(post => 
          post.access?.tier && !post.access?.price
        )
        break
      case 'store':
        // Платный контент
        filtered = posts.filter(post => 
          post.access?.price || post.commerce?.isSellable
        )
        break
      default:
        filtered = posts
    }
    
    // Перемешиваем отфильтрованные посты
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]]
    }
    
    return filtered
  }, [posts, activeTab])

  const handlePostAction = async (action: PostAction) => {
    // ✅ FIX: Ищем пост в filteredPosts, а не в posts
    const post = filteredPosts.find(p => p.id === action.postId)
    
    if (!post) {
      console.error('[Explore] Post not found in filteredPosts:', {
        actionType: action.type,
        postId: action.postId,
        filteredPostsLength: filteredPosts.length,
        filteredPostIds: filteredPosts.map(p => p.id)
      })
      return
    }
    
    console.log('[Explore] handlePostAction:', action.type, 'for post:', post.id)
    
    switch (action.type) {
      case 'bookmark':
        if (!userWallet) {
          toast.error('Please connect your wallet')
          return
        }
        
        try {
          const response = await fetch('/api/bookmarks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              userWallet: userWallet,
              postId: action.postId 
            })
          })

          if (response.ok) {
            const data = await response.json()
            if (data.action === 'added') {
              toast.success('Added to bookmarks')
            } else {
              toast.success('Removed from bookmarks')
            }
          }
        } catch (error) {
          console.error('Error toggling bookmark:', error)
          toast.error('Failed to update bookmark')
        }
        break

      case 'subscribe':
        if (!post) return
        setSelectedPost(post)
        setSelectedCreator(post.creator)
        console.log('[Explore] Opening subscribe modal for:', post.creator)
        setShowSubscribeModal(true)
        break
        
      case 'purchase':
        if(!user?.id) {
          toast.error('You need to be logged in to purchase posts')
          return
        }
        if (!post) return
        // Формируем структуру для PurchaseModal
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
        console.log('[Explore] Opening purchase modal with price:', purchasePost.price)
        setSelectedPost(purchasePost)
        setShowPurchaseModal(true)
        break

      case 'tip':
        // Находим пост для получения данных о креаторе
        const tipPost = posts.find(p => p.id === action.postId)
        if (tipPost && tipPost.creator) {
          setSelectedTipCreator(tipPost.creator)
          setShowTipModal(true)
        }
        break

      case 'like':
      case 'unlike':
      case 'comment':
        // Эти действия обрабатываются в PostCard/PostActions
        break
        
      case 'share':
        // Открываем SharePopup модалку
        console.log('[Explore] Opening share popup for:', action.postId)
        const sharePostData = posts.find(p => p.id === action.postId)
        if (sharePostData) {
          console.log('[Explore] Share post data:', sharePostData)
          setSharePost(sharePostData)
        } else {
          // Fallback: если пост не найден, копируем ссылку
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
        }
        break
        
      case 'edit':
      case 'delete':
        // Эти действия обрабатываются в PostCard/PostActions
        break

      default:
        console.warn('Unhandled action type:', action.type)
    }
  }

  // Обработчик клика по посту - открывает fullscreen
  const handlePostClick = (postIndex: number, post: UnifiedPost) => {
    setFullscreenIndex(postIndex)
    setShowFullscreen(true)
  }

  // Если открыт fullscreen - показываем карусель поверх всего
  if (showFullscreen) {
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-900">
          <FullscreenCarousel
            posts={filteredPosts}
            initialIndex={fullscreenIndex}
            onAction={handlePostAction}
            showBackButton={true}
            onBack={() => setShowFullscreen(false)}
          />
        </div>

        {/* Subscribe Modal */}
        {showSubscribeModal && selectedCreator && (
          <NewSubscribeModal
            onClose={() => {
              setShowSubscribeModal(false)
              setSelectedCreator(null)
            }}
            onSuccess={async () => {
              localStorage.removeItem('user_subscriptions')
              loadPosts()
              setShowFullscreen(false)
            }}
            creator={selectedCreator}
          />
        )}

        {/* Purchase Modal */}
        {showPurchaseModal && selectedPost && (
          <PurchaseModal
            onClose={() => {
              setShowPurchaseModal(false)
              setSelectedPost(null)
            }}
            onSuccess={() => {
              localStorage.removeItem('user_purchases')
              loadPosts()
              setShowPurchaseModal(false)
              setSelectedPost(null)
              setShowFullscreen(false)
              toast.success('Покупка успешна!')
            }}
            post={selectedPost}
          />
        )}

        {/* Tip Modal */}
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin"></div>
            <Squares2X2Icon className="w-6 h-6 text-purple-600 dark:text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Content Type Tabs */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700">
        <div className="flex justify-center">
          <div className="flex">
            <button
              onClick={() => setActiveTab('public')}
              className={`py-4 px-6 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'public'
                  ? 'border-pink-500 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <GlobeAltIcon className="w-4 h-4" />
              Public
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`py-4 px-6 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'feed'
                  ? 'border-pink-500 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <LockClosedIcon className="w-4 h-4" />
              Feed
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`py-4 px-6 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'store'
                  ? 'border-pink-500 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <CurrencyDollarIcon className="w-4 h-4" />
              Store
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`${isMobile ? 'p-3' : 'p-6'}`}>
        {filteredPosts.length > 0 ? (
          <PostsContainer
            posts={filteredPosts}
            layout="gallery"
            variant="creator"
            columns={isMobile ? 2 : 4}
            onAction={handlePostAction}
            onPostClick={handlePostClick}
            showUsername={true}
          />
        ) : (
          <div className="text-center py-20">
            <Squares2X2Icon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {activeTab === 'public' && 'No public content'}
              {activeTab === 'feed' && 'No content for subscriptions'}
              {activeTab === 'store' && 'No paid content'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Try another category
            </p>
          </div>
        )}
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && selectedCreator && (
        <NewSubscribeModal
          onClose={() => {
            setShowSubscribeModal(false)
            setSelectedCreator(null)
          }}
          onSuccess={async () => {
            localStorage.removeItem('user_subscriptions')
            loadPosts()
          }}
          creator={selectedCreator}
        />
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && selectedPost && (
        <PurchaseModal
          onClose={() => {
            setShowPurchaseModal(false)
            setSelectedPost(null)
          }}
          onSuccess={() => {
            localStorage.removeItem('user_purchases')
            loadPosts()
            setShowPurchaseModal(false)
            setSelectedPost(null)
            toast.success('Покупка успешна!')
          }}
          post={selectedPost}
        />
      )}

      {/* Tip Modal */}
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

