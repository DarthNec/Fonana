'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Avatar from './Avatar'
import { CheckBadgeIcon, PlayIcon, UserPlusIcon, HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { creatorsData, isUserSubscribedTo } from '../lib/mockData'
import SubscribeModal from './SubscribeModal'

const categories = ['All', 'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 'Blockchain', 'Intimate']

export default function CreatorsExplorer() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [favorites, setFavorites] = useState<number[]>([])
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState<any>(null)

  const filteredCreators = selectedCategory === 'All' 
    ? creatorsData 
    : creatorsData.filter(creator => creator.tags.includes(selectedCategory))

  const toggleFavorite = (creatorId: number) => {
    setFavorites(prev => 
      prev.includes(creatorId) 
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    )
  }

  const handleSubscribeClick = (creator: any) => {
    setSelectedCreator(creator)
    setShowSubscribeModal(true)
  }

  return (
    <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            <span className="text-white">Откройте талантливых </span>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              авторов
            </span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Исследуйте эксклюзивный контент от проверенных авторов и поддержите их через Web3
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-600/50 hover:border-purple-500/30'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Creators Grid */}
        <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCreators.map((creator) => {
            const isSubscribed = isUserSubscribedTo(creator.id)
            
            return (
              <div 
                key={creator.id} 
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 hover:border-purple-500/30 transition-all duration-500 hover:transform hover:scale-[1.02]"
              >
                {/* Hover glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                
                <div className="relative z-10 p-6">
                  {/* Cover Image */}
                  <div className="relative h-40 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                    <Image
                      src={creator.coverImage}
                      alt={`${creator.name} cover`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
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
                        <h3 className="font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                          {creator.name}
                        </h3>
                        {creator.isVerified && (
                          <CheckBadgeIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-400 text-sm truncate">@{creator.username}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-purple-400 font-semibold">
                          {creator.subscribers.toLocaleString()} подписчиков
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-300 text-sm leading-relaxed mb-4 line-clamp-2">
                    {creator.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {creator.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 text-xs font-medium rounded-full border border-purple-500/30"
                      >
                        {tag}
                      </span>
                    ))}
                    {creator.tags.length > 2 && (
                      <span className="px-3 py-1 bg-slate-700/50 text-slate-400 text-xs font-medium rounded-full">
                        +{creator.tags.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Monthly Earnings */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Месячный доход</p>
                      <p className="text-green-400 font-bold text-lg">
                        {creator.monthlyEarnings}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs mb-1">Постов</p>
                      <p className="text-white font-semibold">
                        {creator.posts}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {isSubscribed ? (
                      // Show "Watch" button for subscribed users
                      <Link
                        href={`/creator/${creator.id}`}
                        className="flex-1 group/btn"
                      >
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center transform group-hover/btn:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25">
                          <PlayIcon className="w-4 h-4 mr-2" />
                          Смотреть
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
                          Подписаться
                        </div>
                      </button>
                    )}
                    
                    <Link
                      href={`/creator/${creator.id}`}
                      className="group/btn"
                    >
                      <div className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white px-4 py-3 rounded-2xl font-semibold text-sm border border-slate-600/50 hover:border-purple-500/30 transform group-hover/btn:scale-105 transition-all duration-300 flex items-center justify-center">
                        <PlayIcon className="w-4 h-4" />
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <button className="group">
            <div className="bg-slate-800/50 backdrop-blur-sm text-slate-300 hover:text-white px-8 py-4 rounded-2xl font-semibold border border-slate-600/50 hover:border-slate-500/50 transform group-hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-slate-500/25">
              Загрузить больше
            </div>
          </button>
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
            // Здесь можно обновить состояние подписок
            window.location.reload() // Временное решение
          }}
        />
      )}
    </section>
  )
} 