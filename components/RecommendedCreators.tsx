'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Avatar from './Avatar'
import { ChevronLeftIcon, ChevronRightIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Creator {
  id: string
  wallet: string
  nickname: string
  fullName: string
  bio: string
  avatar: string | null
  isVerified: boolean
  followersCount: number
  postsCount: number
}

export default function RecommendedCreators() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadRecommendedCreators()
  }, [])

  const loadRecommendedCreators = async () => {
    try {
      setLoading(true)
      
      // Загружаем всех авторов и выбираем случайных
      const response = await fetch('/api/creators')
      const data = await response.json()
      
      if (response.ok && data.creators) {
        // Перемешиваем массив и берем первые 10
        const shuffled = [...data.creators].sort(() => 0.5 - Math.random())
        const recommended = shuffled.slice(0, 10)
        setCreators(recommended)
      }
    } catch (error) {
      console.error('Error fetching creators:', error)
      toast.error('Ошибка загрузки рекомендаций')
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400">Загружаем рекомендации...</p>
      </div>
    )
  }

  if (creators.length === 0) {
    return (
      <div className="text-center">
        <p className="text-slate-400">Нет рекомендаций</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {creators.length > 4 && (
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
        {creators.map((creator) => (
          <div
            key={creator.id}
            className="flex-shrink-0 w-80 h-[320px] group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 hover:border-purple-500/30 transition-all duration-500 hover:transform hover:scale-[1.02] flex flex-col"
          >
            {/* Hover glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
            
            <div className="relative z-10 p-4 flex flex-col h-full">
              {/* Cover Image */}
              <div className="relative h-32 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white/50">
                    {(creator.fullName || creator.nickname || 'C').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              </div>

              {/* Avatar & Info */}
              <div className="flex items-start gap-3 mb-3">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Avatar
                      src={creator.avatar}
                      alt={creator.fullName || creator.nickname}
                      seed={creator.nickname || creator.wallet}
                      size={48}
                      rounded="2xl"
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white truncate group-hover:text-purple-300 transition-colors text-sm">
                      {creator.fullName || creator.nickname || 'Creator'}
                    </h3>
                    {creator.isVerified && (
                      <CheckBadgeIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-slate-400 text-xs truncate">@{creator.nickname || (creator.wallet ? creator.wallet.slice(0, 6) + '...' : 'user')}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-slate-500 text-xs">{creator.followersCount || 0} подписчиков</p>
                    <p className="text-slate-500 text-xs">{creator.postsCount || 0} постов</p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="flex-grow">
                {creator.bio ? (
                  <p className="text-slate-300 text-xs mb-3 line-clamp-2">{creator.bio}</p>
                ) : (
                  <p className="text-slate-300 text-xs mb-3 opacity-0">Placeholder</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-auto">
                <Link
                  href={`/creator/${creator.id}`}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold text-sm text-center transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                >
                  Перейти к профилю
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 