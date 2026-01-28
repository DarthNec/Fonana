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

interface FullscreenCarouselProps {
  posts: UnifiedPost[]
  initialIndex?: number
  onPostChange?: (post: UnifiedPost, index: number) => void
  onAction?: (action: PostAction) => void
  onLoadMore?: () => void
  onBack?: () => void // Кнопка назад (для профиля)
  showBackButton?: boolean // Показывать ли кнопку назад
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
  showBackButton = false
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
      startCooldown()
      setDirection('up')
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      setCurrentRemixIndex(0)
      scrollToPost(newIndex)
    }
  }, [currentIndex, scrollToPost, startCooldown])
  
  // Переход к следующему посту
  const goToNext = useCallback(() => {
    // Проверяем cooldown
    if (isScrollingRef.current) return
    
    if (currentIndex < posts.length - 1) {
      startCooldown()
      setDirection('down')
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      setCurrentRemixIndex(0)
      scrollToPost(newIndex)
    } else if (onLoadMore && currentIndex === posts.length - 1) {
      onLoadMore()
    }
  }, [currentIndex, posts.length, onLoadMore, scrollToPost, startCooldown])
  
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
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем если фокус на input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowDown':
          e.preventDefault()
          goToNext()
          break
        case 'ArrowLeft':
          if (hasRemixes) {
            e.preventDefault()
            goToPreviousRemix()
          }
          break
        case 'ArrowRight':
          if (hasRemixes) {
            e.preventDefault()
            goToNextRemix()
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevious, goToNext, goToPreviousRemix, goToNextRemix, hasRemixes])
  
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
  
  useEffect(() => {
    // Ждём пока контейнер появится
    if (!containerReady) return
    
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
    
    // Добавляем на container
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
    }
    
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel)
      }
    }
  }, [containerReady]) // Запускаем когда контейнер готов
  
  // Очищаем таймаут только при размонтировании компонента
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
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
    
    // Находим все видео на странице
    const allVideos = document.querySelectorAll('video')
    console.log('[VIDEO AUTOPLAY] Found videos:', allVideos.length)
    
    // Ставим все видео на паузу
    allVideos.forEach((video, idx) => {
      console.log(`[VIDEO AUTOPLAY] Pausing video ${idx}`)
      video.pause()
    })
    
    // Находим видео в текущем активном посте и запускаем его
    setTimeout(() => {
      if (currentPost?.media?.type === 'video') {
        console.log('[VIDEO AUTOPLAY] Trying to play video for post:', currentPost.id)
        
        // Находим контейнер текущего поста по data-атрибуту
        const postContainer = document.querySelector(`[data-post-id="${currentPost.id}"]`)
        
        if (postContainer) {
          // Ищем видео именно внутри этого поста
          const activeVideo = postContainer.querySelector('video') as HTMLVideoElement
          
          if (activeVideo) {
            console.log('[VIDEO AUTOPLAY] Found active video in post, playing...')
            activeVideo.play().catch(error => {
              console.error('[VIDEO AUTOPLAY] Autoplay prevented:', error)
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
  }, [currentIndex, currentPost])
  
  // Swipe navigation
  const handlers = useSwipeable({
    onSwipedUp: () => {
      console.log('[SWIPE] Swiped UP - going to next post')
      goToNext()
    },
    onSwipedDown: () => {
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
      <div className="md:hidden fixed bottom-20 right-4 z-50">
        <VerticalActions
          post={currentPost}
          onAction={handleAction}
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

