'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PostAPI, UnifiedPost } from '@/types/posts'

interface RemixChainData {
  startPostId: string
  chain: PostAPI[]
  totalCount: number
}

interface RemixChainResponse {
  success: boolean
  data: RemixChainData
  error?: string
}

interface UseRemixChainState {
  chain: UnifiedPost[]
  isLoading: boolean
  error: string | null
  isInitialized: boolean
}

// 🔥 ГЛОБАЛЬНЫЙ КЕШ для предотвращения повторных запросов
const remixChainCache = new Map<string, {
  chain: UnifiedPost[]
  timestamp: number
  error?: string
}>()

// Время жизни кеша - 5 минут
const CACHE_LIFETIME_MS = 5 * 60 * 1000

/**
 * Очистка устаревших записей из кеша
 */
function cleanupCache() {
  const now = Date.now()
  const entries = Array.from(remixChainCache.entries())
  
  for (const [key, value] of entries) {
    if (now - value.timestamp > CACHE_LIFETIME_MS) {
      remixChainCache.delete(key)
      console.log('[RemixChainCache] Removed expired entry:', key)
    }
  }
}

/**
 * Преобразует PostAPI в UnifiedPost
 */
function convertPostAPIToUnified(post: PostAPI): UnifiedPost {
  return {
    id: post.id,
    creator: {
      id: post.creator.id,
      name: post.creator.nickname || post.creator.fullName || 'Unknown',
      username: post.creator.nickname || post.creator.id,
      nickname: post.creator.nickname,
      avatar: post.creator.avatar,
      isVerified: false // API не предоставляет эту информацию
    },
    content: {
      title: post.title,
      text: post.content,
      category: post.category || undefined,
      tags: [] // API не предоставляет теги
    },
    media: {
      type: post.type as any || 'text',
      url: post.mediaUrl || undefined,
      thumbnail: post.thumbnail || undefined,
      requestId: post.requestId || undefined,
      aspectRatio: 'horizontal' // По умолчанию
    },
    access: {
      isLocked: post.isLocked,
      tier: post.minSubscriptionTier as any || undefined,
      currency: 'USD',
      isPurchased: false, // API не предоставляет эту информацию
      isSubscribed: false, // API не предоставляет эту информацию
      shouldHideContent: false,
      hasAccess: !post.isLocked // Простая логика
    },
    engagement: {
      likes: post.likesCount,
      comments: post.commentsCount,
      views: 0, // API не предоставляет
      isLiked: false // API не предоставляет
    },
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    remixId: post.remixId
  }
}

interface UseRemixChainOptions {
  enabled?: boolean
  refetchOnMount?: boolean
}

/**
 * Хук для загрузки полной цепочки ремиксов
 */
