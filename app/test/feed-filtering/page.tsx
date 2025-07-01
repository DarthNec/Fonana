'use client'

import { useState, useEffect } from 'react'
import { useUserContext } from '@/lib/contexts/UserContext'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import { UnifiedPost } from '@/types/posts'
import { 
  ClockIcon, 
  FireIcon, 
  ArrowTrendingUpIcon, 
  UsersIcon,
  EyeIcon,
  HeartIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'

const categories = [
  'All', 'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 
  'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 
  'Blockchain', 'Intimate', 'Education', 'Comedy'
]

const sortOptions = [
  { value: 'latest', label: 'Latest', icon: ClockIcon },
  { value: 'popular', label: 'Popular', icon: FireIcon },
  { value: 'trending', label: 'Trending', icon: ArrowTrendingUpIcon },
  { value: 'subscribed', label: 'Following', icon: UsersIcon }
]

export default function FeedFilteringTestPage() {
  const { user, isLoading: userLoading } = useUserContext()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending' | 'subscribed'>('latest')
  const [showDebug, setShowDebug] = useState(false)

  // Тестируем новую логику фильтрации
  const {
    posts,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    refresh
  } = useOptimizedPosts({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    variant: 'feed',
    sortBy: sortBy,
    pageSize: 10
  })

  // Очищаем кеш при смене категории или сортировки
  useEffect(() => {
    refresh(true)
  }, [selectedCategory, sortBy])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pt-16 sm:pt-20">
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Тест фильтрации фида
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            Интерактивное тестирование новой логики фильтрации и сортировки постов
          </p>
          
          {/* Debug info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Отладочная информация</h3>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                {showDebug ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            {showDebug && (
              <div className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                <p><strong>Пользователь:</strong> {user?.nickname || 'Не авторизован'}</p>
                <p><strong>Категория:</strong> {selectedCategory}</p>
                <p><strong>Сортировка:</strong> {sortOptions.find(opt => opt.value === sortBy)?.label}</p>
                <p><strong>Endpoint:</strong> {sortBy === 'subscribed' ? '/api/posts/following' : '/api/posts'}</p>
                <p><strong>Загружено постов:</strong> {posts.length}</p>
                <p><strong>Загрузка:</strong> {isLoading ? 'Да' : 'Нет'}</p>
                <p><strong>Ошибка:</strong> {error?.message || 'Нет'}</p>
                <p><strong>Есть еще:</strong> {hasMore ? 'Да' : 'Нет'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Категории</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-4 py-2 rounded-full font-medium transition-all
                  ${selectedCategory === category
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Sort options */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Сортировка</h2>
          <div className="flex gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as 'latest' | 'popular' | 'trending' | 'subscribed')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                  ${sortBy === option.value
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }
                `}
              >
                <option.icon className="w-5 h-5" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Посты ({posts.length})
            </h2>
            <button
              onClick={() => refresh(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Обновить
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-slate-400">Загрузка постов...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400 mb-4">Ошибка: {error.message}</p>
              <button
                onClick={() => refresh(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-slate-400">Постов не найдено</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post: UnifiedPost, index: number) => (
                <div
                  key={post.id}
                  className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {post.content?.title || 'Без названия'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {post.creator?.name || 'Неизвестный автор'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-slate-500">
                      {formatDate(post.createdAt)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <EyeIcon className="w-4 h-4" />
                      {(post as any).viewsCount || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <HeartIcon className="w-4 h-4" />
                      {(post as any).likesCount || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      {(post as any).commentsCount || 0}
                    </div>
                    <div className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                      {(post as any).category || 'Без категории'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && !isLoadingMore && (
            <div className="text-center mt-6">
              <button
                onClick={loadMore}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Загрузить еще
              </button>
            </div>
          )}

          {isLoadingMore && (
            <div className="text-center mt-6">
              <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-slate-400">Загрузка...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 