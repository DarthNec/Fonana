'use client'

import { useState, useEffect, useRef } from 'react'
import { useOptimizedPosts } from '@/lib/hooks/useOptimizedPosts'
import type { UnifiedPost } from '@/types/posts'
import Avatar from './Avatar'
import { 
  ArrowPathIcon, 
  ChatBubbleLeftIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { HeartIcon } from '@heroicons/react/24/solid'
import { useWallet } from '@solana/wallet-adapter-react'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { useUser } from '@/lib/store/appStore'
import { toast } from 'react-hot-toast'

interface Comment {
  id: string
  userId: string
  user: {
    id: string
    nickname?: string
    fullName?: string
    avatar?: string
  }
  content: string
  createdAt: string
  likesCount: number
  isAnonymous: boolean
}
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

// Маппинг ID эмоций к эмодзи
const emotionEmojis: Record<number, string> = {
  1: '😂', // Смешно
  2: '🤡', // Клоун
  3: '🔥', // Огонь
  4: '💩', // Какашка
  5: '❤️', // Сердечко
  6: '👍'  // Палец вверх
}

// Получить уникальные эмоции из массива
function getUniqueEmotions(emotions?: any[]): number[] {
  if (!emotions || emotions.length === 0) return []
  
  const uniqueIds = new Set<number>()
  emotions.forEach(emotion => {
    if (emotion.emotionId) {
      uniqueIds.add(emotion.emotionId)
    }
  })
  
  return Array.from(uniqueIds).sort()
}

export default function TikTokVideoViewerComponent({ onClose }: TikTokVideoViewerComponentProps) {
  const { loadVideos, handleAction } = useOptimizedPosts()
  const { connected, publicKey } = useWallet()
  const { setVisible } = useSafeWalletModal()
  const user = useUser()
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
  
  // Состояния для комментариев
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Состояния для Remix
  const [showRemix, setShowRemix] = useState(false)
  const [remixPrompt, setRemixPrompt] = useState('')
  const [availableGenerations, setAvailableGenerations] = useState<number | null>(null)
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false)
  const [showGenerationTooltip, setShowGenerationTooltip] = useState(false)
  const [isRemixing, setIsRemixing] = useState(false)

  // Загрузка доступных генераций при открытии
  useEffect(() => {
    const fetchGenerations = async () => {
      const publicKeyString = publicKey?.toString()
      if (!publicKeyString) {
        console.log('[TikTokVideoViewer] No wallet connected, skipping generations fetch')
        return
      }
      
      setIsLoadingGenerations(true)
      try {
        console.log('[TikTokVideoViewer] Fetching available generations for:', publicKeyString)
        
        const response = await fetch(`/api/user/generations?userWallet=${publicKeyString}`)
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch generations')
        }
        
        const data = await response.json()
        console.log('[TikTokVideoViewer] Generations fetched:', data.availableGenerationCount)
        
        setAvailableGenerations(data.availableGenerationCount)
      } catch (error) {
        console.error('[TikTokVideoViewer] Error fetching generations:', error)
        setAvailableGenerations(0)
      } finally {
        setIsLoadingGenerations(false)
      }
    }
    
    fetchGenerations()
  }, [publicKey])

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
    if(!connected) {
      toast.success('Подключите кошелек для использования эмоций')
      setVisible(true)
      return
    }
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

  // Загрузка комментариев
  const fetchComments = async (postId: string) => {
    try {
      setLoadingComments(true)
      const response = await fetch(`/api/posts/${postId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
      toast.error('Ошибка загрузки комментариев')
    } finally {
      setLoadingComments(false)
    }
  }

  // Загружаем комментарии при открытии панели
  useEffect(() => {
    if (showComments && currentVideo) {
      fetchComments(currentVideo.id)
    }
  }, [showComments, currentVideo?.id])

  // Добавление комментария
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim()) return
    if (!user?.id) {
      toast.error('Подключите кошелек для комментирования')
      setVisible(true)
      return
    }
    if (!currentVideo) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/posts/${currentVideo.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          content: newComment.trim(),
          isAnonymous: false
        })
      })

      if (response.ok) {
        setNewComment('')
        await fetchComments(currentVideo.id)
        toast.success('Comment added')
        
        // Обновляем счетчик комментариев в видео
        setVideos(prev => prev.map(v => 
          v.id === currentVideo.id 
            ? { ...v, engagement: { ...v.engagement, comments: v.engagement.comments + 1 } }
            : v
        ))
      } else {
        throw new Error('Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Ошибка при добавлении комментария')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Форматирование даты для комментариев
  const formatCommentDate = (dateString: string) => {
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
    
    return date.toLocaleDateString('ru-RU')
  }

  // Обработчик открытия Remix панели
  const handleRemixClick = () => {
    if (!connected) {
      toast.error('Подключите кошелек для использования Remix')
      setVisible(true)
      return
    }
    setShowRemix(true)
  }

  // Функция для создания ремикса через API
  const createRemix = async (videoId: string, prompt: string): Promise<string | null> => {
    try {
      console.log('[TikTokVideoViewer] Starting video remix via API...', {
        videoId,
        prompt: prompt.substring(0, 50) + '...'
      })

      // Отправляем запрос на наш внутренний API
      const response = await fetch('/api/sora/mobile/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          prompt
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create remix')
      }

      const data = await response.json()
      console.log('[TikTokVideoViewer] Remix API response:', data)
      
      const remixVideoId = data.videoId
      
      if (!remixVideoId) {
        throw new Error('Remix video ID not found in response')
      }

      toast.success('🎥 Video remix generation started!')
      return remixVideoId

    } catch (error) {
      console.error('[TikTokVideoViewer] Remix error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create video remix')
      return null
    }
  }

  // Обработчик публикации Remix
  const handleRemixSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!remixPrompt.trim()) {
      toast.error('Введите описание изменений')
      return
    }

    if (!currentVideo?.media.requestId) {
      toast.error('Это видео не поддерживает Remix')
      return
    }

    // 🔧 FALLBACK: Используем реальное состояние кошелька
    const windowSolana = typeof window !== 'undefined' ? (window as any).solana : null
    const realConnected = windowSolana?.isConnected || false
    const realPublicKey = windowSolana?.publicKey
    
    console.log('🔍 [TikTokVideoViewer DEBUG] handleRemixSubmit wallet state:', {
      connected,
      publicKeyString: publicKey?.toString() || null,
      realConnected,
      realPublicKey: realPublicKey?.toString()
    })
    
    // 🔧 ИСПРАВЛЕНИЕ: Проверяем ЛИБО useWallet hook ЛИБО window.solana
    const hasWalletConnection = (connected && publicKey) || (realConnected && realPublicKey)
    const walletAddress = publicKey?.toString() || realPublicKey?.toString()
    
    if (!hasWalletConnection || !walletAddress) {
      toast.error('Подключите кошелек')
      setVisible(true)
      return
    }

    if (availableGenerations === null || availableGenerations <= 0) {
      toast.error('У вас нет доступных генераций')
      return
    }

    try {
      setIsRemixing(true)
      
      // Сначала создаем ремикс через OpenAI API
      console.log('[TikTokVideoViewer] Creating remix...')
      const remixVideoId = await createRemix(currentVideo.media.requestId, remixPrompt)
      
      if (!remixVideoId) {
        throw new Error('Failed to create remix')
      }

      console.log('[TikTokVideoViewer] Remix created:', remixVideoId)

      // Подготавливаем данные для ремикса
      const remixData = {
        userWallet: walletAddress,
        title: `Remix`, // ${currentVideo.content.title}
        content: `Prompt: ${remixPrompt}`,
        type: 'ai-video',
        category: currentVideo.content.category || 'Art',
        tags: [...(currentVideo.content.tags || []), 'remix'],
        thumbnail: '/placeholder-video-enhanced.png',
        mediaUrl: null, // URL будет null, видео придет через webhook
        requestId: remixVideoId, // Используем ID из OpenAI API
        isLocked: false, // Ремиксы по умолчанию бесплатные
        accessType: 'free',
        // Поля для ремикса
        originalPostId: currentVideo.id,
        remixPrompt: remixPrompt,
        originalVideoUrl: currentVideo.media.url
      }

      console.log('[TikTokVideoViewer] Sending remix data:', remixData)
      
      const response = await fetch('/api/posts/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(remixData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error creating remix')
      }

      const result = await response.json()
      const remixPost = result.post || result
      console.log('[TikTokVideoViewer] Remix created:', remixPost)
      
      toast.success('Remix запущен! Видео появится в вашем профиле после обработки')
      
      // Emit custom event for real-time feed updates
      const remixCreatedEvent = new CustomEvent('post-created', {
        detail: { post: remixPost }
      })
      window.dispatchEvent(remixCreatedEvent)
      console.log('[TikTokVideoViewer] Emitted post-created event for real-time updates')
      
      setShowRemix(false)
      setRemixPrompt('')
      
      // Обновляем счетчик генераций
      if (availableGenerations !== null) {
        setAvailableGenerations(availableGenerations - 1)
      }
    } catch (error) {
      console.error('[TikTokVideoViewer] Remix creation error:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка при создании Remix')
    } finally {
      setIsRemixing(false)
    }
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

            {/* Download Button - Top Right */}
            {currentVideo.media.url && (
              <div className="absolute top-4 right-4 z-30">
                <a
                  href={`/api/download?url=${encodeURIComponent(currentVideo.media.url)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
                  aria-label="Download video"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </a>
              </div>
            )}

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
                {currentVideo.emotionsCount === 0 ? (
                  // Если нет реакций - показываем иконку лайка
                  <>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm transition-all bg-white/20 hover:bg-white/30">
                      <HeartIcon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-white text-xs font-medium drop-shadow-lg">
                      0
                    </span>
                  </>
                ) : (
                  // Если есть реакции - показываем эмодзи
                  <>
                    <div className="relative flex items-center justify-center w-12 h-12">
                      {/* Эмодзи накладываются друг на друга */}
                      <div className="relative flex items-center" style={{ width: 'fit-content' }}>
                        {getUniqueEmotions(currentVideo.emotions).map((emotionId, index) => (
                          <div
                            key={emotionId}
                            className="flex items-center justify-center bg-white/90 rounded-full border-2 border-white shadow-lg"
                            style={{
                              width: '32px',
                              height: '32px',
                              marginLeft: index > 0 ? '-12px' : '0',
                              zIndex: getUniqueEmotions(currentVideo.emotions).length - index
                            }}
                          >
                            <span className="text-xl leading-none">{emotionEmojis[emotionId]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <span className="text-white text-xs font-medium drop-shadow-lg">
                      {currentVideo.emotionsCount > 999 
                        ? `${(currentVideo.emotionsCount / 1000).toFixed(1)}K`
                        : currentVideo.emotionsCount}
                    </span>
                  </>
                )}
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
                  onClick={handleRemixClick}
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

      {/* Comments Section */}
      {showComments && (
        <div className="absolute bottom-0 left-0 right-0 h-[60vh] bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl z-[70] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Comments ({comments.length})
            </h3>
            <button
              onClick={() => {
                setShowComments(false)
                setComments([])
                setNewComment('')
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingComments ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 dark:text-slate-400 text-sm">Загружаем комментарии...</p>
                </div>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-slate-400 py-12">
                Комментариев пока нет. Будьте первым!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar
                      src={comment.isAnonymous ? null : comment.user?.avatar}
                      alt="Avatar"
                      seed={comment.isAnonymous ? 'anonymous' : comment.user?.nickname || 'user'}
                      size={32}
                      className="flex-shrink-0"
                      rounded="full"
                    />
                    <div className="flex-1">
                      <div className="bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">
                            {comment.isAnonymous ? 'Аноним' : comment.user.fullName || comment.user.nickname || 'Пользователь'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {formatCommentDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment Input - только если connected */}
          {connected && user && (
            <form onSubmit={handleSubmitComment} className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <div className="flex gap-2">
                <Avatar
                  src={user.avatar}
                  alt="Your avatar"
                  seed={user.nickname || user.id}
                  size={36}
                  className="flex-shrink-0"
                  rounded="full"
                />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => {
                      if (e.target.value.length <= 300) {
                        setNewComment(e.target.value)
                      }
                    }}
                    placeholder="Написать комментарий..111."
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400"
                    maxLength={300}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <PaperAirplaneIcon className="w-5 h-5" />
                    )}
                    <span className="hidden sm:inline">{isSubmitting ? 'Отправка...' : 'Отправить'}</span>
                  </button>
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-slate-400 text-right">
                {newComment.length}/300
              </div>
            </form>
          )}
        </div>
      )}

      {/* Remix Panel */}
      {showRemix && (
        <>
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 z-[70]"
            onClick={() => {
              setShowRemix(false)
              setRemixPrompt('')
            }}
          />
          
          {/* Remix Form */}
          <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl z-[80] flex flex-col">
            {/* Header with Available Generations */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Remix видео
                </h3>
                <button
                  onClick={() => {
                    setShowRemix(false)
                    setRemixPrompt('')
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Available Generations Counter */}
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border border-pink-200 dark:border-pink-800 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Доступно генераций:
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoadingGenerations ? (
                      <div className="w-4 h-4 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className={`text-lg font-bold ${
                          (availableGenerations || 0) > 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {availableGenerations ?? 0}
                        </span>
                        <div 
                          className="relative"
                          onMouseEnter={() => setShowGenerationTooltip(true)}
                          onMouseLeave={() => setShowGenerationTooltip(false)}
                        >
                          <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors" />
                          {showGenerationTooltip && (
                            <div className="absolute z-50 bottom-full right-0 mb-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                              <div className="relative">
                                Количество Sora-2 генераций, которые вы можете использовать в сутки, автоматически обновляется раз в 24 часа
                                <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 border-r border-b border-gray-700 transform rotate-45"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {availableGenerations === 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    ⚠️ Нет доступных генераций. Вы не можете создать Remix.
                  </p>
                )}
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleRemixSubmit} className="flex-1 flex flex-col p-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Как вы хотите изменить это видео?
                </label>
                <textarea
                  value={remixPrompt}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setRemixPrompt(e.target.value)
                    }
                  }}
                  placeholder="Например: сделать видео ярче, добавить снег, изменить время суток на ночь..."
                  className="w-full h-32 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 resize-none"
                  maxLength={500}
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-slate-400 text-right">
                  {remixPrompt.length}/500
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!remixPrompt.trim() || isRemixing || availableGenerations === null || availableGenerations <= 0}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isRemixing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Publish
                  </>
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

