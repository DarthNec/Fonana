'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UnifiedPost, PostAction } from '@/types/posts'
import { PostNormalizer } from '@/services/posts/normalizer'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUserContext } from '@/lib/contexts/UserContext'
import toast from 'react-hot-toast'
import { checkPostAccess, hasAccessToTier } from '@/lib/utils/access'

interface UseUnifiedPostsOptions {
  creatorId?: string
  category?: string
  limit?: number
  variant?: 'feed' | 'profile' | 'creator' | 'search' | 'dashboard'
  initialPosts?: any[]
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
  const { user, isLoading: isUserLoading } = useUserContext()
  const { publicKey } = useWallet()
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<Error | null>(null)
  const postsRef = useRef<UnifiedPost[]>([])

  // Синхронизируем ref с состоянием
  useEffect(() => {
    postsRef.current = posts
  }, [posts])

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
    const post = postsRef.current.find(p => p.id === action.postId)
    if (!post) return

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
  }, [user?.wallet])

  // Лайк поста
  const handleLike = async (postId: string) => {
    // Используем быстрое получение userId
    const userId = await getUserId()
    
    if (!userId) {
      if (isUserLoading) {
        toast('Загружаем данные пользователя...', { icon: '⏳' })
      } else if (!publicKey) {
        toast.error('Подключите кошелек')
      } else {
        // Попытаемся получить userId через API
        try {
          const response = await fetch(`/api/user?wallet=${publicKey.toBase58()}`)
          if (response.ok) {
            const data = await response.json()
            if (data.user?.id) {
              await performLike(postId, data.user.id)
              return
            }
          }
        } catch (error) {
          console.error('Failed to fetch user for like', error)
        }
        toast.error('Не удалось загрузить профиль. Обновите страницу')
      }
      return
    }

    await performLike(postId, userId)
  }

  // Выполнение лайка
  const performLike = async (postId: string, userId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
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
    // Используем быстрое получение userId
    const userId = await getUserId()
    
    if (!userId) {
      if (isUserLoading) {
        toast('Загружаем данные пользователя...', { icon: '⏳' })
      } else if (!publicKey) {
        toast.error('Подключите кошелек')
      } else {
        // Попытаемся получить userId через API
        try {
          const response = await fetch(`/api/user?wallet=${publicKey.toBase58()}`)
          if (response.ok) {
            const data = await response.json()
            if (data.user?.id) {
              await performUnlike(postId, data.user.id)
              return
            }
          }
        } catch (error) {
          console.error('Failed to fetch user for unlike', error)
        }
        toast.error('Не удалось загрузить профиль. Обновите страницу')
      }
      return
    }

    await performUnlike(postId, userId)
  }

  // Выполнение отмены лайка
  const performUnlike = async (postId: string, userId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
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

  // getUserId function that tries context first, then API
  const getUserId = useCallback(async (): Promise<string | null> => {
    // Сначала проверяем user из контекста
    if (user?.id) return user.id
    
    // Если user загружается и есть кошелек, проверяем localStorage
    if (isUserLoading && publicKey) {
      try {
        const savedData = localStorage.getItem('fonana_user_data')
        const savedWallet = localStorage.getItem('fonana_user_wallet')
        
        if (savedData && savedWallet === publicKey.toBase58()) {
          const userData = JSON.parse(savedData)
          if (userData.id) return userData.id
        }
      } catch (e) {
        console.error('[getUserId] Failed to parse saved user data', e)
      }
    }
    
    return null
  }, [user, isUserLoading, publicKey])

  // Обработчик событий обновления подписки
  const handleSubscriptionUpdate = useCallback((event: CustomEvent) => {
    const { creatorId: updatedCreatorId } = event.detail
    
    // Обновляем посты этого создателя
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.creator.id === updatedCreatorId) {
        // Перезагружаем данные о подписке для этого поста
        return {
          ...post,
          access: {
            ...post.access,
            // Сбрасываем флаг блокировки, чтобы перепроверить доступ
            needsRefresh: true
          }
        }
      }
      return post
    }))
    
    // Перезагружаем посты через короткий интервал
    setTimeout(() => {
      fetchPosts()
    }, 500)
  }, [fetchPosts])

  // Обработчик событий покупки поста
  const handlePostPurchase = useCallback((event: CustomEvent) => {
    const { postId } = event.detail
    
    // Оптимистично обновляем конкретный пост
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          access: {
            ...post.access,
            isLocked: false,
            hasPurchased: true
          }
        }
      }
      return post
    }))
  }, [])

  // Подписываемся на события
  useEffect(() => {
    const handleSubscriptionUpdateWrapper = (e: Event) => handleSubscriptionUpdate(e as CustomEvent)
    const handlePostPurchaseWrapper = (e: Event) => handlePostPurchase(e as CustomEvent)
    
    window.addEventListener('subscription-updated', handleSubscriptionUpdateWrapper)
    window.addEventListener('post-purchased', handlePostPurchaseWrapper)
    
    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdateWrapper)
      window.removeEventListener('post-purchased', handlePostPurchaseWrapper)
    }
  }, [handleSubscriptionUpdate, handlePostPurchase])

  return {
    posts,
    isLoading,
    error,
    refresh: fetchPosts,
    handleAction
  }
} 