export function useRemixChain(
  postId: string | null,
  options: UseRemixChainOptions = {}
) {
  const { enabled = true, refetchOnMount = false } = options

  const [state, setState] = useState<UseRemixChainState>({
    chain: [],
    isLoading: false,
    error: null,
    isInitialized: false
  })

  const loadRemixChain = useCallback(async () => {
    if (!postId || !enabled) return

    // 🔥 ПРОВЕРЯЕМ КЕШ ПЕРЕД ЗАГРУЗКОЙ
    const cachedData = remixChainCache.get(postId)
    const now = Date.now()

    if (cachedData && (now - cachedData.timestamp) < CACHE_LIFETIME_MS) {
      console.log('[useRemixChain] 🎯 Using CACHED data for post:', postId)
      setState(prev => ({
        ...prev,
        chain: cachedData.chain,
        error: cachedData.error || null,
        isLoading: false,
        isInitialized: true
      }))
      return
    }

    // Очищаем устаревший кеш если есть
    if (cachedData) {
      console.log('[useRemixChain] 🗑️ Removing stale cache for post:', postId)
      remixChainCache.delete(postId)
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('[useRemixChain] 🌐 Loading remix chain for post:', postId)
      
      const response = await fetch(`/api/posts/remix?postId=${encodeURIComponent(postId)}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: RemixChainResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load remix chain')
      }

      const chain = data.data.chain.map(convertPostAPIToUnified)

      console.log('[useRemixChain] ✅ Remix chain loaded:', {
        postId,
        chainLength: data.data.totalCount
      })

      // 🔥 СОХРАНЯЕМ В КЕШ
      remixChainCache.set(postId, {
        chain,
        timestamp: now
      })

      setState(prev => ({
        ...prev,
        chain,
        isLoading: false,
        isInitialized: true
      }))

      // Периодическая очистка кеша
      cleanupCache()

    } catch (error) {
      console.error('[useRemixChain] ❌ Error loading remix chain:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load remix chain'
      
      // 🔥 СОХРАНЯЕМ ОШИБКУ В КЕШ (чтобы не повторять failed запросы)
      remixChainCache.set(postId, {
        chain: [],
        timestamp: now,
        error: errorMessage
      })

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isInitialized: true
      }))
    }
  }, [postId, enabled])

  // Используем ref для отслеживания предыдущего postId
  const prevPostIdRef = useRef<string | null>(null)

  // Загружаем цепочку при изменении postId
  useEffect(() => {
    // Если postId изменился - сбрасываем состояние и загружаем заново
    if (postId && postId !== prevPostIdRef.current) {
      prevPostIdRef.current = postId
      
      // Проверяем кеш перед сбросом состояния
      const cachedData = remixChainCache.get(postId)
      const now = Date.now()
      
      if (cachedData && (now - cachedData.timestamp) < CACHE_LIFETIME_MS) {
        // Есть валидный кеш - сразу используем его
        console.log('[useRemixChain] 🎯 Applying cached data immediately for:', postId)
        setState({
          chain: cachedData.chain,
          error: cachedData.error || null,
          isLoading: false,
          isInitialized: true
        })
      } else {
        // Кеша нет - сбрасываем и загружаем
        setState({
          chain: [],
          error: null,
          isLoading: false,
          isInitialized: false
        })
      }
    }

    // Загружаем, если enabled и еще не инициализировано
    if (postId && enabled && !state.isInitialized) {
      loadRemixChain()
    }
  }, [postId, enabled, loadRemixChain, state.isInitialized])

  const refetch = useCallback(() => {
    if (postId && enabled) {
      console.log('[useRemixChain] 🔄 Force refetch - clearing cache for:', postId)
      // Очищаем кеш для принудительного обновления
      remixChainCache.delete(postId)
      setState(prev => ({ ...prev, isInitialized: false }))
      loadRemixChain()
    }
  }, [postId, enabled, loadRemixChain])

  return {
    chain: state.chain,
    isLoading: state.isLoading,
    error: state.error,
    isInitialized: state.isInitialized,
    hasChain: state.chain.length > 1,
    refetch
  }
}

/**
 * Экспортируемая функция для очистки всего кеша (для debug)
 */
export function clearRemixChainCache() {
  console.log('[useRemixChain] 🗑️ Clearing entire remix chain cache')
  remixChainCache.clear()
}

/**
 * Экспортируемая функция для получения статистики кеша (для debug)
 */
export function getRemixChainCacheStats() {
  const now = Date.now()
  const stats = {
    totalEntries: remixChainCache.size,
    validEntries: 0,
    expiredEntries: 0,
    entries: [] as Array<{ postId: string, chainLength: number, age: number, isExpired: boolean }>
  }

  const entries = Array.from(remixChainCache.entries())
  
  for (const [postId, data] of entries) {
    const age = now - data.timestamp
    const isExpired = age > CACHE_LIFETIME_MS
    
    if (isExpired) {
      stats.expiredEntries++
    } else {
      stats.validEntries++
    }

    stats.entries.push({
      postId,
      chainLength: data.chain.length,
      age: Math.floor(age / 1000), // в секундах
      isExpired
    })
  }

  return stats
}
