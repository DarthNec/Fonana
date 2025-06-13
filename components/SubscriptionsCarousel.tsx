'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Avatar from './Avatar'
import { CheckBadgeIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/lib/hooks/useUser'
import SubscribeModal from './SubscribeModal'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'

interface SubscriptionInfo {
  creatorId: string
  isVisible: boolean
  subscriptionTier: string
  subscribedAt: string
}

interface Creator {
  id: string
  name: string
  username: string
  description: string
  avatar: string | null
  coverImage: string
  isVerified: boolean
  subscribers: number
  posts: number
  tags: string[]
  monthlyEarnings: string
  createdAt: string
}

export default function SubscriptionsCarousel() {
  const { user } = useUser()
  const { publicKey } = useWallet()
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)
  const [recommendations, setRecommendations] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadRecommendations()
  }, [])

  useEffect(() => {
    // Загружаем подписки пользователя
    if (user) {
      loadUserSubscriptions()
    }
  }, [user])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/creators/recommendations?limit=5')
      const data = await response.json()
      
      if (response.ok) {
        setRecommendations(data.recommendations || [])
      } else {
        console.error('Failed to load recommendations')
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserSubscriptions = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/subscriptions?userId=${user.id}`)
      const data = await response.json()
      
      if (response.ok && data.subscriptions) {
        setSubscriptions(data.subscriptions)
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    }
  }

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' })
    }
  }

  const handleSubscribeClick = (creator: Creator) => {
    if (!publicKey) {
      toast.error('Подключите кошелек для подписки')
      return
    }
    setSelectedCreator(creator)
    setShowSubscribeModal(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-slate-400">Загрузка рекомендаций...</p>
        </div>
      </div>
    )
  }

  // Если нет подписок, показываем рекомендации
  if (subscriptions.length === 0 && recommendations.length > 0) {
    return (
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/20 rounded-full border border-purple-500/30 mb-4">
            <SparklesIcon className="w-5 h-5 text-purple-400" />
            <span className="text-purple-300 font-medium">Рекомендации для вас</span>
          </div>
          <p className="text-slate-400">Популярные авторы, на которых стоит подписаться</p>
        </div>

        {/* Recommendations Carousel */}
        <div className="relative">
          {recommendations.length > 4 && (
            <>
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-slate-700/80 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-slate-700/80 transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </>
          )}

          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {recommendations.map((creator) => (
              <div
                key={creator.id}
                className="flex-shrink-0 w-80 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 hover:border-purple-500/30 transition-all duration-500 hover:transform hover:scale-[1.02]"
              >
                {/* Hover glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                
                <div className="relative z-10 p-4">
                  {/* Cover Image */}
                  <div className="relative h-32 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                    {!creator.coverImage || creator.coverImage.includes('api/og') ? (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white/50">
                          {creator.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <Image
                        src={creator.coverImage}
                        alt={`${creator.name} cover`}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Recommendation badge */}
                    <div className="absolute top-2 right-2 px-2 py-1 bg-purple-600/80 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                      Рекомендуем
                    </div>
                  </div>

                  {/* Avatar & Info */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <Avatar
                          src={creator.avatar}
                          alt={creator.name}
                          seed={creator.username}
                          size={48}
                          rounded="2xl"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white truncate group-hover:text-purple-300 transition-colors text-sm">
                          {creator.name}
                        </h3>
                        {creator.isVerified && (
                          <CheckBadgeIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-400 text-xs truncate">@{creator.username}</p>
                      <p className="text-slate-500 text-xs mt-1">{creator.subscribers.toLocaleString()} подписчиков</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSubscribeClick(creator)}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold text-sm text-center transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                    >
                      Подписаться
                    </button>
                    <Link
                      href={`/creator/${creator.id}`}
                      className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl font-semibold text-sm text-center transition-all"
                    >
                      Профиль
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
              loadUserSubscriptions()
              loadRecommendations()
              setShowSubscribeModal(false)
              setSelectedCreator(null)
            }}
          />
        )}
      </div>
    )
  }

  // TODO: Реализовать отображение подписок пользователя
  // Пока показываем только рекомендации
  return (
    <div className="container mx-auto px-4">
      <div className="relative">
        {subscriptions.length > 4 && (
          <>
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-slate-700/80 transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-slate-700/80 transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </>
        )}

        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="flex-shrink-0 w-80 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 hover:border-purple-500/30 transition-all duration-500 hover:transform hover:scale-[1.02]"
            >
              {/* Hover glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
              
              <div className="relative z-10 p-4">
                {/* Cover Image */}
                <div className="relative h-32 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                  <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white/50">
                      {(subscription.creator.fullName || subscription.creator.nickname || 'C').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  {/* Subscription tier badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 backdrop-blur-sm rounded-full text-xs text-white font-medium ${
                    subscription.plan === 'VIP' 
                      ? 'bg-yellow-500/80' 
                      : subscription.plan === 'Premium' 
                      ? 'bg-purple-600/80'
                      : 'bg-blue-600/80'
                  }`}>
                    {subscription.plan}
                  </div>
                </div>

                {/* Avatar & Info */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                      <Avatar
                        src={subscription.creator.avatar}
                        alt={subscription.creator.fullName || subscription.creator.nickname}
                        seed={subscription.creator.nickname || subscription.creator.wallet}
                        size={48}
                        rounded="2xl"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white truncate group-hover:text-purple-300 transition-colors text-sm">
                        {subscription.creator.fullName || subscription.creator.nickname || 'Creator'}
                      </h3>
                      {subscription.creator.isVerified && (
                        <CheckBadgeIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-400 text-xs truncate">@{subscription.creator.nickname || subscription.creator.wallet.slice(0, 6) + '...'}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      Подписан с {new Date(subscription.subscribedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link
                    href={`/creator/${subscription.creatorId}`}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold text-sm text-center transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                  >
                    Перейти к контенту
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 