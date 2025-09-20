'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import { UnifiedPost, PostAction } from '@/types/posts'
import { PostCard } from '@/components/posts/core/PostCard'
import { DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface PostPageClientProps {
  postId: string
}

export default function PostPageClient({ postId }: PostPageClientProps) {
  const user = useUser()
  const { loadPostById, handleAction } = useOptimizedPosts()
  const [post, setPost] = useState<UnifiedPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загрузка поста при монтировании компонента
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const postData = await loadPostById(postId)
        setPost(postData)
        
      } catch (err) {
        console.error('Ошибка при загрузке поста:', err)
        setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка')
      } finally {
        setIsLoading(false)
      }
    }

    if (postId) {
      fetchPost()
    }
  }, [postId, loadPostById])

  // Обработчик действий с постом
  const handlePostAction = async (action: PostAction) => {
    try {
      await handleAction(action)
      
      // Обновляем локальное состояние после успешного действия
      if (post) {
        switch (action.type) {
          case 'like':
            setPost(prevPost => prevPost ? {
              ...prevPost,
              engagement: {
                ...prevPost.engagement,
                likes: prevPost.engagement.likes + 1
              }
            } : prevPost)
            break
          case 'unlike':
            setPost(prevPost => prevPost ? {
              ...prevPost,
              engagement: {
                ...prevPost.engagement,
                likes: Math.max(0, prevPost.engagement.likes - 1)
              }
            } : prevPost)
            break
          case 'comment':
            setPost(prevPost => prevPost ? {
              ...prevPost,
              engagement: {
                ...prevPost.engagement,
                comments: prevPost.engagement.comments + 1
              }
            } : prevPost)
            break
        }
      }
    } catch (error) {
      console.error('Ошибка при обработке действия:', error)
    }
  }

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mt-4 mb-2">
              Загрузка поста...
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Пожалуйста, подождите
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Состояние ошибки
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Ошибка загрузки
            </h1>
            <p className="text-red-600 dark:text-red-400 text-center mb-6">
              {error}
            </p>
            <div className="text-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Состояние отсутствия поста
  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Пост не найден
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Возможно, пост был удален или ссылка неверна
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Отображение поста
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        <PostCard
          post={post}
          variant="full"
          showCreator={true}
          onAction={handlePostAction}
          className="mb-6"
        />
      </div>
    </div>
  )
}
