'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/store/appStore'
import toast from 'react-hot-toast'
import Avatar from '@/components/Avatar'

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
}

export interface MobileCommentsSectionProps {
  postId: string
  post: any
  className?: string
  onClose?: () => void
  onCommentAdded?: () => void
  onCommentDeleted?: () => void
}

/**
 * Мобильная версия компонента для отображения и добавления комментариев
 * Отображается как фиксированная панель снизу экрана
 */
export function MobileCommentsSection({ postId, post, className, onClose, onCommentAdded, onCommentDeleted }: MobileCommentsSectionProps) {
  const user = useUser()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)

  // Загрузка комментариев
  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/posts/${postId}/comments`)
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
        toast.success('Комментарий добавлен')
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }

  return (
    <>
      {/* Backdrop - полупрозрачная область сверху */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60] sm:hidden"
        onClick={handleBackdropClick}
      />
      
      {/* Мобильная панель комментариев */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700/50 z-[70] sm:hidden',
        'h-[65vh] flex flex-col',
        className
      )}>
        {/* Header с кнопкой закрытия */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Комментарии ({comments.length})
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Прокручиваемая область с комментариями */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-slate-400 py-8">
              Пока нет комментариев. Будьте первым!
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
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                      {comment.content}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <button className="text-xs text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {comment.likesCount}
                    </button>
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
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Форма добавления комментария - фиксированная внизу */}
        {user && (
          <div className="border-t border-gray-200 dark:border-slate-700/50 p-4 bg-white dark:bg-slate-900">
            <form onSubmit={handleSubmit}>
              <div className="flex gap-3">
                <Avatar
                  src={user.avatar}
                  alt="Your avatar"
                  seed={user.nickname || user.id}
                  size={40}
                  className="flex-shrink-0"
                  rounded="full"
                />
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Написать комментарий..."
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400"
                    rows={2}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                      />
                      Анонимно
                    </label>
                    <button
                      type="submit"
                      disabled={!newComment.trim() || isSubmitting}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSubmitting ? 'Отправка...' : 'Отправить'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
