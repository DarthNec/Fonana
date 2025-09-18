'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useStableWallet } from './useStableWallet' // 🔥 M7 FIX: STABLE WALLET HOOK
import { PostNormalizer } from '@/services/posts/normalizer' // 🔥 FIX: Correct path
import type { UnifiedPost } from '@/types/posts'
import { toast } from 'react-hot-toast'

interface UseOptimizedPostsOptions {
  category?: string
  creatorId?: string
  variant?: 'feed' | 'creator' | 'search'
  sortBy?: 'latest' | 'popular' | 'trending' | 'subscribed'
  pageSize?: number
}

interface PostAction {
  type: 'like' | 'unlike' | 'purchase' | 'subscribe' | 'comment' | 'share' | 'delete' | 'edit'
  postId: string
  data?: any
}

interface UseOptimizedPostsReturn {
  posts: UnifiedPost[]
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => void
  refresh: (clearCache?: boolean) => void
  handleAction: (action: PostAction) => Promise<void>
  addNewPost: (post: UnifiedPost) => void
}

/**
 * Simplified useOptimizedPosts hook with proper AbortController pattern
 * Phase 1: Core functionality - load posts without race conditions
 * [feed_loading_2025_001]
 * 
 * 🔥 M7 HEAVY ROUTE FIX: Eliminated infinite loop via stable wallet dependencies
 * ROOT CAUSE: publicKey?.toBase58() created new string each render → infinite useEffect
 * SOLUTION: Use useStableWallet() hook with memoized publicKeyString
 */
