'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { PostAPI, RemixGroupResponse } from '@/types/posts'

interface UseRemixCarouselOptions {
  autoPlay?: boolean
  autoPlayInterval?: number
  enableKeyboard?: boolean
  enableTouch?: boolean
  preloadAdjacent?: boolean
}

interface UseRemixCarouselReturn {
  // State
  currentIndex: number
  remixGroup: PostAPI[]
  isLoading: boolean
  error: string | null
  isPlaying: boolean
  
  // Actions
  navigateTo: (index: number) => void
  navigateNext: () => void
  navigatePrevious: () => void
  togglePlay: () => void
  loadRemixGroup: () => Promise<void>
  refreshGroup: () => Promise<void>
  
  // Computed
  currentPost: PostAPI | null
  canGoNext: boolean
  canGoPrevious: boolean
  totalCount: number
}

export function useRemixCarousel(
  postId: string,
  options: UseRemixCarouselOptions = {}
): UseRemixCarouselReturn {
  const {
    autoPlay = false,
    autoPlayInterval = 5000,
    enableKeyboard = true,
    enableTouch = true,
    preloadAdjacent = true
  } = options
  
  const [state, setState] = useState({
    currentIndex: 0,
    remixGroup: [] as PostAPI[],
    isLoading: false,
    error: null as string | null,
    isInitialized: false,
    isPlaying: false,
    touchStart: null as number | null,
    touchEnd: null as number | null
  })

  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  // Загружаем группу ремиксов
  const loadRemixGroup = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`/api/posts/remix-group/${postId}?includeOriginal=true&limit=20`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: RemixGroupResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load remix group')
      }
      
      setState(prev => ({
        ...prev,
        remixGroup: [data.data.originalPost, ...data.data.remixes],
        isLoading: false,
        isInitialized: true
      }))
      
    } catch (error) {
      console.error('[useRemixCarousel] Error loading remix group:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load remix group',
        isLoading: false,
        isInitialized: true
      }))
    }
  }, [postId])

  // Обновляем группу ремиксов
  const refreshGroup = useCallback(async () => {
    setState(prev => ({ ...prev, isInitialized: false }))
    await loadRemixGroup()
  }, [loadRemixGroup])

  // Навигация
  const navigateTo = useCallback((index: number) => {
    setState(prev => {
      if (index >= 0 && index < prev.remixGroup.length) {
        return { ...prev, currentIndex: index }
      }
      return prev
    })
  }, [])

  const navigateNext = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentIndex < prev.remixGroup.length - 1 
        ? prev.currentIndex + 1 
        : 0
      return { ...prev, currentIndex: nextIndex }
    })
  }, [])

  const navigatePrevious = useCallback(() => {
    setState(prev => {
      const prevIndex = prev.currentIndex > 0 
        ? prev.currentIndex - 1 
        : prev.remixGroup.length - 1
      return { ...prev, currentIndex: prevIndex }
    })
  }, [])

  // Auto play
  const togglePlay = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboard) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigatePrevious()
      } else if (e.key === 'ArrowRight') {
        navigateNext()
      } else if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboard, navigatePrevious, navigateNext, togglePlay])

  // Auto play effect
  useEffect(() => {
    if (!autoPlay || !state.isPlaying || state.remixGroup.length <= 1) {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
        autoPlayRef.current = null
      }
      return
    }

    autoPlayRef.current = setInterval(() => {
      navigateNext()
    }, autoPlayInterval)

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
        autoPlayRef.current = null
      }
    }
  }, [autoPlay, state.isPlaying, state.remixGroup.length, navigateNext, autoPlayInterval])

  // Touch gestures
  const handleTouchStart = useCallback((clientX: number) => {
    if (!enableTouch) return
    setState(prev => ({ ...prev, touchStart: clientX }))
  }, [enableTouch])

  const handleTouchMove = useCallback((clientX: number) => {
    if (!enableTouch) return
    setState(prev => ({ ...prev, touchEnd: clientX }))
  }, [enableTouch])

  const handleTouchEnd = useCallback(() => {
    if (!enableTouch || !state.touchStart || !state.touchEnd) return

    const distance = state.touchStart - state.touchEnd
    const minSwipeDistance = 50

    if (distance > minSwipeDistance) {
      navigateNext()
    } else if (distance < -minSwipeDistance) {
      navigatePrevious()
    }

    setState(prev => ({ ...prev, touchStart: null, touchEnd: null }))
  }, [enableTouch, state.touchStart, state.touchEnd, navigateNext, navigatePrevious])

  // Computed values
  const currentPost = state.remixGroup[state.currentIndex] || null
  const canGoNext = state.currentIndex < state.remixGroup.length - 1
  const canGoPrevious = state.currentIndex > 0
  const totalCount = state.remixGroup.length

  return {
    // State
    currentIndex: state.currentIndex,
    remixGroup: state.remixGroup,
    isLoading: state.isLoading,
    error: state.error,
    isPlaying: state.isPlaying,
    
    // Actions
    navigateTo,
    navigateNext,
    navigatePrevious,
    togglePlay,
    loadRemixGroup,
    refreshGroup,
    
    // Touch handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Computed
    currentPost,
    canGoNext,
    canGoPrevious,
    totalCount
  }
}
