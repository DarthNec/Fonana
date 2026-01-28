'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useRouter } from 'next/navigation'
import { BookmarkIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { FullscreenCarousel } from '@/components/feed/FullscreenCarousel'
import { PostAction, UnifiedPost } from '@/types/posts'
import { PostNormalizer } from '@/services/posts/normalizer'
import toast from 'react-hot-toast'
import { useWallet } from '@/lib/hooks/useSafeWallet'

interface BookmarkedPost {
  id: string
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
  requestId: string | null
  error: string | null
  likesCount: number
  commentsCount: number
  viewsCount: number
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    nickname: string | null
    fullName: string | null
    avatar: string | null
    isCreator: boolean
    name: string
    username: string
  }
  media: {
    type: string
    url: string | null
    thumbnail: string | null
    preview?: string | null
    error: string | null
    blurUrl: string | null
  }
  likes: number
  comments: number
  emotions: any[]
  bookmarkedAt: string
}

export default function BookmarksPageClient() {
  const user = useUser()
  const router = useRouter()
  const { publicKey } = useWallet()
  const userWallet = publicKey?.toBase58() || null
  const [bookmarks, setBookmarks] = useState<BookmarkedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState(0)

  useEffect(() => {
    if (!userWallet) {
      // Не делаем редирект, просто не загружаем закладки
      setIsLoading(false)
      return
    }

    loadBookmarks()
  }, [userWallet, router])

  const loadBookmarks = async () => {
    if (!userWallet) return

    try {
      const response = await fetch(`/api/bookmarks?userWallet=${encodeURIComponent(userWallet)}`)

      if (response.ok) {
        const data = await response.json()
        console.log('[BookmarksPageClient] raw data:', data)
        const normalizedBookmarks = PostNormalizer.normalizeMany(data.bookmarks || [], [], [])
        console.log('[BookmarksPageClient] normalized:', normalizedBookmarks)
        setBookmarks(normalizedBookmarks as any)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to load bookmarks')
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error)
      toast.error('Failed to load bookmarks')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePostAction = async (action: PostAction) => {
    if (!userWallet) {
      toast.error('Please connect your wallet')
      return
    }

    switch (action.type) {
      case 'bookmark':
        // Удаляем из закладок
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
            if (data.action === 'removed') {
              // Удаляем из локального состояния
              setBookmarks(prev => prev.filter(b => b.id !== action.postId))
              toast.success('Removed from bookmarks')
            }
          }
        } catch (error) {
          console.error('Error removing bookmark:', error)
          toast.error('Failed to remove bookmark')
        }
        break

      case 'like':
      case 'unlike':
      case 'comment':
      case 'share':
      case 'subscribe':
      case 'purchase':
      case 'edit':
      case 'delete':
        // Эти действия обрабатываются в PostCard/PostActions
        break

      default:
        console.warn('Unhandled action type:', action.type)
    }
  }

  const handlePostClick = (index: number) => {
    console.log('[BookmarksPageClient] handlePostClick:', index)
    setFullscreenIndex(index)
    setShowFullscreen(true)
  }

  // Если открыт fullscreen - показываем карусель поверх всего
  if (showFullscreen) {
    return (
      <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-900">
        <FullscreenCarousel
          posts={bookmarks as unknown as UnifiedPost[]}
          initialIndex={fullscreenIndex}
          onAction={handlePostAction}
          showBackButton={true}
          onBack={() => setShowFullscreen(false)}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Загружаем закладки...</p>
        </div>
      </div>
    )
  }

  // Если кошелек не подключен, показываем сообщение
  if (!userWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0 px-4">
        <div className="text-center p-6 md:p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4 mx-auto">
            <BookmarkIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">
            Подключите кошелёк
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Для просмотра закладок необходимо подключить Solana кошелёк
          </p>
          <button
            onClick={() => {
              const walletButton = document.querySelector('.wallet-adapter-button-trigger') as HTMLButtonElement
              if (walletButton) {
                walletButton.click()
              } else {
                toast.error('Wallet button not found')
              }
            }}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Подключить
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-3">
            {/* Back button - mobile only */}
            <button
              onClick={() => router.back()}
              className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </button>
            
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <BookmarkIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                  Закладки
                </h1>
                <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">
                  {bookmarks.length} {bookmarks.length === 1 ? 'пост' : 'постов'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {bookmarks.length > 0 ? (
          <PostsContainer
            posts={bookmarks}
            layout="gallery"
            variant="creator"
            columns={4}
            onAction={handlePostAction}
            onPostClick={(index) => handlePostClick(index)}
          />
        ) : (
          <div className="text-center py-16 md:py-20">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4 mx-auto">
              <BookmarkIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Нет закладок
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-6 px-4">
              Сохраняйте понравившиеся посты, чтобы просмотреть их позже
            </p>
            <button
              onClick={() => router.push('/feed')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Открыть ленту
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

