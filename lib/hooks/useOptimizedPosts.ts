'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { UnifiedPost, PostAction } from '@/types/posts'
import { PostNormalizer } from '@/services/posts/normalizer'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUserContext } from '@/lib/contexts/UserContext'
import toast from 'react-hot-toast'
import debounce from 'lodash/debounce'

interface UseOptimizedPostsOptions {
  creatorId?: string
  category?: string
  pageSize?: number
  variant?: 'feed' | 'profile' | 'creator' | 'search' | 'dashboard'
  sortBy?: 'latest' | 'popular' | 'trending' | 'subscribed'
  enableCache?: boolean
  cacheKey?: string
}

interface UseOptimizedPostsReturn {
  posts: UnifiedPost[]
  isLoading: boolean
  isLoadingMore: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  refresh: (clearCache?: boolean) => void
  handleAction: (action: PostAction) => Promise<void>
}

// Кеш для постов с TTL
interface CacheEntry {
  posts: UnifiedPost[]
  timestamp: number
  scrollPosition?: number
}

const postsCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 минут

/**
 * Оптимизированный хук для работы с постами
 * - Пагинация с инкрементальной загрузкой
 * - Debouncing запросов
 * - AbortController для отмены старых запросов
 * - Кеширование с TTL
 * - Сохранение позиции скролла
 */
