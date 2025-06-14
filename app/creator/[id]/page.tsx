'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import PostCard from '@/components/PostCard'
import SubscribeModal from '@/components/SubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import { 
  CheckBadgeIcon, 
  LinkIcon,
  CalendarIcon,
  UsersIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import { useUser } from '@/lib/hooks/useUser'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'

interface Creator {
  id: string
  wallet: string
  nickname: string
  fullName: string
  bio: string
  avatar: string | null
  website: string | null
  twitter: string | null
  telegram: string | null
  location: string | null
  isVerified: boolean
  isCreator: boolean
  followersCount: number
  followingCount: number
  postsCount: number
  createdAt: string
}

export default function CreatorPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { connected } = useWallet()
  const [creator, setCreator] = useState<Creator | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'stats'>('posts')
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)

  useEffect(() => {
    if (params.id) {
      loadCreatorData()
    }
  }, [params.id, user])

  const loadCreatorData = async () => {
    try {
      setIsLoading(true)
      
      // Load creator data
      const creatorResponse = await fetch(`/api/user?id=${params.id}`)
      if (!creatorResponse.ok) {
        throw new Error('Creator not found')
      }
      const creatorData = await creatorResponse.json()
      
      // Transform data for proper display
      const creatorInfo = {
        ...creatorData.user,
        followersCount: creatorData.user._count?.followers || 0,
        followingCount: creatorData.user._count?.follows || 0,
        postsCount: creatorData.user._count?.posts || 0
      }
      setCreator(creatorInfo)

      // Load creator posts
      const postsParams = new URLSearchParams({
        creatorId: params.id as string
      })
      if (user?.wallet) {
        postsParams.append('userWallet', user.wallet)
      }
      
      const postsResponse = await fetch(`/api/posts?${postsParams.toString()}`)
      if (postsResponse.ok) {
        const postsData = await postsResponse.json()
        // Format posts like on feed page
        const formattedPosts = postsData.posts.map((post: any) => ({
          id: post.id,
          creator: {
            id: creatorInfo.id,
            name: creatorInfo.fullName || creatorInfo.nickname,
            username: creatorInfo.nickname,
            avatar: creatorInfo.avatar,
            isVerified: creatorInfo.isVerified
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
      }

      // Check subscription if user is authenticated
      if (user) {
        const subResponse = await fetch(`/api/subscriptions/check?userId=${user.id}&creatorId=${params.id}`)
        if (subResponse.ok) {
          const subData = await subResponse.json()
          setIsSubscribed(subData.isSubscribed)
        }
      }
    } catch (error) {
      console.error('Error loading creator data:', error)
      toast.error('Error loading creator data')
      router.push('/creators')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!connected) {
      toast.error('Connect wallet')
      return
    }

    setIsFollowing(!isFollowing)
    // TODO: API for following creator
  }

  const handleSubscribeClick = (creatorData: any, tier: 'basic' | 'premium' | 'vip' = 'basic') => {
    setShowSubscribeModal(true)
  }

  const handlePurchaseClick = (postData: any) => {
    setSelectedPost(postData)
    setShowPurchaseModal(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 pt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-slate-900 pt-32">
        <div className="text-center">
          <p className="text-slate-400">Creator not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full">
          <div className="w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full">
          <div className="w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>

      <div className="relative z-10 pt-32 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back
          </button>

          {/* Profile Header */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              {/* Avatar */}
              <Avatar
                src={creator.avatar}
                alt={creator.fullName || creator.nickname}
                seed={creator.nickname || creator.wallet}
                size={128}
                rounded="3xl"
                className="border-4 border-purple-500/30"
              />

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">
                    {creator.fullName || creator.nickname}
                  </h1>
                  {creator.isVerified && (
                    <CheckBadgeIcon className="w-8 h-8 text-blue-400" />
                  )}
                </div>
                <p className="text-slate-400 mb-4">@{creator.nickname}</p>
                
                {creator.bio && (
                  <p className="text-slate-300 mb-6 max-w-2xl">{creator.bio}</p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-white font-semibold">{creator.followersCount}</span>
                    <span className="text-slate-400">followers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-white font-semibold">{creator.postsCount}</span>
                    <span className="text-slate-400">posts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-400">Created {formatDate(creator.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4">
                  {creator.id !== user?.id && (
                    <>
                      <button
                        onClick={() => setShowSubscribeModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105"
                      >
                        {isSubscribed ? 'Manage subscription' : 'Subscribe'}
                      </button>
                      <button
                        onClick={handleFollow}
                        className={`px-6 py-3 border rounded-xl font-semibold transition-all ${
                          isFollowing
                            ? 'border-purple-500 text-purple-400 hover:bg-purple-500/10'
                            : 'border-slate-600 text-slate-300 hover:text-white hover:border-slate-500'
                        }`}
                      >
                        {isFollowing ? 'Reading' : 'Read'}
                      </button>
                    </>
                  )}
                  <button className="p-3 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl transition-all">
                    <ShareIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Links */}
            {(creator.website || creator.twitter || creator.telegram) && (
              <div className="mt-6 pt-6 border-t border-slate-700/50 flex flex-wrap gap-4">
                {creator.website && (
                  <a
                    href={creator.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <LinkIcon className="w-5 h-5" />
                    Website
                  </a>
                )}
                {creator.twitter && (
                  <a
                    href={`https://twitter.com/${creator.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <LinkIcon className="w-5 h-5" />
                    Twitter
                  </a>
                )}
                {creator.telegram && (
                  <a
                    href={`https://t.me/${creator.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <LinkIcon className="w-5 h-5" />
                    Telegram
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'posts'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              <DocumentTextIcon className="w-5 h-5 inline mr-2" />
              Posts
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'about'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              <UsersIcon className="w-5 h-5 inline mr-2" />
              About the Creator
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              <ChartBarIcon className="w-5 h-5 inline mr-2" />
              Stats
            </button>
          </div>

          {/* Content */}
          {activeTab === 'posts' && (
            <div>
              {posts.length === 0 ? (
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12 text-center">
                  <DocumentTextIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      {...post}
                      showCreator={false}
                      onSubscribeClick={handleSubscribeClick}
                      onPurchaseClick={handlePurchaseClick}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">About the Creator</h2>
              <div className="space-y-6">
                {creator.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Biography</h3>
                    <p className="text-slate-300">{creator.bio}</p>
                  </div>
                )}
                {creator.location && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Location</h3>
                    <p className="text-slate-300">{creator.location}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">On Platform</h3>
                  <p className="text-slate-300">Created {formatDate(creator.createdAt)}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                    <UsersIcon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Followers</p>
                    <p className="text-2xl font-bold text-white">{creator.followersCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                    <DocumentTextIcon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Posts</p>
                    <p className="text-2xl font-bold text-white">{creator.postsCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center">
                    <CurrencyDollarIcon className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Earned</p>
                    <p className="text-2xl font-bold text-white">$0</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <SubscribeModal
          creator={{
            id: creator.id,
            name: creator.fullName || creator.nickname,
            username: creator.nickname,
            avatar: creator.avatar || '',
            isVerified: creator.isVerified
          }}
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={() => {
            setShowSubscribeModal(false)
            loadCreatorData() // Reload data
          }}
        />
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && selectedPost && (
        <PurchaseModal
          post={selectedPost}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => {
            setShowPurchaseModal(false)
            loadCreatorData() // Reload posts after purchase
          }}
        />
      )}
    </div>
  )
} 