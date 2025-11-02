'use client'

import React, { useState, useEffect, useRef } from 'react'
import { UnifiedPost, PostAction, PostCardVariant } from '@/types/posts'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export interface PostActionsProps {
  post: UnifiedPost
  commentCount?: number
  onAction?: (action: PostAction) => void
  variant?: PostCardVariant
  className?: string
  overlay?: boolean // Для Instagram-style на темном фоне
}

// Типы эмоций
const EMOTIONS = [
  { id: 1, emoji: '😂', label: 'Смешно', color: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20' },
  { id: 2, emoji: '🤡', label: 'Клоун', color: 'hover:bg-purple-50 dark:hover:bg-purple-900/20' },
  { id: 3, emoji: '🔥', label: 'Огонь', color: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' },
  { id: 4, emoji: '💩', label: 'Какашка', color: 'hover:bg-amber-50 dark:hover:bg-amber-900/20' },
  { id: 5, emoji: '❤️', label: 'Сердечко', color: 'hover:bg-red-50 dark:hover:bg-red-900/20' },
  { id: 6, emoji: '👍', label: 'Палец вверх', color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
]

/**
 * Компонент для отображения действий с постом (лайки, комментарии, поделиться)
 */
export function PostActions({
  post,
  commentCount,
  onAction,
  variant = 'full',
  className,
  overlay = false
}: PostActionsProps) {
  const [optimisticLikes, setOptimisticLikes] = useState(post.engagement.likes)
  const [isLiked, setIsLiked] = useState(post.engagement.isLiked)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showEmotionPicker, setShowEmotionPicker] = useState(false)
  
  // Локальное состояние для мгновенного отображения эмоций
  const [localUserEmotionId, setLocalUserEmotionId] = useState<number | null>(
    post.userEmotion?.emotionId || null
  )
  const [localEmotionCounts, setLocalEmotionCounts] = useState<Record<number, number>>(() => {
    if (!post.emotions || post.emotions.length === 0) return {}
    
    const counts: Record<number, number> = {}
    post.emotions.forEach(emotion => {
      counts[emotion.emotionId] = (counts[emotion.emotionId] || 0) + 1
    })
    
    return counts
  })
  
  const isMountedRef = useRef(true)
  const emotionContainerRef = useRef<HTMLDivElement>(null)
  const emotionPickerRef = useRef<HTMLDivElement>(null)
  
  console.log('[PostActions] Rendering:', {
    postId: post.id,
    emotionsCount: post.emotions?.length,
    userEmotionId: post.userEmotion?.emotionId,
    localUserEmotionId,
    localEmotionCounts
  });
  
  // Синхронизация с post.emotions при изменении (от API)
  useEffect(() => {
    console.log('[PostActions] Syncing with post.emotions:', post.emotions?.length, 'userEmotion:', post.userEmotion?.emotionId)
    
    const counts: Record<number, number> = {}
    if (post.emotions && post.emotions.length > 0) {
      post.emotions.forEach(emotion => {
        counts[emotion.emotionId] = (counts[emotion.emotionId] || 0) + 1
      })
    }
    setLocalEmotionCounts(counts)
    setLocalUserEmotionId(post.userEmotion?.emotionId || null)
    
    console.log('[PostActions] Updated localUserEmotionId to:', post.userEmotion?.emotionId || null)
  }, [post.emotions, post.userEmotion?.emotionId, post.emotionsCount])
  
  // Определяем, есть ли эмоции на посте (используем локальное состояние)
  const hasEmotions = Object.keys(localEmotionCounts).length > 0
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Обновляем локальное состояние при изменении пропсов
  useEffect(() => {
    setOptimisticLikes(post.engagement.likes)
    setIsLiked(post.engagement.isLiked)
    console.log(`Post engagement`, post);
  }, [post.engagement.likes, post.engagement.isLiked])

  // Закрытие popup при клике вне его
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

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmotionPicker])

  // Unified icon and text sizes
  const iconSize = 'w-5 h-5'
  const buttonSize = 'p-2'
  const textSize = 'text-sm'

  const handleLikeButtonClick = () => {
    // Открываем/закрываем выбор эмоций
    setShowEmotionPicker(!showEmotionPicker)
  }

  const handleEmotionSelect = (emotionId: number) => {
    if (!onAction || isProcessing) return

    setIsProcessing(true)
    
    // Локальное обновление состояния для мгновенного отклика
    const newCounts = { ...localEmotionCounts }
    
    if (localUserEmotionId === emotionId) {
      // Убираем эмоцию (toggle off - выбрана та же самая)
      console.log('[PostActions] Removing emotion:', emotionId)
      
      if (newCounts[emotionId]) {
        newCounts[emotionId] = Math.max(0, newCounts[emotionId] - 1)
        if (newCounts[emotionId] === 0) {
          delete newCounts[emotionId]
        }
      }
      
      setLocalUserEmotionId(null)
      setLocalEmotionCounts(newCounts)
      
      onAction({
        type: 'remove-emotion',
        postId: post.id,
        emotionId
      })
      
    } else if (localUserEmotionId !== null && localUserEmotionId !== emotionId) {
      // Заменяем эмоцию (выбрана другая)
      console.log('[PostActions] Updating emotion from', localUserEmotionId, 'to', emotionId)
      
      // Убираем старую
      if (newCounts[localUserEmotionId]) {
        newCounts[localUserEmotionId] = Math.max(0, newCounts[localUserEmotionId] - 1)
        if (newCounts[localUserEmotionId] === 0) {
          delete newCounts[localUserEmotionId]
        }
      }
      
      // Добавляем новую
      newCounts[emotionId] = (newCounts[emotionId] || 0) + 1
      
      setLocalUserEmotionId(emotionId)
      setLocalEmotionCounts(newCounts)
      
      onAction({
        type: 'add-emotion',
        postId: post.id,
        emotionId
      })

      setIsProcessing(false)
    } else {
      // Добавляем эмоцию (userEmotion нет)
      console.log('[PostActions] Adding emotion:', emotionId)
      
      newCounts[emotionId] = (newCounts[emotionId] || 0) + 1
      
      setLocalUserEmotionId(emotionId)
      setLocalEmotionCounts(newCounts)
      
      onAction({
        type: 'add-emotion',
        postId: post.id,
        emotionId
      })

      setIsProcessing(false)
    }

    // Сбрасываем флаг обработки
    setTimeout(() => {
      if (!isMountedRef.current) return
      setIsProcessing(false)
    }, 300)
    
    // Закрываем picker через небольшую задержку
    setTimeout(() => {
      setShowEmotionPicker(false)
    }, 500)
  }

  const handleComment = () => {
    if (onAction) {
      onAction({ type: 'comment', postId: post.id })
    }
  }

  const handleShare = () => {
    console.log('[PostActions] handleShare');
    if (onAction) {
      console.log('[PostActions] onAction');
      onAction({ type: 'share', postId: post.id })
    }
  }

  return (
    <div className={cn(
      'flex items-center justify-between',
      overlay ? '' : 'pt-3 mt-3 border-t border-gray-100 dark:border-slate-800',
      className
    )}>
      <div className="flex items-center gap-6">
        {/* Emotion button with picker */}
        <div className="relative" ref={emotionContainerRef}>
          {hasEmotions ? (
            // Показываем эмоции с количеством
            <div className="flex items-center gap-2">
              {EMOTIONS.map((emotion) => {
                const count = localEmotionCounts[emotion.id]
                if (!count || count === 0) return null
                
                // Проверяем, это эмоция текущего пользователя (используем локальное состояние)
                const isUserEmotion = localUserEmotionId === emotion.id
                
                console.log(`[PostActions] Emotion ${emotion.emoji} (id=${emotion.id}):`, {
                  count,
                  localUserEmotionId,
                  isUserEmotion
                })
                
                return (
                  <button
                    key={emotion.id}
                    onClick={handleLikeButtonClick}
                    disabled={isProcessing}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-lg transition-all',
                      overlay ? 'hover:bg-white/20 text-white' : emotion.color,
                      'text-gray-700 dark:text-slate-300',
                      'hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed',
                      isUserEmotion && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <span className="text-lg">{emotion.emoji}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            // Показываем обычную кнопку лайка
            <button
              onClick={handleLikeButtonClick}
              disabled={isProcessing}
              className={cn(
                'flex items-center gap-2 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed',
                overlay 
                  ? 'text-white hover:text-red-400' 
                  : 'text-gray-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400'
              )}
            >
              <div className={cn(
                'rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors',
                buttonSize
              )}>
                {localUserEmotionId !== null ? (
                  <svg className={cn(iconSize, 'text-red-500 dark:text-red-400')} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ) : (
                  <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
              </div>
              
            </button>
          )}

          {/* Emotion picker popup */}
          {showEmotionPicker && (
            <div
              ref={emotionPickerRef}
              className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex gap-1">
                {EMOTIONS.map((emotion) => {
                  const isSelected = localUserEmotionId === emotion.id
                  return (
                    <button
                      key={emotion.id}
                      onClick={() => handleEmotionSelect(emotion.id)}
                      disabled={isProcessing}
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

        {/* Comment button */}
        <button
          onClick={handleComment}
          className={cn(
            'flex items-center gap-2 transition-colors group',
            overlay
              ? 'text-white hover:text-blue-300'
              : 'text-gray-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'
          )}
        >
          <div className={cn(
            'rounded-lg transition-colors',
            overlay ? 'hover:bg-white/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
            buttonSize
          )}>
            <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className={cn(textSize, 'font-medium', overlay ? 'text-white' : 'group-hover:text-blue-500 dark:group-hover:text-blue-400')}>
            {commentCount ?? post.engagement.comments}
          </span>
        </button>

        {/* View count */}
        <div className={cn(
          'flex items-center gap-2',
          overlay ? 'text-white/80' : 'text-gray-500 dark:text-slate-500'
        )}>
          <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className={cn(textSize, 'font-medium')}>
            {post.engagement.views}
          </span>
        </div>
      </div>

      {/* Share button */}
      {/*
      <button
        onClick={handleShare}
        className="text-gray-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
      >
        <div className={cn(
          'rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors',
          buttonSize
        )}>
          <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.632 7.66a3 3 0 01-5.368 0m5.368 0c.202-.404.316-.86.316-1.342 0-1.104-.82-2.016-1.885-2.165m1.569 3.507a3 3 0 01-5.368 0m5.368 0c-.202.404-.316.86-.316 1.342a3 3 0 11-3-3c.482 0 .938.114 1.342.316m3.658-9.342a3 3 0 00-5.316 0" />
          </svg>
        </div>
      </button>
      */}
    </div>
  )
} 