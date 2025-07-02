'use client'

import React, { useState, useEffect } from 'react'
import { UnifiedPost, PostAction, PostCardVariant } from '@/types/posts'
import { cn } from '@/lib/utils'

export interface PostActionsProps {
  post: UnifiedPost
  onAction?: (action: PostAction) => void
  variant?: PostCardVariant
  className?: string
}

/**
 * Компонент для отображения действий с постом (лайки, комментарии, поделиться)
 */
export function PostActions({
  post,
  onAction,
  variant = 'full',
  className
}: PostActionsProps) {
  const [optimisticLikes, setOptimisticLikes] = useState(post.engagement.likes)
  const [isLiked, setIsLiked] = useState(post.engagement.isLiked)
  const [isProcessing, setIsProcessing] = useState(false)

  // Обновляем локальное состояние при изменении пропсов
  useEffect(() => {
    setOptimisticLikes(post.engagement.likes)
    setIsLiked(post.engagement.isLiked)
  }, [post.engagement.likes, post.engagement.isLiked])

  // Unified icon and text sizes
  const iconSize = 'w-5 h-5'
  const buttonSize = 'p-2'
  const textSize = 'text-sm'

  const handleLike = () => {
    if (!onAction || isProcessing) return

    setIsProcessing(true)
    const newIsLiked = !isLiked
    const newLikeCount = newIsLiked 
      ? optimisticLikes + 1 
      : Math.max(0, optimisticLikes - 1)

    // Optimistic update
    setIsLiked(newIsLiked)
    setOptimisticLikes(newLikeCount)

    // Call action
    onAction({
      type: newIsLiked ? 'like' : 'unlike',
      postId: post.id
    })

    // Сбрасываем флаг обработки через небольшую задержку
    setTimeout(() => setIsProcessing(false), 1000)
  }

  const handleComment = () => {
    if (onAction) {
      onAction({ type: 'comment', postId: post.id })
    }
  }

  const handleShare = () => {
    if (onAction) {
      onAction({ type: 'share', postId: post.id })
    }
  }

  return (
    <div className={cn(
      'flex items-center justify-between',
      'pt-3 mt-3 border-t border-gray-100 dark:border-slate-800',
      className
    )}>
      <div className="flex items-center gap-6">
        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={isProcessing}
          className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className={cn(
            'rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors',
            buttonSize
          )}>
            {isLiked ? (
              <svg className={cn(iconSize, 'text-red-500 dark:text-red-400')} fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            ) : (
              <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </div>
          <span className={cn(
            textSize, 
            'font-medium group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors',
            'min-w-[1.5rem] text-center'
          )}>
            {optimisticLikes}
          </span>
        </button>

        {/* Comment button */}
        <button
          onClick={handleComment}
          className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group"
        >
          <div className={cn(
            'rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors',
            buttonSize
          )}>
            <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className={cn(textSize, 'font-medium group-hover:text-blue-500 dark:group-hover:text-blue-400')}>
            {post.engagement.comments}
          </span>
        </button>

        {/* View count */}
        <div className="flex items-center gap-2 text-gray-500 dark:text-slate-500">
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
    </div>
  )
} 