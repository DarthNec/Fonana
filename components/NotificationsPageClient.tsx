'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import {
  BellIcon,
  HeartIcon,
  UserPlusIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  ShieldCheckIcon,
  EyeSlashIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline'
import Avatar from './Avatar'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

// Эмоции (такие же как в PostActions)
const EMOTIONS = [
  { id: 1, emoji: '😂', label: 'Смешно' },
  { id: 2, emoji: '🤡', label: 'Клоун' },
  { id: 3, emoji: '🔥', label: 'Огонь' },
  { id: 4, emoji: '💩', label: 'Какашка' },
  { id: 5, emoji: '❤️', label: 'Сердечко' },
  { id: 6, emoji: '👍', label: 'Палец вверх' },
]

// Типы уведомлений
type NotificationType = 'all' | 'subscriptions' | 'purchases' | 'tips' | 'moderators' | 'likes' | 'hidden'

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

const notificationTabs = [
  { id: 'all' as NotificationType, label: 'All', icon: BellIcon },
  { id: 'subscriptions' as NotificationType, label: 'Subscriptions', icon: UserPlusIcon },
  { id: 'purchases' as NotificationType, label: 'Purchases', icon: ShoppingBagIcon },
  { id: 'tips' as NotificationType, label: 'Tips', icon: BanknotesIcon },
  { id: 'moderators' as NotificationType, label: 'Moderators', icon: ShieldCheckIcon },
  { id: 'likes' as NotificationType, label: 'Likes', icon: HeartIcon },
  { id: 'hidden' as NotificationType, label: 'Hidden', icon: EyeSlashIcon },
]

export default function NotificationsPageClient() {
  const user = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<NotificationType>('all')
  const [notifications, setNotifications] = useState<EmotionNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [counts, setCounts] = useState<Record<NotificationType, number>>({
    all: 0,
    subscriptions: 0,
    purchases: 0,
    tips: 0,
    moderators: 0,
    likes: 0,
    hidden: 0,
  })

  // Загрузка уведомлений (эмоций)
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/emotions/${user.id}`)
        const data = await response.json()

        if (data.success && data.data) {
          setNotifications(data.data)
          // Пока только likes (эмоции)
          setCounts({
            all: data.data.length,
            subscriptions: 0,
            purchases: 0,
            tips: 0,
            moderators: 0,
            likes: data.data.length,
            hidden: 0,
          })
        } else {
          console.error('[NotificationsPage] Failed to load notifications:', data.error)
        }
      } catch (error) {
        console.error('[NotificationsPage] Error loading notifications:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadNotifications()
  }, [user?.id])

  // Фильтрация уведомлений по типу
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true
    if (activeTab === 'likes') return true // Все текущие уведомления - это эмоции (лайки)
    return false // Остальные типы пока не реализованы
  })

  // Получаем медиа для отображения
  const getPostMedia = (post: EmotionNotification['post']) => {
    return post.thumbnail || post.previewUrl || post.blurUrl || post.mediaUrl
  }

  // Форматирование времени
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru })
    } catch {
      return dateString
    }
  }

  // Получить эмодзи по emotionId
  const getEmotionEmoji = (emotionId: string | number): string => {
    const id = typeof emotionId === 'string' ? parseInt(emotionId, 10) : emotionId
    const emotion = EMOTIONS.find(e => e.id === id)
    return emotion?.emoji || emotionId.toString()
  }

  // Обработка клика на уведомление
  const handleNotificationClick = (postId: string) => {
    window.location.href = `/post/${postId}`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-slate-700">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-3">
            {/* Back button - mobile only */}
            <button
              onClick={() => router.back()}
              className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </button>
            
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <BellIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                  Notifications
                </h1>
                <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">
                  {counts.all} {counts.all === 1 ? 'notification' : 'notifications'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - desktop only */}
      <div className="hidden md:block sticky top-[73px] z-10 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
        <div className="px-6 py-3">
          <div className="flex items-center gap-3">
            {notificationTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className="text-xs opacity-75">({counts[tab.id]})</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 py-4 md:py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-20">
            <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-20">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <BellIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No notifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center max-w-sm px-4">
              Here you will see all your notifications
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((emotion, index) => (
              <div
                key={`${emotion.user.id}-${emotion.post.id}-${index}`}
                onClick={() => handleNotificationClick(emotion.post.id)}
                className="flex items-center gap-3 p-3 md:p-4 bg-white dark:bg-slate-800/50 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors border border-gray-100 dark:border-slate-700/50"
              >
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
                  <p className="text-sm text-gray-900 dark:text-white leading-snug">
                    <span className="font-semibold">{emotion.user.name}</span>
                    {' '}
                    <span className="text-xl inline-block align-middle mx-0.5">{getEmotionEmoji(emotion.emotionId)}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                    {formatTime(emotion.createdAt)}
                  </p>
                </div>

                {/* Post Thumbnail */}
                {getPostMedia(emotion.post) && (
                  <div className="flex-shrink-0">
                    <img
                      src={getPostMedia(emotion.post)!}
                      alt="Post"
                      className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

