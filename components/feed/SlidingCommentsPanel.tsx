'use client'

import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { CommentsSection } from '@/components/posts/core/CommentsSection/desktopIndex'
import { cn } from '@/lib/utils'
import { UnifiedPost } from '@/types/posts'

interface SlidingCommentsPanelProps {
  isOpen: boolean
  onClose: () => void
  post: UnifiedPost
}

/**
 * Выдвигающаяся панель комментариев (slide-up from bottom)
 * Располагается между левым навбаром и контентом
 */
export function SlidingCommentsPanel({ isOpen, onClose, post }: SlidingCommentsPanelProps) {
  // Блокируем скролл body когда панель открыта
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Оверлей для закрытия при клике вне панели */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 max-md:z-[54]"
        onClick={onClose}
        style={{
          animation: 'fadeIn 0.2s ease-out'
        }}
      />
      
      {/* Панель комментариев - между навбаром и контентом */}
      <div 
        className={cn(
          'fixed bottom-0 left-0 md:left-[220px]',
          'w-full md:w-[400px] lg:w-[450px]',
          'h-screen',
          'bg-white dark:bg-slate-900',
          'shadow-2xl',
          'z-50 max-md:z-[55]',
          'flex flex-col',
          'border-r border-gray-200 dark:border-slate-700'
        )}
        style={{
          animation: 'slideUpFromBottom 0.3s ease-out'
        }}
      >
        {/* Header панели */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Комментарии
            {post.engagement.comments > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-slate-400">
                ({post.engagement.comments})
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-700 dark:text-slate-300" />
          </button>
        </div>

        {/* Контент панели - CommentsSection */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CommentsSection
            postId={post.id}
            post={post}
            hideHeader={true}
            formAtBottom={true}
            hideFormAvatar={true}
            className="flex-1 flex flex-col overflow-hidden"
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUpFromBottom {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}

