'use client'

import React, { useState, useEffect } from 'react'
import { ShoppingBagIcon } from '@heroicons/react/24/outline'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { FullscreenCarousel } from '@/components/feed/FullscreenCarousel'
import { PostAction, UnifiedPost } from '@/types/posts'
import toast from 'react-hot-toast'
import { useUser } from '@/lib/store/appStore'

export default function PurchasesPageClient() {
  const user = useUser()
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState(0)

  useEffect(() => {
    if (user?.id) {
      loadPurchases()
    }
  }, [user?.id])

  const loadPurchases = async () => {
    if (!user?.id) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/purchases?userId=${user.id}`)

      if (response.ok) {
        let data = await response.json()
        data = data.purchases.map((post: any) => {
          post.access.shouldHideContent = false;
          post.access.isLocked = false;
          return post;
        })
        console.log(`[PurchasesPageClient] Purchases loaded:`, data);
        setPosts(data || [])
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to load purchases')
      }
    } catch (error) {
      console.error('Error loading purchases:', error)
      toast.error('Failed to load purchases')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePostAction = async (action: PostAction) => {
    switch (action.type) {
      case 'comment':
        console.log('[PurchasesPage] Comment action:', action.postId)
        break
      default:
        console.log('[PurchasesPage] Unhandled action:', action)
    }
  }

  const handlePostClick = (index: number) => {
    setFullscreenIndex(index)
    setShowFullscreen(true)
  }

  // Если открыт fullscreen - показываем карусель поверх всего
  if (showFullscreen) {
    return (
      <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-900">
        <FullscreenCarousel
          posts={posts}
          initialIndex={fullscreenIndex}
          onAction={handlePostAction}
          showBackButton={true}
          onBack={() => setShowFullscreen(false)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <ShoppingBagIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Мои покупки
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {posts.length} {posts.length === 1 ? 'пост' : 'постов'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4 mx-auto">
              <ShoppingBagIcon className="w-10 h-10 text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Нет покупок
            </h3>
            <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              Здесь будут отображаться посты, которые вы приобрели
            </p>
          </div>
        ) : (
          <PostsContainer
            posts={posts}
            layout="gallery"
            variant="creator"
            columns={4}
            onAction={handlePostAction}
            onPostClick={(index) => handlePostClick(index)}
          />
        )}
      </div>
    </div>
  )
}
