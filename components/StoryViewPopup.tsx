'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Stories from 'react-insta-stories'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/store/appStore'
import toast from 'react-hot-toast'
import Avatar from './Avatar'

// Типы эмоций (такие же как в PostActions и CommentsSection)
const EMOTIONS = [
  { id: 1, emoji: '😂', label: 'Смешно', color: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20' },
  { id: 2, emoji: '🤡', label: 'Клоун', color: 'hover:bg-purple-50 dark:hover:bg-purple-900/20' },
  { id: 3, emoji: '🔥', label: 'Огонь', color: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' },
  { id: 4, emoji: '💩', label: 'Какашка', color: 'hover:bg-amber-50 dark:hover:bg-amber-900/20' },
  { id: 5, emoji: '❤️', label: 'Сердечко', color: 'hover:bg-red-50 dark:hover:bg-red-900/20' },
  { id: 6, emoji: '👍', label: 'Палец вверх', color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
]

interface StoryEmotion {
  id: string
  userId: string
  storyId: string
  emotionId: number
  createdAt: string
}

interface Story {
  id: string
  userId: string
  type: string
  mediaUrl: string
  likesCount: number
  viewsCount: number
  createdAt: string
  user: {
    id: string
    nickname?: string
    fullName?: string
    avatar?: string
    isVerified: boolean
  }
  emotions?: StoryEmotion[]
  userEmotion?: StoryEmotion
}

interface StoryViewPopupProps {
  stories: Story[]
  initialStoryIndex?: number
  onClose: () => void
}

export default function StoryViewPopup({ stories: initialStories, initialStoryIndex = 0, onClose }: StoryViewPopupProps) {
  const user = useUser()
  const [stories, setStories] = useState(initialStories)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex)
  const [isMobile, setIsMobile] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Состояния для emotion picker
  const [showEmotionPicker, setShowEmotionPicker] = useState(false)
  const [emotionProcessing, setEmotionProcessing] = useState(false)
  const emotionPickerRef = useRef<HTMLDivElement>(null)
  const emotionContainerRef = useRef<HTMLDivElement>(null)

  // Логируем количество историй для отладки
  useEffect(() => {
    console.log('[StoryViewPopup] Received stories count:', stories.length)
    console.log('[StoryViewPopup] Stories:', stories)
    if (stories.length > 0) {
      console.log('[StoryViewPopup] User:', stories[0].user)
    }
  }, [stories])

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Блокировка скролла
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.add('modal-open')
      
      return () => {
        document.body.classList.remove('modal-open')
      }
    }
  }, [])

  // Escape для закрытия
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Закрытие emotion picker при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmotionPicker &&
        emotionPickerRef.current &&
        emotionContainerRef.current &&
        !emotionPickerRef.current.contains(event.target as Node) &&
        !emotionContainerRef.current.contains(event.target as Node)
      ) {
        setShowEmotionPicker(false)
      }
    }

    if (showEmotionPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmotionPicker])

  // Обработчик выбора эмоции для истории
  const handleEmotionSelect = async (emotionId: number) => {
    if (!user?.wallet) {
      toast.error('Подключите кошелек для реакций')
      return
    }

    if (emotionProcessing) return

    const currentStory = stories[currentStoryIndex]
    if (!currentStory) return

    try {
      setEmotionProcessing(true)
      
      const response = await fetch(`/api/stories/${currentStory.id}/emotion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet: user.wallet,
          emotionId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update emotion')
      }

      const data = await response.json()
      
      // Обновляем локальное состояние историй
      setStories(prevStories => 
        prevStories.map((story, index) => {
          if (index !== currentStoryIndex) return story

          const emotions = story.emotions || []
          let newEmotions = [...emotions]
          
          if (data.action === 'removed') {
            // Удаляем эмоцию
            newEmotions = newEmotions.filter(e => !(e.userId === user.id && e.emotionId === emotionId))
            return {
              ...story,
              emotions: newEmotions,
              userEmotion: undefined
            }
          } else {
            // Добавляем/заменяем эмоцию
            // Сначала удаляем старую эмоцию пользователя
            newEmotions = newEmotions.filter(e => e.userId !== user.id)
            // Добавляем новую
            newEmotions.push({
              id: data.emotion?.id || '',
              userId: user.id,
              storyId: currentStory.id,
              emotionId,
              createdAt: new Date().toISOString()
            })
            
            return {
              ...story,
              emotions: newEmotions,
              userEmotion: {
                id: data.emotion?.id || '',
                userId: user.id,
                storyId: currentStory.id,
                emotionId,
                createdAt: new Date().toISOString()
              }
            }
          }
        })
      )

      // Закрываем picker через небольшую задержку
      setTimeout(() => {
        setShowEmotionPicker(false)
      }, 500)

    } catch (error) {
      console.error('Error updating story emotion:', error)
      toast.error('Ошибка при обновлении реакции')
    } finally {
      setTimeout(() => {
        setEmotionProcessing(false)
      }, 300)
    }
  }

  // Получение количества эмоций для текущей истории
  const getEmotionCounts = (): Record<number, number> => {
    const currentStory = stories[currentStoryIndex]
    const counts: Record<number, number> = {}
    if (!currentStory?.emotions || currentStory.emotions.length === 0) return counts
    
    currentStory.emotions.forEach(emotion => {
      counts[emotion.emotionId] = (counts[emotion.emotionId] || 0) + 1
    })
    
    return counts
  }

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentStoryIndex, stories.length, onClose])

  const handlePrevious = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1)
      setProgress(0)
    }
  }, [currentStoryIndex])

  // Desktop story timer
  useEffect(() => {
    if (isMobile) return
    
    const currentStory = stories[currentStoryIndex]
    if (!currentStory || isPaused) return

    const duration = currentStory.type === 'video' ? 15000 : 5000
    const interval = 50
    let elapsed = 0

    setProgress(0)
    
    timerRef.current = setInterval(() => {
      elapsed += interval
      const newProgress = (elapsed / duration) * 100
      setProgress(newProgress)

      if (elapsed >= duration) {
        handleNext()
      }
    }, interval)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [currentStoryIndex, isPaused, isMobile, stories, handleNext])

  // Форматируем истории для react-insta-stories (mobile)
  const formattedStories = stories.map((story) => {
    const timeAgo = getTimeAgo(story.createdAt)
    
    return {
      url: story.mediaUrl,
      type: story.type === 'video' ? 'video' : 'image',
      duration: story.type === 'video' ? 15000 : 5000,
      header: {
        heading: story.user.fullName || story.user.nickname || 'User',
        subheading: timeAgo,
        profileImage: story.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.user.nickname || story.user.id}`
      }
    }
  })

  // Функция для расчета времени
  function getTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 1) return 'только что'
    if (minutes < 60) return `${minutes} мин. назад`
    if (hours < 24) return `${hours} ч. назад`
    
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short'
    })
  }

  const currentStory = stories[currentStoryIndex]
  const timeAgo = getTimeAgo(currentStory.createdAt)

  // Мемоизированный Header для desktop (чтобы не мигал при обновлении progress)
  const DesktopHeader = React.useMemo(() => (
    <div className="absolute top-4 left-0 right-0 z-[205] px-4 pt-3">
      <div className="flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent p-3 rounded-t-2xl">
        <Avatar
          src={currentStory.user.avatar}
          alt={currentStory.user.fullName || currentStory.user.nickname || 'User'}
          seed={currentStory.user.nickname || currentStory.user.id}
          size={40}
          rounded="full"
        />
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">
            {currentStory.user.fullName || currentStory.user.nickname || 'User'}
          </p>
          <p className="text-white/70 text-xs">{timeAgo}</p>
        </div>
      </div>
    </div>
  ), [currentStoryIndex, currentStory.user.avatar, currentStory.user.fullName, currentStory.user.nickname, currentStory.user.id, timeAgo])

  // Mobile version - react-insta-stories
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[210] p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="relative w-full h-full flex items-center justify-center">
          <Stories
            stories={formattedStories}
            defaultInterval={5000}
            width="100%"
            height="100%"
            currentIndex={currentStoryIndex}
            onAllStoriesEnd={onClose}
            onStoryEnd={(s: number, st: any) => {
              console.log('[StoryViewPopup] Story ended:', s, st)
            }}
            onStoryStart={(s: number, st: any) => {
              console.log('[StoryViewPopup] Story started:', s, st)
              setCurrentStoryIndex(s)
            }}
            keyboardNavigation
            isPaused={false}
            storyStyles={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
            storyContainerStyles={{
              maxWidth: '500px',
              margin: '0 auto'
            }}
          />
        </div>
      </div>
    )
  }

  // Desktop version - custom viewer
  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[210] p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      {/* Navigation Buttons */}
      {currentStoryIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handlePrevious()
          }}
          className="absolute left-4 z-[210] p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
        >
          <ChevronLeftIcon className="w-8 h-8" />
        </button>
      )}

      {currentStoryIndex < stories.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleNext()
          }}
          className="absolute right-4 z-[210] p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
        >
          <ChevronRightIcon className="w-8 h-8" />
        </button>
      )}

      {/* Story Content */}
      <div 
        className="relative flex flex-col"
        style={{
          maxHeight: '90vh',
          height: '90vh',
          maxWidth: '500px',
          width: '500px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-[205] flex gap-1 p-2">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width: index < currentStoryIndex 
                    ? '100%' 
                    : index === currentStoryIndex 
                    ? `${progress}%` 
                    : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header - мемоизированный */}
        {DesktopHeader}

        {/* Media */}
        <div 
          className="relative bg-black overflow-hidden"
          style={{
            borderRadius: '16px',
            height: '100%'
          }}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {currentStory.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="w-full h-full object-contain"
              autoPlay
              loop
              playsInline
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}

          {/* Emotion Button - Bottom Left */}
          <div className="absolute bottom-4 left-4 z-[206]" ref={emotionContainerRef}>
            {(() => {
              const emotionCounts = getEmotionCounts()
              const hasEmotions = Object.keys(emotionCounts).length > 0
              const userEmotionId = currentStory.userEmotion?.emotionId || null

              if (hasEmotions) {
                // Показываем эмоции с количеством
                return (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {EMOTIONS.map((emotion) => {
                      const count = emotionCounts[emotion.id]
                      if (!count || count === 0) return null
                      
                      const isUserEmotion = userEmotionId === emotion.id
                      
                      return (
                        <button
                          key={emotion.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowEmotionPicker(!showEmotionPicker)
                          }}
                          disabled={emotionProcessing}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-full transition-all backdrop-blur-md',
                            'bg-black/50 hover:bg-black/70',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            isUserEmotion && 'ring-2 ring-white/50'
                          )}
                        >
                          <span className="text-xl">{emotion.emoji}</span>
                          <span className="text-sm font-medium text-white">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              } else {
                // Показываем обычную кнопку лайка
                return (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!user?.wallet) {
                        toast.error('Подключите кошелек для реакций')
                        return
                      }
                      setShowEmotionPicker(!showEmotionPicker)
                    }}
                    disabled={emotionProcessing}
                    className={cn(
                      'p-3 rounded-full transition-all backdrop-blur-md',
                      'bg-black/50 hover:bg-black/70',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                )
              }
            })()}

            {/* Emotion picker popup */}
            {showEmotionPicker && (
              <div
                ref={emotionPickerRef}
                className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex gap-1">
                  {EMOTIONS.map((emotion) => {
                    const isSelected = currentStory.userEmotion?.emotionId === emotion.id
                    return (
                      <button
                        key={emotion.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEmotionSelect(emotion.id)
                        }}
                        disabled={emotionProcessing}
                        className={cn(
                          'relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
                          emotion.color,
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          isSelected && 'ring-2 ring-red-500 dark:ring-red-400'
                        )}
                        title={emotion.label}
                      >
                        <span className="text-2xl">{emotion.emoji}</span>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 text-center mt-1 px-2">
                  Выберите эмоцию
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

