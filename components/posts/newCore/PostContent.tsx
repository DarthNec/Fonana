'use client'

import { useState, useRef } from 'react'
import { UnifiedPost, PostAction } from '@/types/posts'
import { cn } from '@/lib/utils'
import { VerticalActions } from '@/components/feed/VerticalActions'
import RemixPostModal from '@/components/RemixPostModal'
import RemixImagePostModal from '@/components/RemixImagePostModal'
import { PostLocked } from '@/components/posts/core/PostLocked'
import { 
  needsPayment, 
  needsSubscription, 
  needsTierUpgrade,
  isPostSold 
} from '@/components/posts/utils/postHelpers'
import { useUser } from '@/lib/store/appStore'

interface PostContentProps {
  post: UnifiedPost
  onAction?: (action: PostAction) => void
  className?: string
}

/**
 * Новый формат PostContent для FullscreenPostCard
 * Контент слева, кнопки справа вплотную
 */
export function PostContent({ post, onAction, className }: PostContentProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [showRemixModal, setShowRemixModal] = useState(false)
  const [showRemixImageModal, setShowRemixImageModal] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isHorizontal, setIsHorizontal] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const handleVideoPlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleVideoClick()
  }

  // Определение ориентации изображения
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setIsHorizontal(img.naturalWidth > img.naturalHeight)
    setImageLoaded(true)
  }

  // Получаем текущего пользователя
  const user = useUser()
  
  // Проверяем, является ли текущий пользователь владельцем поста
  const isOwner = user?.id === post.creator.id
  
  // Проверка, нужно ли скрывать контент
  // Если пользователь владелец поста - контент всегда открыт
  const shouldHideContent = isOwner ? false : (
    post.access.shouldHideContent || 
    (post.access.isLocked && !post.access.isPurchased && !post.access.isSubscribed)
  )
  
  const isLocked = isOwner ? false : (
    needsPayment(post) || needsSubscription(post) || needsTierUpgrade(post)
  )
  const isSold = isPostSold(post.commerce)

  return (
    <div className={cn('flex flex-row items-center gap-4', className)}>
      {/* Контент (медиа) */}
      <div className={cn(
        'relative rounded-3xl md:rounded-3xl overflow-hidden inline-block',
        // Mobile: на весь экран без скруглений (BottomNav поверх)
        'max-md:rounded-none max-md:w-screen max-md:h-screen',
        // Для заблокированного контента используем средний размер (только desktop)
        (shouldHideContent || isLocked) ? (
          post.media.type === 'video' 
            ? 'md:h-[95vh] md:w-[800px]' 
            : 'md:h-[60vh] md:w-[600px]'
        ) : (
          // Для открытого контента применяем адаптивные размеры (только desktop)
          post.media.type === 'image' 
            ? (isHorizontal ? 'md:max-h-[44vh]' : 'md:max-h-[75vh]')
            : 'md:max-h-[95vh]'
        )
      )}>
        {/* Заблокированный контент */}
        {(shouldHideContent || isLocked) ? (
          <PostLocked
            post={post}
            onAction={onAction}
            variant="full"
            isOverlay={true}
          />
        ) : (
          <>
            {/* AI-Video в процессе генерации - вертикальный блок как изображение */}
            {post.media.type === 'ai-video' && !post.media.error && (
              <div className="w-[400px] h-[75vh] bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-white font-medium">AI Video Generation</p>
                </div>
              </div>
            )}

            {/* AI-Video генерация не удалась - вертикальный блок */}
            {post.media.type === 'ai-video' && post.media.error && (
              <div className="w-[400px] h-[75vh] bg-gradient-to-br from-red-500 to-pink-500 rounded-3xl flex items-center justify-center">
                <div className="text-center p-6">
                  <svg className="w-12 h-12 text-white mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-white font-medium mb-2">Generation Failed</p>
                  <p className="text-xs text-white/90 max-w-xs mx-auto">{post.media.error}</p>
                </div>
              </div>
            )}

           

            {/* Image */}
            {post.media.type === 'image' && post.media.url && (
          <>
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            )}
            <img
              src={post.media.url}
              alt={post.content.title || 'Post image'}
              className={cn(
                'transition-opacity duration-300',
                // Mobile: вертикальные на весь экран по высоте, горизонтальные по ширине
                'max-md:w-full max-md:h-full max-md:object-contain',
                // Desktop: адаптивные размеры
                'md:h-full md:w-auto md:object-contain',
                isHorizontal ? 'md:max-h-[44vh]' : 'md:max-h-[75vh]',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={handleImageLoad}
              onError={() => setImageError(true)}
            />
            {imageError && (
              <div className="flex items-center justify-center min-h-[400px] bg-gray-100 dark:bg-slate-800 rounded-3xl">
                <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            
            {/* Remix button for images - только для AI контента с requestId, НЕ платного */}
            {!isMenuOpen && post.media?.requestId && !post.access?.price && !post.commerce?.isSellable && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowRemixImageModal(true)
                }}
                className="absolute top-4 right-3 w-8 h-8 sm:w-10 sm:h-10 sm:right-4 flex items-center justify-center bg-purple-500/80 hover:bg-purple-600/80 text-white rounded-full transition-colors backdrop-blur-sm z-50"
                aria-label="Remix image"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            
            {/* Download button for images */}
            <a
              href={`/api/download?url=${encodeURIComponent(post.media.url)}`}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-3 right-3 w-8 h-8 sm:w-10 sm:h-10 sm:bottom-4 sm:right-4 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm z-30"
              aria-label="Download image"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </>
        )}

        {/* Video */}
        {post.media.type === 'video' && post.media.url && (
          <div className="relative cursor-pointer max-md:w-full max-md:h-full md:max-h-[95vh]" onClick={handleVideoClick}>
            <video
              ref={videoRef}
              src={post.media.url}
              poster={post.media.preview?.startsWith('https://fonanastorage.b-cdn.net/') ? post.media.preview : undefined}
              className={cn(
                'w-full h-full object-contain',
                // Mobile: на весь экран как TikTok
                'max-md:object-cover',
                // Desktop: со скруглением
                'md:max-h-[95vh] md:rounded-3xl'
              )}
              preload="auto"
              playsInline
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              onEnded={() => setIsVideoPlaying(false)}
            />
            
            {/* Play button */}
            {!isVideoPlaying && (
              <button
                onClick={handleVideoPlayPause}
                className="absolute inset-0 flex items-center justify-center z-20 transition-opacity hover:opacity-90"
                aria-label="Play video"
              >
                <div className="w-20 h-20 flex items-center justify-center bg-black/60 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all">
                  <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            )}
            
            {/* Remix button for videos - только для AI контента с requestId, НЕ платного */}
            {!isMenuOpen && post.media?.requestId && !post.access?.price && !post.commerce?.isSellable && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowRemixModal(true)
                }}
                className="absolute top-4 right-3 w-8 h-8 sm:w-10 sm:h-10 sm:right-4 flex items-center justify-center bg-purple-500/80 hover:bg-purple-600/80 text-white rounded-full transition-colors backdrop-blur-sm z-30"
                aria-label="Remix video"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            
            {/* Download button for videos */}
            <a
              href={`/api/download?url=${encodeURIComponent(post.media.url || '')}`}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-3 right-3 w-8 h-8 sm:w-10 sm:h-10 sm:bottom-4 sm:right-4 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm z-30"
              aria-label="Download video"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        )}

            {/* Username overlay внизу - только для незаблокированного контента */}
            <div className="absolute bottom-0 left-0 right-0 p-4 max-md:pb-20 bg-gradient-to-t from-black/80 via-black/50 to-transparent md:rounded-b-3xl">
              <p className="text-white font-bold text-lg">
                @{post.creator.nickname || post.creator.name || 'User'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Vertical Actions справа вплотную - только desktop */}
      <div className="hidden md:flex flex-shrink-0">
        <VerticalActions
          post={post}
          onAction={onAction}
        />
      </div>

      {/* Remix Modal for Videos */}
      {showRemixModal && (
        <RemixPostModal
          post={post}
          onClose={() => setShowRemixModal(false)}
          onRemixCreated={(remixPost) => {
            console.log('[PostContent] Remix created:', remixPost)
            setShowRemixModal(false)
            // Callback для обновления ленты
            if (onAction) {
              onAction({ type: 'remix_created', postId: post.id, post: remixPost })
            }
          }}
        />
      )}

      {/* Remix Modal for Images */}
      {showRemixImageModal && (
        <RemixImagePostModal
          post={post}
          onClose={() => setShowRemixImageModal(false)}
          onRemixCreated={(remixPost) => {
            console.log('[PostContent] Video generated from image:', remixPost)
            setShowRemixImageModal(false)
            // Callback для обновления ленты
            if (onAction) {
              onAction({ type: 'remix_created', postId: post.id, post: remixPost })
            }
          }}
        />
      )}
    </div>
  )
}

