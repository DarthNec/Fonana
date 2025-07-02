'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { wsService, WebSocketEvent } from '@/lib/services/websocket'
import { useUserContext } from '@/lib/contexts/UserContext'
import { UnifiedPost } from '@/types/posts'
import toast from 'react-hot-toast'
import { throttle, debounce } from 'lodash'

interface UseOptimizedRealtimePostsOptions {
  posts: UnifiedPost[]
  onPostsUpdate?: (posts: UnifiedPost[]) => void
  showNewPostsNotification?: boolean
  autoUpdateFeed?: boolean
  maxPendingPosts?: number
  batchUpdateDelay?: number
}

interface UseOptimizedRealtimePostsReturn {
  posts: UnifiedPost[]
  newPostsCount: number
  pendingPosts: UnifiedPost[]
  loadPendingPosts: () => void
  hasNewPosts: boolean
}

// Кеш для оптимистичных обновлений
const optimisticUpdatesCache = new Map<string, any>()

export function useOptimizedRealtimePosts({
  posts,
  onPostsUpdate,
  showNewPostsNotification = true,
  autoUpdateFeed = false,
  maxPendingPosts = 50,
  batchUpdateDelay = 100
}: UseOptimizedRealtimePostsOptions): UseOptimizedRealtimePostsReturn {
  const { user } = useUserContext()
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [pendingPosts, setPendingPosts] = useState<UnifiedPost[]>([])
  const [updatedPosts, setUpdatedPosts] = useState<UnifiedPost[]>(posts)
  
  // Refs для батчинга обновлений
  const updateBatchRef = useRef<Map<string, UnifiedPost>>(new Map())
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Обновление локального состояния при изменении posts
  useEffect(() => {
    setUpdatedPosts(posts)
  }, [posts])

  // Батчинг обновлений для оптимизации производительности
  const applyBatchedUpdates = useCallback(() => {
    if (updateBatchRef.current.size === 0) return
    
    setUpdatedPosts(prev => {
      const newPosts = [...prev]
      const postsMap = new Map(newPosts.map(p => [p.id, p]))
      
      // Применяем все накопленные обновления
      updateBatchRef.current.forEach((update, postId) => {
        const index = newPosts.findIndex(p => p.id === postId)
        if (index !== -1) {
          newPosts[index] = update
        }
        postsMap.set(postId, update)
      })
      
      updateBatchRef.current.clear()
      return newPosts
    })
  }, [])

  // Debounced версия применения обновлений
  const debouncedApplyUpdates = useCallback(
    debounce(() => {
      applyBatchedUpdates()
    }, batchUpdateDelay),
    [applyBatchedUpdates]
  )

  // Добавление обновления в батч
  const batchUpdate = useCallback((postId: string, update: Partial<UnifiedPost>) => {
    setUpdatedPosts(prev => {
      const currentPost = prev.find(p => p.id === postId)
      if (currentPost) {
        return prev.map(post => 
          post.id === postId ? { ...post, ...update } : post
        )
      }
      return prev
    })
  }, [])

  // Throttled версия обработки лайков для предотвращения спама
  const handlePostLikedThrottled = useCallback(
    throttle((event: WebSocketEvent) => {
      if (event.type === 'post_liked' && 'postId' in event && event.postId) {
        setUpdatedPosts(prev => {
          const currentPost = prev.find(p => p.id === event.postId)
          const currentEngagement = currentPost?.engagement || { likes: 0, comments: 0, views: 0, isLiked: false }
          
          return prev.map(post => {
            if (post.id === event.postId) {
              return {
                ...post,
                engagement: {
                  ...currentEngagement,
                  likes: 'likesCount' in event && typeof event.likesCount === 'number' ? event.likesCount : currentEngagement.likes,
                  isLiked: 'userId' in event && event.userId === user?.id ? true : currentEngagement.isLiked
                }
              }
            }
            return post
          })
        })
      }
    }, 500),
    [user?.id]
  )

  // Throttled версия обработки удаления лайков
  const handlePostUnlikedThrottled = useCallback(
    throttle((event: WebSocketEvent) => {
      if (event.type === 'post_unliked' && 'postId' in event && event.postId) {
        setUpdatedPosts(prev => {
          const currentPost = prev.find(p => p.id === event.postId)
          const currentEngagement = currentPost?.engagement || { likes: 0, comments: 0, views: 0, isLiked: false }
          
          return prev.map(post => {
            if (post.id === event.postId) {
              return {
                ...post,
                engagement: {
                  ...currentEngagement,
                  likes: 'likesCount' in event && typeof event.likesCount === 'number' ? event.likesCount : currentEngagement.likes,
                  isLiked: 'userId' in event && event.userId === user?.id ? false : currentEngagement.isLiked
                }
              }
            }
            return post
          })
        })
      }
    }, 500),
    [user?.id]
  )

  // Обработка нового поста с ограничением количества
  const handlePostCreated = useCallback((event: WebSocketEvent) => {
    if (event.type === 'post_created' && event.post) {
      const newPost = event.post as UnifiedPost

      if (autoUpdateFeed) {
        // Автоматически добавляем пост в ленту
        setUpdatedPosts(prev => {
          // Предотвращаем дубликаты
          if (prev.some(p => p.id === newPost.id)) return prev
          return [newPost, ...prev]
        })
      } else {
        // Сохраняем в ожидающие посты с ограничением
        setPendingPosts(prev => {
          if (prev.length >= maxPendingPosts) {
            // Удаляем старые посты если достигнут лимит
            return [newPost, ...prev.slice(0, maxPendingPosts - 1)]
          }
          return [newPost, ...prev]
        })
        setNewPostsCount(prev => Math.min(prev + 1, maxPendingPosts))

        // Показываем уведомление
        if (showNewPostsNotification && newPostsCount < 5) {
          toast.custom((t) => (
            <div 
              onClick={() => {
                loadPendingPosts()
                toast.dismiss(t.id)
              }}
              className="cursor-pointer bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in"
            >
              <p className="font-medium text-gray-900 dark:text-white">Новые посты!</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Появились новые посты. Нажмите для обновления.
              </p>
            </div>
          ), {
            duration: 5000,
            position: 'top-center'
          })
        }
      }
    }
  }, [autoUpdateFeed, showNewPostsNotification, newPostsCount, maxPendingPosts])

  // Обработка удаления поста
  const handlePostDeleted = useCallback((event: WebSocketEvent) => {
    if (event.type === 'post_deleted' && event.postId) {
      setUpdatedPosts(prev => prev.filter(post => post.id !== event.postId))
      setPendingPosts(prev => prev.filter(post => post.id !== event.postId))
      
      // Очистка из батча если есть
      updateBatchRef.current.delete(event.postId)
    }
  }, [])

  // Оптимизированная обработка комментариев
  const handleCommentUpdate = useCallback((event: WebSocketEvent) => {
    if (!('postId' in event) || !event.postId) return
    
    const delta = event.type === 'comment_added' ? 1 : -1
    
    setUpdatedPosts(prev => {
      const currentPost = prev.find(p => p.id === event.postId)
      const currentEngagement = currentPost?.engagement || { likes: 0, comments: 0, views: 0, isLiked: false }
      
      return prev.map(post => {
        if (post.id === event.postId) {
          return {
            ...post,
            engagement: {
              ...currentEngagement,
              comments: Math.max(0, currentEngagement.comments + delta)
            }
          }
        }
        return post
      })
    })
  }, [])

  // Обработка покупки поста с оптимистичным обновлением
  const handlePostPurchased = useCallback((event: WebSocketEvent | any) => {
    const postId = event.postId || event.detail?.postId
    if (!postId) return
    
    // Сохраняем в кеш для оптимистичных обновлений
    optimisticUpdatesCache.set(`purchase_${postId}`, true)
    
    setUpdatedPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          access: {
            ...post.access,
            isPurchased: true,
            hasAccess: true,
            isLocked: false,
            shouldHideContent: false
          }
        }
      }
      return post
    }))
    
    toast.success('Контент разблокирован!', { duration: 3000 })
  }, [])

  // Обработка обновления подписки
  const handleSubscriptionUpdated = useCallback((event: WebSocketEvent | any) => {
    if (event.type === 'subscription_updated' || event.type === 'subscription-updated') {
      const creatorId = event.creatorId || event.detail?.creatorId
      const newTier = event.tier || event.detail?.tier || 'basic'
      
      setUpdatedPosts(prev => prev.map(post => {
        if (post.creator.id === creatorId) {
          // Безопасная проверка доступа с новым тиром
          const postTier = post?.access?.tier
          const hasAccess = !postTier || 
            (newTier === 'vip') ||
            (newTier === 'premium' && ['basic', 'premium'].includes(postTier)) ||
            (newTier === 'basic' && postTier === 'basic')
          
          return {
            ...post,
            access: {
              ...post.access,
              isSubscribed: true,
              hasSubscription: true,
              userTier: newTier,
              hasAccess: hasAccess || post.access.isPurchased,
              isLocked: post.access.isLocked && !hasAccess && !post.access.isPurchased,
              shouldHideContent: post.access.isLocked && !hasAccess && !post.access.isPurchased
            }
          }
        }
        return post
      }))
      
      toast.success('Подписка обновлена!')
    }
  }, [])

  // Загрузить ожидающие посты с анимацией
  const loadPendingPosts = useCallback(() => {
    if (pendingPosts.length > 0) {
      setUpdatedPosts(prev => {
        // Предотвращаем дубликаты
        const existingIds = new Set(prev.map(p => p.id))
        const newPosts = pendingPosts.filter(p => !existingIds.has(p.id))
        return [...newPosts, ...prev]
      })
      setPendingPosts([])
      setNewPostsCount(0)
      
      toast.success(`${pendingPosts.length} новых постов загружено!`, {
        icon: '🎉',
        duration: 3000
      })
    }
  }, [pendingPosts])

  // Подписка на WebSocket события
  useEffect(() => {
    if (!user?.id) return

    // Подписываемся на обновления ленты
    wsService.subscribeToFeed(user.id)

    // Обработчики событий
    wsService.on('post_liked', handlePostLikedThrottled)
    wsService.on('post_unliked', handlePostUnlikedThrottled)
    wsService.on('post_created', handlePostCreated)
    wsService.on('post_deleted', handlePostDeleted)
    wsService.on('comment_added', handleCommentUpdate)
    wsService.on('comment_deleted', handleCommentUpdate)
    wsService.on('post_purchased', handlePostPurchased)
    wsService.on('subscription_updated', handleSubscriptionUpdated)

    // Также слушаем window события для обратной совместимости
    const handleWindowEvent = (e: Event) => {
      const event = e as CustomEvent
      switch (e.type) {
        case 'post-purchased':
          handlePostPurchased(event)
          break
        case 'subscription-updated':
          handleSubscriptionUpdated(event)
          break
        case 'post-deleted':
          if (event.detail?.postId) {
            handlePostDeleted({ type: 'post_deleted', postId: event.detail.postId })
          }
          break
      }
    }
    
    window.addEventListener('post-purchased', handleWindowEvent)
    window.addEventListener('subscription-updated', handleWindowEvent)
    window.addEventListener('post-deleted', handleWindowEvent)

    // Отписываемся при размонтировании
    return () => {
      // Применяем все накопленные обновления перед размонтированием
      applyBatchedUpdates()
      
      wsService.unsubscribeFromFeed(user.id)
      wsService.off('post_liked', handlePostLikedThrottled)
      wsService.off('post_unliked', handlePostUnlikedThrottled)
      wsService.off('post_created', handlePostCreated)
      wsService.off('post_deleted', handlePostDeleted)
      wsService.off('comment_added', handleCommentUpdate)
      wsService.off('comment_deleted', handleCommentUpdate)
      wsService.off('post_purchased', handlePostPurchased)
      wsService.off('subscription_updated', handleSubscriptionUpdated)
      
      window.removeEventListener('post-purchased', handleWindowEvent)
      window.removeEventListener('subscription-updated', handleWindowEvent)
      window.removeEventListener('post-deleted', handleWindowEvent)
      
      // Очистка таймеров
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
    }
  }, [user?.id]) // Только user?.id в зависимостях

  // Уведомляем об изменениях только если есть callback и посты действительно изменились
  useEffect(() => {
    if (onPostsUpdate && updatedPosts !== posts) {
      onPostsUpdate(updatedPosts)
    }
  }, [updatedPosts, onPostsUpdate, posts])

  return {
    posts: updatedPosts,
    newPostsCount,
    pendingPosts,
    loadPendingPosts,
    hasNewPosts: newPostsCount > 0
  }
} 