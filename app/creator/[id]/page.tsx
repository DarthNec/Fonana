'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import PostCard from '@/components/PostCard'
import SubscribeModal from '@/components/SubscribeModal'
import PurchaseModal from '@/components/PurchaseModal'
import FlashSalesList from '@/components/FlashSalesList'
import { 
  CheckBadgeIcon, 
  LinkIcon,
  CalendarIcon,
  UsersIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShareIcon,
  UserPlusIcon,
  CheckIcon,
  GlobeAltIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  VideoCameraIcon,
  ChatBubbleLeftEllipsisIcon
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
  backgroundImage: string | null
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
  const [activeTab, setActiveTab] = useState<'posts' | 'photos' | 'videos'>('posts')
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [currentSubscriptionTier, setCurrentSubscriptionTier] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedPurchaseData, setSelectedPurchaseData] = useState<any>(null)
  const [selectedCreatorData, setSelectedCreatorData] = useState<any>(null)
  const [selectedTier, setSelectedTier] = useState<'basic' | 'premium' | 'vip' | undefined>(undefined)
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [creatorTiers, setCreatorTiers] = useState<any>(null)

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
                              image: post.mediaUrl || post.thumbnail,
          mediaUrl: post.mediaUrl,
          thumbnail: post.thumbnail,
          preview: post.preview,
          type: post.type as 'text' | 'image' | 'video' | 'audio',
          isLocked: post.isLocked,
          isPremium: post.isPremium || false,
          price: post.price,
          currency: post.currency,
          likes: post._count?.likes || 0,
          comments: post._count?.comments || 0,
          createdAt: post.createdAt,
          tags: post.tags || [],
          isSubscribed: post.isSubscribed || false,
          shouldHideContent: post.shouldHideContent || false,
          requiredTier: post.requiredTier || null,
          userTier: post.userTier || null,
          flashSale: post.flashSale || null
        }))
        setPosts(formattedPosts)
      }

      // Check subscription if user is authenticated
      if (user) {
        const subResponse = await fetch(`/api/subscriptions/check?userId=${user.id}&creatorId=${params.id}`)
        if (subResponse.ok) {
          const subData = await subResponse.json()
          setIsSubscribed(subData.isSubscribed)
          if (subData.subscription && subData.isSubscribed) {
            setCurrentSubscriptionTier(subData.subscription.plan)
          }
        }
      }

      // Load creator tier settings
      const tierResponse = await fetch(`/api/user/tier-settings?wallet=${creatorInfo.wallet}`)
      if (tierResponse.ok) {
        const tierData = await tierResponse.json()
        setCreatorTiers(tierData.settings)
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
    setSelectedTier(tier)
    setShowSubscribeModal(true)
  }

  const handlePurchaseClick = (postData: any) => {
    setSelectedPurchaseData(postData)
    setShowPurchaseModal(true)
  }

  const handleMessageClick = async () => {
    if (!user || !user.wallet) {
      toast.error('Please connect your wallet')
      return
    }

    try {
      // Create or get existing conversation
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-wallet': user.wallet
        },
        body: JSON.stringify({
          participantId: creator!.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/messages/${data.conversation.id}`)
      } else {
        toast.error('Failed to start conversation')
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      toast.error('Failed to start conversation')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }

  // Filter posts based on active tab
  const filteredPosts = posts.filter(post => {
    if (activeTab === 'photos') return post.type === 'image'
    if (activeTab === 'videos') return post.type === 'video'
    return true // 'posts' tab shows all
  })

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
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-32 flex items-center justify-center">
        <p className="text-gray-600 dark:text-slate-400">Error: Invalid creator ID</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full">
          <div className="w-[60rem] h-[60rem] bg-gradient-to-r from-purple-500/10 dark:from-purple-500/20 to-pink-500/10 dark:to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full">
          <div className="w-[60rem] h-[60rem] bg-gradient-to-r from-blue-500/10 dark:from-blue-500/20 to-cyan-500/10 dark:to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>

      <div className="relative z-10 pt-32 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl overflow-hidden mb-8">
            {/* Background Image with Gradient Overlay */}
            <div className="relative">
              {creator.backgroundImage && (
                <div className="absolute inset-0">
                  <img
                    src={creator.backgroundImage}
                    alt={`${creator.nickname} background`}
                    className="w-full h-full object-cover"
                  />
                  {/* Gradient overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-white/80 dark:via-slate-900/80 to-white/40 dark:to-slate-900/40"></div>
                </div>
              )}
              
              <div className="relative z-10 p-8 md:p-12">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white/50 dark:border-slate-800/50 bg-gradient-to-br from-purple-500/20 to-pink-500/20 shadow-xl">
                      <Avatar
                        src={creator.avatar}
                        alt={creator.nickname}
                        seed={creator.wallet}
                        size={128}
                        rounded="3xl"
                      />
                    </div>
                    {creator.isVerified && (
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <CheckBadgeIcon className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Creator Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">{creator.fullName || creator.nickname}</h1>
                        <p className="text-gray-600 dark:text-slate-400 text-lg mb-4">@{creator.nickname}</p>
                        <p className="text-gray-700 dark:text-slate-300 leading-relaxed max-w-2xl">{creator.bio}</p>
                      </div>

                      {/* Subscribe Button (Desktop) */}
                      <div className="hidden md:flex gap-3">
                        {!isSubscribed ? (
                          <button
                            onClick={() => handleSubscribeClick({
                              id: creator.id,
                              name: creator.fullName || creator.nickname,
                              username: creator.nickname,
                              avatar: creator.avatar || '',
                              isVerified: creator.isVerified
                            })}
                            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                          >
                            <UserPlusIcon className="w-5 h-5" />
                            Subscribe
                          </button>
                        ) : (
                          <div className="flex flex-col items-end gap-2">
                            <button className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold shadow-lg flex items-center gap-2">
                              <CheckIcon className="w-5 h-5" />
                              Subscribed
                            </button>
                            {currentSubscriptionTier && (
                              <div className="flex justify-center">
                                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${
                                  currentSubscriptionTier.toLowerCase() === 'basic' ? 'from-gray-400 to-gray-600' :
                                  currentSubscriptionTier.toLowerCase() === 'premium' ? 'from-purple-500 to-pink-500' :
                                  currentSubscriptionTier.toLowerCase() === 'vip' ? 'from-yellow-400 to-orange-500' :
                                  'from-blue-400 to-cyan-400'
                                }`}>
                                  <span>{
                                    currentSubscriptionTier.toLowerCase() === 'basic' ? '⭐' :
                                    currentSubscriptionTier.toLowerCase() === 'premium' ? '💎' :
                                    currentSubscriptionTier.toLowerCase() === 'vip' ? '👑' :
                                    '✨'
                                  }</span>
                                  <span>{currentSubscriptionTier} tier</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Message Button */}
                        <button
                          onClick={handleMessageClick}
                          className="px-6 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                        >
                          <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                          Message
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-6 mt-6">
                      <div>
                        <p className="text-gray-900 dark:text-white font-bold text-2xl">{creator.followersCount}</p>
                        <p className="text-gray-600 dark:text-slate-400">Subscribers</p>
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-bold text-2xl">{creator.postsCount}</p>
                        <p className="text-gray-600 dark:text-slate-400">Posts</p>
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-bold text-2xl">{creator.followingCount}</p>
                        <p className="text-gray-600 dark:text-slate-400">Following</p>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="flex flex-wrap gap-4 mt-6">
                      {creator.website && (
                        <a
                          href={creator.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                        >
                          <GlobeAltIcon className="w-5 h-5" />
                          Website
                        </a>
                      )}
                      {creator.twitter && (
                        <a
                          href={`https://twitter.com/${creator.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          Twitter
                        </a>
                      )}
                      {creator.telegram && (
                        <a
                          href={`https://t.me/${creator.telegram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                        >
                          <PaperAirplaneIcon className="w-5 h-5" />
                          Telegram
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subscribe Button (Mobile) */}
                <div className="md:hidden mt-6 space-y-3">
                  {!isSubscribed ? (
                    <button
                      onClick={() => handleSubscribeClick({
                        id: creator.id,
                        name: creator.fullName || creator.nickname,
                        username: creator.nickname,
                        avatar: creator.avatar || '',
                        isVerified: creator.isVerified
                      })}
                      className="w-full px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <UserPlusIcon className="w-5 h-5" />
                      Subscribe
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button className="w-full px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
                        <CheckIcon className="w-5 h-5" />
                        Subscribed
                      </button>
                      {currentSubscriptionTier && (
                        <div className="flex justify-center">
                          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${
                            currentSubscriptionTier.toLowerCase() === 'basic' ? 'from-gray-400 to-gray-600' :
                            currentSubscriptionTier.toLowerCase() === 'premium' ? 'from-purple-500 to-pink-500' :
                            currentSubscriptionTier.toLowerCase() === 'vip' ? 'from-yellow-400 to-orange-500' :
                            'from-blue-400 to-cyan-400'
                          }`}>
                            <span>{
                              currentSubscriptionTier.toLowerCase() === 'basic' ? '⭐' :
                              currentSubscriptionTier.toLowerCase() === 'premium' ? '💎' :
                              currentSubscriptionTier.toLowerCase() === 'vip' ? '👑' :
                              '✨'
                            }</span>
                            <span>{currentSubscriptionTier} tier</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Message Button */}
                  <button
                    onClick={handleMessageClick}
                    className="w-full px-8 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Tiers - перемещено наверх */}
          {creator.isCreator && creatorTiers && (
            <div id="subscription-tiers" className="mb-8">
              <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Subscription Tiers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Basic Tier */}
                  {creatorTiers.basicTier?.enabled && (
                    <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 border border-gray-200 dark:border-slate-600/50 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⭐</span>
                          <h4 className="font-semibold text-gray-900 dark:text-white">Basic</h4>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {creatorTiers.basicTier.price} SOL
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                        {creatorTiers.basicTier.description || 'Access to basic content'}
                      </p>
                      {currentSubscriptionTier !== 'basic' && (
                        <button
                          onClick={() => handleSubscribeClick({
                            id: creator.id,
                            name: creator.fullName || creator.nickname,
                            username: creator.nickname,
                            avatar: creator.avatar || '',
                            isVerified: creator.isVerified
                          }, 'basic')}
                          className="w-full px-3 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-all"
                        >
                          {isSubscribed ? 'Switch to Basic' : 'Subscribe'}
                        </button>
                      )}
                      {currentSubscriptionTier === 'basic' && (
                        <div className="w-full px-3 py-2 bg-green-500/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium text-center">
                          Current Plan
                        </div>
                      )}
                    </div>
                  )}

                  {/* Premium Tier */}
                  {creatorTiers.premiumTier?.enabled && (
                    <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-200 dark:border-purple-700/50 hover:shadow-lg transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-bl-lg">
                        POPULAR
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">💎</span>
                          <h4 className="font-semibold text-gray-900 dark:text-white">Premium</h4>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {creatorTiers.premiumTier.price} SOL
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                        {creatorTiers.premiumTier.description || 'Extended access'}
                      </p>
                      {currentSubscriptionTier !== 'premium' && (
                        <button
                          onClick={() => handleSubscribeClick({
                            id: creator.id,
                            name: creator.fullName || creator.nickname,
                            username: creator.nickname,
                            avatar: creator.avatar || '',
                            isVerified: creator.isVerified
                          }, 'premium')}
                          className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-all transform hover:scale-105"
                        >
                          {isSubscribed ? 'Upgrade to Premium' : 'Subscribe'}
                        </button>
                      )}
                      {currentSubscriptionTier === 'premium' && (
                        <div className="w-full px-3 py-2 bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium text-center">
                          Current Plan
                        </div>
                      )}
                    </div>
                  )}

                  {/* VIP Tier */}
                  {creatorTiers.vipTier?.enabled && (
                    <div className="bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700/50 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👑</span>
                          <h4 className="font-semibold text-gray-900 dark:text-white">VIP</h4>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {creatorTiers.vipTier.price} SOL
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                        {creatorTiers.vipTier.description || 'Maximum access'}
                      </p>
                      {currentSubscriptionTier !== 'vip' && (
                        <button
                          onClick={() => handleSubscribeClick({
                            id: creator.id,
                            name: creator.fullName || creator.nickname,
                            username: creator.nickname,
                            avatar: creator.avatar || '',
                            isVerified: creator.isVerified
                          }, 'vip')}
                          className="w-full px-3 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-lg text-sm font-medium transition-all transform hover:scale-105"
                        >
                          {isSubscribed ? 'Upgrade to VIP' : 'Subscribe'}
                        </button>
                      )}
                      {currentSubscriptionTier === 'vip' && (
                        <div className="w-full px-3 py-2 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm font-medium text-center">
                          Current Plan
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Flash Sales */}
          {creator.isCreator && (
            <div className="mb-8">
              <FlashSalesList creatorId={creator.id} isOwner={false} />
            </div>
          )}

          {/* Content Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto">
            {[
              { id: 'posts', label: 'Posts', icon: DocumentTextIcon },
              { id: 'photos', label: 'Photos', icon: PhotoIcon },
              { id: 'videos', label: 'Videos', icon: VideoCameraIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-white dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {isLoadingPosts ? (
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-slate-400">Loading content...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-12 text-center">
              <DocumentTextIcon className="w-16 h-16 text-gray-400 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-slate-300 mb-2">No {activeTab} yet</h3>
              <p className="text-gray-600 dark:text-slate-400">Check back later for new content</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  {...post}
                  showCreator={false}
                  flashSale={post.flashSale}
                  onSubscribeClick={handleSubscribeClick}
                  onPurchaseClick={handlePurchaseClick}
                />
              ))}
            </div>
          )}

          {/* Related Creators */}
          <div className="mt-12">
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Related Creators</h2>
              <p className="text-gray-600 dark:text-slate-400">Coming soon...</p>
            </div>
          </div>

          {/* About */}
          <div className="mt-8">
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">About</h2>
              <div className="space-y-2 text-gray-600 dark:text-slate-400">
                <p>Joined {new Date(creator.createdAt).toLocaleDateString()}</p>
                {creator.location && <p>📍 {creator.location}</p>}
              </div>
            </div>
          </div>
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
      {showPurchaseModal && selectedPurchaseData && (
        <PurchaseModal
          post={selectedPurchaseData}
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