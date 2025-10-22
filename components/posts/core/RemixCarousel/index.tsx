'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { PostAPI, PostAction, PostCardVariant, RemixGroupResponse } from '@/types/posts'
import { PostContent } from '@/components/posts/core/PostContent'
import { NavigationControls } from './NavigationControls'
import { RemixIndicators } from './RemixIndicators'
import { cn } from '@/lib/utils'

interface RemixCarouselProps {
  post: PostAPI
  onAction?: (action: PostAction) => void
  variant?: PostCardVariant
  className?: string
  autoPlay?: boolean
  autoPlayInterval?: number
  showIndicators?: boolean
  showNavigation?: boolean
  enableKeyboard?: boolean
  enableTouch?: boolean
}

interface RemixCarouselState {
  currentIndex: number
  remixGroup: PostAPI[]
  isLoading: boolean
  error: string | null
  isInitialized: boolean
  isPlaying: boolean
  touchStart: number | null
  touchEnd: number | null
}

export function RemixCarousel({
  post,
  onAction,
  variant = 'full',
  className,
  autoPlay = false,
  autoPlayInterval = 5000,
  showIndicators = true,
  showNavigation = true,
  enableKeyboard = true,
  enableTouch = true
}: RemixCarouselProps) {
  const [state, setState] = useState<RemixCarouselState>({
    currentIndex: 0,
    remixGroup: [],
    isLoading: false,
    error: null,
    isInitialized: false,
    isPlaying: false,
    touchStart: null,
    touchEnd: null
  })

  // Определяем, нужно ли загружать группу ремиксов
  const shouldLoadGroup = useMemo(() => {
    return post.remixId || hasRemixes(post.id)
  }, [post.remixId, post.id])

  // Загружаем группу ремиксов
  const loadRemixGroup = useCallback(async () => {
    if (!shouldLoadGroup || state.isInitialized) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`/api/posts/remix-group/${post.id}?includeOriginal=true&limit=20`)
      
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
      console.error('[RemixCarousel] Error loading remix group:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load remix group',
        isLoading: false,
        isInitialized: true
      }))
    }
  }, [shouldLoadGroup, state.isInitialized, post.id])

  // Загружаем группу при монтировании
  useEffect(() => {
    if (shouldLoadGroup && !state.isInitialized) {
      loadRemixGroup()
    }
  }, [shouldLoadGroup, state.isInitialized, loadRemixGroup])

  // Навигация
  const navigateTo = useCallback((index: number) => {
    if (index >= 0 && index < state.remixGroup.length) {
      setState(prev => ({ ...prev, currentIndex: index }))
    }
  }, [state.remixGroup.length])

  const navigateNext = useCallback(() => {
    const nextIndex = state.currentIndex < state.remixGroup.length - 1 
      ? state.currentIndex + 1 
      : 0
    navigateTo(nextIndex)
  }, [state.currentIndex, state.remixGroup.length, navigateTo])

  const navigatePrevious = useCallback(() => {
    const prevIndex = state.currentIndex > 0 
      ? state.currentIndex - 1 
      : state.remixGroup.length - 1
    navigateTo(prevIndex)
  }, [state.currentIndex, state.remixGroup.length, navigateTo])

  // Touch gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableTouch) return
    setState(prev => ({ ...prev, touchStart: e.targetTouches[0].clientX }))
  }, [enableTouch])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableTouch) return
    setState(prev => ({ ...prev, touchEnd: e.targetTouches[0].clientX }))
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

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboard) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigatePrevious()
      } else if (e.key === 'ArrowRight') {
        navigateNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboard, navigatePrevious, navigateNext])

  // Auto play
  useEffect(() => {
    if (!autoPlay || state.remixGroup.length <= 1) return

    const interval = setInterval(() => {
      navigateNext()
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, navigateNext, state.remixGroup.length])

  // Если группа не нужна, показываем обычный PostContent
  if (!shouldLoadGroup) {
    return (
      <PostContent 
        post={post} 
        onAction={onAction} 
        variant={variant} 
      />
    )
  }

  // Если загружается
  if (state.isLoading) {
    return (
      <div className={cn('remix-carousel loading', className)}>
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      </div>
    )
  }

  // Если ошибка
  if (state.error) {
    return (
      <div className={cn('remix-carousel error', className)}>
        <div className="error-overlay">
          <div className="error-message">{state.error}</div>
          <button 
            className="retry-button"
            onClick={loadRemixGroup}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Если нет ремиксов
  if (state.remixGroup.length <= 1) {
    return (
      <PostContent 
        post={state.remixGroup[0] || post} 
        onAction={onAction} 
        variant={variant} 
      />
    )
  }

  // Показываем карусель
  const currentPost = state.remixGroup[state.currentIndex]

  return (
    <div 
      className={cn('remix-carousel', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="carousel-content">
        <div className="post-container active">
          <PostContent 
            post={currentPost} 
            onAction={onAction} 
            variant={variant} 
          />
        </div>
      </div>

      {showNavigation && (
        <NavigationControls
          currentIndex={state.currentIndex}
          totalCount={state.remixGroup.length}
          onPrevious={navigatePrevious}
          onNext={navigateNext}
          variant={variant}
        />
      )}

      {showIndicators && (
        <RemixIndicators
          currentIndex={state.currentIndex}
          totalCount={state.remixGroup.length}
          onNavigate={navigateTo}
          variant="dots"
        />
      )}
    </div>
  )
}

// Вспомогательная функция для проверки наличия ремиксов
function hasRemixes(postId: string): boolean {
  // В реальном приложении здесь может быть проверка через API
  // Пока возвращаем false, так как загрузка будет происходить через API
  return false
}
