'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Avatar from './Avatar'
import { CheckBadgeIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { getCreatorById, getAllCreators, type Creator } from '../lib/mockData'
import { useUser } from '@/lib/hooks/useUser'
import SubscribeModal from './SubscribeModal'

interface SubscriptionInfo {
  creatorId: number
  isVisible: boolean
  subscriptionTier: string
  subscribedAt: string
}

// Mock data for user subscriptions - using real creator IDs
const mockUserSubscriptions: SubscriptionInfo[] = []

export default function SubscriptionsCarousel() {
  const { user } = useUser()
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Загружаем подписки пользователя
    if (user) {
      // Здесь будет реальная загрузка подписок из базы
      setSubscriptions(mockUserSubscriptions)
    }

    // Загружаем рекомендации
    loadRecommendations()
  }, [user])

  const loadRecommendations = () => {
    // Получаем всех креаторов и сортируем по популярности
    const allCreators = getAllCreators()
    const sortedCreators = allCreators
      .sort((a: Creator, b: Creator) => b.subscribers - a.subscribers)
      .slice(0, 10) // Топ 10 креаторов
    
    // Перемешиваем и берем 5 случайных из топ-10
    const shuffled = sortedCreators.sort(() => 0.5 - Math.random())
    setRecommendations(shuffled.slice(0, 5))
  }

  // Show only visible creators
  const visibleSubscriptions = subscriptions.filter(sub => sub.isVisible)

  const toggleVisibility = (creatorId: number) => {
    setSubscriptions(prev => 
      prev.map(sub => 
        sub.creatorId === creatorId 
          ? { ...sub, isVisible: !sub.isVisible }
          : sub
      )
    )
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

  const handleSubscribeClick = (creator: any) => {
    setSelectedCreator(creator)
    setShowSubscribeModal(true)
  }

  // Если нет подписок, показываем рекомендации
  if (visibleSubscriptions.length === 0 && recommendations.length > 0) {
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
                    <Image
                      src={creator.coverImage}
                      alt={`${creator.name} cover`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-6xl">
                        {creator.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
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
            creator={selectedCreator}
            onClose={() => {
              setShowSubscribeModal(false)
              setSelectedCreator(null)
            }}
            onSuccess={() => {
              // Обновляем список подписок
              loadRecommendations()
            }}
          />
        )}
      </div>
    )
  }

  // Обычное отображение подписок
  return (
    <div className="container mx-auto px-4">
      {/* Carousel */}
      <div className="relative">
        {/* Navigation Buttons */}
        {visibleSubscriptions.length > 4 && (
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

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {visibleSubscriptions.map((sub) => {
            const creator = getCreatorById(sub.creatorId)
            if (!creator) return null
            
            return (
              <div
                key={creator.id}
                className="flex-shrink-0 w-80 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 hover:border-purple-500/30 transition-all duration-500 hover:transform hover:scale-[1.02]"
              >
                {/* Hover glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                
                <div className="relative z-10 p-4">
                  {/* Cover Image */}
                  <div className="relative h-32 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                    <Image
                      src={creator.coverImage}
                      alt={`${creator.name} cover`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-6xl">
                        {creator.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Visibility Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleVisibility(creator.id)
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 bg-slate-800/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-400 hover:text-white"
                      title="Hide from carousel"
                    >
                      <EyeSlashIcon className="w-3 h-3" />
                    </button>
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
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    href={`/creator/${creator.id}`}
                    className="w-full group/btn block"
                  >
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold text-sm text-center transform group-hover/btn:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25">
                      Смотреть
                    </div>
                  </Link>
                </div>
              </div>
            )
          })}

          {/* Manage hidden subscriptions */}
          {subscriptions.filter(sub => !sub.isVisible).length > 0 && (
            <div className="flex-shrink-0 w-80 flex items-center justify-center">
              <button
                onClick={() => setShowSettings(true)}
                className="w-full h-full min-h-[280px] rounded-3xl border-2 border-dashed border-slate-600/50 hover:border-slate-500/50 transition-colors bg-slate-800/20 backdrop-blur-sm flex flex-col items-center justify-center gap-4 group"
              >
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-600/50 group-hover:border-slate-500/50 transition-colors flex items-center justify-center">
                  <span className="text-slate-500 group-hover:text-slate-400 text-xl font-bold">
                    +{subscriptions.filter(sub => !sub.isVisible).length}
                  </span>
                </div>
                <div>
                  <p className="text-slate-500 group-hover:text-slate-400 font-medium mb-1">Скрытые</p>
                  <p className="text-slate-600 text-sm">Нажмите для настройки</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Управление подписками</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <p className="text-slate-400 mb-6">
              Настройте, какие авторы отображаются в карусели подписок
            </p>

            <div className="space-y-4">
              {subscriptions.map((sub) => {
                const creator = getCreatorById(sub.creatorId)
                if (!creator) return null
                
                return (
                  <div
                    key={creator.id}
                    className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-2xl border border-slate-600/50"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex-shrink-0">
                      <Avatar
                        src={creator.avatar}
                        alt={creator.name}
                        seed={creator.username}
                        size={48}
                        rounded="xl"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white truncate">
                          {creator.name}
                        </h4>
                        {creator.isVerified && (
                          <CheckBadgeIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-400 text-sm">@{creator.username}</p>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${sub.isVisible ? 'text-green-400' : 'text-slate-500'}`}>
                        {sub.isVisible ? 'Видимый' : 'Скрытый'}
                      </span>
                      <button
                        onClick={() => toggleVisibility(creator.id)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          sub.isVisible ? 'bg-purple-600' : 'bg-slate-600'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                            sub.isVisible ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 p-4 bg-slate-700/30 rounded-2xl border border-slate-600/50">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <EyeIcon className="w-5 h-5 text-purple-400" />
                О видимости в карусели
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                Скрытые авторы не будут отображаться в карусели подписок. 
                Вы по-прежнему будете подписаны и сможете получить доступ к их контенту.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubscribeModal && selectedCreator && (
        <SubscribeModal
          creator={selectedCreator}
          onClose={() => {
            setShowSubscribeModal(false)
            setSelectedCreator(null)
          }}
          onSuccess={() => {
            // Обновляем список подписок
            loadRecommendations()
          }}
        />
      )}
    </div>
  )
} 