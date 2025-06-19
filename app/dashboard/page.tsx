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
  BellIcon,
  ShoppingBagIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  ShieldCheckIcon
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

  // Check if user is admin
  const isAdmin = user?.wallet === 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4' || 
                  user?.wallet === 'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG'

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-slate-400">Please connect your wallet to access the dashboard.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* User Info Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 mb-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user.fullName || user.nickname || 'Creator'}!</h1>
          <p className="text-purple-100">Manage your content and track your earnings</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">0 SOL</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Subscribers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.followersCount || 0}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.postsCount || 0}</p>
              </div>
              <DocumentTextIcon className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Total Likes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
              </div>
              <HeartIcon className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link 
              href="/create" 
              className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <DocumentTextIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Create Post</h3>
                  <p className="text-purple-200 text-sm">Share new content</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/analytics" 
              className="group bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Analytics</h3>
                  <p className="text-blue-200 text-sm">View insights</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/profile" 
              className="group bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/25"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Cog6ToothIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Settings</h3>
                  <p className="text-green-200 text-sm">Manage profile</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/dashboard/referrals" 
              className="group bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/25"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Referrals</h3>
                  <p className="text-orange-200 text-sm">Invite friends</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Admin Section */}
          {isAdmin && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Admin Tools</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Link 
                  href="/admin/referrals" 
                  className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/25"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <ShieldCheckIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Manage Referrals</h3>
                      <p className="text-indigo-200 text-sm">Admin panel</p>
                    </div>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Subscription Management - Full Width */}
        <div className="mb-8">
          <SubscriptionManager />
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <p className="text-gray-500 dark:text-slate-400 text-center py-8">No recent activity to show</p>
          </div>
        </div>
      </div>
    </div>
  )
} 