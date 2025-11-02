'use client'

import { useState, useEffect, useRef } from 'react'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import type { UnifiedPost } from '@/types/posts'
import Avatar from './Avatar'
import { 
  ArrowPathIcon, 
  ChatBubbleLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { HeartIcon } from '@heroicons/react/24/solid'

interface TikTokVideoViewerComponentProps {
  onClose: () => void
}

// Функция для перемешивания массива (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Форматирование даты
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин. назад`
  if (hours < 24) return `${hours} ч. назад`
  if (days < 7) return `${days} дн. назад`
  
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'short'
  })
}

export default function TikTokVideoViewerComponent({ onClose }: TikTokVideoViewerComponentProps) {
  const { loadVideos, handleAction } = useOptimizedPosts()
  const [videos, setVideos] = useState<UnifiedPost[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [startY, setStartY] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [showEmotions, setShowEmotions] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<'up' | 'down' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Загрузка видео при монтировании компонента
  useEffect(() => {
    const loadAndShuffleVideos = async () => {
      try {
        setIsLoading(true)
        const fetchedVideos = await loadVideos()
        
        // Перемешиваем видео случайным образом
        const shuffledVideos = shuffleArray(fetchedVideos)
        setVideos(shuffledVideos)
        
        console.log('[TikTokVideoViewer] Loaded and shuffled', shuffledVideos.length, 'videos')
      } catch (error) {
        console.error('[TikTokVideoViewer] Error loading videos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAndShuffleVideos()
  }, [loadVideos])

  // Автоматическое воспроизведение текущего видео
  useEffect(() => {
    if (videoRef.current && !isLoading && videos.length > 0) {
      videoRef.current.play().catch(error => {
        console.log('[TikTokVideoViewer] Autoplay prevented:', error)
      })
    }
  }, [currentIndex, isLoading, videos])

  // Функция для переключения видео с анимацией
  const switchVideo = (direction: 'up' | 'down', newIndex: number) => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    setTransitionDirection(direction)
    
    // Через 300ms меняем индекс и убираем анимацию
    setTimeout(() => {
      setCurrentIndex(newIndex)
      setIsTransitioning(false)
      setTransitionDirection(null)
      
      // Сбрасываем время видео
      if (videoRef.current) {
        videoRef.current.currentTime = 0
      }
    }, 300)
  }

  // Обработка touch событий для свайпа
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isTransitioning) return
    
    const endY = e.changedTouches[0].clientY
    const diff = startY - endY

    // Свайп вверх (следующее видео)
    if (diff > 50 && currentIndex < videos.length - 1) {
      switchVideo('up', currentIndex + 1)
    }
    // Свайп вниз (предыдущее видео)
    else if (diff < -50 && currentIndex > 0) {
      switchVideo('down', currentIndex - 1)
    }
  }

  // Обработка колеса мыши для desktop
  const handleWheel = (e: React.WheelEvent) => {
    if (isTransitioning) return
    
    if (e.deltaY > 0 && currentIndex < videos.length - 1) {
      // Скролл вниз - следующее видео
      switchVideo('up', currentIndex + 1)
    } else if (e.deltaY < 0 && currentIndex > 0) {
      // Скролл вверх - предыдущее видео
      switchVideo('down', currentIndex - 1)
    }
  }

  const currentVideo = videos[currentIndex]

  // Открыть панель эмоций
  const handleLikeClick = () => {
    setShowEmotions(true)
  }

  // Обработка выбора эмоции
  const handleEmotionSelect = async (emotionId: number) => {
    if (!currentVideo) return
    
    await handleAction({ 
      type: 'add-emotion', 
      postId: currentVideo.id, 
      emotionId 
    })
    
    // Обновляем локальное состояние
    setVideos(prev => prev.map(v => 
      v.id === currentVideo.id 
        ? {
            ...v,
            emotionsCount: v.emotionsCount + 1
          }
        : v
    ))
    
    setShowEmotions(false)
  }

  if (isLoading) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-14 z-40 bg-black flex items-center justify-center">
        <div className="text-white text-xl font-semibold">Load videos...</div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-14 z-40 bg-black flex items-center justify-center">
        <div className="text-white text-xl font-semibold">No videos available</div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="fixed top-0 left-0 right-0 bottom-14 z-40 bg-black overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >

      {/* Current Video Container with Animation */}
      <div 
        className="w-full h-full absolute top-0 left-0"
        style={{
          transform: transitionDirection === 'up' 
            ? 'translateY(-100%)' 
            : transitionDirection === 'down' 
            ? 'translateY(100%)' 
            : 'translateY(0)',
          opacity: isTransitioning ? 0 : 1,
          transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
          zIndex: 20
        }}
      >
        {currentVideo && (
          <>
            {/* Video Player */}
            <video
              ref={videoRef}
              src={currentVideo.media.url}
              className="w-full h-full object-cover"
              loop
              playsInline
              onClick={() => {
                if (videoRef.current) {
                  if (videoRef.current.paused) {
                    videoRef.current.play()
                  } else {
                    videoRef.current.pause()
                  }
                }
              }}
            />

            {/* Bottom Left Info */}
            <div className="absolute bottom-4 left-4 z-30 space-y-3 max-w-[calc(100%-120px)]">
              {/* Creator Info */}
              <div className="flex items-center gap-3">
                <Avatar
                  src={currentVideo.creator.avatar || null}
                  alt={currentVideo.creator.name}
                  seed={currentVideo.creator.username}
                  size={48}
                  rounded="full"
                  className="ring-2 ring-white shadow-lg"
                />
                <div>
                  <div className="text-white font-semibold text-base drop-shadow-lg">
                    {currentVideo.creator.name}
                  </div>
                  <div className="text-white/80 text-sm drop-shadow-md">
                    @{currentVideo.creator.username}
                  </div>
                </div>
              </div>

              {/* Title */}
              {currentVideo.content.title && (
                <div className="text-white font-medium text-base drop-shadow-lg line-clamp-2">
                  {currentVideo.content.title}
                </div>
              )}

              {/* Description */}
              {currentVideo.content.text && (
                <div className="text-white/90 text-sm drop-shadow-md line-clamp-3">
                  {currentVideo.content.text}
                </div>
              )}

              {/* Created At */}
              <div className="text-white/70 text-xs drop-shadow-md">
                {formatRelativeTime(currentVideo.createdAt)}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="absolute bottom-4 right-4 z-30 flex flex-col items-center gap-6">
              {/* Like/Emotions Button */}
              <button
                onClick={handleLikeClick}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm transition-all bg-white/20 hover:bg-white/30">
                  <HeartIcon className="w-7 h-7 text-white" />
                </div>
                <span className="text-white text-xs font-medium drop-shadow-lg">
                  {currentVideo.emotionsCount > 999 
                    ? `${(currentVideo.emotionsCount / 1000).toFixed(1)}K`
                    : currentVideo.emotionsCount}
                </span>
              </button>

              {/* Comments Button */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                  <ChatBubbleLeftIcon className="w-7 h-7 text-white" />
                </div>
                <span className="text-white text-xs font-medium drop-shadow-lg">
                  {currentVideo.engagement.comments}
                </span>
              </button>

              {/* Remix Button (if has requestId) */}
              {currentVideo.media.requestId && (
                <button
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500/80 backdrop-blur-sm flex items-center justify-center hover:bg-purple-600/80 transition-all">
                    <ArrowPathIcon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium drop-shadow-lg">
                    Remix
                  </span>
                </button>
              )}
            </div>

          </>
        )}
      </div>

      {/* Emotions Panel */}
      {showEmotions && (
        <>
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 z-[70]"
            onClick={() => setShowEmotions(false)}
          />
          
          {/* Emotions Picker */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl z-[80] p-6 pb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Выберите реакцию</h3>
              <button
                onClick={() => setShowEmotions(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Emotions Grid */}
            <div className="grid grid-cols-3 gap-4">
              {/* Emotion 1 - Смешно */}
              <button
                onClick={() => handleEmotionSelect(1)}
                className="flex items-center justify-center p-4 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-2xl transition-colors"
              >
                <span className="text-5xl">😂</span>
              </button>
              
              {/* Emotion 2 - Клоун */}
              <button
                onClick={() => handleEmotionSelect(2)}
                className="flex items-center justify-center p-4 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-2xl transition-colors"
              >
                <span className="text-5xl">🤡</span>
              </button>
              
              {/* Emotion 3 - Огонь */}
              <button
                onClick={() => handleEmotionSelect(3)}
                className="flex items-center justify-center p-4 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-2xl transition-colors"
              >
                <span className="text-5xl">🔥</span>
              </button>
              
              {/* Emotion 4 - Какашка */}
              <button
                onClick={() => handleEmotionSelect(4)}
                className="flex items-center justify-center p-4 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-2xl transition-colors"
              >
                <span className="text-5xl">💩</span>
              </button>
              
              {/* Emotion 5 - Сердечко */}
              <button
                onClick={() => handleEmotionSelect(5)}
                className="flex items-center justify-center p-4 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
              >
                <span className="text-5xl">❤️</span>
              </button>
              
              {/* Emotion 6 - Палец вверх */}
              <button
                onClick={() => handleEmotionSelect(6)}
                className="flex items-center justify-center p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors"
              >
                <span className="text-5xl">👍</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Comments Section (TODO: implement) */}
      {showComments && (
        <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl z-[70] p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Комментарии</h3>
            <button
              onClick={() => setShowComments(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-500 text-center">Комментарии будут здесь...</p>
        </div>
      )}
    </div>
  )
}

