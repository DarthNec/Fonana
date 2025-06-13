'use client'

import { useState } from 'react'
import PostComments from '@/components/PostComments'
import { mockComments, getCommentsByPostId } from '@/lib/mockData'

export default function CommentsTestPage() {
  const [selectedPostId, setSelectedPostId] = useState(1)
  
  const testPosts = [
    { id: 1, title: 'Anna Crypto - DeFi Yield Farming Strategies', hasComments: true },
    { id: 4, title: 'Alex NFT - Digital Art Collection', hasComments: true },
    { id: 7, title: 'Test Post без комментариев', hasComments: false }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              📝 Тестирование системы комментариев
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Проверка функциональности добавления, отображения и взаимодействия с комментариями
            </p>
          </div>

          {/* Post Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Выберите пост для тестирования:
            </h2>
            
            <div className="space-y-3">
              {testPosts.map(post => {
                const commentsCount = getCommentsByPostId(post.id).length
                return (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPostId(post.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedPostId === post.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Post ID: {post.id}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {commentsCount} комментарий(ев)
                        </p>
                        <p className="text-xs text-gray-500">
                          {post.hasComments ? 'Есть комментарии' : 'Нет комментариев'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Current Post Display */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {testPosts.find(p => p.id === selectedPostId)?.title}
              </h2>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm rounded-full">
                Post ID: {selectedPostId}
              </span>
            </div>
            
            <div className="prose dark:prose-invert mb-6">
              <p className="text-gray-700 dark:text-gray-300">
                Это тестовый пост для демонстрации системы комментариев. 
                {selectedPostId === 1 && ' В этом посте есть комментарии с ответами от пользователей defi_hunter, yield_farmer и trading_pro.'}
                {selectedPostId === 4 && ' В этом посте есть комментарии от nft_collector и crypto_enthusiast.'}
                {selectedPostId === 7 && ' В этом посту пока нет комментариев - можете быть первым!'}
              </p>
            </div>

            {/* Comments Component */}
            <PostComments 
              postId={selectedPostId} 
              isSubscribed={true}
            />
          </div>

          {/* Info Panel */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              🔧 Функциональность комментариев:
            </h3>
            
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>✅ Отображение существующих комментариев</li>
              <li>✅ Добавление новых комментариев (только для подписчиков)</li>
              <li>✅ Лайки комментариев</li>
              <li>✅ Вложенные ответы</li>
              <li>✅ Показ времени создания комментария</li>
              <li>✅ Верификационные значки для проверенных пользователей</li>
              <li>✅ Ограничение доступа для неподписчиков</li>
              <li>✅ Адаптивный дизайн</li>
            </ul>

            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Текущий пользователь:</strong> crypto_enthusiast (ID: 1) - может добавлять комментарии
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
} 