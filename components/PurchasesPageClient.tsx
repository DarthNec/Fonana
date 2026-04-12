'use client'

import React, { useState, useEffect } from 'react'
import { ShoppingBagIcon, WalletIcon } from '@heroicons/react/24/outline'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { FullscreenCarousel } from '@/components/feed/FullscreenCarousel'
import { PostAction, UnifiedPost } from '@/types/posts'
import toast from 'react-hot-toast'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@/lib/hooks/useSafeWallet'

export default function PurchasesPageClient() {
  const user = useUser()
  const { publicKey } = useWallet()
  const userWallet = publicKey?.toBase58() || null
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState(0)

  // Проверяем, нужно ли пользователю подключить кошелёк
  const needsWalletConnection = user?.wallet?.startsWith('TG_') || 
                                 user?.wallet?.startsWith('FK_') || 
                                 user?.wallet?.startsWith('GOOGLE_') || 
                                 user?.wallet?.startsWith('EMAIL_')

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
                My Purchases
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Wallet Connection Notice */}
        {needsWalletConnection && (
          <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <WalletIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Connect Your Wallet
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Connect your Solana wallet to interact with your purchased content and unlock all features.
                </p>
              </div>
            </div>
          </div>
        )}

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
              No Purchases Yet
            </h3>
            <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              Posts you purchase will appear here
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
