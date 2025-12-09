'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import Avatar from './Avatar'
import { XMarkIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  nickname?: string
  fullName?: string
  avatar?: string
  isVerified: boolean
  bio?: string
  followersCount: number
  followingCount: number
}

interface FollowItem {
  id: string
  userId: string
  user: User
  createdAt: string
}

interface FollowersPopupProps {
  userId: string
  type: 'followers' | 'following'
  isOpen: boolean
  onClose: () => void
  className?: string
}

/**
 * Попап для отображения списка фолловеров или подписок
 */
export function FollowersPopup({ userId, type, isOpen, onClose, className }: FollowersPopupProps) {
  const [data, setData] = useState<FollowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Загрузка данных
  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/user/follow?userId=${userId}&type=${type}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }

        const result = await response.json()
        setData(result.data || [])
      } catch (err) {
        console.error('Error fetching followers/following:', err)
        setError('Failed to load data')
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId, type, isOpen])

  // Закрытие попапа при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleUserClick = (userId: string) => {
    router.push(`/creator/${userId}`)
    onClose()
  }

  if (!isOpen) return null

  const title = type === 'followers' ? 'Followers' : 'Following'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        ref={popupRef}
        className={cn(
          'bg-white dark:bg-slate-800 rounded-2xl shadow-2xl',
          'border border-gray-200 dark:border-slate-700',
          'w-full max-w-md max-h-[80vh] flex flex-col',
          'animate-fade-in',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 dark:text-red-400">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12">
              <HeartSolidIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
              <p className="text-gray-500 dark:text-slate-400">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleUserClick(item.user.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    'hover:bg-gray-50 dark:hover:bg-slate-700',
                    'cursor-pointer transition-colors'
                  )}
                >
                  <Avatar
                    src={item.user.avatar}
                    alt={item.user.fullName || item.user.nickname || 'User'}
                    seed={item.user.nickname || item.user.id}
                    size={48}
                    rounded="full"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {item.user.fullName || item.user.nickname || 'User'}
                      </p>
                      {item.user.isVerified && (
                        <CheckBadgeIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                      @{item.user.nickname || 'user'}
                    </p>
                    {item.user.bio && (
                      <p className="text-xs text-gray-600 dark:text-slate-400 truncate mt-0.5">
                        {item.user.bio}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400">
                      <span>{item.user.followersCount} followers</span>
                      <span>•</span>
                      <span>{item.user.followingCount} following</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && data.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center">
              Total: {data.length} {type === 'followers' ? 'followers' : 'following'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

