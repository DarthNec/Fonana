'use client'

import { useState, useEffect, useCallback } from 'react'
import { UnifiedPost, PostAction } from '@/types/posts'
import { PostNormalizer } from '@/services/posts/normalizer'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUser } from '@/lib/store/appStore'

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

/**
 * Simplified useOptimizedPosts hook with proper AbortController pattern
 * Phase 1: Core functionality - load posts without race conditions
 * [feed_loading_2025_001]
 */
export function useOptimizedPosts(options: UseOptimizedPostsOptions = {}): UseOptimizedPostsReturn {
  const user = useUser()
  const { publicKey } = useWallet()
  
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
        
        if (publicKey) params.append('userWallet', publicKey.toBase58())
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
        const rawPosts = data.posts || []
        
        console.log(`[useOptimizedPosts] Received ${rawPosts.length} posts from API`)
        
        // Normalize posts
        const normalizedPosts = PostNormalizer.normalizeMany(rawPosts)
        
        console.log(`[useOptimizedPosts] Normalized ${normalizedPosts.length} posts successfully`)
        
        setPosts(normalizedPosts)
        
      } catch (err: any) {
        // ✅ Proper AbortError handling
        if (err.name !== 'AbortError') {
          console.error('[useOptimizedPosts] Fetch error:', err)
          setError(err)
        } else {
          console.log('[useOptimizedPosts] Request aborted (expected)')
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    loadPosts()
    
    // ✅ Cleanup function
    return () => {
      console.log('[useOptimizedPosts] Cleanup: aborting request')
      controller.abort()
    }
  }, [options.sortBy, options.category, options.creatorId, publicKey, user?.id])  // ✅ Clear dependencies
  
  // Placeholder functions to maintain interface compatibility
  const loadMore = useCallback(() => {
    console.log('[useOptimizedPosts] loadMore not implemented in Phase 1')
  }, [])
  
  const refresh = useCallback((clearCache?: boolean) => {
    console.log('[useOptimizedPosts] refresh not implemented in Phase 1', { clearCache })
    // TODO Phase 2: Implement refresh functionality
  }, [])
  
  const handleAction = useCallback(async (action: PostAction) => {
    console.log('[useOptimizedPosts] handleAction not implemented in Phase 1', action)
    // TODO Phase 2: Implement post actions
  }, [])
  
  return {
    posts,
    isLoading,
    isLoadingMore: false,  // Simplified for Phase 1
    error,
    hasMore: false,       // Simplified for Phase 1
    loadMore,
    refresh,
    handleAction
  }
} 