export function useOptimizedPosts(options: UseOptimizedPostsOptions = {}): UseOptimizedPostsReturn {
  const { user, isLoading: isUserLoading } = useUserContext()
  const { publicKey } = useWallet()
  
  // Состояние
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  
  // Refs
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)
  const postsRef = useRef<UnifiedPost[]>([])
  
  // Параметры
  const pageSize = options.pageSize || 20
  const cacheKey = options.cacheKey || `posts_${options.variant}_${options.creatorId || 'all'}_${options.category || 'all'}_${options.sortBy || 'latest'}`
  const enableCache = options.enableCache !== false

  // Синхронизируем ref с состоянием
  useEffect(() => {
    postsRef.current = posts
  }, [posts])

  // Загрузка постов с пагинацией
  const fetchPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    // Предотвращаем параллельные запросы
    if (loadingRef.current) return
    loadingRef.current = true

    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      if (!append) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      setError(null)

      // Проверяем кеш для первой страницы
      if (pageNum === 1 && !append && enableCache) {
        const cached = postsCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setPosts(cached.posts)
          setIsLoading(false)
          loadingRef.current = false
          
          // Восстанавливаем позицию скролла
          if (cached.scrollPosition !== undefined) {
            setTimeout(() => {
              window.scrollTo(0, cached.scrollPosition || 0)
            }, 100)
          }
          
          return
        }
      }

      // Построение URL с параметрами
      const params = new URLSearchParams()
      if (options.creatorId) params.append('creatorId', options.creatorId)
      if (options.category) params.append('category', options.category)
      params.append('page', pageNum.toString())
      params.append('limit', pageSize.toString())
      if (publicKey) params.append('userWallet', publicKey.toBase58())
      if (user?.id) params.append('userId', user.id)
      
      // Выбираем правильный endpoint в зависимости от типа сортировки
      let endpoint = '/api/posts'
      if (options.sortBy === 'subscribed') {
        endpoint = '/api/posts/following'
      }
      
      // Передаем sortBy для всех типов сортировки
      if (options.sortBy) {
        params.append('sortBy', options.sortBy)
      }

      const response = await fetch(`${endpoint}?${params}`, {
        signal: abortControllerRef.current.signal
      })
      
      if (!response.ok) throw new Error('Failed to fetch posts')

      const data = await response.json()
      const rawPosts = data.posts || []
      const totalCount = data.totalCount || 0

      // КРИТИЧЕСКИЙ ФИКС: добавляем логирование для отладки
      console.log('[useOptimizedPosts] Raw posts sample:', rawPosts.slice(0, 2).map((p: any) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        access: p.access,
        commerce: p.commerce,
        isPremium: p.isPremium,
        minSubscriptionTier: p.minSubscriptionTier,
        isSellable: p.isSellable
      })))

      // Нормализация постов
      const normalizedPosts = PostNormalizer.normalizeMany(rawPosts)
      
      // КРИТИЧЕСКИЙ ФИКС: логируем результат нормализации
      console.log('[useOptimizedPosts] Normalized posts sample:', normalizedPosts.slice(0, 2).map((p: UnifiedPost) => ({
        id: p.id,
        title: p.content?.title,
        access: p.access,
        commerce: p.commerce
      })))
      
      if (append) {
        // Добавляем к существующим, исключая дубликаты
        const existingIds = new Set(postsRef.current.map(p => p.id))
        const newPosts = normalizedPosts.filter(p => !existingIds.has(p.id))
        setPosts(prev => [...prev, ...newPosts])
      } else {
        setPosts(normalizedPosts)
        
        // Кешируем первую страницу
        if (pageNum === 1 && enableCache) {
          postsCache.set(cacheKey, {
            posts: normalizedPosts,
            timestamp: Date.now()
          })
        }
      }

      // Проверяем, есть ли еще посты
      const loadedCount = append ? postsRef.current.length + normalizedPosts.length : normalizedPosts.length
      setHasMore(loadedCount < totalCount && normalizedPosts.length === pageSize)

    } catch (err: any) {
      // Игнорируем ошибки отмены
      if (err.name !== 'AbortError') {
        console.error('Error fetching posts:', err)
        setError(err as Error)
        if (!append) {
          toast.error('Ошибка загрузки постов')
        }
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      loadingRef.current = false
    }
  }, [options.creatorId, options.category, options.sortBy, pageSize, publicKey, user?.id, cacheKey, enableCache])

  // Debounced версия fetchPosts для фильтрации
  const debouncedFetchPosts = useMemo(
    () => debounce(fetchPosts, 300),
    [fetchPosts]
  )

  // Загрузка первой страницы при монтировании (без debounce)
  useEffect(() => {
    console.log('[useOptimizedPosts] Initial load with options:', {
      sortBy: options.sortBy,
      category: options.category,
      creatorId: options.creatorId
    })
    
    // Первая загрузка без debounce для мгновенного отклика
    fetchPosts(1, false)
    
    return () => {
      debouncedFetchPosts.cancel()
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, []) // Пустой массив зависимостей - только при монтировании

  // Отслеживание изменений параметров (с debounce для фильтрации)
  useEffect(() => {
    // Пропускаем первую загрузку, так как она уже обработана выше
    if (posts.length === 0) return
    
    console.log('[useOptimizedPosts] Parameters changed, refreshing with debounce:', {
      sortBy: options.sortBy,
      category: options.category,
      creatorId: options.creatorId
    })
    
    // Используем debounce для фильтрации, чтобы избежать частых запросов
    debouncedFetchPosts(1, false)
    
    return () => {
      debouncedFetchPosts.cancel()
    }
  }, [options.sortBy, options.category, options.creatorId, debouncedFetchPosts])

  // Загрузить больше постов
  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || loadingRef.current) return
    
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage, true)
  }, [page, hasMore, isLoadingMore, fetchPosts])

  // Обновить посты (с опцией очистки кеша)
  const refresh = useCallback((clearCache: boolean = false) => {
    console.log('[useOptimizedPosts] Refresh called with clearCache:', clearCache)
    
    if (clearCache && enableCache) {
      postsCache.delete(cacheKey)
    }
    setPage(1)
    setHasMore(true)
    
    // Отменяем предыдущий debounced вызов
    debouncedFetchPosts.cancel()
    
    // Принудительная загрузка без debounce для мгновенного отклика
    fetchPosts(1, false)
  }, [fetchPosts, cacheKey, enableCache])

  // Сохранение позиции скролла при unmount
  useEffect(() => {
    return () => {
      if (enableCache && posts.length > 0) {
        const cached = postsCache.get(cacheKey)
        if (cached) {
          cached.scrollPosition = window.scrollY
        }
      }
    }
  }, [cacheKey, enableCache, posts.length])

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
          console.log('Comment action:', action)
          break
        case 'share':
          await handleShare(action.postId)
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

  // Вспомогательные функции для действий
  const handleLike = async (postId: string) => {
    const userId = await getUserId()
    
    if (!userId) {
      if (isUserLoading) {
        toast('Загружаем данные пользователя...', { icon: '⏳' })
      } else if (!publicKey) {
        toast.error('Подключите кошелек')
      } else {
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

  const performLike = async (postId: string, userId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) throw new Error('Failed to like post')

      const data = await response.json()
      
      // Обновляем состояние на основе ответа сервера
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

      // Инвалидируем кеш
      if (enableCache) {
        postsCache.delete(cacheKey)
      }

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

  const handleUnlike = async (postId: string) => {
    const userId = await getUserId()
    
    if (!userId) {
      if (isUserLoading) {
        toast('Загружаем данные пользователя...', { icon: '⏳' })
      } else if (!publicKey) {
        toast.error('Подключите кошелек')
      } else {
        toast.error('Не удалось загрузить профиль. Обновите страницу')
      }
      return
    }

    await performUnlike(postId, userId)
  }

  const performUnlike = async (postId: string, userId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST', // Используем POST для toggle
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) throw new Error('Failed to unlike post')

      const data = await response.json()
      
      // Обновляем состояние на основе ответа сервера
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

      // Инвалидируем кеш
      if (enableCache) {
        postsCache.delete(cacheKey)
      }

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
        console.log('Share cancelled or error:', error)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Ссылка скопирована!')
      } catch (error) {
        console.error('Copy error:', error)
        toast.error('Не удалось скопировать ссылку')
      }
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) return

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete post')

      // Удаляем из локального состояния
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
      
      // Инвалидируем кеш
      if (enableCache) {
        postsCache.delete(cacheKey)
      }
      
      toast.success('Пост удален')

    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Ошибка при удалении поста')
    }
  }

  const getUserId = useCallback(async (): Promise<string | null> => {
    if (user?.id) return user.id
    
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

  return {
    posts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    handleAction
  }
} 