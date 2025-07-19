'use client'

import React, { useState } from 'react'
import { UnifiedPost, PostAction, PostPageVariant } from '@/types/posts'
import { PlayIcon, SpeakerXMarkIcon, EyeIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import MediaViewerModal from './MediaViewerModal'

export interface PostGalleryProps {
  posts: UnifiedPost[]
  variant?: PostPageVariant
  onAction?: (action: PostAction) => void
  className?: string
  columns?: number
}

/**
 * Компонент для отображения медиа постов в виде галереи квадратных плиток
 */
export function PostGallery({ 
  posts, 
  variant = 'feed', 
  onAction,
  className,
  columns = 3
}: PostGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Фильтруем только медиа посты с безопасной проверкой
  const mediaPosts = posts.filter(post => {
    const mediaType = post.media?.type || 'text'
    return ['image', 'video', 'audio'].includes(mediaType)
  })

  const handleTileClick = (index: number) => {
    setSelectedIndex(index)
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
      default: return 'grid-cols-2 md:grid-cols-3'
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
      <div className={cn('p-6', className)}>
        <div className={cn('grid gap-3', getGridClass())}>
          {mediaPosts.map((post, index) => (
            <MediaTile
              key={post.id}
              post={post}
              index={index}
              onClick={() => handleTileClick(index)}
              onAction={onAction}
            />
          ))}
        </div>
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
}

function MediaTile({ post, index, onClick, onAction }: MediaTileProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isLocked = post.access?.isLocked && !post.access?.isPurchased && !post.access?.isSubscribed && !post.access?.hasAccess
  const thumbnail = post.media?.thumbnail || post.media?.url || '/placeholder.webp'
  
  return (
    <div 
      className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer group hover:scale-105 transition-transform duration-200"
      onClick={onClick}
    >
      {/* Media Content */}
      {post.media?.type === 'image' && (
        <>
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
          )}
          <img
            src={thumbnail}
            alt={post.content?.title || 'Media'}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
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
              'w-full h-full object-cover',
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
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <SpeakerXMarkIcon className="w-12 h-12 text-white" />
          </div>
        </>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

      {/* Lock Icon */}
      {isLocked && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}

      {/* Views Counter */}
      <div className="absolute bottom-2 left-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-black/60 rounded-full text-white text-xs">
          <EyeIcon className="w-3 h-3" />
          <span>{post.engagement?.views || 0}</span>
        </div>
      </div>
    </div>
  )
} 