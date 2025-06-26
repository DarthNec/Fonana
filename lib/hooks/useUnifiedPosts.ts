'use client'

import { useState, useEffect, useCallback } from 'react'
import { UnifiedPost, PostAction } from '@/types/posts'
import { PostNormalizer } from '@/services/posts/normalizer'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUser } from '@/lib/hooks/useUser'
import toast from 'react-hot-toast'

interface UseUnifiedPostsOptions {
  creatorId?: string
  category?: string
  limit?: number
  variant?: 'feed' | 'profile' | 'creator' | 'search' | 'dashboard'
}

interface UseUnifiedPostsReturn {
  posts: UnifiedPost[]
  isLoading: boolean
  error: Error | null
  refresh: () => void
  handleAction: (action: PostAction) => Promise<void>
}

/**
 * Хук для работы с унифицированными постами
 */
export function useUnifiedPosts(options: UseUnifiedPostsOptions = {}): UseUnifiedPostsReturn {
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { publicKey } = useWallet()
  const { user, isLoading: isUserLoading } = useUser()

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Построение URL с параметрами
      const params = new URLSearchParams()
      if (options.creatorId) params.append('creatorId', options.creatorId)
      if (options.category) params.append('category', options.category)
      if (options.limit) params.append('limit', options.limit.toString())
      if (publicKey) params.append('userWallet', publicKey.toBase58())
      if (user?.id) params.append('userId', user.id)

      const response = await fetch(`/api/posts?${params}`)
      if (!response.ok) throw new Error('Failed to fetch posts')

      const data = await response.json()
      const rawPosts = data.posts || []

      // Нормализация постов
      const normalizedPosts = PostNormalizer.normalizeMany(rawPosts)
      setPosts(normalizedPosts)

    } catch (err) {
      console.error('Error fetching posts:', err)
      setError(err as Error)
      toast.error('Ошибка загрузки постов')
    } finally {
      setIsLoading(false)
    }
  }, [options.creatorId, options.category, options.limit, publicKey, user?.id])

  // Загрузка постов при монтировании и изменении параметров
  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Обработка действий с постами
  const handleAction = useCallback(async (action: PostAction) => {
    try {
      switch (action.type) {
        case 'like':
          await handleLike(action.postId)
          break
        case 'unlike':
          await handleUnlike(action.postId)
          break
        case 'comment':
          // Будет реализовано позже
          console.log('Comment action:', action)
          break
        case 'share':
          await handleShare(action.postId)
          break
        case 'subscribe':
          // Будет реализовано позже
          console.log('Subscribe action:', action)
          break
        case 'purchase':
          // Будет реализовано позже
          console.log('Purchase action:', action)
          break
        case 'edit':
          // Будет реализовано позже
          console.log('Edit action:', action)
          break
        case 'delete':
          await handleDelete(action.postId)
          break
        default:
          console.warn('Unknown action type:', action.type)
      }
    } catch (error) {
      console.error('Action error:', error)
      toast.error('Ошибка выполнения действия')
    }
  }, [])

  // Лайк поста
  const handleLike = async (postId: string) => {
    // Проверяем сначала user из контекста
    if (!user?.id) {
      if (isUserLoading) {
        toast.error('Загружаем данные пользователя...')
      } else if (!publicKey) {
        toast.error('Подключите кошелек')
      } else {
        toast.error('Пожалуйста, подождите инициализацию профиля')
      }
      return
    }

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        }),
      })

      if (!response.ok) throw new Error('Failed to like post')

      // Обновляем локальное состояние
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                engagement: { 
                  ...post.engagement, 
                  likes: post.engagement.likes + 1,
                  isLiked: true 
                }
              }
            : post
        )
      )

      toast.success('Пост лайкнут!')
    } catch (error) {
      console.error('Like error:', error)
      toast.error('Ошибка при лайке')
    }
  }

  // Убрать лайк
  const handleUnlike = async (postId: string) => {
    // Проверяем сначала user из контекста
    if (!user?.id) {
      if (isUserLoading) {
        toast.error('Загружаем данные пользователя...')
      } else if (!publicKey) {
        toast.error('Подключите кошелек')
      } else {
        toast.error('Пожалуйста, подождите инициализацию профиля')
      }
      return
    }

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        }),
      })

      if (!response.ok) throw new Error('Failed to unlike post')

      // Обновляем локальное состояние
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                engagement: { 
                  ...post.engagement, 
                  likes: Math.max(0, post.engagement.likes - 1),
                  isLiked: false 
                }
              }
            : post
        )
      )

    } catch (error) {
      console.error('Unlike error:', error)
      toast.error('Ошибка при отмене лайка')
    }
  }

  // Поделиться постом
  const handleShare = async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    const shareUrl = `${window.location.origin}/post/${postId}`
    const shareText = `Посмотрите этот пост от @${post.creator.username}: ${post.content.title}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.content.title,
          text: shareText,
          url: shareUrl,
        })
      } catch (error) {
        // Пользователь отменил или ошибка
        console.log('Share cancelled or error:', error)
      }
    } else {
      // Fallback - копировать в буфер обмена
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Ссылка скопирована!')
      } catch (error) {
        console.error('Copy error:', error)
        toast.error('Не удалось скопировать ссылку')
      }
    }
  }

  // Удалить пост
  const handleDelete = async (postId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) return

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete post')

      // Удаляем из локального состояния
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
      toast.success('Пост удален')

    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Ошибка при удалении поста')
    }
  }

  return {
    posts,
    isLoading,
    error,
    refresh: fetchPosts,
    handleAction
  }
} 