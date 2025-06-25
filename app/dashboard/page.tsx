'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  EyeIcon, 
  HeartIcon, 
  ChatBubbleBottomCenterTextIcon,
  PhotoIcon,
  PlusIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UsersIcon,
  GiftIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline'
import { useUser } from '@/lib/hooks/useUser'
import { useWallet } from '@solana/wallet-adapter-react'
import CreatePostModal from '@/components/CreatePostModal'
import PostCard from '@/components/PostCard'
import RevenueChart from '@/components/RevenueChart'
import toast from 'react-hot-toast'
import { useSolRate } from '@/lib/hooks/useSolRate'

interface DashboardData {
  posts: any[]
  stats: {
    totalViews: number
    totalLikes: number
    totalComments: number
    totalRevenue: number
    activeSubscribers: number
    newSubscribers: number
  }
  recentActivity: any[]
  revenue: {
    subscriptions: number
    posts: number
    tips: number
    messages: number
  }
}

export default function DashboardPage() {
  const { user } = useUser()
  const { publicKey } = useWallet()
  const { rate: solRate } = useSolRate()
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    posts: [],
    stats: {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalRevenue: 0,
      activeSubscribers: 0,
      newSubscribers: 0
    },
    recentActivity: [],
    revenue: {
      subscriptions: 0,
      posts: 0,
      tips: 0,
      messages: 0
    }
  })

  useEffect(() => {
    if (user?.id) {
      loadDashboard()
    }
  }, [user])

  const loadDashboard = async () => {
    try {
      setIsLoading(true)
      
      // Load posts
      const postsResponse = await fetch(`/api/posts?creatorId=${user?.id}`)
      const postsData = await postsResponse.json()
      const posts = postsData.posts || []
      
      // Load analytics for quick stats
      const analyticsResponse = await fetch(`/api/creators/analytics?creatorId=${user?.id}&period=month`)
      const analyticsData = await analyticsResponse.json()
      
      // Calculate quick stats
      const totalViews = posts.reduce((sum: number, post: any) => sum + (post.viewsCount || 0), 0)
      const totalLikes = posts.reduce((sum: number, post: any) => sum + (post._count?.likes || 0), 0)
      const totalComments = posts.reduce((sum: number, post: any) => sum + (post._count?.comments || 0), 0)
      
      setDashboardData({
        posts: posts.slice(0, 6), // Show last 6 posts
        stats: {
          totalViews,
          totalLikes,
          totalComments,
          totalRevenue: analyticsData.revenue?.current || 0,
          activeSubscribers: analyticsData.subscribers?.total || 0,
          newSubscribers: analyticsData.subscribers?.new || 0
        },
        recentActivity: [],
        revenue: {
          subscriptions: analyticsData.revenue?.bySource?.subscriptions?.total || 0,
          posts: analyticsData.revenue?.bySource?.posts?.total || 0,
          tips: analyticsData.revenue?.bySource?.messages?.tips?.total || 0,
          messages: analyticsData.revenue?.bySource?.messages?.ppv?.total || 0
        }
      })
      
    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error('Ошибка загрузки дашборда')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePostCreated = () => {
    loadDashboard()
  }

  if (!user?.isCreator) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-32 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Вы не являетесь создателем
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Чтобы получить доступ к дашборду, станьте создателем контента.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full">
          <div className="w-96 h-96 bg-gradient-to-r from-purple-500/10 dark:from-purple-500/20 to-pink-500/10 dark:to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full">
          <div className="w-96 h-96 bg-gradient-to-r from-blue-500/10 dark:from-blue-500/20 to-cyan-500/10 dark:to-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
      </div>

      <div className="relative z-10 py-4 sm:pt-32 sm:pb-8 lg:pt-40 lg:pb-12">
        <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8">
          {/* Header - только на десктопе */}
          <div className="hidden sm:flex sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-12">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400 bg-clip-text text-transparent mb-2 sm:mb-4">
                Дашборд создателя
              </h1>
              <p className="text-gray-600 dark:text-slate-400 text-base sm:text-lg">
                Управляйте своим контентом и отслеживайте доходы
              </p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-medium hover:shadow-lg transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Новый пост
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-slate-400">Загрузка дашборда...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8 px-4 sm:px-0">
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-purple-500/20 rounded-xl sm:rounded-3xl p-3 sm:p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg sm:rounded-2xl flex items-center justify-center">
                      <CurrencyDollarIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="text-purple-600 dark:text-purple-400 text-[10px] sm:text-sm font-medium text-right">
                      За месяц
                    </div>
                  </div>
                  <p className="text-gray-900 dark:text-white text-lg sm:text-3xl font-bold truncate">
                    {dashboardData.stats.totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-gray-500 dark:text-slate-500 text-[10px] sm:text-sm mt-0.5 sm:mt-1">
                    ≈ ${(dashboardData.stats.totalRevenue * solRate).toFixed(0)} USD
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-blue-500/20 rounded-xl sm:rounded-3xl p-3 sm:p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg sm:rounded-2xl flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 text-[10px] sm:text-sm font-medium">
                      +{dashboardData.stats.newSubscribers}
                    </div>
                  </div>
                  <p className="text-gray-900 dark:text-white text-lg sm:text-3xl font-bold">
                    {dashboardData.stats.activeSubscribers}
                  </p>
                  <p className="text-gray-500 dark:text-slate-500 text-[10px] sm:text-sm mt-0.5 sm:mt-1">
                    Подписчиков
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-emerald-500/20 rounded-xl sm:rounded-3xl p-3 sm:p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg sm:rounded-2xl flex items-center justify-center">
                      <EyeIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-sm font-medium">
                      Просмотры
                    </div>
                  </div>
                  <p className="text-gray-900 dark:text-white text-lg sm:text-3xl font-bold">
                    {dashboardData.stats.totalViews}
                  </p>
                  <p className="text-gray-500 dark:text-slate-500 text-[10px] sm:text-sm mt-0.5 sm:mt-1">
                    {dashboardData.stats.totalLikes} лайков
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-orange-500/20 rounded-xl sm:rounded-3xl p-3 sm:p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg sm:rounded-2xl flex items-center justify-center">
                      <ChatBubbleBottomCenterTextIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="text-orange-600 dark:text-orange-400 text-[10px] sm:text-sm font-medium">
                      Отзывы
                    </div>
                  </div>
                  <p className="text-gray-900 dark:text-white text-lg sm:text-3xl font-bold">
                    {dashboardData.stats.totalComments}
                  </p>
                  <p className="text-gray-500 dark:text-slate-500 text-[10px] sm:text-sm mt-0.5 sm:mt-1">
                    Комментариев
                  </p>
                </div>
              </div>

              {/* Revenue Sources Summary */}
              <div className="mb-4 sm:mb-12">
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border-y sm:border border-gray-200 dark:border-slate-700/50 rounded-none sm:rounded-3xl p-4 sm:p-6 shadow-lg">
                  <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-6">
                    Источники дохода
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg sm:rounded-2xl">
                      <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                        <UsersIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-sm text-gray-600 dark:text-slate-400">Подписки</p>
                        <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                          {dashboardData.revenue.subscriptions.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg sm:rounded-2xl">
                      <div className="w-7 h-7 sm:w-10 sm:h-10 bg-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                        <DocumentTextIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-sm text-gray-600 dark:text-slate-400">Посты</p>
                        <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                          {dashboardData.revenue.posts.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg sm:rounded-2xl">
                      <div className="w-7 h-7 sm:w-10 sm:h-10 bg-yellow-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                        <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-sm text-gray-600 dark:text-slate-400">PPV</p>
                        <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                          {dashboardData.revenue.messages.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg sm:rounded-2xl">
                      <div className="w-7 h-7 sm:w-10 sm:h-10 bg-emerald-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                        <GiftIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-sm text-gray-600 dark:text-slate-400">Чаевые</p>
                        <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                          {dashboardData.revenue.tips.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Charts */}
              <div className="px-0 sm:px-0 mb-4 sm:mb-8">
                {user?.id && <RevenueChart creatorId={user.id} />}
              </div>

              {/* Recent Posts */}
              <div className="mt-4 sm:mt-12">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-6 px-4 sm:px-0 flex items-center justify-between">
                  <span>Последние посты</span>
                  {/* Мобильная кнопка создания поста */}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium text-xs"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Новый
                  </button>
                </h2>
                {dashboardData.posts.length > 0 ? (
                  <div className="space-y-0 sm:space-y-6 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                    {dashboardData.posts.map((post) => (
                      <PostCard 
                        key={post.id}
                        id={post.id}
                        creator={post.creator}
                        title={post.title}
                        content={post.content}
                        category={post.category}
                        image={post.mediaUrl}
                        mediaUrl={post.mediaUrl}
                        thumbnail={post.thumbnail}
                        type={post.type}
                        isLocked={post.isLocked}
                        price={post.price}
                        currency={post.currency}
                        likes={post._count?.likes || 0}
                        comments={post._count?.comments || 0}
                        createdAt={post.createdAt}
                        tags={post.tags?.map((t: any) => t.tag.name) || []}
                        isPremium={post.isPremium}
                        requiredTier={post.minSubscriptionTier}
                        imageAspectRatio={post.imageAspectRatio}
                        isSellable={post.isSellable}
                        sellType={post.sellType}
                        quantity={post.quantity}
                        auctionStatus={post.auctionStatus}
                        auctionStartPrice={post.auctionStartPrice}
                        auctionEndAt={post.auctionEndAt}
                        flashSale={post.flashSale}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border-y sm:border border-gray-200 dark:border-slate-700/50 rounded-none sm:rounded-3xl p-6 sm:p-12 text-center mx-0 sm:mx-0">
                    <PhotoIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-slate-400 mb-4">
                      У вас пока нет постов
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-medium hover:shadow-lg transition-all hover:-translate-y-0.5 inline-flex items-center gap-2 text-sm sm:text-base"
                    >
                      <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      Создать первый пост
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  )
} 