export function useOptimizedPosts(options: UseOptimizedPostsOptions = {}): UseOptimizedPostsReturn {
  const user = useUser()
  const { publicKeyString } = useStableWallet() // 🔥 M7 FIX: STABLE DEPENDENCY!
  
  // Core state
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Main effect for posts loading - FIXED AbortController pattern
  useEffect(() => {
    const controller = new AbortController()  // ✅ Created in useEffect
    
    const loadPosts = async () => {
      try {
        console.log('[useOptimizedPosts] Loading posts with options:', {
          sortBy: options.sortBy,
          category: options.category,
          creatorId: options.creatorId
        })
        
        setIsLoading(true)
        setError(null)
        
        // Build API params
        const params = new URLSearchParams()
        if (options.category) params.append('category', options.category)
        if (options.creatorId) params.append('creatorId', options.creatorId)
        params.append('sortBy', options.sortBy || 'latest')
        params.append('page', '1')
        params.append('limit', '20')
        
        if (publicKeyString) params.append('userWallet', publicKeyString) // 🔥 M7 FIX: STABLE STRING
        if (user?.id) params.append('userId', user.id)
        
        // Choose endpoint based on sortBy
        let endpoint = '/api/posts'
        if (options.sortBy === 'subscribed') {
          endpoint = '/api/posts/following'
        }


        
        
        // Fetch with abort signal
        const response = await fetch(`${endpoint}?${params}`, {
          signal: controller.signal  // ✅ Proper signal usage
        })

        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        let likesData = []
        let rawPosts = data.posts || []


        if(user?.id) {
        // Fetch with abort signal
          const likesResponse = await fetch(`/api/likes/user?userId=${user.id}`, {
              signal: controller.signal  // ✅ Proper signal usage
          })
          if (!likesResponse.ok) {
            throw new Error(`HTTP ${likesResponse.status}: ${likesResponse.statusText}`)
          }
          likesData = await likesResponse.json()
          console.log(`[useOptimizedPosts] User likes:`, likesData);

          if(rawPosts.length > 0) {
            rawPosts = rawPosts.map((post: any) => {
              const like = likesData.find((like: any) => like.postId === post.id);
              console.log(`[useOptimizedPosts] Like:`, like);
              return {
                ...post,
                isLiked: true
              }
            })
          }
          console.log(`Raw posts: `, rawPosts);
        }

        
        console.log(`[useOptimizedPosts] Received ${rawPosts.length} posts from API`)
        console.log(`[useOptimizedPosts] Raw posts2:`, rawPosts);
        // Normalize posts
        console.log('ПРЯМО ПЕРЕД normalizeMany:', rawPosts[0]);
        const normalizedPosts = PostNormalizer.normalizeMany(rawPosts, likesData);
        
        console.log(`[useOptimizedPosts] Normalized ${normalizedPosts.length} posts successfully`)
        
        setPosts(normalizedPosts)
        
      } catch (err: any) {
        // ✅ Proper AbortError handling
        if (err.name !== 'AbortError') {
          console.error('[useOptimizedPosts] Fetch error:', err)
          setError(err)
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    loadPosts()
    
    // ✅ Cleanup properly
    return () => {
      controller.abort()
    }
  }, [
    options.sortBy, 
    options.category, 
    options.creatorId,
    publicKeyString, // 🔥 M7 FIX: STABLE STRING DEPENDENCY!
    user?.id
  ])
  
  // 🔥 IMPLEMENTED: Refresh functionality for real-time updates
  const refresh = useCallback(async (clearCache?: boolean) => {
    console.log('[useOptimizedPosts] refresh called, clearCache:', clearCache)
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Build API params
      const params = new URLSearchParams()
      if (options.category) params.append('category', options.category)
      if (options.creatorId) params.append('creatorId', options.creatorId)
      params.append('sortBy', options.sortBy || 'latest')
      params.append('page', '1')
      params.append('limit', '20')
      
      if (publicKeyString) params.append('userWallet', publicKeyString)
      if (user?.id) params.append('userId', user.id)
      
      // 🔥 SAFETY: Fallback на localStorage если publicKeyString недоступен
      if (!publicKeyString && typeof window !== 'undefined') {
        const savedWallet = localStorage.getItem('fonana_user_wallet')
        if (savedWallet) {
          console.log('[useOptimizedPosts] Using localStorage fallback for refresh wallet address:', savedWallet.substring(0, 8) + '...')
          params.append('userWallet', savedWallet)
        }
      }
      
      // Choose endpoint based on sortBy
      let endpoint = '/api/posts'
      if (options.sortBy === 'subscribed') {
        endpoint = '/api/posts/following'
      }
      
      console.log('[useOptimizedPosts] Refreshing posts from:', endpoint)
      
      const response = await fetch(`${endpoint}?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      const rawPosts = data.posts || []
      
      console.log(`[useOptimizedPosts] Refresh received ${rawPosts.length} posts from API`)
      
      // Normalize posts
      const normalizedPosts = PostNormalizer.normalizeMany(rawPosts)
      
      console.log(`[useOptimizedPosts] Refresh normalized ${normalizedPosts.length} posts successfully`)
      
      // Update posts state
      setPosts(normalizedPosts)
      
      // Clear any pending posts if clearCache is true
      if (clearCache) {
        console.log('[useOptimizedPosts] Clearing cache as requested')
        // Reset any cached state if needed
      }
      
    } catch (err: any) {
      console.error('[useOptimizedPosts] Refresh error:', err)
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [
    options.sortBy, 
    options.category, 
    options.creatorId,
    publicKeyString,
    user?.id
  ])
  
  // Placeholder functions for Phase 1
  const loadMore = useCallback(() => {
    console.log('[useOptimizedPosts] loadMore not implemented in Phase 1')
  }, [])
  
  // Функция для получения userId
  const getUserId = useCallback(async (): Promise<string | null> => {
    console.log('🎯 [useOptimizedPosts] getUserId called:', { 
      hasUser: !!user, 
      userId: user?.id, 
      hasPublicKey: !!publicKeyString 
    })
    
    if (user?.id) {
      console.log('🎯 [useOptimizedPosts] Returning user.id from context:', user.id)
      return user.id
    }
    
    // 🔥 SAFETY: Fallback на localStorage если publicKeyString недоступен
    let walletAddress = publicKeyString
    if (!walletAddress && typeof window !== 'undefined') {
      const savedWallet = localStorage.getItem('fonana_user_wallet')
      if (savedWallet) {
        walletAddress = savedWallet
        console.log('🎯 [useOptimizedPosts] Using localStorage fallback for getUserId wallet address:', walletAddress.substring(0, 8) + '...')
      }
    }
    
    if (walletAddress) {
      console.log('🎯 [useOptimizedPosts] Trying to fetch user via API...')
      try {
        const response = await fetch(`/api/user?wallet=${walletAddress}`)
        if (response.ok) {
          const data = await response.json()
          if (data.user?.id) {
            console.log('🎯 [useOptimizedPosts] Got user from API:', data.user.id)
            return data.user.id
          }
        }
      } catch (error) {
        console.error('Failed to fetch user for like', error)
      }
    }
    
    console.log('🎯 [useOptimizedPosts] No user ID available')
    return null
  }, [user?.id, publicKeyString])

  // Обработка лайка
  const handleLike = useCallback(async (postId: string) => {
    console.log('🎯 [useOptimizedPosts] handleLike called for post:', postId)
    
    const userId = await getUserId()
    if (!userId) {
      console.log('🎯 [useOptimizedPosts] No userId available for like')
      toast.error('Подключите кошелек для лайка')
      return
    }

    await performLike(postId, userId)
  }, [getUserId])

  // Выполнение лайка
  const performLike = useCallback(async (postId: string, userId: string) => {
    console.log('🎯 [useOptimizedPosts] performLike called:', { postId, userId })
    
    try {
      console.log('🎯 [useOptimizedPosts] Sending request to API...')
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      console.log('🎯 [useOptimizedPosts] API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🎯 [useOptimizedPosts] API error response:', errorText)
        throw new Error(`Failed to like post: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log('🎯 [useOptimizedPosts] API response data:', data)
      
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
    }
  }, [])

  // Удалить пост
  const handleDelete = useCallback(async (postId: string) => {
    console.log('🎯 [useOptimizedPosts] handleDelete called for post:', postId)
    
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) {
      console.log('🎯 [useOptimizedPosts] Delete cancelled by user')
      return
    }

    try {
      console.log('🎯 [useOptimizedPosts] Sending delete request to API...')
      console.log('🎯 [useOptimizedPosts] publicKeyString:', publicKeyString)
      
      // 🔥 SAFETY: Fallback на localStorage если publicKeyString недоступен
      let walletAddress: string | undefined = publicKeyString
      if (!walletAddress && typeof window !== 'undefined') {
        const savedWallet = localStorage.getItem('fonana_user_wallet')
        if (savedWallet) {
          walletAddress = savedWallet
          console.log('🎯 [useOptimizedPosts] Using localStorage fallback for wallet address:', walletAddress.substring(0, 8) + '...')
        }
      }
      
      if (!walletAddress) {
        console.error('🎯 [useOptimizedPosts] No wallet address available for delete')
        toast.error('Подключите кошелек для удаления поста')
        return
      }
      
      const response = await fetch(`/api/posts/${postId}?userWallet=${walletAddress}`, {
        method: 'DELETE',
      })

      console.log('🎯 [useOptimizedPosts] Delete API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🎯 [useOptimizedPosts] Delete API error response:', errorText)
        throw new Error(`Failed to delete post: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log('🎯 [useOptimizedPosts] Delete API response data:', data)
      
      // Удаляем из локального состояния
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
      toast.success('Пост удален')

    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Ошибка при удалении поста')
    }
  }, [publicKeyString])

  const handleAction = useCallback(async (action: PostAction) => {
    console.log('[useOptimizedPosts] handleAction called:', action)
    
    try {
      switch (action.type) {
        case 'like':
          await handleLike(action.postId)
          break
        case 'unlike':
          await handleLike(action.postId) // Используем тот же API для toggle
          break
        case 'comment':
          console.log('Comment action:', action)
          break
        case 'share':
          console.log('Share action:', action)
          break
        case 'subscribe':
          console.log('Subscribe action:', action)
          break
        case 'purchase':
          console.log('Purchase action:', action)
          break
        case 'delete':
          await handleDelete(action.postId)
          return true;
          break
        case 'edit':
          console.log('Edit action:', action)
          break
        default:
          console.warn('Unknown action type:', action.type)
      }
    } catch (error) {
      console.error('Action error:', error)
      toast.error('Ошибка выполнения действия')
    }
  }, [handleLike, handleDelete])
  
  // [tier_access_system_2025_017] Добавляем функцию для локального добавления нового поста
  // [post_content_render_2025_017] Исправлено: нормализуем пост перед добавлением
  const addNewPost = useCallback((newPost: UnifiedPost) => {
    console.log('[useOptimizedPosts] Adding new post locally:', newPost.id)
    const normalizedPost = PostNormalizer.normalize(newPost)
    setPosts(prevPosts => [normalizedPost, ...prevPosts])
  }, [])
  
  return {
    posts,
    isLoading,
    error,
    hasMore: false, // Phase 1: No pagination
    isLoadingMore: false,
    loadMore,
    refresh,
    handleAction,
    addNewPost
  }
} 