'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon,
  EyeIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface AnalyticsData {
  totalViews: number
  totalLikes: number
  totalComments: number
  totalSubscribers: number
  totalRevenue: number
  monthlyRevenue: number
  viewsGrowth: number
  likesGrowth: number
  subscribersGrowth: number
  revenueGrowth: number
  topPosts: Array<{
    id: string
    title: string
    views: number
    likes: number
    revenue: number
  }>
  recentActivity: Array<{
    id: string
    type: 'view' | 'like' | 'comment' | 'subscription' | 'purchase'
    description: string
    timestamp: string
  }>
}

export default function AnalyticsPage() {
  const user = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    if (!user.isCreator) {
      router.push('/dashboard')
      return
    }

    fetchAnalytics()
  }, [user, router, period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Симулируем загрузку аналитики
      // В реальном приложении здесь был бы API вызов
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setAnalytics({
        totalViews: Math.floor(Math.random() * 10000) + 5000,
        totalLikes: Math.floor(Math.random() * 1000) + 500,
        totalComments: Math.floor(Math.random() * 500) + 200,
        totalSubscribers: Math.floor(Math.random() * 100) + 50,
        totalRevenue: Math.random() * 1000 + 200,
        monthlyRevenue: Math.random() * 300 + 100,
        viewsGrowth: Math.random() * 40 - 20,
        likesGrowth: Math.random() * 30 - 15,
        subscribersGrowth: Math.random() * 50 - 25,
        revenueGrowth: Math.random() * 60 - 30,
        topPosts: [
          {
            id: '1',
            title: 'My Best Content Ever',
            views: 1250,
            likes: 89,
            revenue: 45.8
          },
          {
            id: '2', 
            title: 'Tutorial: How to Create Amazing Art',
            views: 980,
            likes: 67,
            revenue: 32.4
          },
          {
            id: '3',
            title: 'Behind the Scenes',
            views: 756,
            likes: 54,
            revenue: 28.9
          }
        ],
        recentActivity: [
          {
            id: '1',
            type: 'subscription',
            description: 'New subscriber joined your Basic tier',
            timestamp: '2 hours ago'
          },
          {
            id: '2',
            type: 'purchase',
            description: 'Someone purchased your premium post',
            timestamp: '4 hours ago'
          },
          {
            id: '3',
            type: 'like',
            description: '5 new likes on "My Best Content Ever"',
            timestamp: '6 hours ago'
          }
        ]
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} SOL`
  }

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowUpIcon className="w-4 h-4 text-green-500" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 text-red-500" />
    )
  }

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-500' : 'text-red-500'
  }

  if (!user || !user.isCreator) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track your content performance and earnings
              </p>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
            {['7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as '7d' | '30d' | '90d')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {p === '7d' && 'Last 7 days'}
                {p === '30d' && 'Last 30 days'}
                {p === '90d' && 'Last 90 days'}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <EyeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex items-center gap-1">
                {getGrowthIcon(analytics?.viewsGrowth || 0)}
                <span className={`text-sm font-medium ${getGrowthColor(analytics?.viewsGrowth || 0)}`}>
                  {Math.abs(analytics?.viewsGrowth || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics?.totalViews.toLocaleString()}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Views</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <HeartIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex items-center gap-1">
                {getGrowthIcon(analytics?.likesGrowth || 0)}
                <span className={`text-sm font-medium ${getGrowthColor(analytics?.likesGrowth || 0)}`}>
                  {Math.abs(analytics?.likesGrowth || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics?.totalLikes.toLocaleString()}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Likes</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <UsersIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex items-center gap-1">
                {getGrowthIcon(analytics?.subscribersGrowth || 0)}
                <span className={`text-sm font-medium ${getGrowthColor(analytics?.subscribersGrowth || 0)}`}>
                  {Math.abs(analytics?.subscribersGrowth || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics?.totalSubscribers.toLocaleString()}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Subscribers</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex items-center gap-1">
                {getGrowthIcon(analytics?.revenueGrowth || 0)}
                <span className={`text-sm font-medium ${getGrowthColor(analytics?.revenueGrowth || 0)}`}>
                  {Math.abs(analytics?.revenueGrowth || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(analytics?.totalRevenue || 0)}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Revenue</p>
          </div>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Posts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Top Performing Posts
            </h2>
            <div className="space-y-4">
              {analytics?.topPosts.map((post, index) => (
                <div key={post.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{post.views} views</span>
                        <span>{post.likes} likes</span>
                        <span>{formatCurrency(post.revenue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {analytics?.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {activity.type === 'subscription' && <UsersIcon className="w-4 h-4 text-blue-600" />}
                    {activity.type === 'purchase' && <CurrencyDollarIcon className="w-4 h-4 text-green-600" />}
                    {activity.type === 'like' && <HeartIcon className="w-4 h-4 text-red-600" />}
                    {activity.type === 'view' && <EyeIcon className="w-4 h-4 text-purple-600" />}
                    {activity.type === 'comment' && <ChatBubbleLeftIcon className="w-4 h-4 text-orange-600" />}
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white">{activity.description}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 