'use client'

import React, { useState, useRef, useEffect } from 'react'
import { UnifiedPost, PostAction } from '@/types/posts'
import { useUserContext } from '@/lib/contexts/UserContext'
import { cn } from '@/lib/utils'
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  FlagIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline'

export interface PostMenuProps {
  post: UnifiedPost
  onAction?: (action: PostAction) => void
  className?: string
}

/**
 * Меню управления постом
 * Показывает опции редактирования и удаления для автора
 * Опции шаринга и жалобы для остальных
 */
export function PostMenu({ post, onAction, className }: PostMenuProps) {
  const { user } = useUserContext()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Проверяем, является ли пользователь автором
  // Убеждаемся, что все данные существуют
  const isCreator = Boolean(
    user?.id && 
    post?.creator?.id && 
    user.id === post.creator.id
  )
  
  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }
  
  const handleAction = (type: PostAction['type']) => {
    setIsOpen(false)
    onAction?.({
      type,
      postId: post.id
    })
  }
  
  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <button
        onClick={handleMenuClick}
        className={cn(
          'p-2 rounded-lg transition-all duration-200',
          'text-gray-500 dark:text-slate-400',
          'hover:bg-gray-100 dark:hover:bg-slate-800',
          'hover:text-gray-700 dark:hover:text-slate-200',
          'focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
          isOpen && 'bg-gray-100 dark:bg-slate-800'
        )}
        aria-label="Post menu"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          'absolute right-0 z-50 mt-2 w-48',
          'bg-white dark:bg-slate-800',
          'rounded-xl shadow-lg',
          'border border-gray-200 dark:border-slate-700',
          'py-1',
          'animate-fade-in'
        )}>
          {isCreator ? (
            <>
              {/* Creator actions */}
              <button
                onClick={() => handleAction('edit')}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-2.5',
                  'text-gray-700 dark:text-slate-300',
                  'hover:bg-gray-100 dark:hover:bg-slate-700/50',
                  'transition-colors'
                )}
              >
                <PencilIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Edit Post</span>
              </button>
              
              <button
                onClick={() => handleAction('delete')}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-2.5',
                  'text-red-600 dark:text-red-400',
                  'hover:bg-red-50 dark:hover:bg-red-900/20',
                  'transition-colors'
                )}
              >
                <TrashIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Delete Post</span>
              </button>
            </>
          ) : (
            <>
              {/* Viewer actions */}
              <button
                onClick={() => handleAction('share')}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-2.5',
                  'text-gray-700 dark:text-slate-300',
                  'hover:bg-gray-100 dark:hover:bg-slate-700/50',
                  'transition-colors'
                )}
              >
                <ShareIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Share</span>
              </button>
              
              <button
                onClick={() => handleAction('bookmark')}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-2.5',
                  'text-gray-700 dark:text-slate-300',
                  'hover:bg-gray-100 dark:hover:bg-slate-700/50',
                  'transition-colors'
                )}
              >
                <BookmarkIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Save</span>
              </button>
              
              <div className="my-1 h-px bg-gray-200 dark:bg-slate-700" />
              
              <button
                onClick={() => handleAction('report')}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-2.5',
                  'text-red-600 dark:text-red-400',
                  'hover:bg-red-50 dark:hover:bg-red-900/20',
                  'transition-colors'
                )}
              >
                <FlagIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Report</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
} 