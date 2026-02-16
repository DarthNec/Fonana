'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/store/appStore'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import { UnifiedPost, PostAction } from '@/types/posts'
import { FullscreenPostCard } from '@/components/posts/variants/FullscreenPostCard'
import { VerticalActions } from '@/components/feed/VerticalActions'
import { SlidingCommentsPanel } from '@/components/feed/SlidingCommentsPanel'
import { ArrowLeftIcon, DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface PostPageClientProps {
  postId: string
}

export default function PostPageClient({ postId }: PostPageClientProps) {
  const router = useRouter()
  const user = useUser()
  const { loadPostById, handleAction } = useOptimizedPosts()
  const [post, setPost] = useState<UnifiedPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showComments, setShowComments] = useState(false)

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
  const handlePostAction = useCallback(async (action: PostAction) => {
    // Открытие комментариев
    if (action.type === 'comment') {
      setShowComments(true)
      return
    }
    
    // Share - копирование ссылки
    if (action.type === 'share') {
      const postUrl = `${window.location.origin}/post/${postId}`
      try {
        await navigator.clipboard.writeText(postUrl)
        toast.success('Link copied to clipboard!', {
          duration: 2000,
          position: 'top-center',
        })
      } catch (err) {
        console.error('Error sharing:', err)
        toast.error('Failed to copy link', {
          duration: 2000,
          position: 'top-center',
        })
      }
      return
    }
    
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
                likes: (prevPost.engagement?.likes ?? 0) + 1
              }
            } : prevPost)
            break
          case 'unlike':
            setPost(prevPost => prevPost ? {
              ...prevPost,
              engagement: {
                ...prevPost.engagement,
                likes: Math.max(0, (prevPost.engagement?.likes ?? 0) - 1)
              }
            } : prevPost)
            break
          case 'add-emotion':
          case 'remove-emotion':
            // Эмоции обрабатываются через handleAction от useOptimizedPosts
            break
        }
      }
    } catch (error) {
      console.error('Ошибка при обработке действия:', error)
    }
  }, [handleAction, post, postId])

  // Кнопка назад
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/feed')
    }
  }

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 flex items-center justify-center z-40">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Состояние ошибки
  if (error) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 flex items-center justify-center z-40">
        <div className="text-center px-4">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Ошибка загрузки
          </h1>
          <p className="text-red-500 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  // Состояние отсутствия поста
  if (!post) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 flex items-center justify-center z-40">
        <div className="text-center px-4">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Пост не найден
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Возможно, пост был удален или ссылка неверна
          </p>
          <button
            onClick={() => router.push('/feed')}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
          >
            Вернуться в ленту
          </button>
        </div>
      </div>
    )
  }

  // Fullscreen отображение поста
  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 z-40 overflow-hidden">
      {/* Кнопка назад */}
      <button
        onClick={handleBack}
        className="fixed top-6 left-6 z-50 w-12 h-12 flex items-center justify-center bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all transform hover:scale-110"
      >
        <ArrowLeftIcon className="w-6 h-6 text-white" />
      </button>
      
      {/* Основной контент */}
      <div 
        data-post-id={post.id}
        className="w-full h-full flex items-center justify-center"
      >
        <FullscreenPostCard
          post={post}
          onAction={handlePostAction}
          isFullscreen={false}
        />
      </div>
      
      {/* Mobile: Vertical Actions внизу (над BottomNav) */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
        <VerticalActions
          post={post}
          onAction={handlePostAction}
        />
      </div>
      
      {/* Sliding Comments Panel */}
      <SlidingCommentsPanel
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        post={post}
      />
    </div>
  )
}
