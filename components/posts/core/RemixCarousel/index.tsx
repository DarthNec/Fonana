'use client'

import React, { useState, useEffect } from 'react'
import { PostAction, PostCardVariant, UnifiedPost } from '@/types/posts'
import { PostContent } from '@/components/posts/core/PostContent'
import { NavigationControls } from './NavigationControls'
import { RemixIndicators } from './RemixIndicators'
import { cn } from '@/lib/utils'

interface RemixCarouselProps {
  post: UnifiedPost
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
  // Получаем ремиксы из поста (уже загружены из Redis в API)
  const remixChain = post.postRemixes || []

  // Находим индекс оригинального поста в цепочке
  const getOriginalPostIndex = () => {
    const index = remixChain.findIndex(p => p.id === post.id)
    return index >= 0 ? index : 0
  }

  const [state, setState] = useState<RemixCarouselState>({
    currentIndex: getOriginalPostIndex(),
    touchStart: null,
    touchEnd: null
  })

  // Определяем, нужно ли показывать карусель
  const shouldShowCarousel = remixChain.length > 1

  // Навигация
  const navigateTo = (index: number) => {
    if (index >= 0 && index < remixChain.length) {
      setState(prev => ({ ...prev, currentIndex: index }))
    }
  }

  const navigateNext = () => {
    const nextIndex = state.currentIndex < remixChain.length - 1 
      ? state.currentIndex + 1 
      : 0
    navigateTo(nextIndex)
  }

  const navigatePrevious = () => {
    const prevIndex = state.currentIndex > 0 
      ? state.currentIndex - 1 
      : remixChain.length - 1
    navigateTo(prevIndex)
  }

  // Touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableTouch) return
    setState(prev => ({ ...prev, touchStart: e.targetTouches[0].clientX }))
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enableTouch) return
    setState(prev => ({ ...prev, touchEnd: e.targetTouches[0].clientX }))
  }

  const handleTouchEnd = () => {
    if (!enableTouch || !state.touchStart || !state.touchEnd) return

    const distance = state.touchStart - state.touchEnd
    const minSwipeDistance = 50

    if (distance > minSwipeDistance) {
      navigateNext()
    } else if (distance < -minSwipeDistance) {
      navigatePrevious()
    }

    setState(prev => ({ ...prev, touchStart: null, touchEnd: null }))
  }

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboard) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setState(prev => {
          const prevIndex = prev.currentIndex > 0 
            ? prev.currentIndex - 1 
            : remixChain.length - 1
          return { ...prev, currentIndex: prevIndex }
        })
      } else if (e.key === 'ArrowRight') {
        setState(prev => {
          const nextIndex = prev.currentIndex < remixChain.length - 1 
            ? prev.currentIndex + 1 
            : 0
          return { ...prev, currentIndex: nextIndex }
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboard, remixChain.length])

  // Auto play
  useEffect(() => {
    if (!autoPlay || remixChain.length <= 1) return

    const interval = setInterval(() => {
      setState(prev => {
        const nextIndex = prev.currentIndex < remixChain.length - 1 
          ? prev.currentIndex + 1 
          : 0
        return { ...prev, currentIndex: nextIndex }
      })
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, remixChain.length])

  // Если нет ремиксов или только один пост - показываем обычный PostContent
  if (!shouldShowCarousel) {
    return (
      <PostContent 
        post={post} 
        onAction={onAction} 
        variant={variant} 
      />
    )
  }

  // Показываем карусель с цепочкой ремиксов
  const currentPost = remixChain[state.currentIndex] || post

  return (
    <div 
      className={cn('remix-carousel relative min-h-[200px]', className)}
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
          totalCount={remixChain.length}
          onPrevious={navigatePrevious}
          onNext={navigateNext}
          variant={variant}
        />
      )}

      {showIndicators && (
        <RemixIndicators
          currentIndex={state.currentIndex}
          totalCount={remixChain.length}
          onNavigate={navigateTo}
          variant="dots"
        />
      )}
    </div>
  )
}
