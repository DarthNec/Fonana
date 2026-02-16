'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useRouter } from 'next/navigation'
import { SparklesIcon, ClockIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface SoraPost {
  id: string
  title: string
  content: string
  requestStatus: 'processing' | 'completed' | 'failed' | null
  createdAt: string
  media?: {
    url?: string
    thumbnail?: string
  }
}

export default function SoraGenerationPageClient() {
  const user = useUser()
  const router = useRouter()
  const [posts, setPosts] = useState<SoraPost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      router.push('/feed')
      return
    }

    loadSoraPosts()
    
    // Обновляем каждые 10 секунд
    const interval = setInterval(loadSoraPosts, 10000)
    
    return () => clearInterval(interval)
  }, [user?.id, router])

  const loadSoraPosts = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/posts?creatorId=${user.id}&type=ai-video&limit=10`)
      if (response.ok) {
        const data = await response.json()
        // Фильтруем только посты в генерации или недавно завершенные/отклоненные
        const activePosts = data.posts?.filter((post: any) => 
          post.type === 'ai-video' && 
          (!post.mediaUrl || post.requestStatus === 'processing' || post.requestStatus === 'failed')
        ).slice(0, 3) || [] // Берем только первые 3
        
        setPosts(activePosts)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error loading Sora posts:', error)
      toast.error('Failed to load generations')
      setIsLoading(false)
    }
  }

  // Удалить пост
  const handleDelete = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Предотвращаем переход на страницу поста
    
    if (!user?.wallet) {
      toast.error('Кошелек не подключен')
      return
    }
    
    try {
      const response = await fetch(`/api/posts/${postId}?userWallet=${user.wallet}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete post')

      // Удаляем из локального состояния
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
      toast.success('Post deleted')

    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Ошибка при удалении поста')
    }
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'processing':
        return <ClockIcon className="w-5 h-5 text-yellow-400 animate-pulse" />
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-400" />
      default:
        return <SparklesIcon className="w-5 h-5 text-purple-400 animate-pulse" />
    }
  }

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'processing':
        return 'Генерируется...'
      case 'completed':
        return 'Готово!'
      case 'failed':
        return 'Отклонено'
      default:
        return 'В очереди...'
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'processing':
        return 'bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border-yellow-400/30'
      case 'completed':
        return 'bg-gradient-to-br from-green-400/20 to-emerald-400/20 border-green-400/30'
      case 'failed':
        return 'bg-gradient-to-br from-red-400/20 to-pink-400/20 border-red-400/30'
      default:
        return 'bg-gradient-to-br from-purple-400/20 to-pink-400/20 border-purple-400/30'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin"></div>
            <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Загрузка генераций...</p>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
        <div className="text-center max-w-md">
          <SparklesIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Нет активных генераций
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            У вас пока нет активных AI-видео генераций. Создайте новый пост с помощью Sora-2!
          </p>
          <button
            onClick={() => router.push('/feed')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Вернуться в ленту
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            Sora-2 Генерации
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Отслеживайте статус ваших AI-видео генераций в реальном времени
          </p>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`relative rounded-2xl border-2 p-6 transition-all hover:scale-105 cursor-pointer ${getStatusColor(post.requestStatus)}`}
              onClick={() => console.log('post clicked')}
            >
              {/* Status Badge */}
              {/*
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full">
                {getStatusIcon(post.requestStatus)}
                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                  {getStatusText(post.requestStatus)}
                </span>
              </div>
              */}

              {/* Content */}
              <div className="mt-2">
                {/* Thumbnail or Placeholder */}
                <div className="w-full aspect-video bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-xl mb-4 flex flex-col items-center justify-center overflow-hidden">
                  {post.requestStatus === 'processing' ? (
                    // Loading state для processing
                    <div className="flex flex-col items-center gap-4 p-6">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <SparklesIcon className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-white font-semibold text-center text-sm px-4">
                        Генерируем Sora 2 видео...
                      </p>
                    </div>
                  ) : post.requestStatus === 'failed' ? (
                    // Rejected state
                    <div className="flex flex-col items-center gap-4 p-6">
                      <XCircleIcon className="w-16 h-16 text-red-400" />
                      <div className="text-center px-4">
                        <p className="text-white font-bold text-base mb-1">
                          Генерация отклонена
                        </p>
                        <p className="text-white/80 text-sm mb-4">
                          Sora не смогла обработать ваш запрос
                        </p>
                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDelete(post.id, e)}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-lg font-semibold text-sm flex items-center gap-2 mx-auto transition-all border border-red-500/30 hover:border-red-500/50"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Удалить
                        </button>
                      </div>
                    </div>
                  ) : post.media?.thumbnail || post.media?.url ? (
                    // Completed with media
                    <img
                      src={post.media.thumbnail || post.media.url}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // Default placeholder
                    <SparklesIcon className="w-16 h-16 text-white/50" />
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  Prompt: {post.title || 'Без названия'}
                </h3>

                {/* Description */}
                {post.content && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                    {post.content}
                  </p>
                )}

                {/* Date */}
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Создан: {new Date(post.createdAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Progress Bar for Processing */}
              {post.requestStatus === 'processing' && (
                <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Автообновление каждые 10 секунд
          </p>
        </div>
      </div>
    </div>
  )
}

