'use client'

import React, { useState } from 'react'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { useUnifiedPosts } from '@/lib/hooks/useUnifiedPosts'
import { PostLayoutType } from '@/types/posts'

export default function UnifiedPostsTestPage() {
  const [layout, setLayout] = useState<PostLayoutType>('list')
  const [variant, setVariant] = useState<'feed' | 'dashboard' | 'search' | 'creator' | 'profile'>('feed')
  const [showCreator, setShowCreator] = useState(true)
  
  const { posts, isLoading, error, refresh, handleAction } = useUnifiedPosts({
    limit: 12,
    variant
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-32 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Unified Posts System Test
          </h1>
          <p className="text-gray-600 dark:text-slate-400">
            Тестирование унифицированной системы отображения постов
          </p>
        </div>

        {/* Панель управления */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Настройки отображения
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Layout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Layout
              </label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as PostLayoutType)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="list">List</option>
                <option value="grid">Grid</option>
                <option value="masonry">Masonry (в разработке)</option>
              </select>
            </div>

            {/* Variant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Page Variant
              </label>
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="feed">Feed</option>
                <option value="dashboard">Dashboard</option>
                <option value="search">Search</option>
                <option value="creator">Creator</option>
                <option value="profile">Profile</option>
              </select>
            </div>

            {/* Show Creator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Показывать создателя
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={showCreator}
                  onChange={(e) => setShowCreator(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700 dark:text-slate-300">
                  Отображать информацию о создателе
                </label>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="mt-6">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Загрузка...' : 'Обновить'}
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Информация о системе:</p>
              <ul className="space-y-1">
                <li>• Загружено постов: {posts.length}</li>
                <li>• Текущий layout: <span className="font-medium">{layout}</span></li>
                <li>• Вариант страницы: <span className="font-medium">{variant}</span></li>
                <li>• Статус: {isLoading ? 'Загрузка...' : error ? 'Ошибка' : 'Готово'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-medium">Ошибка загрузки:</p>
                <p>{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Контейнер с постами */}
        <PostsContainer
          posts={posts}
          layout={layout}
          variant={variant}
          showCreator={showCreator}
          onAction={handleAction}
          isLoading={isLoading}
          emptyMessage="Нет постов для отображения"
          className="transition-all duration-300"
        />

        {/* Debug Info */}
        <details className="mt-12">
          <summary className="cursor-pointer text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
            Debug Info (click to expand)
          </summary>
          <div className="mt-4 bg-gray-100 dark:bg-slate-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-gray-700 dark:text-slate-300">
              {JSON.stringify({ layout, variant, showCreator, postsCount: posts.length }, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  )
} 