'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import {
  BellIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
  BanknotesIcon,
  DocumentIcon,
  CheckIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import Avatar from './Avatar'

// Эмоции (такие же как в PostActions)
const EMOTIONS = [
  { id: 1, emoji: '😂', label: 'Смешно' },
  { id: 2, emoji: '🤡', label: 'Клоун' },
  { id: 3, emoji: '🔥', label: 'Огонь' },
  { id: 4, emoji: '💩', label: 'Какашка' },
  { id: 5, emoji: '❤️', label: 'Сердечко' },
  { id: 6, emoji: '👍', label: 'Палец вверх' },
]

// Функция для форматирования времени
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'только что'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч назад`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} д назад`
  
  return date.toLocaleDateString('ru-RU')
}

// Типы для эмоций
interface EmotionNotification {
  user: {
    id: string
    name: string
    username: string
    avatar: string | null
    wallet: string | null
    isVerified: boolean
  }
  post: {
    id: string
    title: string | null
    content: string | null
    type: string
    category: string | null
    thumbnail: string | null
    mediaUrl: string | null
    blurUrl: string | null
    previewUrl: string | null
    isLocked: boolean
    isPremium: boolean
    price: number | null
    currency: string | null
  }
  emotionId: string
  createdAt: string
}

// Получить эмодзи по emotionId
function getEmotionEmoji(emotionId: string | number): string {
  const id = typeof emotionId === 'string' ? parseInt(emotionId, 10) : emotionId
  const emotion = EMOTIONS.find(e => e.id === id)
  return emotion?.emoji || emotionId.toString()
}

export default function NotificationsDropdown() {
  const user = useUser()
  const [notifications, setNotifications] = useState<EmotionNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Загружаем эмоции при открытии dropdown
  useEffect(() => {
    const loadEmotions = async () => {
      if (!isOpen || !user?.id) return
      
      setIsLoading(true)
      try {
        const response = await fetch(`/api/emotions/${user.id}`)
        const data = await response.json()
        
        if (data.success && data.data) {
          setNotifications(data.data)
        } else {
          console.error('[NotificationsDropdown] Failed to load emotions:', data.error)
        }
      } catch (error) {
        console.error('[NotificationsDropdown] Error loading emotions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadEmotions()
  }, [isOpen, user?.id])
  
  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  // Обработка клика на уведомление - переход к посту
  const handleNotificationClick = (postId: string) => {
    window.location.href = `/post/${postId}`
    setIsOpen(false)
  }
  
  // Получаем медиа для отображения
  const getPostMedia = (post: EmotionNotification['post']) => {
    // Приоритет: thumbnail > previewUrl > blurUrl > mediaUrl
    return post.thumbnail || post.previewUrl || post.blurUrl || post.mediaUrl
  }
  
  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        {notifications.length > 0 ? (
          <BellSolidIcon className="w-6 h-6" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
        
        {/* Notification count badge */}
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Активность
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Загружаем активность...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="w-12 h-12 text-gray-400 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-slate-400">Пока нет активности</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {notifications.map((emotion, index) => (
                  <div
                    key={`${emotion.user.id}-${emotion.post.id}-${index}`}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => handleNotificationClick(emotion.post.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* User Avatar */}
                      <div className="flex-shrink-0">
                        <Avatar
                          src={emotion.user.avatar}
                          alt={emotion.user.name}
                          seed={emotion.user.username}
                          size={40}
                          rounded="full"
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-semibold">{emotion.user.name}</span>
                          {' '}поставил реакцию{' '}
                          <span className="text-xl">{getEmotionEmoji(emotion.emotionId)}</span>
                          {' '}на ваш пост
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                          {formatTimeAgo(new Date(emotion.createdAt))}
                        </p>
                      </div>
                      
                      {/* Post Media Thumbnail */}
                      {getPostMedia(emotion.post) && (
                        <div className="flex-shrink-0">
                          <img
                            src={getPostMedia(emotion.post)!}
                            alt="Post media"
                            className="w-12 h-12 rounded object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 text-center">
              <Link
                href="/notifications"
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                onClick={() => setIsOpen(false)}
              >
                Смотреть всё
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 