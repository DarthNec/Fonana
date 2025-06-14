'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/useUser'
import PostCard from '@/components/PostCard'
import SubscribeModal from '@/components/SubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import { 
  SparklesIcon, 
  FireIcon, 
  ClockIcon, 
  UsersIcon,
  FunnelIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

const categories = [
  'All', 'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 
  'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 
  'Blockchain', 'Intimate', 'Education', 'Comedy'
]

export default function FeedPage() {
  const { user } = useUser()
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'following'>('latest')
  
  // Состояние для модалок
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [preferredTier, setPreferredTier] = useState<'basic' | 'premium' | 'vip'>('basic')

  useEffect(() => {
    loadPosts()
  }, [user])

  const loadPosts = async () => {
    try {
      setIsLoading(true)
      
      // Add current user's wallet to request
      const params = new URLSearchParams()
      if (user?.wallet) {
        params.append('userWallet', user.wallet)
      }
      
      const response = await fetch(`/api/posts?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to load posts')
      }

      const data = await response.json()
      console.log('Loaded posts:', data.posts)
      
      // Format data for display
      const formattedPosts = data.posts.map((post: any) => ({
        id: post.id,
        creator: {
          id: post.creator.id,
          name: post.creator.nickname || post.creator.wallet.slice(0, 6) + '...',
          username: post.creator.wallet.slice(0, 6) + '...' + post.creator.wallet.slice(-4),
          avatar: post.creator.avatar || '/default-avatar.png',
          isVerified: false
        },
        title: post.title,
        content: post.content,
        category: post.category,
        image: post.thumbnail || post.mediaUrl,
        type: post.type as 'text' | 'image' | 'video' | 'audio',
        isLocked: post.isLocked,
        isPremium: post.isPremium || false,
        price: post.price,
        currency: post.currency,
        likes: post._count?.likes || 0,
        comments: post._count?.comments || 0,
        createdAt: post.createdAt,
        tags: post.tags || [],
        isSubscribed: post.isSubscribed || false
      }))

      setPosts(formattedPosts)
    } catch (error) {
      console.error('Error loading posts:', error)
      toast.error('Error loading posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribeClick = (creatorData: any, tier: 'basic' | 'premium' | 'vip' = 'basic') => {
    setSelectedCreator(creatorData)
    setPreferredTier(tier)
    setShowSubscribeModal(true)
  }

  const handlePurchaseClick = (postData: any) => {
    setSelectedPost(postData)
    setShowPurchaseModal(true)
  }

  const filteredPosts = posts.filter(post => 
    selectedCategory === 'All' || post.category === selectedCategory
  )

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    } else if (sortBy === 'popular') {
      return (b.likes + b.comments) - (a.likes + a.comments)
    }
    return 0
  })

  const sortOptions = [
    { id: 'latest', label: 'Latest', icon: ClockIcon },
    { id: 'popular', label: 'Popular', icon: FireIcon },
    { id: 'following', label: 'Following', icon: UsersIcon }
  ]

  return (
    <div className="min-h-screen pt-16"> {/* Added pt-16 for navbar offset */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Content Feed
              </span>
            </h1>
            <p className="text-slate-400">Discover amazing content from creators</p>
          </div>
          <Link
            href="/create"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Create
          </Link>
        </div>

        {/* Filters and Sort */}
        <div className="mb-8 space-y-4">
          {/* Sort Options */}
          <div className="flex items-center gap-4 mb-6">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id as any)}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  sortBy === option.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <option.icon className="w-5 h-5" />
                {option.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <FunnelIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Filter by categories</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-4xl">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full transition-all ${
                    selectedCategory === category
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                      : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Loading posts...</p>
            </div>
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="text-center py-20">
            <SparklesIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-300 mb-2">No posts yet</h3>
            <p className="text-slate-400 mb-6">Be the first to create content!</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300"
            >
              <PlusIcon className="w-5 h-5" />
              Create first post
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {sortedPosts.map((post) => (
              <PostCard
                key={post.id}
                {...post}
                showCreator={true}
                onSubscribeClick={handleSubscribeClick}
                onPurchaseClick={handlePurchaseClick}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {sortedPosts.length > 0 && (
          <div className="text-center mt-12">
            <button className="px-8 py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-xl font-medium transition-all">
              Load more
            </button>
          </div>
        )}
      </div>

      {/* Modals moved outside */}
      {showSubscribeModal && selectedCreator && (
        <SubscribeModal
          creator={selectedCreator}
          preferredTier={preferredTier}
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={() => {
            setShowSubscribeModal(false)
            loadPosts() // Reload posts after subscription
          }}
        />
      )}

      {showPurchaseModal && selectedPost && (
        <PurchaseModal
          post={selectedPost}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => {
            setShowPurchaseModal(false)
            loadPosts() // Reload posts after purchase
          }}
        />
      )}
    </div>
  )
} 