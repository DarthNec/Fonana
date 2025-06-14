'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  UsersIcon, 
  CurrencyDollarIcon, 
  EyeIcon, 
  PlusIcon, 
  CogIcon, 
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  HeartIcon,
  ChatBubbleLeftEllipsisIcon,
  GiftIcon,
  StarIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/useUser'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import SubscriptionManager from '@/components/SubscriptionManager'

interface Post {
  id: string
  title: string
  content: string
  likes: number
  comments: number
  isLocked: boolean
  createdAt: string
}

interface Stats {
  totalRevenue: number
  subscribers: number
  views: number
  postsCount: number
}

export default function Dashboard() {
  const { user } = useUser()
  const { publicKey } = useWallet()
  const [recentPosts, setRecentPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    subscribers: 0,
    views: 0,
    postsCount: 0
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load recent posts
      const postsResponse = await fetch(`/api/posts?creatorId=${user?.id}&limit=5`)
      if (postsResponse.ok) {
        const postsData = await postsResponse.json()
        const formattedPosts = postsData.posts.map((post: any) => ({
          id: post.id,
          title: post.title,
          content: post.content,
          likes: post._count?.likes || 0,
          comments: post._count?.comments || 0,
          isLocked: post.isLocked,
          createdAt: post.createdAt
        }))
        setRecentPosts(formattedPosts)
      }

      // Load stats from database
      if (user) {
        // Get total posts count
        const allPostsResponse = await fetch(`/api/posts?creatorId=${user.id}`)
        const allPostsData = await allPostsResponse.json()
        const totalPosts = allPostsData.posts?.length || 0
        
        // Get subscribers count
        const subscribersResponse = await fetch(`/api/subscriptions?creatorId=${user.id}`)
        const subscribersData = await subscribersResponse.json()
        const activeSubscribers = subscribersData.subscriptions?.filter((sub: any) => sub.isActive).length || 0
        
        // Calculate total revenue from subscriptions
        const totalRevenue = subscribersData.subscriptions?.reduce((sum: number, sub: any) => {
          return sum + (sub.price || 0)
        }, 0) || 0
        
        // Calculate total views from all posts
        const totalViews = allPostsData.posts?.reduce((sum: number, post: any) => {
          return sum + (post.viewsCount || 0)
        }, 0) || 0

        setStats({
          totalRevenue,
          subscribers: activeSubscribers,
          views: totalViews,
          postsCount: totalPosts
        })
      }

      // Load recent activity
      try {
        const activityResponse = await fetch(`/api/user/activity?creatorId=${user?.id}&limit=10`)
        if (activityResponse.ok) {
          const activityData = await activityResponse.json()
          
          // Format activity data
          const formattedActivity = activityData.activities?.map((activity: any) => {
            let icon, color, action
            
            switch(activity.type) {
              case 'subscription':
                icon = UsersIcon
                color = 'text-emerald-400'
                action = 'subscribed to your channel'
                break
              case 'like':
                icon = HeartIcon
                color = 'text-red-400'
                action = `liked your post "${activity.post?.title || 'post'}"`
                break
              case 'comment':
                icon = ChatBubbleLeftEllipsisIcon
                color = 'text-blue-400'
                action = `commented on "${activity.post?.title || 'post'}"`
                break
              case 'tip':
                icon = GiftIcon
                color = 'text-yellow-400'
                action = `sent you ${activity.amount || 0} SOL tip`
                break
              default:
                icon = StarIcon
                color = 'text-purple-400'
                action = activity.action || 'interacted with your content'
            }
            
            return {
              id: activity.id,
              user: activity.user?.fullName || activity.user?.nickname || 'Anonymous',
              action,
              time: formatTimeAgo(activity.createdAt),
              icon,
              color,
              type: activity.type
            }
          }) || []
          
          setRecentActivity(formattedActivity)
        }
      } catch (error) {
        console.error('Error loading activity:', error)
        // Activity is optional, so we don't show an error toast
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Error loading dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
    return date.toLocaleDateString()
  }

  const displayStats = [
    {
      id: 1,
      name: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      change: '+0%',
      changeType: 'neutral' as const,
      icon: CurrencyDollarIcon,
      color: 'from-emerald-500 to-teal-500',
      description: 'Revenue from all sources'
    },
    {
      id: 2,
      name: 'Subscribers',
      value: stats.subscribers.toLocaleString(),
      change: '+0%',
      changeType: 'neutral' as const,
      icon: UsersIcon,
      color: 'from-blue-500 to-indigo-500',
      description: 'Active subscribers'
    },
    {
      id: 3,
      name: 'Posts',
      value: stats.postsCount.toLocaleString(),
      change: '+0%',
      changeType: 'neutral' as const,
      icon: DocumentTextIcon,
      color: 'from-purple-500 to-pink-500',
      description: 'Total posts created'
    },
    {
      id: 4,
      name: 'Views',
      value: stats.views.toLocaleString(),
      change: '+0%',
      changeType: 'neutral' as const,
      icon: EyeIcon,
      color: 'from-orange-500 to-red-500',
      description: 'Total content views'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full">
          <div className="w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full">
          <div className="w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 pt-32 pb-8 lg:pt-40 lg:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
              Dashboard
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Manage content, track analytics, and grow your audience
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {displayStats.map((stat) => {
              const Icon = stat.icon
              return (
                <div 
                  key={stat.name} 
                  className={`bg-gradient-to-br ${stat.color} backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 text-sm font-bold">{stat.change}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-medium mb-2">{stat.name}</p>
                    <p className="text-white text-3xl font-bold">{stat.value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <PlusIcon className="w-5 h-5 text-white" />
              </div>
              Quick Actions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link 
                href="/create" 
                className="group bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <PlusIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Create Post</h3>
                    <p className="text-purple-200 text-sm">New content</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/profile" 
                className="group bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <CogIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Settings</h3>
                    <p className="text-blue-200 text-sm">Edit profile</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/analytics" 
                className="group bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/25"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <ChartBarIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Analytics</h3>
                    <p className="text-emerald-200 text-sm">View statistics</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Subscription Management */}
          <div className="mb-12">
            <SubscriptionManager />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
            {/* Recent Posts */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="w-5 h-5 text-white" />
                  </div>
                  Recent Posts
                </h2>
                <Link 
                  href="/create" 
                  className="text-purple-400 hover:text-purple-300 font-medium text-sm bg-purple-500/10 px-4 py-2 rounded-xl hover:bg-purple-500/20 transition-all duration-300"
                >
                  Create New
                </Link>
              </div>
              
              {isLoading ? (
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-slate-700 rounded-xl w-3/4 mb-3"></div>
                      <div className="h-3 bg-slate-700 rounded-xl w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recentPosts.length > 0 ? (
                <div className="space-y-6">
                  {recentPosts.map((post) => (
                    <div key={post.id} className="bg-slate-700/30 rounded-2xl p-4 hover:bg-slate-700/50 transition-all duration-300">
                      <h3 className="text-white font-medium text-lg mb-3">{post.title}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 text-sm text-slate-400">
                          <div className="flex items-center gap-2">
                            <HeartIcon className="w-4 h-4 text-red-400" />
                            <span>{post.likes}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-blue-400" />
                            <span>{post.comments}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-xl text-xs font-medium ${
                          post.isLocked 
                            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30' 
                            : 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {post.isLocked ? 'Premium' : 'Free'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <DocumentTextIcon className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-slate-400 mb-6 text-lg">No posts yet</p>
                  <Link 
                    href="/create" 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-2xl transition-all duration-300 hover:scale-105"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Create your first post
                  </Link>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center">
                  <BellIcon className="w-5 h-5 text-white" />
                </div>
                Recent Activity
              </h2>
              
              {recentActivity.length > 0 ? (
                <div className="space-y-6">
                  {recentActivity.map((activity, index) => {
                    const Icon = activity.icon
                    return (
                      <div key={index} className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-2xl hover:bg-slate-700/50 transition-all duration-300">
                        <div className={`w-10 h-10 bg-gradient-to-r ${
                          activity.type === 'subscription' ? 'from-emerald-400/20 to-green-400/20' :
                          activity.type === 'like' ? 'from-red-400/20 to-pink-400/20' :
                          activity.type === 'comment' ? 'from-blue-400/20 to-cyan-400/20' :
                          'from-yellow-400/20 to-orange-400/20'
                        } rounded-xl flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${activity.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm">
                            <span className="font-medium text-purple-300">{activity.user}</span>{' '}
                            <span className="text-slate-300">{activity.action}</span>
                          </p>
                          <p className="text-slate-400 text-xs mt-1">{activity.time}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BellIcon className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-slate-400 text-lg">No recent activity</p>
                  <p className="text-slate-500 text-sm mt-2">Activity will appear here once users interact with your content</p>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Balance */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-5 h-5 text-white" />
              </div>
              Wallet Overview
            </h2>
            <div className="text-center py-8">
              <p className="text-slate-400">Wallet component temporarily disabled</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 