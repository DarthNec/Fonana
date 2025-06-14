'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  UsersIcon, 
  CurrencyDollarIcon, 
  EyeIcon,
  ArrowTrendingUpIcon,
  HeartIcon,
  ChatBubbleLeftEllipsisIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { useUser } from '@/lib/hooks/useUser'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'

interface AnalyticsData {
  revenue: {
    total: number
    monthly: number
    growth: number
  }
  subscribers: {
    total: number
    active: number
    new: number
    growth: number
  }
  content: {
    posts: number
    views: number
    avgViews: number
    engagement: number
  }
  engagement: {
    likes: number
    comments: number
    shares: number
  }
  topPosts: Array<{
    id: string
    title: string
    views: number
    likes: number
    comments: number
  }>
  recentFeedback: Array<{
    id: string
    user: string
    type: 'comment' | 'like' | 'subscription'
    content?: string
    postTitle?: string
    createdAt: string
  }>
}

export default function AnalyticsPage() {
  const { user } = useUser()
  const { publicKey } = useWallet()
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    revenue: { total: 0, monthly: 0, growth: 0 },
    subscribers: { total: 0, active: 0, new: 0, growth: 0 },
    content: { posts: 0, views: 0, avgViews: 0, engagement: 0 },
    engagement: { likes: 0, comments: 0, shares: 0 },
    topPosts: [],
    recentFeedback: []
  })

  useEffect(() => {
    if (user?.id) {
      loadAnalytics()
    }
  }, [user, timeRange])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      
      // Load posts
      const postsResponse = await fetch(`/api/posts?creatorId=${user?.id}`)
      const postsData = await postsResponse.json()
      const posts = postsData.posts || []
      
      // Load subscribers
      const subscribersResponse = await fetch(`/api/subscriptions?creatorId=${user?.id}`)
      const subscribersData = await subscribersResponse.json()
      const subscribers = subscribersData.subscriptions || []
      
      // Load recent activity for feedback
      const activityResponse = await fetch(`/api/user/activity?creatorId=${user?.id}&limit=20`)
      const activityData = await activityResponse.json()
      const activities = activityData.activities || []
      
      // Calculate analytics
      const totalRevenue = subscribers.reduce((sum: number, sub: any) => sum + (sub.price || 0), 0)
      const activeSubscribers = subscribers.filter((sub: any) => sub.isActive).length
      const totalViews = posts.reduce((sum: number, post: any) => sum + (post.viewsCount || 0), 0)
      const totalLikes = posts.reduce((sum: number, post: any) => sum + (post._count?.likes || 0), 0)
      const totalComments = posts.reduce((sum: number, post: any) => sum + (post._count?.comments || 0), 0)
      
      // Get top posts by engagement
      const topPosts = posts
        .sort((a: any, b: any) => {
          const aEngagement = (a._count?.likes || 0) + (a._count?.comments || 0) + (a.viewsCount || 0)
          const bEngagement = (b._count?.likes || 0) + (b._count?.comments || 0) + (b.viewsCount || 0)
          return bEngagement - aEngagement
        })
        .slice(0, 5)
        .map((post: any) => ({
          id: post.id,
          title: post.title,
          views: post.viewsCount || 0,
          likes: post._count?.likes || 0,
          comments: post._count?.comments || 0
        }))
      
      // Format recent feedback
      const recentFeedback = activities.map((activity: any) => ({
        id: activity.id,
        user: activity.user?.nickname || activity.user?.fullName || 'Anonymous',
        type: activity.type,
        content: activity.content,
        postTitle: activity.post?.title,
        createdAt: activity.createdAt
      }))
      
      setAnalyticsData({
        revenue: {
          total: totalRevenue,
          monthly: totalRevenue / 12, // Simplified calculation
          growth: 0 // TODO: Calculate based on historical data
        },
        subscribers: {
          total: subscribers.length,
          active: activeSubscribers,
          new: 0, // TODO: Calculate based on date range
          growth: 0 // TODO: Calculate based on historical data
        },
        content: {
          posts: posts.length,
          views: totalViews,
          avgViews: posts.length > 0 ? Math.round(totalViews / posts.length) : 0,
          engagement: posts.length > 0 ? ((totalLikes + totalComments) / (totalViews || 1) * 100) : 0
        },
        engagement: {
          likes: totalLikes,
          comments: totalComments,
          shares: 0 // TODO: Implement shares tracking
        },
        topPosts,
        recentFeedback
      })
      
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Error loading analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const timeRangeOptions = [
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'year', label: 'Last Year' }
  ]

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

      <div className="relative z-10 pt-32 pb-8 lg:pt-40 lg:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400 bg-clip-text text-transparent mb-4">
                Analytics
              </h1>
              <p className="text-gray-600 dark:text-slate-400 text-lg">
                Track your content performance and audience growth
              </p>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 rounded-xl p-1 shadow-lg border border-gray-200 dark:border-slate-700/50">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    timeRange === option.value
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-slate-400">Loading analytics...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-emerald-500/20 rounded-3xl p-6 shadow-lg dark:from-emerald-500/10 dark:to-teal-500/10 dark:bg-gradient-to-br">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center">
                      <CurrencyDollarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-300 text-sm font-bold">+{analyticsData.revenue.growth}%</span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-slate-400 text-sm mb-2">Total Revenue</p>
                  <p className="text-gray-900 dark:text-white text-3xl font-bold">${analyticsData.revenue.total.toFixed(2)}</p>
                  <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">${analyticsData.revenue.monthly.toFixed(2)}/month</p>
                </div>

                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-blue-500/20 rounded-3xl p-6 shadow-lg dark:from-blue-500/10 dark:to-indigo-500/10 dark:bg-gradient-to-br">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                      <UsersIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowTrendingUpIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-700 dark:text-blue-300 text-sm font-bold">+{analyticsData.subscribers.growth}%</span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-slate-400 text-sm mb-2">Subscribers</p>
                  <p className="text-gray-900 dark:text-white text-3xl font-bold">{analyticsData.subscribers.total}</p>
                  <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">{analyticsData.subscribers.active} active</p>
                </div>

                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-purple-500/20 rounded-3xl p-6 shadow-lg dark:from-purple-500/10 dark:to-pink-500/10 dark:bg-gradient-to-br">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                      <DocumentTextIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-purple-700 dark:text-purple-300 text-sm">
                      {analyticsData.content.avgViews} avg views
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-slate-400 text-sm mb-2">Content</p>
                  <p className="text-gray-900 dark:text-white text-3xl font-bold">{analyticsData.content.posts}</p>
                  <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">{analyticsData.content.views} total views</p>
                </div>

                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-orange-500/20 rounded-3xl p-6 shadow-lg dark:from-orange-500/10 dark:to-red-500/10 dark:bg-gradient-to-br">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
                      <HeartIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-orange-700 dark:text-orange-300 text-sm">
                      {analyticsData.content.engagement.toFixed(1)}% rate
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-slate-400 text-sm mb-2">Engagement</p>
                  <p className="text-gray-900 dark:text-white text-3xl font-bold">{analyticsData.engagement.likes + analyticsData.engagement.comments}</p>
                  <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">{analyticsData.engagement.likes} likes, {analyticsData.engagement.comments} comments</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Top Performing Posts */}
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                      <ChartBarIcon className="w-5 h-5 text-white" />
                    </div>
                    Top Performing Posts
                  </h2>
                  
                  {analyticsData.topPosts.length > 0 ? (
                    <div className="space-y-4">
                      {analyticsData.topPosts.map((post, index) => (
                        <div key={post.id} className="bg-gray-50 dark:bg-slate-700/30 rounded-2xl p-4 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-900 dark:text-white font-medium flex-1 mr-4">{post.title}</h3>
                            <span className="text-purple-600 dark:text-purple-400 font-bold">#{index + 1}</span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <EyeIcon className="w-4 h-4" />
                              <span>{post.views}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <HeartIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
                              <span>{post.likes}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                              <span>{post.comments}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-slate-400">No posts yet</p>
                    </div>
                  )}
                </div>

                {/* Recent Feedback */}
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center">
                      <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-white" />
                    </div>
                    Recent Feedback
                  </h2>
                  
                  {analyticsData.recentFeedback.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {analyticsData.recentFeedback.map((feedback) => (
                        <div key={feedback.id} className="bg-gray-50 dark:bg-slate-700/30 rounded-2xl p-4 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              feedback.type === 'comment' ? 'bg-blue-500/20' :
                              feedback.type === 'like' ? 'bg-red-500/20' :
                              'bg-emerald-500/20'
                            }`}>
                              {feedback.type === 'comment' ? (
                                <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                              ) : feedback.type === 'like' ? (
                                <HeartIcon className="w-5 h-5 text-red-500 dark:text-red-400" />
                              ) : (
                                <UsersIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-900 dark:text-white text-sm">
                                <span className="font-medium text-purple-600 dark:text-purple-300">{feedback.user}</span>
                                {feedback.type === 'comment' && ' commented on '}
                                {feedback.type === 'like' && ' liked '}
                                {feedback.type === 'subscription' && ' subscribed'}
                                {feedback.postTitle && (
                                  <span className="text-gray-700 dark:text-slate-300">"{feedback.postTitle}"</span>
                                )}
                              </p>
                              {feedback.content && (
                                <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">{feedback.content}</p>
                              )}
                              <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">{formatDate(feedback.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-slate-400">No feedback yet</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 