'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UnifiedPost, PostAction } from '@/types/posts'
import { PostNormalizer } from '@/services/posts/normalizer'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUser } from '@/lib/store/appStore'
import toast from 'react-hot-toast'
import { checkPostAccess, hasAccessToTier } from '@/lib/utils/access'
import { useStableWallet } from './useStableWallet'

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
 * [Enhanced Posts System - Unified Interface 2025]
 * 
 * 🔥 M7 HEAVY ROUTE FIX: Eliminated infinite loop via stable wallet dependencies
 * ROOT CAUSE: publicKey object in fetchPosts useCallback dependencies → infinite re-creation
 * SOLUTION: Use useStableWallet() hook with memoized publicKeyString
 */
export function useUnifiedPosts(options: UseUnifiedPostsOptions = {}): UseUnifiedPostsReturn {
  const user = useUser()
  const isUserLoading = false // Zustand не имеет отдельного состояния загрузки
  const { publicKeyString } = useStableWallet() // 🔥 M7 FIX: STABLE DEPENDENCY!
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
      if (publicKeyString) params.append('userWallet', publicKeyString) // 🔥 M7 FIX: STABLE STRING
      if (user?.id) params.append('userId', user.id)

      const response = await fetch(`/api/posts?${params}`)
      if (!response.ok) throw new Error('Failed to fetch posts')

      const data = await response.json()
      const rawPosts = data.posts || []

      // Нормализация постов
      // [iscreatorpost_normalizer_fix_2025_025] Передаём пустые массивы, так как этот хук не имеет likes и emotions data
      const normalizedPosts = PostNormalizer.normalizeMany(rawPosts, [], [])
      setPosts(normalizedPosts)

    } catch (err) {
      console.error('Error fetching posts:', err)
      setError(err as Error)
      toast.error('Ошибка загрузки постов')
    } finally {
      setIsLoading(false)
    }
  }, [options.creatorId, options.category, options.limit, publicKeyString, user?.id]) // 🔥 M7 FIX: STABLE STRING!

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
        case 'adminDelete':
          await handleAdminDelete(action.postId)
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
    console.log('🎯 [LIKE HOOK] handleLike called for post:', postId)
    
    // Используем быстрое получение userId
    const userId = await getUserId()
    console.log('🎯 [LIKE HOOK] getUserId result:', userId)
    
    if (!userId) {
      console.log('🎯 [LIKE HOOK] No userId, checking alternatives...')
      if (isUserLoading) {
        console.log('🎯 [LIKE HOOK] User is loading...')
        toast('Загружаем данные пользователя...', { icon: '⏳' })
      } else if (!publicKeyString) {
        console.log('🎯 [LIKE HOOK] No publicKeyString')
        toast.error('Подключите кошелек')
      } else {
        // Попытаемся получить userId через API
        console.log('🎯 [LIKE HOOK] Trying to fetch user via API...')
        try {
          const response = await fetch(`/api/user?wallet=${publicKeyString}`)
          if (response.ok) {
            const data = await response.json()
            if (data.user?.id) {
              console.log('🎯 [LIKE HOOK] Got user from API:', data.user.id)
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

    console.log('🎯 [LIKE HOOK] Proceeding with performLike...')
    await performLike(postId, userId)
  }

  // Выполнение лайка
  const performLike = async (postId: string, userId: string) => {
    console.log('🎯 [LIKE HOOK] performLike called:', { postId, userId })
    
    try {
      console.log('🎯 [LIKE HOOK] Sending request to API...')
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      console.log('🎯 [LIKE HOOK] API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🎯 [LIKE HOOK] API error response:', errorText)
        throw new Error(`Failed to like post: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log('🎯 [LIKE HOOK] API response data:', data)
      
      // Обновляем локальное состояние на основе ответа сервера
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                engagement: { 
                  ...post.engagement, 
                  likes: data.likesCount,
                  isLiked: data.isLiked
                }
              }
            : post
        )
      )

      if (data.action === 'liked') {
        toast.success('Пост лайкнут!')
      } else {
        toast.success('Лайк убран')
      }
    } catch (error) {
      console.error('Like error:', error)
      toast.error('Ошибка при лайке')
      
      // Откатываем оптимистичное обновление при ошибке
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                engagement: { 
                  ...post.engagement, 
                  likes: post.engagement.likes - 1,
                  isLiked: false
                }
              }
            : post
        )
      )
    }
  }

  // Убрать лайк
  const handleUnlike = async (postId: string) => {
    // Используем быстрое получение userId
    const userId = await getUserId()
    
    if (!userId) {
      if (isUserLoading) {
        toast('Загружаем данные пользователя...', { icon: '⏳' })
      } else if (!publicKeyString) {
        toast.error('Подключите кошелек')
      } else {
        // Попытаемся получить userId через API
        try {
          const response = await fetch(`/api/user?wallet=${publicKeyString}`)
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
        method: 'POST', // Используем POST для toggle
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) throw new Error('Failed to unlike post')

      const data = await response.json()
      
      // Обновляем локальное состояние на основе ответа сервера
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                engagement: { 
                  ...post.engagement, 
                  likes: data.likesCount,
                  isLiked: data.isLiked
                }
              }
            : post
        )
      )

      if (data.action === 'unliked') {
        toast.success('Лайк убран')
      } else {
        toast.success('Пост лайкнут!')
      }

    } catch (error) {
      console.error('Unlike error:', error)
      toast.error('Ошибка при отмене лайка')
      
      // Откатываем оптимистичное обновление при ошибке
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

  // Административное удаление поста
  const handleAdminDelete = async (postId: string) => {
    console.log('🛡️ [useUnifiedPosts] handleAdminDelete called for post:', postId)
    
    if (!confirm('⚠️ АДМИНИСТРАТИВНОЕ УДАЛЕНИЕ\n\nВы уверены, что хотите удалить этот пост как администратор?')) {
      console.log('🛡️ [useUnifiedPosts] Admin delete cancelled by user')
      return
    }

    try {
      console.log('🛡️ [useUnifiedPosts] Sending admin delete request to API...')
      
      // Получаем wallet address
      let walletAddress = user?.wallet
      if (!walletAddress && typeof window !== 'undefined') {
        const savedWallet = localStorage.getItem('fonana_user_wallet')
        if (savedWallet) {
          walletAddress = savedWallet
          console.log('🛡️ [useUnifiedPosts] Using localStorage fallback for wallet address')
        }
      }
      
      if (!walletAddress) {
        console.error('🛡️ [useUnifiedPosts] No wallet address available for admin delete')
        toast.error('Подключите кошелек для удаления поста')
        return
      }
      
      const response = await fetch(`/api/posts/${postId}/admin-delete?userWallet=${walletAddress}`, {
        method: 'DELETE',
      })

      console.log('🛡️ [useUnifiedPosts] Admin delete API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🛡️ [useUnifiedPosts] Admin delete API error response:', errorText)
        
        if (response.status === 403) {
          toast.error('У вас нет прав администратора')
        } else {
          throw new Error(`Failed to admin delete post: ${response.status} ${errorText}`)
        }
        return
      }

      const data = await response.json()
      console.log('🛡️ [useUnifiedPosts] Admin delete API response data:', data)
      
      // Удаляем из локального состояния
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
      toast.success('Пост удален администратором')

    } catch (error) {
      console.error('Admin delete error:', error)
      toast.error('Ошибка при административном удалении поста')
    }
  }

  // getUserId function that tries context first, then API
  const getUserId = useCallback(async (): Promise<string | null> => {
    console.log('🎯 [getUserId] Called with:', { 
      hasUser: !!user, 
      userId: user?.id, 
      isUserLoading, 
      hasPublicKey: !!publicKeyString 
    })
    
    // Сначала проверяем user из контекста
    if (user?.id) {
      console.log('🎯 [getUserId] Returning user.id from context:', user.id)
      return user.id
    }
    
    // Если user загружается и есть кошелек, проверяем localStorage
    if (isUserLoading && publicKeyString) {
      console.log('🎯 [getUserId] Checking localStorage...')
      try {
        const savedData = localStorage.getItem('fonana_user_data')
        const savedWallet = localStorage.getItem('fonana_user_wallet')
        
        console.log('🎯 [getUserId] localStorage data:', { 
          hasSavedData: !!savedData, 
          savedWallet, 
          currentWallet: publicKeyString 
        })
        
        if (savedData && savedWallet === publicKeyString) {
          const userData = JSON.parse(savedData)
          if (userData.id) {
            console.log('🎯 [getUserId] Returning user.id from localStorage:', userData.id)
            return userData.id
          }
        }
      } catch (e) {
        console.error('[getUserId] Failed to parse saved user data', e)
      }
    }
    
    console.log('🎯 [getUserId] No userId found, returning null')
    return null
  }, [user, isUserLoading, publicKeyString]) // 🔥 M7 FIX: STABLE publicKeyString

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