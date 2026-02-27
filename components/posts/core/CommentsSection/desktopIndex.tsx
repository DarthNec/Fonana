'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/store/appStore'
import toast from 'react-hot-toast'
import Avatar from '@/components/Avatar'
import EmojiPicker from 'emoji-picker-react'

// Типы эмоций (такие же как в PostActions)
const EMOTIONS = [
  { id: 1, emoji: '😂', label: 'Смешно', color: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20' },
  { id: 2, emoji: '🤡', label: 'Клоун', color: 'hover:bg-purple-50 dark:hover:bg-purple-900/20' },
  { id: 3, emoji: '🔥', label: 'Огонь', color: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' },
  { id: 4, emoji: '💩', label: 'Какашка', color: 'hover:bg-amber-50 dark:hover:bg-amber-900/20' },
  { id: 5, emoji: '❤️', label: 'Сердечко', color: 'hover:bg-red-50 dark:hover:bg-red-900/20' },
  { id: 6, emoji: '👍', label: 'Палец вверх', color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
]

export interface CommentEmotion {
  id: string
  userId: string
  commentId: string
  emotionId: number
  createdAt: string
}

export interface Comment {
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
  parentId?: string
  replies?: Comment[]
  emotions?: CommentEmotion[]
  userEmotion?: CommentEmotion
}

export interface CommentsSectionProps {
  postId: string
  post: any
  className?: string
  onClose?: () => void
  onCommentAdded?: () => void
  onCommentDeleted?: () => void
  hideHeader?: boolean // Скрыть заголовок и кнопку закрытия
  formAtBottom?: boolean // Форма внизу вместо вверху
  hideFormAvatar?: boolean // Скрыть аватар в форме
}

/**
 * Десктопная версия компонента для отображения и добавления комментариев
 */
export function CommentsSection({ 
  postId, 
  post, 
  className, 
  onClose, 
  onCommentAdded, 
  onCommentDeleted,
  hideHeader = false,
  formAtBottom = false,
  hideFormAvatar = false
}: CommentsSectionProps) {
  const user = useUser()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Состояния для emotion picker
  const [showEmotionPicker, setShowEmotionPicker] = useState<string | null>(null) // ID комментария
  const [emotionProcessing, setEmotionProcessing] = useState<string | null>(null)
  const emotionPickerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const emotionContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  
  // ✅ FIX: Ref для контейнера списка комментариев (для предотвращения event propagation)
  const commentsListRef = useRef<HTMLDivElement>(null)

  // Функции для работы с развернутыми комментариями
  const toggleCommentExpansion = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const getDisplayText = (content: string, commentId: string) => {
    const isExpanded = expandedComments.has(commentId)
    if (content.length <= 150 || isExpanded) {
      return content
    }
    return content.substring(0, 150) + '...'
  }

  // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: предотвращаем React Error #185
  // Комментарии доступны всем, но форма добавления только авторизованным
  // НЕ возвращаем null, так как комментарии должны быть видны всем
  
  // Загрузка комментариев
  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      // Добавляем userId в query параметры если пользователь авторизован
      const url = user?.id 
        ? `/api/posts/${postId}/comments?userId=${user.id}`
        : `/api/posts/${postId}/comments`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
      toast.error('Ошибка загрузки комментариев')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim()) return
    if (!user?.id) {
      toast.error('Подключите кошелек для комментирования')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          content: newComment.trim(),
          isAnonymous
        })
      })

      if (response.ok) {
        setNewComment('')
        setIsAnonymous(false)
        await fetchComments()
        toast.success('Comment added')
        console.log('post', post);
        onCommentAdded?.()
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

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) {
      toast.error('Подключите кошелек для удаления комментария')
      return
    }

    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
      return
    }

    try {
      const response = await fetch(`/api/posts/${postId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (response.ok) {
        await fetchComments()
        toast.success('Комментарий удален')
        onCommentDeleted?.()
      } else {
        throw new Error('Failed to delete comment')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error('Ошибка при удалении комментария')
    }
  }

  const formatDate = (dateString: string) => {
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

  // Обработчик выбора эмодзи
  const handleEmojiClick = (emojiData: any) => {
    const emojiText = emojiData.emoji
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = newComment
      const newText = text.substring(0, start) + emojiText + text.substring(end)
      if (newText.length <= 300) {
        setNewComment(newText)
        // Устанавливаем курсор после вставленного эмодзи
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start + emojiText.length, start + emojiText.length)
        }, 0)
      }
    }
    setShowEmojiPicker(false)
  }

  // Закрытие пикера при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  // Закрытие emotion picker при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showEmotionPicker) return
      
      const pickerEl = emotionPickerRefs.current[showEmotionPicker]
      const containerEl = emotionContainerRefs.current[showEmotionPicker]
      
      if (
        pickerEl && !pickerEl.contains(event.target as Node) &&
        containerEl && !containerEl.contains(event.target as Node)
      ) {
        setShowEmotionPicker(null)
      }
    }

    if (showEmotionPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmotionPicker])

  // ✅ FIX: Предотвращаем propagation wheel events из списка комментариев
  // Без этого wheel события "всплывают" до FullscreenCarousel и вызывают переключение постов
  useEffect(() => {
    const commentsListEl = commentsListRef.current
    if (!commentsListEl) return
    
    const handleWheel = (e: WheelEvent) => {
      // Останавливаем propagation, чтобы FullscreenCarousel не перехватывал wheel events
      e.stopPropagation()
      
      // НЕ вызываем preventDefault() - позволяем нормальный скролл комментариев
    }
    
    commentsListEl.addEventListener('wheel', handleWheel, {
      passive: false // Нужно для stopPropagation в некоторых браузерах
    })
    
    return () => {
      commentsListEl.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Обработчик выбора эмоции для комментария
  const handleCommentEmotionSelect = async (commentId: string, emotionId: number) => {
    if (!user?.wallet) {
      toast.error('Подключите кошелек для реакций')
      return
    }

    if (emotionProcessing === commentId) return

    try {
      setEmotionProcessing(commentId)
      
      const response = await fetch(`/api/comments/${commentId}/emotion`, {
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
      
      // Обновляем локальное состояние комментариев
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id !== commentId) return comment

          const emotions = comment.emotions || []
          let newEmotions = [...emotions]
          
          if (data.action === 'removed') {
            // Удаляем эмоцию
            newEmotions = newEmotions.filter(e => !(e.userId === user.id && e.emotionId === emotionId))
            return {
              ...comment,
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
              commentId,
              emotionId,
              createdAt: new Date().toISOString()
            })
            
            return {
              ...comment,
              emotions: newEmotions,
              userEmotion: {
                id: data.emotion?.id || '',
                userId: user.id,
                commentId,
                emotionId,
                createdAt: new Date().toISOString()
              }
            }
          }
        })
      )

      // Закрываем picker через небольшую задержку
      setTimeout(() => {
        setShowEmotionPicker(null)
      }, 500)

    } catch (error) {
      console.error('Error updating comment emotion:', error)
      toast.error('Ошибка при обновлении реакции')
    } finally {
      setTimeout(() => {
        setEmotionProcessing(null)
      }, 300)
    }
  }

  // Получение количества эмоций для комментария
  const getEmotionCounts = (comment: Comment): Record<number, number> => {
    const counts: Record<number, number> = {}
    if (!comment.emotions || comment.emotions.length === 0) return counts
    
    comment.emotions.forEach(emotion => {
      counts[emotion.emotionId] = (counts[emotion.emotionId] || 0) + 1
    })
    
    return counts
  }

  // Форма комментария
  const commentForm = user && (
    <form 
      onSubmit={handleSubmit} 
      className={cn(
        formAtBottom 
          ? 'border-t border-gray-200 dark:border-slate-700 pt-4 pb-4 bg-white dark:bg-slate-900 flex-shrink-0' 
          : 'mb-4'
      )}
    >
      <div className={cn(
        hideFormAvatar ? '' : 'flex gap-3'
      )}>
        {!hideFormAvatar && (
          <Avatar
            src={user.avatar}
            alt="Your avatar"
            seed={user.nickname || user.id}
            size={40}
            className="flex-shrink-0"
            rounded="full"
          />
        )}
        <div className={cn(hideFormAvatar ? 'w-full' : 'flex-1')}>
              {/* Контейнер для textarea с кнопкой эмодзи */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => {
                    if (e.target.value.length <= 300) {
                      setNewComment(e.target.value)
                    }
                  }}
                  placeholder="Type your comment..."
                  className="w-full px-4 py-2 pr-12 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400"
                  rows={3}
                  maxLength={300}
                />
                {/* Кнопка эмодзи - внутри textarea справа снизу */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowEmojiPicker(!showEmojiPicker)
                  }}
                  className="absolute right-3 bottom-3 p-1 text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors rounded hover:bg-gray-200/50 dark:hover:bg-slate-700/50"
                  title="Добавить эмодзи"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                {/* Эмодзи пикер */}
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef}
                    className={cn(
                      "absolute right-0 z-[9999]",
                      // На мобильном - вверх, на desktop - вниз
                      "max-md:bottom-full max-md:mb-2",
                      "md:top-full md:mt-2"
                    )}
                  >
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      width={350}
                      height={400}
                    />
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                    />
                    Anonymous
                  </label>
                  <span className={`text-xs ${newComment.length > 300 ? 'text-red-500' : 'text-gray-500 dark:text-slate-400'}`}>
                    {newComment.length}/300
                  </span>
                </div>
                {newComment.length <= 300 && (
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? 'Sending...' : 'Send'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
  )
  
  return (
    <div className={cn(
      formAtBottom ? 'flex flex-col h-full' : 'border-t border-gray-200 dark:border-slate-700/50 pt-4 pb-4',
      'px-3 sm:px-6',
      className
    )}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Comments ({comments.length})
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Comment form at top (if not formAtBottom) */}
      {!formAtBottom && commentForm}

      {/* Comments list */}
      <div 
        ref={commentsListRef}
        className={cn(
          'space-y-4',
          formAtBottom ? 'flex-1 overflow-y-auto pt-4' : ''
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600 dark:text-slate-400 text-sm">Loading comments...</p>
            </div>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-slate-400 py-8">
            No comments yet. Be the first!
          </p>
        ) : (
          comments.map((comment) => (
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
                <div className="bg-gray-100 dark:bg-slate-800 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {comment.isAnonymous ? 'Аноним' : comment.user.fullName || comment.user.nickname || 'Пользователь'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 dark:text-slate-300 break-words whitespace-pre-wrap overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {getDisplayText(comment.content, comment.id)}
                    </p>
                    {comment.content.length > 150 && (
                      <button
                        onClick={() => toggleCommentExpansion(comment.id)}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mt-1 font-medium transition-colors"
                      >
                        {expandedComments.has(comment.id) ? 'Свернуть' : 'Развернуть'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  {/* Emotion button with picker */}
                  <div className="relative" ref={el => { emotionContainerRefs.current[comment.id] = el }}>
                    {(() => {
                      const emotionCounts = getEmotionCounts(comment)
                      const hasEmotions = Object.keys(emotionCounts).length > 0
                      const userEmotionId = comment.userEmotion?.emotionId || null

                      if (hasEmotions) {
                        // Показываем эмоции с количеством
                        return (
                          <div className="flex items-center gap-1">
                            {EMOTIONS.map((emotion) => {
                              const count = emotionCounts[emotion.id]
                              if (!count || count === 0) return null
                              
                              const isUserEmotion = userEmotionId === emotion.id
                              
                              return (
                                <button
                                  key={emotion.id}
                                  onClick={() => setShowEmotionPicker(comment.id)}
                                  disabled={emotionProcessing === comment.id}
                                  className={cn(
                                    'flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all text-xs',
                                    emotion.color,
                                    'hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed',
                                    isUserEmotion && 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800'
                                  )}
                                >
                                  <span className="text-sm">{emotion.emoji}</span>
                                  <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{count}</span>
                                </button>
                              )
                            })}
                          </div>
                        )
                      } else {
                        // Показываем обычную кнопку лайка
                        return (
                          <button
                            onClick={() => setShowEmotionPicker(comment.id)}
                            disabled={emotionProcessing === comment.id}
                            className="text-xs text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        )
                      }
                    })()}

                    {/* Emotion picker popup */}
                    {showEmotionPicker === comment.id && (
                      <div
                        ref={el => { emotionPickerRefs.current[comment.id] = el }}
                        className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                      >
                        <div className="flex gap-1">
                          {EMOTIONS.map((emotion) => {
                            const isSelected = comment.userEmotion?.emotionId === emotion.id
                            return (
                              <button
                                key={emotion.id}
                                onClick={() => handleCommentEmotionSelect(comment.id, emotion.id)}
                                disabled={emotionProcessing === comment.id}
                                className={cn(
                                  'relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
                                  emotion.color,
                                  'disabled:opacity-50 disabled:cursor-not-allowed',
                                  isSelected && 'ring-2 ring-red-500 dark:ring-red-400'
                                )}
                                title={emotion.label}
                              >
                                <span className="text-xl">{emotion.emoji}</span>
                                {isSelected && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center">
                                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 text-center mt-1 px-2">
                          Select emotion
                        </div>
                      </div>
                    )}
                  </div>
                  {comment.userId === user?.id && (
                    <button 
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center gap-1"
                      title="Удалить комментарий"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Удалить
                    </button>
                  )}
                  {/* 
                  <button className="text-xs text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                    Ответить
                  </button>
                  */}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Comment form at bottom (if formAtBottom) */}
      {formAtBottom && commentForm}
    </div>
  )
}

