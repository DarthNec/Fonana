'use client'

import { useEffect, useCallback, useState } from 'react'
import { wsService, WebSocketEvent } from '@/lib/services/websocket'
import { useUserContext } from '@/lib/contexts/UserContext'
import { UnifiedPost } from '@/types/posts'
import toast from 'react-hot-toast'

interface UseRealtimePostsOptions {
  posts: UnifiedPost[]
  onPostsUpdate?: (posts: UnifiedPost[]) => void
  showNewPostsNotification?: boolean
  autoUpdateFeed?: boolean
}

interface UseRealtimePostsReturn {
  posts: UnifiedPost[]
  newPostsCount: number
  pendingPosts: UnifiedPost[]
  loadPendingPosts: () => void
  hasNewPosts: boolean
}

export function useRealtimePosts({
  posts,
  onPostsUpdate,
  showNewPostsNotification = true,
  autoUpdateFeed = false
}: UseRealtimePostsOptions): UseRealtimePostsReturn {
  const { user } = useUserContext()
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [pendingPosts, setPendingPosts] = useState<UnifiedPost[]>([])
  const [updatedPosts, setUpdatedPosts] = useState<UnifiedPost[]>(posts)

  // Обновление локального состояния при изменении posts
  useEffect(() => {
    setUpdatedPosts(posts)
  }, [posts])

  // Обработка лайка поста
  const handlePostLiked = useCallback((event: WebSocketEvent) => {
    if (event.type === 'post_liked') {
      setUpdatedPosts(prev => prev.map(post => {
        if (post.id === event.postId) {
          // Оптимистичное обновление счётчика лайков
          return {
            ...post,
            engagement: {
              ...post.engagement,
              likes: event.likesCount,
              isLiked: event.userId === user?.id ? true : post.engagement.isLiked
            }
          }
        }
        return post
      }))
    }
  }, [user?.id])

  // Обработка удаления лайка
  const handlePostUnliked = useCallback((event: WebSocketEvent) => {
    if (event.type === 'post_unliked') {
      setUpdatedPosts(prev => prev.map(post => {
        if (post.id === event.postId) {
          return {
            ...post,
            engagement: {
              ...post.engagement,
              likes: event.likesCount,
              isLiked: event.userId === user?.id ? false : post.engagement.isLiked
            }
          }
        }
        return post
      }))
    }
  }, [user?.id])

  // Обработка нового поста
  const handlePostCreated = useCallback((event: WebSocketEvent) => {
    if (event.type === 'post_created') {
      const newPost = event.post as UnifiedPost

      if (autoUpdateFeed) {
        // Автоматически добавляем пост в ленту
        setUpdatedPosts(prev => [newPost, ...prev])
      } else {
        // Сохраняем в ожидающие посты
        setPendingPosts(prev => [newPost, ...prev])
        setNewPostsCount(prev => prev + 1)

        // Показываем уведомление
        if (showNewPostsNotification) {
          const count = newPostsCount + 1
          toast.custom((t) => (
            <div 
              onClick={() => {
                loadPendingPosts()
                toast.dismiss(t.id)
              }}
              className="cursor-pointer bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 max-w-sm"
            >
              <p className="font-medium text-gray-900 dark:text-white">Новые посты!</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {count} {count === 1 ? 'новый пост' : 'новых постов'}. Нажмите для обновления.
              </p>
            </div>
          ), {
            duration: 5000,
            position: 'top-center'
          })
        }
      }
    }
  }, [autoUpdateFeed, showNewPostsNotification, newPostsCount])

  // Обработка удаления поста
  const handlePostDeleted = useCallback((event: WebSocketEvent) => {
    if (event.type === 'post_deleted') {
      setUpdatedPosts(prev => prev.filter(post => post.id !== event.postId))
      setPendingPosts(prev => prev.filter(post => post.id !== event.postId))
    }
  }, [])

  // Обработка нового комментария
  const handleCommentAdded = useCallback((event: WebSocketEvent) => {
    if (event.type === 'comment_added') {
      setUpdatedPosts(prev => prev.map(post => {
        if (post.id === event.postId) {
          return {
            ...post,
            engagement: {
              ...post.engagement,
              comments: post.engagement.comments + 1
            }
          }
        }
        return post
      }))
    }
  }, [])

  // Обработка удаления комментария
  const handleCommentDeleted = useCallback((event: WebSocketEvent) => {
    if (event.type === 'comment_deleted') {
      setUpdatedPosts(prev => prev.map(post => {
        if (post.id === event.postId) {
          return {
            ...post,
            engagement: {
              ...post.engagement,
              comments: Math.max(0, post.engagement.comments - 1)
            }
          }
        }
        return post
      }))
    }
  }, [])

  // Обработка покупки поста
  const handlePostPurchased = useCallback((event: WebSocketEvent | any) => {
    if (event.type === 'post_purchased' || event.type === 'post-purchased') {
      const postId = event.postId || event.detail?.postId
      setUpdatedPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            access: {
              ...post.access,
              isPurchased: true,
              hasAccess: true,
              isLocked: false,
              shouldHideContent: false // Важно! Показываем контент
            }
          }
        }
        return post
      }))
      
      toast.success('Контент разблокирован!')
    }
  }, [])

  // Обработка обновления подписки
  const handleSubscriptionUpdated = useCallback((event: WebSocketEvent | any) => {
    if (event.type === 'subscription_updated' || event.type === 'subscription-updated') {
      const creatorId = event.creatorId || event.detail?.creatorId
      const newTier = event.tier || event.detail?.tier || 'basic'
      
      setUpdatedPosts(prev => prev.map(post => {
        if (post.creator.id === creatorId) {
          // Проверяем доступ с новым тиром
          const hasAccess = !post.access.tier || 
            (newTier === 'vip') ||
            (newTier === 'premium' && ['basic', 'premium'].includes(post.access.tier)) ||
            (newTier === 'basic' && post.access.tier === 'basic')
          
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

  // Загрузить ожидающие посты
  const loadPendingPosts = useCallback(() => {
    if (pendingPosts.length > 0) {
      setUpdatedPosts(prev => [...pendingPosts, ...prev])
      setPendingPosts([])
      setNewPostsCount(0)
      
      toast.success(`${pendingPosts.length} новых постов загружено!`)
    }
  }, [pendingPosts])

  // Подписка на WebSocket события
  useEffect(() => {
    if (!user?.id) return

    // Подписываемся на обновления ленты
    wsService.subscribeToFeed(user.id)

    // Подписываемся на события для каждого поста
    posts.forEach(post => {
      wsService.subscribeToPost(post.id)
    })

    // Обработчики событий
    wsService.on('post_liked', handlePostLiked)
    wsService.on('post_unliked', handlePostUnliked)
    wsService.on('post_created', handlePostCreated)
    wsService.on('post_deleted', handlePostDeleted)
    wsService.on('comment_added', handleCommentAdded)
    wsService.on('comment_deleted', handleCommentDeleted)
    wsService.on('post_purchased', handlePostPurchased)
    wsService.on('subscription_updated', handleSubscriptionUpdated)

    // Также слушаем window события для обратной совместимости
    const handleWindowPostPurchased = (e: Event) => handlePostPurchased(e as CustomEvent)
    const handleWindowSubscriptionUpdated = (e: Event) => handleSubscriptionUpdated(e as CustomEvent)
    const handleWindowPostDeleted = (e: Event) => {
      const event = e as CustomEvent
      const postId = event.detail?.postId
      if (postId) {
        handlePostDeleted({ type: 'post_deleted', postId })
      }
    }
    
    window.addEventListener('post-purchased', handleWindowPostPurchased)
    window.addEventListener('subscription-updated', handleWindowSubscriptionUpdated)
    window.addEventListener('post-deleted', handleWindowPostDeleted)

    // Отписываемся при размонтировании
    return () => {
      wsService.unsubscribeFromFeed(user.id)
      posts.forEach(post => {
        wsService.unsubscribeFromPost(post.id)
      })
      wsService.off('post_liked', handlePostLiked)
      wsService.off('post_unliked', handlePostUnliked)
      wsService.off('post_created', handlePostCreated)
      wsService.off('post_deleted', handlePostDeleted)
      wsService.off('comment_added', handleCommentAdded)
      wsService.off('comment_deleted', handleCommentDeleted)
      wsService.off('post_purchased', handlePostPurchased)
      wsService.off('subscription_updated', handleSubscriptionUpdated)
      
      window.removeEventListener('post-purchased', handleWindowPostPurchased)
      window.removeEventListener('subscription-updated', handleWindowSubscriptionUpdated)
      window.removeEventListener('post-deleted', handleWindowPostDeleted)
    }
  }, [
    user?.id, 
    posts, 
    handlePostLiked, 
    handlePostUnliked, 
    handlePostCreated, 
    handlePostDeleted,
    handleCommentAdded,
    handleCommentDeleted,
    handlePostPurchased,
    handleSubscriptionUpdated
  ])

  // Уведомляем об изменениях
  useEffect(() => {
    if (onPostsUpdate && updatedPosts !== posts) {
      onPostsUpdate(updatedPosts)
    }
  }, [updatedPosts, posts, onPostsUpdate])

  return {
    posts: updatedPosts,
    newPostsCount,
    pendingPosts,
    loadPendingPosts,
    hasNewPosts: newPostsCount > 0
  }
} 