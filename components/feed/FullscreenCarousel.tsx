'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwipeable } from 'react-swipeable'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { UnifiedPost, PostAction } from '@/types/posts'
import { FullscreenPostCard } from '@/components/posts/variants/FullscreenPostCard'
import { CircularNavigation } from './CircularNavigation'
import { VerticalActions } from './VerticalActions'
import { SlidingCommentsPanel } from './SlidingCommentsPanel'
import { cn } from '@/lib/utils'

interface FullscreenCarouselProps {
  posts: UnifiedPost[]
  initialIndex?: number
  onPostChange?: (post: UnifiedPost, index: number) => void
  onAction?: (action: PostAction) => void
  onLoadMore?: () => void
  onBack?: () => void // Кнопка назад (для профиля)
  showBackButton?: boolean // Показывать ли кнопку назад
  isFullscreen?: boolean // Флаг для fullscreen режима (убирает отступ max-md:pb-20)
}

/**
 * Fullscreen carousel для отображения постов один за другим
 * С keyboard navigation, swipe support и circular navigation
 */
// Cooldown между переключениями постов (1 секунда)
const SCROLL_COOLDOWN = 1000

export function FullscreenCarousel({
  posts,
  initialIndex = 0,
  onPostChange,
  onAction,
  onLoadMore,
  onBack,
  showBackButton = false,
  isFullscreen = true // По умолчанию true (для профиля/explore), false для FeedPageClient
}: FullscreenCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const [currentRemixIndex, setCurrentRemixIndex] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Cooldown для предотвращения быстрого переключения
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const currentPost = posts[currentIndex]
  const hasRemixes = currentPost?.postRemixes && currentPost.postRemixes.length > 1
  
  // Скролл к конкретному посту
  const scrollToPost = useCallback((index: number) => {
    if (containerRef.current) {
      const postElements = containerRef.current.querySelectorAll('.snap-start')
      const targetPost = postElements[index] as HTMLElement
      if (targetPost) {
        targetPost.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [])
  
  // Функция для запуска cooldown
  const startCooldown = useCallback(() => {
    isScrollingRef.current = true
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
      
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false
    }, SCROLL_COOLDOWN)
  }, [])
  
  // Переход к предыдущему посту
  const goToPrevious = useCallback(() => {
    // Проверяем cooldown
    if (isScrollingRef.current) return
    
    if (currentIndex > 0) {
      // ✅ FIX: Стопаем видео текущего поста (который станет следующим)
      const currentPost = posts[currentIndex]
      if (currentPost?.media?.type === 'video') {
        const currentContainer = document.querySelector(`[data-post-id="${currentPost.id}"]`)
        const currentVideo = currentContainer?.querySelector('video') as HTMLVideoElement
        if (currentVideo && !currentVideo.paused) {
          currentVideo.pause()
        }
      }
      
      startCooldown()
      setDirection('up')
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      setCurrentRemixIndex(0)
      scrollToPost(newIndex)
    }
  }, [currentIndex, posts, scrollToPost, startCooldown])
  
  // Переход к следующему посту
  const goToNext = useCallback(() => {
    // Проверяем cooldown
    if (isScrollingRef.current) return
    
    if (currentIndex < posts.length - 1) {
      // ✅ FIX: Стопаем видео текущего поста (который станет предыдущим)
      const currentPost = posts[currentIndex]
      if (currentPost?.media?.type === 'video') {
        const currentContainer = document.querySelector(`[data-post-id="${currentPost.id}"]`)
        const currentVideo = currentContainer?.querySelector('video') as HTMLVideoElement
        if (currentVideo && !currentVideo.paused) {
          currentVideo.pause()
        }
      }
      
      startCooldown()
      setDirection('down')
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      setCurrentRemixIndex(0)
      scrollToPost(newIndex)
    } else if (onLoadMore && currentIndex === posts.length - 1) {
      onLoadMore()
    }
  }, [currentIndex, posts, onLoadMore, scrollToPost, startCooldown])
  
  // Навигация по ремиксам
  const goToPreviousRemix = useCallback(() => {
    if (hasRemixes) {
      setCurrentRemixIndex(prev => 
        prev === 0 ? currentPost.postRemixes!.length - 1 : prev - 1
      )
    }
  }, [hasRemixes, currentPost])
  
  const goToNextRemix = useCallback(() => {
    if (hasRemixes) {
      setCurrentRemixIndex(prev => 
        prev === currentPost.postRemixes!.length - 1 ? 0 : prev + 1
      )
    }
  }, [hasRemixes, currentPost])
  
  // Обработчик действий с перехватом комментариев
  const handleAction = useCallback((action: PostAction) => {
    if (action.type === 'comment') {
      setShowComments(true)
      return
    }
    
    // Все остальные действия передаем родителю
    onAction?.(action)
  }, [onAction])
  
  // ✅ FIX: Keyboard navigation с AbortController для proper cleanup
  useEffect(() => {
    const controller = new AbortController()
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем если фокус на input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          goToPreviousRef.current()
          break
        case 'ArrowDown':
          e.preventDefault()
          goToNextRef.current()
          break
        case 'ArrowLeft':
          if (currentPost?.postRemixes && currentPost.postRemixes.length > 1) {
            e.preventDefault()
            goToPreviousRemix()
          }
          break
        case 'ArrowRight':
          if (currentPost?.postRemixes && currentPost.postRemixes.length > 1) {
            e.preventDefault()
            goToNextRemix()
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown, {
      signal: controller.signal // ✅ Auto-cleanup with AbortController
    })
    
    return () => {
      controller.abort() // ✅ Removes listener automatically
    }
  }, [goToPreviousRemix, goToNextRemix, currentPost]) // Minimal dependencies
  
  // Wheel navigation (cooldown уже в goToNext/goToPrevious)
  // Используем ref для функций, чтобы избежать пересоздания обработчика
  const goToNextRef = useRef(goToNext)
  const goToPreviousRef = useRef(goToPrevious)
  
  // Обновляем refs при изменении функций
  useEffect(() => {
    goToNextRef.current = goToNext
    goToPreviousRef.current = goToPrevious
  }, [goToNext, goToPrevious])
  
  // Состояние для отслеживания готовности контейнера
  const [containerReady, setContainerReady] = useState(false)
  
  // ✅ FIX: Wheel navigation с proper cleanup и AbortController
  useEffect(() => {
    // Ждём пока контейнер появится
    if (!containerReady) return
    
    const container = containerRef.current
    if (!container) return
    
    const controller = new AbortController()
    
    const handleWheel = (e: WheelEvent) => {
      // Игнорируем маленькие движения колеса (threshold)
      if (Math.abs(e.deltaY) < 30) return
      
      // Блокируем дефолтный скролл
      e.preventDefault()
      
      if (e.deltaY > 0) {
        // Скролл вниз → следующий пост
        goToNextRef.current()
      } else {
        // Скролл вверх → предыдущий пост
        goToPreviousRef.current()
      }
    }
    
    // ✅ Используем AbortController для auto-cleanup
    container.addEventListener('wheel', handleWheel, {
      passive: false,
      signal: controller.signal
    })
    
    return () => {
      controller.abort() // ✅ Removes listener automatically
    }
  }, [containerReady]) // Запускаем когда контейнер готов
  
  // ✅ FIX: Comprehensive cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      // Очищаем таймаут
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }
      
      // Сбрасываем scrolling flag для предотвращения блокировок
      isScrollingRef.current = false
      
      // ✅ CRITICAL: Сбрасываем containerReady для предотвращения накопления listeners
      setContainerReady(false)
    }
  }, [])
  
  // Callback при смене поста
  useEffect(() => {
    if (currentPost && onPostChange) {
      onPostChange(currentPost, currentIndex)
    }
  }, [currentIndex, currentPost, onPostChange])
  
  // Автовоспроизведение видео при смене поста
  
  useEffect(() => {
    console.log('[VIDEO AUTOPLAY] Current index changed to:', currentIndex)
    console.log('[VIDEO AUTOPLAY] Current post:', currentPost?.id, 'media type:', currentPost?.media?.type)
    
    // ✅ FIX: Используем флаг для отмены автовоспроизведения при unmount
    let isCancelled = false
    
    // Находим видео в текущем активном посте и запускаем его
    const timeoutId = setTimeout(() => {
      // ✅ FIX: Проверяем, не был ли effect отменен
      if (isCancelled) {
        console.log('[VIDEO AUTOPLAY] Effect cancelled, skipping autoplay')
        return
      }
      
      if (currentPost?.media?.type === 'video') {
        console.log('[VIDEO AUTOPLAY] Trying to play video for post:', currentPost.id)
        
        // Находим контейнер текущего поста по data-атрибуту
        const postContainer = document.querySelector(`[data-post-id="${currentPost.id}"]`)
        
        if (postContainer) {
          // Ищем видео именно внутри этого поста
          const activeVideo = postContainer.querySelector('video') as HTMLVideoElement
          
          if (activeVideo) {
            // ✅ FIX: Проверяем, что элемент всё ещё в DOM
            if (!document.contains(activeVideo)) {
              console.warn('[VIDEO AUTOPLAY] Video element removed from DOM, skipping autoplay')
              return
            }
            
            console.log('[VIDEO AUTOPLAY] Found active video in post, playing...')
            // ✅ FIX: Обрабатываем все возможные ошибки
            activeVideo.play().catch(error => {
              // Игнорируем AbortError (элемент был удален)
              if (error.name === 'AbortError') {
                console.log('[VIDEO AUTOPLAY] Play aborted (element removed)')
              } else {
                console.error('[VIDEO AUTOPLAY] Autoplay prevented:', error.name, error.message)
              }
            })
          } else {
            console.warn('[VIDEO AUTOPLAY] Video element not found in post container')
          }
        } else {
          console.warn('[VIDEO AUTOPLAY] Post container not found for post:', currentPost.id)
        }
      } else {
        console.log('[VIDEO AUTOPLAY] Current post is not a video')
      }
    }, 600) // Задержка под длительность анимации (500ms) + запас
    
    // ✅ FIX: Cleanup - отменяем timeout и флаг при unmount/rerender
    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
    }
  }, [currentIndex, currentPost])
  
 
  // Swipe navigation
  const handlers = useSwipeable({
    onSwipedUp: () => {
      // ✅ FIX: Не переключаем посты если открыты комментарии
      if (showComments) return
      
      console.log('[SWIPE] Swiped UP - going to next post')
      goToNext()
    },
    onSwipedDown: () => {
      // ✅ FIX: Не переключаем посты если открыты комментарии
      if (showComments) return
      
      console.log('[SWIPE] Swiped DOWN - going to previous post')
      goToPrevious()
    },
    onSwipedLeft: () => hasRemixes && goToNextRemix(),
    onSwipedRight: () => hasRemixes && goToPreviousRemix(),
    preventScrollOnSwipe: true,
    trackMouse: false,
    trackTouch: true,
    delta: 30, // Уменьшаем порог для более чувствительного свайпа
    swipeDuration: 1000 // Увеличиваем время для медленных свайпов
  })
  
  // Правильное объединение refs
  const swipeRef = (el: HTMLDivElement | null) => {
    // Устанавливаем наш ref
    if (containerRef) {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    }
    // Вызываем ref из useSwipeable
    if (handlers.ref) {
      (handlers.ref as (el: HTMLDivElement | null) => void)(el)
    }
    // Сигнализируем что контейнер готов
    if (el && !containerReady) {
      setContainerReady(true)
    }
  }
  
  if (!currentPost) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Loading posts...</p>
        </div>
      </div>
    )
  }
  
  // Объединяем handlers без ref (ref передаём отдельно)
  const { ref: _swipeRef, ...swipeHandlers } = handlers
  
  return (
    <div 
      ref={swipeRef}
      className="relative w-full h-screen overflow-hidden bg-white dark:bg-slate-900"
      {...swipeHandlers}
    >
      {/* Back Button - для профиля */}
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          className="fixed top-6 left-6 z-50 w-12 h-12 flex items-center justify-center bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all transform hover:scale-110"
        >
          <ArrowLeftIcon className="w-6 h-6 text-white" />
        </button>
      )}
      
      {/* Posts container с анимированным переключением */}
      <div 
        className="w-full h-screen transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateY(-${currentIndex * 100}vh)`
        }}
      >
        {posts.map((post, index) => {
          // ✅ FIX: Рендерим только ±2 поста от текущего (5 постов max вместо 750)
          const isInRange = Math.abs(index - currentIndex) <= 2
          
          if (!isInRange) {
            // Рендерим пустой placeholder для сохранения позиции в transform
            return (
              <div
                key={post.id}
                className="relative w-full h-screen"
              />
            )
          }
          
          const isActive = index === currentIndex
          const postRemixes = post.postRemixes && post.postRemixes.length > 1
          const displayPost = post // postRemixes && isActive ? post.postRemixes[currentRemixIndex] : post
          
          return (
            <div
              key={post.id}
              data-post-id={displayPost.id}
              className="relative w-full h-screen flex items-center justify-center"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${displayPost.id}-${isActive ? currentRemixIndex : 0}`}
                  initial={false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full"
                >
                  <FullscreenPostCard
                    post={displayPost}
                    onAction={handleAction}
                    isFullscreen={isFullscreen}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      
      {/* Circular Navigation - справа между центром и actions */}
      <div className="hidden md:block fixed right-4 lg:right-32 top-1/2 -translate-y-1/2 z-50">
        <CircularNavigation
          onPrevious={goToPrevious}
          onNext={goToNext}
          onLeft={hasRemixes ? goToPreviousRemix : undefined}
          onRight={hasRemixes ? goToNextRemix : undefined}
          canGoPrevious={currentIndex > 0}
          canGoNext={currentIndex < posts.length - 1}
          hasRemixes={hasRemixes}
        />
      </div>
      
      {/* Mobile: Vertical Actions внизу (над BottomNav) */}
      <div className={cn(
        "md:hidden fixed right-4 z-50",
        isFullscreen ? "bottom-4" : "bottom-20" // Fullscreen: bottom-4, FeedPage: bottom-20 (над navbar)
      )}>
        <VerticalActions
          post={currentPost}
          onAction={handleAction}
          isFullscreen={isFullscreen}
        />
      </div>
      
      {/* Sliding Comments Panel */}
      <SlidingCommentsPanel
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        post={currentPost}
      />
    </div>
  )
}

