'use client'

import React, { useState, useRef, useEffect } from 'react'
import { UnifiedPost, PostAction, PostPageVariant } from '@/types/posts'
import { PlayIcon, SpeakerXMarkIcon, EyeIcon, EllipsisVerticalIcon, ShareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import MediaViewerModal from './MediaViewerModal'
import { useUser } from '@/lib/store/appStore'

export interface PostGalleryProps {
  posts: UnifiedPost[]
  variant?: PostPageVariant
  onAction?: (action: PostAction) => void
  onPostClick?: (postIndex: number, post: UnifiedPost) => void
  className?: string
  columns?: number
  showUsername?: boolean
}

/**
 * Компонент для отображения медиа постов в виде галереи квадратных плиток
 */
export function PostGallery({ 
  posts, 
  variant = 'feed', 
  onAction,
  onPostClick,
  className,
  columns = 3,
  showUsername = false
}: PostGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Фильтруем только медиа посты с безопасной проверкой
  const mediaPosts = posts.filter(post => {
    const mediaType = post.media?.type || 'text'
    return ['image', 'video', 'audio'].includes(mediaType)
  })

  const handleTileClick = (index: number) => {
    // Если есть onPostClick callback, используем fullscreen режим
    if (onPostClick) {
      // Находим реальный индекс в исходном массиве posts
      const post = mediaPosts[index]
      const realIndex = posts.findIndex(p => p.id === post.id)
      onPostClick(realIndex, post)
    } else {
      // Иначе используем встроенный MediaViewerModal
      setSelectedIndex(index)
    }
  }

  const handleCloseModal = () => {
    setSelectedIndex(null)
  }

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < mediaPosts.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const getGridClass = () => {
    switch (columns) {
      case 2: return 'grid-cols-2'
      case 4: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      case 5: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      default: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    }
  }

  if (mediaPosts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <EyeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No media content</p>
        <p className="text-sm">This creator hasn't shared any images, videos, or audio yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className={cn('grid gap-3', getGridClass(), className)}>
        {mediaPosts.map((post, index) => (
          <MediaTile
            key={post.id}
            post={post}
            index={index}
            onClick={() => handleTileClick(index)}
            onAction={onAction}
            showUsername={showUsername}
          />
        ))}
      </div>

      {/* Media Viewer Modal */}
      {selectedIndex !== null && (
        <MediaViewerModal
          posts={mediaPosts}
          currentIndex={selectedIndex}
          onClose={handleCloseModal}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onAction={onAction}
        />
      )}
    </>
  )
}

interface MediaTileProps {
  post: UnifiedPost
  index: number
  onClick: () => void
  onAction?: (action: PostAction) => void
  showUsername?: boolean
}

function MediaTile({ post, index, onClick, onAction, showUsername = false }: MediaTileProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const user = useUser()

  const isLocked = post.access?.isLocked && !post.access?.isPurchased && !post.access?.isSubscribed && !post.access?.hasAccess
  const isCreator = Boolean(user?.id && post?.creator?.id && user.id === post.creator.id)

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMenuOpen(!isMenuOpen)
  }

  const handleAction = (type: PostAction['type'], e?: React.MouseEvent) => {
    e?.stopPropagation() // Останавливаем всплытие, чтобы не открывался пост
    setIsMenuOpen(false)
    
    onAction?.({
      type,
      postId: post.id
    })
  }
  // Для видео используем preview, если оно есть
  const thumbnail = post.media?.type === 'video' 
    ? (post.media?.preview?.startsWith('https://fonanastorage.b-cdn.net/') ? post.media.preview : post.media?.thumbnail || post.media?.url || '/placeholder.webp')
    : (post.media?.thumbnail || post.media?.url || '/placeholder.webp')
  
  return (
    <div 
      className="relative aspect-[4/5] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer group hover:scale-105 transition-transform duration-200 flex flex-col"
      onClick={onClick}
    >
      {/* Media Content Container */}
      <div className="flex-1 relative">
      {post.media?.type === 'image' && (
        <>
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
          )}
          <img
            src={thumbnail}
            alt={post.content?.title || 'Media'}
            className={cn(
                'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
              imageLoaded ? 'opacity-100' : 'opacity-0',
              isLocked && 'blur-md'
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        </>
      )}

      {post.media?.type === 'video' && (
        <>
          <img
            src={thumbnail}
            alt={post.content?.title || 'Video'}
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              isLocked && 'blur-md'
            )}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center group-hover:bg-black/80 transition-colors">
              <PlayIcon className="w-6 h-6 text-white ml-1" />
            </div>
          </div>
        </>
      )}

      {post.media?.type === 'audio' && (
        <>
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <SpeakerXMarkIcon className="w-12 h-12 text-white" />
          </div>
        </>
      )}


      {/* Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

      {/* Locked Content Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-2">
          {/* Creator Avatar */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white overflow-hidden mb-2 shadow-lg">
            {post.creator?.avatar ? (
              <img 
                src={post.creator.avatar} 
                alt={post.creator.name || post.creator.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                {(post.creator?.name || post.creator?.nickname || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Action Button - opens post on click */}
          <button
            onClick={onClick}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:scale-105 transform flex items-center gap-1"
          >
            {post.access?.price || post.commerce?.isSellable ? (
              <>
                <span>Unlock</span>
                <span className="font-bold">{post.access?.price?.toFixed(2)} SOL</span>
              </>
            ) : (
              <span>Subscribe</span>
            )}
          </button>
        </div>
      )}

      {/* Menu Button */}
      {!isLocked && (
        <div ref={menuRef} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleMenuClick}
            className="w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label="Post menu"
          >
            <EllipsisVerticalIcon className="w-5 h-5 text-white" />
          </button>
          
          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className={cn(
              'absolute right-0 z-50 mt-2 w-48',
              'bg-white dark:bg-slate-800',
              'rounded-xl shadow-lg',
              'border border-gray-200 dark:border-slate-700',
              'py-1',
              'animate-fade-in'
            )}>
              <button
                onClick={(e) => handleAction('share', e)}
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
              
              {isCreator && (
                <button
                  onClick={(e) => handleAction('delete', e)}
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
              )}
            </div>
          )}
        </div>
      )}

      {/* Views Counter - СКРЫТ */}
      {/*
      <div className="absolute bottom-2 left-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-black/60 rounded-full text-white text-xs">
          <EyeIcon className="w-3 h-3" />
          <span>{post.engagement?.views || 0}</span>
        </div>
      </div>
      */}
      </div>
      
      {/* Username блок (только для Explore) - ВНУТРИ карточки */}
      {showUsername && post.creator && (
        <div className="h-10 flex items-center gap-2 px-2 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
          {/* Avatar */}
          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
            {post.creator.avatar ? (
              <img 
                src={post.creator.avatar} 
                alt={post.creator.username || post.creator.nickname || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                {(post.creator.username || post.creator.nickname || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Username */}
          <span className="text-xs text-gray-900 dark:text-white font-medium truncate">
            @{post.creator.username || post.creator.nickname || 'unknown'}
          </span>
        </div>
      )}
    </div>
  )
} 