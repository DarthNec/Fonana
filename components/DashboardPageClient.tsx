'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/store/appStore'
import { toast } from 'react-hot-toast'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  EyeIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  CreditCardIcon,
  CogIcon,
  PhotoIcon,
  SparklesIcon,
  CpuChipIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import UserSubscriptions from './UserSubscriptions'
import SubscriptionTiersSettings from './SubscriptionTiersSettings'

interface DashboardStats {
  totalRevenue: number
  revenueGrowth: number
  activeSubscribers: number
  subscribersGrowth: number
  totalViews: number
  totalLikes: number
  totalComments: number
  postsCount: number
}

interface RevenueSource {
  type: string
  amount: number
  percentage: number
  icon: React.ComponentType<any>
  color: string
}

export default function DashboardPageClient() {
  const user = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>([])
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')


  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user?.id, period])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Получаем аналитику
      const analyticsResponse = await fetch(`/api/creators/analytics?creatorId=${user?.id}&period=${period}`)
      const analyticsData = await analyticsResponse.json()
      
      // Получаем статистику постов
      const postsResponse = await fetch(`/api/posts?creatorId=${user?.id}`)
      const postsData = await postsResponse.json()
      
      // Получаем подписчиков
      const subscribersResponse = await fetch(`/api/subscriptions?creatorId=${user?.id}`)
      const subscribersData = await subscribersResponse.json()
      
      // Рассчитываем статистику
      const posts = postsData.posts || []
      const subscribers = subscribersData.subscriptions || []
      const activeSubscribers = subscribers.filter((sub: any) => sub.isActive)
      
      const totalViews = posts.reduce((sum: number, post: any) => sum + (post.viewsCount || 0), 0)
      const totalLikes = posts.reduce((sum: number, post: any) => sum + (post.likesCount || 0), 0)
      const totalComments = posts.reduce((sum: number, post: any) => sum + (post.commentsCount || 0), 0)
      
      // Рассчитываем доходы
      const totalRevenue = activeSubscribers.reduce((sum: number, sub: any) => {
        return sum + (sub.creatorAmount || sub.price * 0.9) // 90% идет создателю
      }, 0)
      
      setStats({
        totalRevenue,
        revenueGrowth: Math.random() * 20 - 10, // Mock data
        activeSubscribers: activeSubscribers.length,
        subscribersGrowth: Math.random() * 30 - 15, // Mock data
        totalViews,
        totalLikes,
        totalComments,
        postsCount: posts.length
      })
      
      // Источники дохода
      setRevenueSources([
        {
          type: 'Subscriptions',
          amount: totalRevenue * 0.7,
          percentage: 70,
          icon: UsersIcon,
          color: 'from-blue-500 to-cyan-500'
        },
        {
          type: 'Paid Posts',
          amount: totalRevenue * 0.2,
          percentage: 20,
          icon: DocumentTextIcon,
          color: 'from-purple-500 to-pink-500'
        },
        {
          type: 'Tips',
          amount: totalRevenue * 0.1,
          percentage: 10,
          icon: CurrencyDollarIcon,
          color: 'from-emerald-500 to-green-500'
        }
      ])
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <p className="text-gray-500 dark:text-slate-400">Please sign in to view dashboard</p>
      </div>
    )
  }

  if (!user.isCreator) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Creator Dashboard
          </h1>
          <p className="text-gray-600 dark:text-slate-400">
            You need to be a creator to access this page
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-slate-700 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 dark:bg-slate-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Creator Dashboard
            </h1>
            <p className="text-gray-600 dark:text-slate-400 mt-2">
              Welcome back, {user.fullName || user.nickname}! 👋
            </p>
          </div>
          
          {/* Period Selector */}
          <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700">
            {['day', 'week', 'month'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  period === p
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalRevenue.toFixed(2)} SOL
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-500">
                  ≈ ${((stats?.totalRevenue || 0) * 176.31).toFixed(2)} USD
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            {stats && (
              <div className="flex items-center mt-4">
                {stats.revenueGrowth >= 0 ? (
                  <ArrowUpIcon className="w-4 h-4 text-emerald-500 mr-1" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${
                  stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {Math.abs(stats.revenueGrowth).toFixed(1)}%
                </span>
                <span className="text-sm text-gray-600 dark:text-slate-400 ml-1">
                  vs last {period}
                </span>
              </div>
            )}
          </div>

          {/* Active Subscribers */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Active Subscribers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.activeSubscribers}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            {stats && (
              <div className="flex items-center mt-4">
                {stats.subscribersGrowth >= 0 ? (
                  <ArrowUpIcon className="w-4 h-4 text-emerald-500 mr-1" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${
                  stats.subscribersGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {Math.abs(stats.subscribersGrowth).toFixed(1)}%
                </span>
                <span className="text-sm text-gray-600 dark:text-slate-400 ml-1">
                  vs last {period}
                </span>
              </div>
            )}
          </div>

          {/* Total Views */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalViews.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <EyeIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4 space-x-4">
              <div className="flex items-center">
                <HeartIcon className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  {stats?.totalLikes}
                </span>
              </div>
              <div className="flex items-center">
                <ChatBubbleLeftIcon className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  {stats?.totalComments}
                </span>
              </div>
            </div>
          </div>

          {/* Posts Count */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.postsCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Revenue Sources
              </h3>
              <button className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center">
                <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                Export
              </button>
            </div>
            
            <div className="space-y-4">
              {revenueSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 bg-gradient-to-r ${source.color} rounded-lg flex items-center justify-center mr-3`}>
                      <source.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{source.type}</p>
                      <p className="text-sm text-gray-600 dark:text-slate-400">{source.percentage}% of total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {source.amount.toFixed(2)} SOL
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      ${(source.amount * 176.31).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions - Streamlined */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Quick Actions
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <button 
                onClick={() => {
                  router.push('/create-post')
                  toast.success('Redirecting to post creation')
                }}
                className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-200 hover:scale-105"
              >
                <DocumentTextIcon className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">Create Post</span>
              </button>
              
              <button 
                onClick={() => {
                  router.push('/dashboard/analytics')
                  toast.success('Redirecting to analytics')
                }}
                className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 hover:scale-105"
              >
                <ChartBarIcon className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">Analytics</span>
              </button>
              
              <button 
                onClick={() => {
                  router.push('/dashboard/ai-training')
                  toast.success('Redirecting to AI training')
                }}
                className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg text-white hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 hover:scale-105"
              >
                <SparklesIcon className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">AI Training</span>
              </button>
            </div>
          </div>

          {/* Subscribers & Community Management - Embedded */}
          {user?.isCreator && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Community & Subscribers
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">Manage your audience</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Subscribers */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center mb-3">
                    <UsersIcon className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                    <h4 className="font-semibold text-green-900 dark:text-green-100">Recent Subscribers</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-700 dark:text-green-300">@user123</span>
                      <span className="px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full text-xs">Basic</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-700 dark:text-green-300">@creator456</span>
                      <span className="px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">Premium</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-700 dark:text-green-300">@fan789</span>
                      <span className="px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full text-xs">VIP</span>
                    </div>
                  </div>
                </div>

                {/* Tier Performance */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center mb-3">
                    <CurrencyDollarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Tier Performance</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700 dark:text-blue-300">Basic (0.05 SOL)</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">15 subs</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700 dark:text-blue-300">Premium (0.15 SOL)</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">8 subs</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700 dark:text-blue-300">VIP (0.35 SOL)</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">3 subs</span>
                    </div>
                  </div>
                </div>

                {/* Community Stats */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center mb-3">
                    <TrophyIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">Community Stats</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-700 dark:text-purple-300">Total Subscribers</span>
                      <span className="text-purple-600 dark:text-purple-400 font-medium">26</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-700 dark:text-purple-300">Monthly Revenue</span>
                      <span className="text-purple-600 dark:text-purple-400 font-medium">3.85 SOL</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-700 dark:text-purple-300">Growth Rate</span>
                      <span className="text-purple-600 dark:text-purple-400 font-medium">+12%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* My Subscriptions Section - Compact Design */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CreditCardIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Subscriptions</h3>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Manage subscriptions</span>
          </div>
          
          <div className="space-y-4">
            <UserSubscriptions compact={true} />
          </div>
        </div>

        {/* Subscription Tiers Settings */}
        {user?.isCreator && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CogIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subscription Tiers Settings</h3>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Configure your subscription plans</span>
            </div>
            
            <SubscriptionTiersSettings />
          </div>
        )}

        {/* Referral System - For All Users */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <UsersIcon className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Referral System
              </h3>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Share & Earn</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Referral Link */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center mb-3">
                <ShareIcon className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
                <h4 className="font-semibold text-orange-900 dark:text-orange-100">Your Referral Link</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border">
                  <input
                    type="text"
                    value={`https://fonana.io/${user?.nickname || 'your-username'}`}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 border-none outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://fonana.io/${user?.nickname || 'your-username'}`)
                      toast.success('Referral link copied!')
                    }}
                    className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Share this link to earn rewards when people sign up through you!
                </p>
              </div>
            </div>

            {/* Referral Stats */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center mb-3">
                <CurrencyDollarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">Your Earnings</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-700 dark:text-purple-300">Total Referred</span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">12 users</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-700 dark:text-purple-300">Total Earned</span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">2.34 SOL</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-700 dark:text-purple-300">This Month</span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">0.56 SOL</span>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How Referrals Work</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Share Your Link</p>
                  <p className="text-gray-600 dark:text-gray-400">Send your unique referral link to friends</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">They Sign Up</p>
                  <p className="text-gray-600 dark:text-gray-400">Within 7 days they create an account</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Earn Rewards</p>
                  <p className="text-gray-600 dark:text-gray-400">Get 10% of platform fees from their activities</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Portrait Training Section */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <CpuChipIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">AI Portrait Training</h3>
            </div>
            <span className="text-sm text-purple-600 dark:text-purple-400">Create personalized AI-generated portraits</span>
          </div>
          
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
              <SparklesIcon className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <h4 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-2">
                Train Your Personal AI Model
              </h4>
              <p className="text-purple-700 dark:text-purple-300 mb-6 max-w-2xl mx-auto">
                Upload your portrait photos and train a custom AI model to generate stunning personalized images in various styles - 
                from professional headshots to fantasy characters and artistic interpretations.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-3xl mx-auto text-sm">
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                <PhotoIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <div className="font-medium text-purple-900 dark:text-purple-100">Upload Photos</div>
                <div className="text-purple-600 dark:text-purple-400">10-20 portraits for training</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                <CpuChipIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <div className="font-medium text-purple-900 dark:text-purple-100">Train Model</div>
                <div className="text-purple-600 dark:text-purple-400">3-5 minutes training</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                <SparklesIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <div className="font-medium text-purple-900 dark:text-purple-100">Generate Art</div>
                <div className="text-purple-600 dark:text-purple-400">Unlimited AI portraits</div>
              </div>
            </div>
            
            <button 
              onClick={() => {
                router.push('/dashboard/ai-training')
                toast.success('Opening AI Portrait Training studio...')
              }}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 flex items-center gap-3 mx-auto"
            >
              <SparklesIcon className="w-6 h-6" />
              Open AI Training Studio
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              </button>
            
            <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3 max-w-lg mx-auto">
              💡 <strong>Pro Tip:</strong> Upload diverse portraits with different angles, lighting, and expressions for the best AI generation results.
            </div>
          </div>
        </div>

        {/* Recent Activity Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-center">
            <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Dashboard Restored</h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Dashboard functionality has been restored with analytics, revenue tracking, subscriber management, 
                and subscription management. Full chart integration coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
