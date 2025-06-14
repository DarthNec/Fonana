'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Avatar from './Avatar'
import { CheckBadgeIcon, PlayIcon, UserPlusIcon, HeartIcon, UsersIcon, SparklesIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import SubscribeModal from './SubscribeModal'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'

const categories = ['All', 'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 'Blockchain', 'Intimate']

interface Creator {
  id: string
  name: string
  username: string
  description: string
  avatar: string | null
  backgroundImage?: string | null
  coverImage: string
  isVerified: boolean
  subscribers: number
  posts: number
  tags: string[]
  monthlyEarnings: string
  createdAt: string
}

export default function CreatorsExplorer() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [favorites, setFavorites] = useState<string[]>([])
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<string[]>([])
  const [hiddenCreatorIds, setHiddenCreatorIds] = useState<string[]>([])
  const { publicKey } = useWallet()
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'recommendations' | 'all'>('subscriptions')

  // Load creators list
  useEffect(() => {
    fetchCreators()
  }, [])

  // Load user subscriptions and visibility preferences
  useEffect(() => {
    if (publicKey) {
      fetchUserSubscriptions()
    }
  }, [publicKey])

  // Automatically switch to the right tab
  useEffect(() => {
    if (!publicKey) {
      setActiveTab('all')
    } else if (subscribedCreatorIds.length === 0) {
      setActiveTab('recommendations')
    }
  }, [publicKey, subscribedCreatorIds])

  const fetchCreators = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/creators')
      const data = await response.json()
      
      if (response.ok) {
        setCreators(data.creators || [])
      } else {
        toast.error('Error loading creators')
      }
    } catch (error) {
      console.error('Error fetching creators:', error)
      toast.error('Error loading creators')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserSubscriptions = async () => {
    try {
      const response = await fetch(`/api/user?wallet=${publicKey?.toBase58()}`)
      const userData = await response.json()
      
      if (userData.user?.id) {
        const subsResponse = await fetch(`/api/subscriptions/check?userId=${userData.user.id}`)
        const subsData = await subsResponse.json()
        
        if (subsResponse.ok) {
          setSubscribedCreatorIds(subsData.subscribedCreatorIds || [])
        }
        
        // Load hidden subscription IDs from localStorage
        const savedVisibility = localStorage.getItem(`sub_visibility_${userData.user.id}`)
        if (savedVisibility) {
          try {
            const hiddenSubIds = JSON.parse(savedVisibility)
            // Get full subscriptions to map subscription IDs to creator IDs
            const fullSubsResponse = await fetch(`/api/subscriptions?userId=${userData.user.id}`)
            const fullSubsData = await fullSubsResponse.json()
            
            if (fullSubsResponse.ok) {
              const hiddenCreators = fullSubsData.subscriptions
                .filter((sub: any) => hiddenSubIds.includes(sub.id))
                .map((sub: any) => sub.creatorId)
              setHiddenCreatorIds(hiddenCreators)
            }
          } catch (error) {
            console.error('Error loading visibility preferences:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    }
  }

  const toggleFavorite = (creatorId: string) => {
    setFavorites(prev => 
      prev.includes(creatorId) 
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    )
  }

  const handleSubscribeClick = (creator: Creator) => {
    if (!publicKey) {
      toast.error('Connect wallet to subscribe')
      return
    }
    setSelectedCreator(creator)
    setShowSubscribeModal(true)
  }

  const isUserSubscribedTo = (creatorId: string) => {
    return subscribedCreatorIds.includes(creatorId)
  }

  // Фильтруем авторов в зависимости от активной вкладки
  const getFilteredCreators = () => {
    let filtered = creators

    if (activeTab === 'subscriptions') {
      // Показываем только тех, на кого подписан пользователь и кто не скрыт
      filtered = creators.filter(creator => 
        isUserSubscribedTo(creator.id) && !hiddenCreatorIds.includes(creator.id)
      )
    } else if (activeTab === 'recommendations') {
      // Показываем рекомендации - случайные 6 авторов, на которых НЕ подписан
      const notSubscribed = creators.filter(creator => !isUserSubscribedTo(creator.id))
      // Перемешиваем и берем первые 6
      filtered = notSubscribed.sort(() => Math.random() - 0.5).slice(0, 6)
    } else {
      // activeTab === 'all' - показываем всех с фильтрацией по категории
      if (selectedCategory !== 'All') {
        filtered = creators.filter(creator => creator.tags.includes(selectedCategory))
      }
    }

    return filtered
  }

  const filteredCreators = getFilteredCreators()

  const renderCreatorCard = (creator: Creator) => {
    const isSubscribed = isUserSubscribedTo(creator.id)
    
    return (
      <div 
        key={creator.id} 
        className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 hover:border-purple-500/50 dark:hover:border-purple-500/30 transition-all duration-500 hover:transform hover:scale-[1.02] h-full flex flex-col"
      >
        {/* Hover glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
        
        <div className="relative z-10 p-6 flex flex-col h-full">
          {/* Cover Image */}
          <div className="relative h-40 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
            {creator.backgroundImage ? (
              <Image
                src={creator.backgroundImage}
                alt={`${creator.name} background`}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                <span className="text-4xl font-bold text-white/50">
                  {creator.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            
            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                toggleFavorite(creator.id)
              }}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
            >
              {favorites.includes(creator.id) ? (
                <HeartSolidIcon className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {/* Avatar & Info */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <Avatar
                  src={creator.avatar}
                  alt={creator.name}
                  seed={creator.username}
                  size={64}
                  rounded="2xl"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                  {creator.name}
                </h3>
                {creator.isVerified && (
                  <CheckBadgeIcon className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                )}
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-sm truncate">@{creator.username}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-purple-600 dark:text-purple-400 font-semibold">
                  {creator.subscribers.toLocaleString()} subscribers
                </span>
              </div>
            </div>
          </div>

          {/* Content section with flex-grow to push buttons to bottom */}
          <div className="flex-1 flex flex-col">
            {/* Description */}
            <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed mb-4 line-clamp-2">
              {creator.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {creator.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full border border-purple-500/30"
                >
                  {tag}
                </span>
              ))}
              {creator.tags.length > 2 && (
                <span className="px-3 py-1 bg-gray-100 dark:bg-slate-700/50 text-gray-600 dark:text-slate-400 text-xs font-medium rounded-full">
                  +{creator.tags.length - 2}
                </span>
              )}
            </div>

            {/* Monthly Earnings - push to bottom with mt-auto */}
            <div className="flex items-center justify-between mb-6 mt-auto">
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-xs mb-1">Monthly earnings</p>
                <p className="text-green-600 dark:text-green-400 font-bold text-lg">
                  {creator.monthlyEarnings}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 dark:text-slate-400 text-xs mb-1">Posts</p>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {creator.posts}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons - now always at the bottom */}
          <div className="flex gap-3">
            {isSubscribed ? (
              // Show "Watch" button for subscribed users
              <Link
                href={`/creator/${creator.id}`}
                className="flex-1 group/btn"
              >
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center transform group-hover/btn:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25">
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Watch
                </div>
              </Link>
            ) : (
              // Show "Subscribe" button for non-subscribed users
              <button
                onClick={() => handleSubscribeClick(creator)}
                className="flex-1 group/btn"
              >
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center transform group-hover/btn:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25">
                  <UserPlusIcon className="w-4 h-4 mr-2" />
                  Subscribe
                </div>
              </button>
            )}
            
            <Link
              href={`/creator/${creator.id}`}
              className="group/btn"
            >
              <div className="bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-600/50 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white px-4 py-3 rounded-2xl font-semibold text-sm border border-gray-200 dark:border-slate-600/50 hover:border-gray-300 dark:hover:border-purple-500/30 transform group-hover/btn:scale-105 transition-all duration-300 flex items-center justify-center">
                <PlayIcon className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-slate-300">Loading creators...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 bg-gray-50 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            <span className="text-gray-900 dark:text-white">Explore </span>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              creators
            </span>
          </h2>
        </div>

        {/* Top Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1 border border-gray-200 dark:border-slate-700/50">
            {publicKey && (
              <>
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'subscriptions'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <UsersIcon className="w-5 h-5" />
                  Your subscriptions
                  {subscribedCreatorIds.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                      {subscribedCreatorIds.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'recommendations'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <SparklesIcon className="w-5 h-5" />
                  Recommendations
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Squares2X2Icon className="w-5 h-5" />
              All creators
            </button>
          </div>
        </div>

        {/* Category Filter (only for "All Authors" tab) */}
        {activeTab === 'all' && (
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-white dark:bg-slate-800/50 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 hover:border-gray-300 dark:hover:border-purple-500/30'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content Title */}
        {activeTab === 'subscriptions' && filteredCreators.length > 0 && (
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Your subscriptions</h3>
            <p className="text-gray-600 dark:text-slate-400 mt-2">Creators you are subscribed to</p>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Recommendations for you</h3>
            <p className="text-gray-600 dark:text-slate-400 mt-2">Creators that might interest you</p>
          </div>
        )}

        {activeTab === 'all' && (
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">All creators</h3>
            <p className="text-gray-600 dark:text-slate-400 mt-2">
              {selectedCategory === 'All' 
                ? 'All platform creators' 
                : `Creators in category ${selectedCategory}`}
            </p>
          </div>
        )}

        {/* Creators Grid */}
        {filteredCreators.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-slate-400 text-lg">
              {activeTab === 'subscriptions' 
                ? 'You are not subscribed to any creators' 
                : activeTab === 'recommendations'
                ? 'No recommendations'
                : 'No creators in this category'}
            </p>
            {activeTab === 'subscriptions' && (
              <button
                onClick={() => setActiveTab('recommendations')}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:scale-105 transition-transform"
              >
                View recommendations
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCreators.map(renderCreatorCard)}
          </div>
        )}
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && selectedCreator && (
        <SubscribeModal
          creator={{
            ...selectedCreator,
            avatar: selectedCreator.avatar || '/avatars/default.png'
          }}
          onClose={() => {
            setShowSubscribeModal(false)
            setSelectedCreator(null)
          }}
          onSuccess={() => {
            // Обновляем список подписок
            fetchUserSubscriptions()
            setShowSubscribeModal(false)
            setSelectedCreator(null)
          }}
        />
      )}
    </section>
  )
} 