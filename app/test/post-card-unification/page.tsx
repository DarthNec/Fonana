'use client'

import React, { useState } from 'react'
import { PostCard } from '@/components/posts/core/PostCard'
import { PostsContainer } from '@/components/posts/layouts/PostsContainer'
import { PostNormalizer } from '@/services/posts/normalizer'
import { useUserContext } from '@/lib/contexts/UserContext'

// Моковые данные для тестирования
const mockPosts = [
  {
    id: '1',
    title: 'Тестовый пост 1 - Свой',
    content: 'Это мой собственный пост для тестирования меню управления',
    mediaUrl: 'https://picsum.photos/800/600?random=1',
    thumbnail: 'https://picsum.photos/400/300?random=1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorId: 'current-user-id', // Будет заменено на реальный ID
    author: {
      id: 'current-user-id',
      name: 'Текущий пользователь',
      username: 'currentuser',
      avatar: 'https://picsum.photos/100/100?random=10',
      isVerified: true
    },
    isLocked: false,
    price: 0,
    likes: 5,
    comments: 2,
    views: 100,
    category: 'Art'
  },
  {
    id: '2',
    title: 'Тестовый пост 2 - Чужой',
    content: 'Это чужой пост, меню управления не должно показываться',
    mediaUrl: 'https://picsum.photos/800/600?random=2',
    thumbnail: 'https://picsum.photos/400/300?random=2',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    authorId: 'other-user-id',
    author: {
      id: 'other-user-id',
      name: 'Другой пользователь',
      username: 'otheruser',
      avatar: 'https://picsum.photos/100/100?random=11',
      isVerified: false
    },
    isLocked: true,
    price: 0.1,
    likes: 15,
    comments: 8,
    views: 250,
    category: 'Music'
  },
  {
    id: '3',
    title: 'Тестовый пост 3 - Премиум',
    content: 'Это премиум пост с ограниченным доступом',
    mediaUrl: 'https://picsum.photos/800/600?random=3',
    thumbnail: 'https://picsum.photos/400/300?random=3',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    authorId: 'current-user-id',
    author: {
      id: 'current-user-id',
      name: 'Текущий пользователь',
      username: 'currentuser',
      avatar: 'https://picsum.photos/100/100?random=10',
      isVerified: true
    },
    isLocked: true,
    price: 0.5,
    likes: 25,
    comments: 12,
    views: 500,
    category: 'Gaming'
  }
]

export default function PostCardUnificationTestPage() {
  const { user } = useUserContext()
  const [selectedVariant, setSelectedVariant] = useState<'full' | 'compact' | 'minimal'>('full')
  const [showCreator, setShowCreator] = useState(true)
  const [layout, setLayout] = useState<'list' | 'grid'>('list')

  // Нормализуем посты и заменяем ID на реальный пользователя
  const normalizedPosts = mockPosts.map(post => {
    const normalized = PostNormalizer.normalize(post)
    if (post.authorId === 'current-user-id' && user?.id) {
      normalized.creator.id = user.id
    }
    return normalized
  })

  const handlePostAction = (action: any) => {
    console.log('Post action:', action)
    alert(`Действие: ${action.type} для поста ${action.postId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Тест унификации PostCard
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            Проверка единообразного отображения PostCard во всех вариантах с меню управления
          </p>

          {/* Контролы */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Настройки отображения
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Вариант карточки
                </label>
                <select
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="full">Full</option>
                  <option value="compact">Compact</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Layout
                </label>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="list">List</option>
                  <option value="grid">Grid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Показывать создателя
                </label>
                <select
                  value={showCreator.toString()}
                  onChange={(e) => setShowCreator(e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="true">Да</option>
                  <option value="false">Нет</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Пользователь
                </label>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  {user ? (
                    <div>
                      <div>ID: {user.id}</div>
                      <div>Name: {user.nickname}</div>
                    </div>
                  ) : (
                    <div>Не авторизован</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Инструкции */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Что проверять:
            </h3>
            <ul className="space-y-2 text-blue-800 dark:text-blue-200">
              <li>• <strong>Пост 1 и 3</strong> - должны показывать меню (⋯) - это посты текущего пользователя</li>
              <li>• <strong>Пост 2</strong> - НЕ должен показывать меню - это чужой пост</li>
              <li>• <strong>Меню должно работать</strong> - нажмите на ⋯ и выберите действие</li>
              <li>• <strong>Визуальный стиль</strong> должен быть одинаковым во всех вариантах</li>
              <li>• <strong>При showCreator=false</strong> меню должно показываться справа вверху</li>
            </ul>
          </div>
        </div>

        {/* Тестовые посты */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Отдельные карточки (тест PostCard)
            </h2>
            <div className="space-y-6">
              {normalizedPosts.map((post, index) => (
                <div key={post.id} className="bg-white dark:bg-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Пост {index + 1}: {post.content.title}
                  </h3>
                  <PostCard
                    post={post}
                    variant={selectedVariant}
                    showCreator={showCreator}
                    onAction={handlePostAction}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Контейнер постов (тест PostsContainer)
            </h2>
            <PostsContainer
              posts={normalizedPosts}
              layout={layout}
              variant="feed"
              showCreator={showCreator}
              onAction={handlePostAction}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 