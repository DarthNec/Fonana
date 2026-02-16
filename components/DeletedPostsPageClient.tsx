'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { TrashIcon, ArrowPathIcon, ChevronLeftIcon, ClockIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { FullscreenCarousel } from '@/components/feed/FullscreenCarousel'
import { PostAction, UnifiedPost } from '@/types/posts'

interface DeletedPost {
  id: string
  originalPostId: string
  title: string
  content: string
  type: string
  category: string | null
  thumbnail: string | null
  mediaUrl: string | null
  blurUrl: string | null
  previewUrl: string | null
  isLocked: boolean
  isPremium: boolean
  price: number | null
  currency: string
  isSellable: boolean
  likesCount: number
  commentsCount: number
  viewsCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string
  deletedBy: string | null
  deletionReason: string | null
}

export default function DeletedPostsPageClient() {
  const user = useUser()
  const router = useRouter()
  const { publicKey } = useWallet()
  const userWallet = publicKey?.toBase58() || null
  const [deletedPosts, setDeletedPosts] = useState<DeletedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  
  // Fullscreen viewer state
  const [showFullscreenView, setShowFullscreenView] = useState(false)
  const [fullscreenInitialIndex, setFullscreenInitialIndex] = useState(0)

  // Конвертация DeletedPost в UnifiedPost для FullscreenCarousel
  const convertToUnifiedPosts = (posts: DeletedPost[]): UnifiedPost[] => {
    return posts.map(post => ({
      id: post.id,
      content: {
        title: post.title,
        text: post.content,
      },
      media: {
        type: post.type as 'image' | 'video' | 'audio' | 'text',
        url: post.mediaUrl || '',
        thumbnail: post.thumbnail || '',
        blurHash: post.blurUrl || undefined,
        aspectRatio: post.type === 'video' ? '16:9' : '1:1',
      },
      creator: {
        id: post.creatorId,
        nickname: user?.nickname || 'Unknown',
        fullName: user?.fullName || 'Unknown',
        avatar: user?.avatar || '',
        isVerified: user?.isVerified || false,
      },
      engagement: {
        likes: post.likesCount,
        comments: post.commentsCount,
        views: post.viewsCount,
        shares: 0,
      },
      access: {
        isLocked: post.isLocked,
        isPremium: post.isPremium,
        isSellable: post.isSellable,
        price: post.price || 0,
        currency: post.currency,
        canView: true,
        canDownload: false,
      },
      metadata: {
        createdAt: post.createdAt,
        category: post.category || undefined,
      },
      interactions: {
        isLiked: false,
        isBookmarked: false,
      },
    }))
  }

  const unifiedPosts = convertToUnifiedPosts(deletedPosts)

  // Handle post actions in fullscreen
  const handlePostAction = async (action: PostAction) => {
    console.log('Post action:', action)
    
    // Для deleted posts доступны только базовые действия
    if (action.type === 'close') {
      setShowFullscreenView(false)
      return
    }
    
    // Share action
    if (action.type === 'share') {
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
      return
    }

    // Остальные действия недоступны для deleted posts
    toast.error('This action is not available for deleted posts')
  }

  useEffect(() => {
    if (!user?.id) {
      router.push('/feed')
      return
    }
    loadDeletedPosts()
  }, [user?.id, router])

  const loadDeletedPosts = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/posts/deleted?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        setDeletedPosts(data.posts)
      } else {
        toast.error('Failed to load deleted posts')
      }
    } catch (error) {
      console.error('Error loading deleted posts:', error)
      toast.error('Failed to load deleted posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (deletedPostId: string) => {
    if (!userWallet) {
      toast.error('Please connect your wallet')
      return
    }

    setRestoringId(deletedPostId)
    try {
      const response = await fetch('/api/posts/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedPostId, userWallet })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Post restored successfully!')
        
        // Удаляем из списка
        setDeletedPosts(prev => prev.filter(p => p.id !== deletedPostId))
        
        // Обновляем счётчик в localStorage
        const currentCount = parseInt(localStorage.getItem('deletedPostsCount') || '0')
        const newCount = Math.max(0, currentCount - 1)
        
        if (newCount === 0) {
          // Если счётчик стал 0, удаляем ключ из localStorage
          localStorage.removeItem('deletedPostsCount')
        } else {
          // Иначе обновляем значение
          localStorage.setItem('deletedPostsCount', newCount.toString())
        }
        
        // Перезагружаем страницу для обновления сайдбара
        window.location.reload()
      } else {
        toast.error(data.error || 'Failed to restore post')
      }
    } catch (error) {
      console.error('Error restoring post:', error)
      toast.error('Failed to restore post')
    } finally {
      setRestoringId(null)
    }
  }

  // Вычислить оставшиеся дни до удаления
  const getDaysLeft = (deletedAt: string): number => {
    const deletedDate = new Date(deletedAt)
    const expirationDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 дней
    const now = new Date()
    const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, daysLeft)
  }

  // Получить цвет для badge оставшихся дней
  const getDaysLeftColor = (daysLeft: number): string => {
    if (daysLeft <= 7) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    if (daysLeft <= 14) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-slate-400">Loading deleted posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                <TrashIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Deleted Posts
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {deletedPosts.length} {deletedPosts.length === 1 ? 'post' : 'posts'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {deletedPosts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {deletedPosts.map((post, index) => {
              const daysLeft = getDaysLeft(post.deletedAt)
              const thumbnail = post.type === 'video' 
                ? (post.previewUrl || post.thumbnail || post.mediaUrl || '/placeholder.webp')
                : (post.thumbnail || post.mediaUrl || '/placeholder.webp')
              
              return (
                <div
                  key={post.id}
                  className="group relative bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-shadow"
                >
                  {/* Thumbnail - clickable */}
                  <div 
                    className="relative aspect-[3/4] bg-gray-100 dark:bg-slate-700 overflow-hidden cursor-pointer"
                    onClick={() => {
                      setFullscreenInitialIndex(index)
                      setShowFullscreenView(true)
                    }}
                  >
                    <img
                      src={thumbnail}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Video indicator */}
                    {post.type === 'video' && (
                      <div className="absolute bottom-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                      {post.title}
                    </h3>
                    
                    {/* Days left warning - ЯВНОЕ предупреждение */}
                    <div className={cn(
                      'px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5',
                      getDaysLeftColor(daysLeft)
                    )}>
                      <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        {daysLeft === 0 ? (
                          'Expired - cannot restore'
                        ) : daysLeft === 1 ? (
                          'Last day to restore!'
                        ) : daysLeft <= 7 ? (
                          `Only ${daysLeft} days left to restore`
                        ) : (
                          `${daysLeft} days left to restore`
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 dark:text-slate-600">
                      Deleted: {new Date(post.deletedAt).toLocaleDateString()}
                    </p>

                    {/* Restore button */}
                    <button
                      onClick={() => handleRestore(post.id)}
                      disabled={restoringId === post.id || daysLeft === 0}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2',
                        daysLeft === 0
                          ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {restoringId === post.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Restoring...</span>
                        </>
                      ) : daysLeft === 0 ? (
                        <span>Expired</span>
                      ) : (
                        <>
                          <ArrowPathIcon className="w-4 h-4" />
                          <span>Restore</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4 mx-auto">
              <TrashIcon className="w-10 h-10 text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No deleted posts
            </h3>
            <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              Your deleted posts will appear here and can be restored within 30 days
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Post Viewer */}
      {showFullscreenView && unifiedPosts.length > 0 && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-900">
          <FullscreenCarousel
            posts={unifiedPosts}
            initialIndex={fullscreenInitialIndex}
            onAction={handlePostAction}
            showBackButton={true}
            onBack={() => setShowFullscreenView(false)}
          />
        </div>
      )}
    </div>
  )
}
