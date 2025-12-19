'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { UnifiedPost, PostAction, PostCardVariant } from '@/types/posts'
import { PostLocked } from '../PostLocked'
import { TierBadge } from '../TierBadge'
import { PostHeader } from '../PostHeader'
import { PostActions } from '../PostActions'
import { 
  needsPayment, 
  needsSubscription, 
  needsTierUpgrade,
  isPostSold 
} from '@/components/posts/utils/postHelpers'
import { cn } from '@/lib/utils'
import RemixPostModal from '@/components/RemixPostModal'
import RemixImagePostModal from '@/components/RemixImagePostModal'
import { RemixCarousel } from '../RemixCarousel'
import { 
  // Category icons
  Squares2X2Icon, // All
  PaintBrushIcon, // Art
  MusicalNoteIcon, // Music
  PuzzlePieceIcon, // Gaming
  HomeIcon, // Lifestyle
  HeartIcon as FitnessIcon, // Fitness
  ComputerDesktopIcon, // Tech
  CurrencyDollarIcon, // DeFi
  PhotoIcon as NFTIcon, // NFT
  ChartBarIcon, // Trading
  CpuChipIcon, // GameFi
  LinkIcon, // Blockchain
  HeartIcon as IntimateIcon, // Intimate
  AcademicCapIcon, // Education
  FaceSmileIcon, // Comedy
  CakeIcon, // Food
  SparklesIcon, // Party
  PhotoIcon, // Landscape
  BriefcaseIcon, // Work
  ArrowPathIcon, // Remix
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

export interface PostContentProps {
  post: UnifiedPost
  variant?: PostCardVariant
  onAction?: (action: PostAction) => void
  className?: string
  showHeader?: boolean // Для Instagram-style header поверх контента
  showFooter?: boolean // Для Instagram-style footer с actions снизу
  commentCount?: number // Для отображения количества комментариев
}

// Маппинг категорий к иконкам
const categoryIcons: Record<string, any> = {
  'All': Squares2X2Icon,
  'Art': PaintBrushIcon,
  'Music': MusicalNoteIcon,
  'Gaming': PuzzlePieceIcon,
  'Lifestyle': HomeIcon,
  'Fitness': FitnessIcon,
  'Tech': ComputerDesktopIcon,
  'DeFi': CurrencyDollarIcon,
  'NFT': NFTIcon,
  'Trading': ChartBarIcon,
  'GameFi': CpuChipIcon,
  'Blockchain': LinkIcon,
  'Intimate': IntimateIcon,
  'Education': AcademicCapIcon,
  'Comedy': FaceSmileIcon,
  'Food': CakeIcon,
  'Party': SparklesIcon,
  'Landscape': PhotoIcon,
  'Work': BriefcaseIcon
}

/**
 * Компонент для отображения контента поста
 */
export function PostContent({
  post,
  variant = 'full',
  onAction,
  className,
  showHeader = false,
  showFooter = false,
  commentCount = 0
}: PostContentProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isTextExpanded, setIsTextExpanded] = useState(false)
  const [showRemixModal, setShowRemixModal] = useState(false)
  const [showRemixImageModal, setShowRemixImageModal] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isFooterTextExpanded, setIsFooterTextExpanded] = useState(false)
  
  // Находим индекс текущего поста в массиве ремиксов (если есть)
  const initialRemixIndex = React.useMemo(() => {
    if (post.postRemixes && post.postRemixes.length > 1) {
      const index = post.postRemixes.findIndex(p => p.id === post.id)
      return index !== -1 ? index : 0
    }
    return 0
  }, [post.id, post.postRemixes])
  
  const [currentRemixIndex, setCurrentRemixIndex] = useState(initialRemixIndex)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  
  // Обновляем индекс когда меняется пост
  React.useEffect(() => {
    setCurrentRemixIndex(initialRemixIndex)
  }, [initialRemixIndex])
  
  // Получаем текущий пост для отображения (если есть ремиксы, показываем текущий из цепочки)
  const currentPost = post.postRemixes && post.postRemixes.length > 1 
    ? post.postRemixes[currentRemixIndex] 
    : post

  // Функции управления видео
  const handleVideoPlayPause = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
        setIsVideoPlaying(false)
      } else {
        videoRef.current.play()
        setIsVideoPlaying(true)
      }
    }
  }

  const handleVideoClick = (e: React.MouseEvent) => {
    // Игнорируем клики на кнопки
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
      return
    }
    handleVideoPlayPause()
  }
  
  // Определяем длинный ли текст (больше 200 символов)
  const isLongText = currentPost.content?.text && typeof currentPost.content.text === 'string' && currentPost.content.text.length > 200
  
  // Определяем много ли строк в тексте (больше 3 строк)
  const hasManyLines = currentPost.content?.text && typeof currentPost.content.text === 'string' && 
    currentPost.content.text.split('\n').length > 3
  
  // Показываем кнопку для длинных текстов ИЛИ для текстов с большим количеством строк
  const shouldShowExpandButton = isLongText || hasManyLines
  
  // Отладочная информация
  if (isLongText) {
    console.log('PostContent Debug:', {
      variant,
      textLength: post.content?.text?.length,
      isLongText,
      shouldShowExpandButton,
      isTextExpanded
    })
  }

  // Проверяем, нужно ли скрывать контент
  // Автор всегда видит свой контент
  const shouldHideContent = post.access.isCreatorPost ? false : (
    post.access.shouldHideContent || 
    (post.access.isLocked && !post.access.isPurchased && !post.access.isSubscribed)
  )
  
  const isLocked = post.access.isCreatorPost ? false : (
    needsPayment(post) || needsSubscription(post) || needsTierUpgrade(post)
  )
  const isSold = isPostSold(post.commerce)

  // Размеры текста для разных вариантов
  const getTitleSize = () => {
    switch (variant) {
      case 'minimal': return 'text-base'
      case 'compact': return 'text-lg'
      default: return 'text-xl sm:text-2xl'
    }
  }

  const getContentSize = () => {
    switch (variant) {
      case 'minimal': return 'text-sm'
      case 'compact': return 'text-sm'
      default: return 'text-base'
    }
  }

  // Aspect ratio классы (для видео используем фиксированную высоту)
  const getAspectRatioClass = () => {
    // Для видео используем фиксированную высоту
    if (currentPost.media.type === 'video') {
      return 'h-full'
    }
    
    // Для изображений: на mobile используем aspect ratio, на desktop - без ограничений (будет заполнять flex-1)
    const mobileAspect = (() => {
      switch (currentPost.media.aspectRatio) {
        case 'vertical': return 'aspect-3/4'
        case 'square': return 'aspect-square'
        case 'horizontal': return 'aspect-video'
        default: return 'aspect-video'
      }
    })()
    
    return `${mobileAspect} sm:aspect-auto`
  }

  const handleClick = () => {
    if (onAction) {
      // Открываем пост в отдельной странице
      // window.location.href = `/post/${post.id}`
    }
  }

  // Функции навигации по ремиксам
  const handlePreviousRemix = () => {
    if (post.postRemixes && post.postRemixes.length > 1) {
      setCurrentRemixIndex((prev) => 
        prev === 0 ? post.postRemixes!.length - 1 : prev - 1
      )
    }
  }

  const handleNextRemix = () => {
    if (post.postRemixes && post.postRemixes.length > 1) {
      setCurrentRemixIndex((prev) => 
        prev === post.postRemixes!.length - 1 ? 0 : prev + 1
      )
    }
  }

  // Если у поста есть remixId и загружена цепочка ремиксов, показываем RemixCarousel
  /*
  if (post.postRemixes && post.postRemixes.length > 1) {
    return (
      <div className={cn('space-y-3', className)}>
        <RemixCarousel
          post={post}
          onAction={onAction}
          variant={variant}
          className="remix-chain-carousel"
          showIndicators={true}
          showNavigation={true}
          enableKeyboard={true}
          enableTouch={true}
        />
        
        
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <ArrowPathIcon className="w-4 h-4" />
          <span>Цепочка ремиксов ({post.postRemixes?.length} постов)</span>
        </div>
      </div>
    )
  }
  */
  return (
    <div className={cn('space-y-3', 'sm:h-full sm:flex sm:flex-col', className)}>
      {/* Header для текстовых постов без медиа */}
      {showHeader && !currentPost.media.url && (
        <PostHeader 
          post={post}
          variant={variant}
          onAction={onAction}
          overlay={false}
          className="mb-3"
        />
      )}
      
      {/* Title - для текстовых постов показываем всегда, для медиа-постов только если нет showHeader */}
      {(!showHeader || !currentPost.media.url) && (
        <h3 className={cn(
          'font-bold text-gray-900 dark:text-white',
          getTitleSize(),
          variant !== 'full' && 'line-clamp-2'
        )}>
          {currentPost.content.title}
        </h3>
      )}

      {/* Media Content */}
      {currentPost.media.url && (
        <div className="relative sm:flex-1 sm:min-h-0">
          <div 
            className={cn(
              'relative overflow-hidden rounded-xl sm:rounded-2xl cursor-pointer',
              'bg-gray-100 dark:bg-slate-800',
              getAspectRatioClass(),
              'sm:h-full' // Desktop: занимает всю высоту родителя
            )}
            onClick={handleClick}
          >
            {/* Заблокированный контент или медиа */}
            {shouldHideContent || isLocked ? (
              <>
                {/* PostLocked на z-10 */}
                <PostLocked
                  post={post}
                  onAction={onAction}
                  variant={variant}
                  className="absolute inset-0 z-10"
                  isOverlay={true}
                />
                
                {/* Header поверх заблокированного контента */}
                {showHeader && (
                  <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 via-black/60 to-transparent pt-3 pb-16 px-3 sm:px-4">
                    <PostHeader 
                      post={post}
                      variant={variant}
                      onAction={onAction}
                      overlay={true}
                      className="mb-0"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
              {/* Instagram-style Header поверх контента */}
              {showHeader && (
                <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 via-black/60 to-transparent pt-3 pb-16 px-3 sm:px-4">
                  <PostHeader 
                    post={post}
                    variant={variant}
                    onAction={onAction}
                    overlay={true}
                    className="mb-0" // Убираем отступ так как title теперь внизу
                  />
                </div>
              )}
              {/* Media based on type */}
              {currentPost.media.type === 'image' && (
                <>
                  {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                  )}
                  <img
                    src={currentPost.media.url}
                    alt={currentPost.content.title}
                    className={cn(
                      'w-full h-full object-cover sm:object-contain transition-opacity duration-300',
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                  />
                  {imageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-slate-800">
                      <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Remix button for images */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowRemixImageModal(true)
                    }}
                    className={cn(
                      "absolute right-3 w-8 h-8 sm:w-10 sm:h-10 sm:right-4 flex items-center justify-center bg-purple-500/80 hover:bg-purple-600/80 text-white rounded-full transition-colors backdrop-blur-sm z-30",
                      showHeader ? "top-20 sm:top-13" : "top-4" // Опускаем под header если он есть
                    )}
                    aria-label="Remix image"
                  >
                    <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  
                  {/* Download button для изображений */}
                  <a
                    href={`/api/download?url=${encodeURIComponent(currentPost.media.url)}`}
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

              {currentPost.media.type === 'ai-video' && !currentPost.media.error && (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-500 to-pink-500">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-white font-medium mb-1">Generating AI Video...</p>
                    <p className="text-xs text-white/80">This may take a few minutes</p>
                  </div>
                </div>
              )}

              {currentPost.media.type === 'ai-video' && currentPost.media.error && (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-500 to-pink-500">
                  <div className="text-center p-6">
                    <svg className="w-12 h-12 text-white mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-white font-medium mb-2">Generation Failed</p>
                    <p className="text-xs text-white/90 max-w-sm mx-auto">{currentPost.media.error}</p>
                  </div>
                </div>
              )}

              {(currentPost.media.type === 'video') && currentPost.media.error && (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-500 to-pink-500">
                  <div className="text-center p-6">
                    <svg className="w-12 h-12 text-white mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-white font-medium mb-2">Video Error</p>
                    <p className="text-xs text-white/90 max-w-sm mx-auto">{currentPost.media.error}</p>
                  </div>
                </div>
              )}

              {(currentPost.media.type === 'video') && !currentPost.media.error && (
                <div className="relative w-full h-full cursor-pointer" onClick={handleVideoClick}>
                  <video
                    ref={videoRef}
                    src={currentPost.media.url}
                    poster={currentPost.media.preview?.startsWith('https://fonanastorage.b-cdn.net/') ? currentPost.media.preview : undefined}
                    className="w-full h-full object-contain"
                    preload="auto"
                    playsInline
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onEnded={() => setIsVideoPlaying(false)}
                  />
                  
                  {/* Play button в центре */}
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
                  
                  {/* Remix button for videos */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowRemixModal(true)
                    }}
                    className={cn(
                      "absolute right-3 w-8 h-8 sm:w-10 sm:h-10 sm:right-4 flex items-center justify-center bg-purple-500/80 hover:bg-purple-600/80 text-white rounded-full transition-colors backdrop-blur-sm z-30",
                      showHeader ? "top-20 sm:top-13" : "top-4" // Опускаем под header если он есть
                    )}
                    aria-label="Remix video"
                  >
                    <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  
                  {/* Download button - теперь на всех устройствах */}
                  <a
                    href={`/api/download?url=${encodeURIComponent(currentPost.media.url || '')}`}
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

              {post.media.type === 'audio' && (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-500 to-pink-500">
                  <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              )}
              </>
            )}

            {/* Overlay для затемнения контента при раскрытом тексте - только для незаблокированного */}
            {!shouldHideContent && !isLocked && isFooterTextExpanded && showFooter && (
              <div 
                className="absolute inset-0 bg-black/80 z-40 transition-opacity duration-300"
                onClick={() => setIsFooterTextExpanded(false)}
              />
            )}

            {/* Instagram-style Footer с actions снизу - ТОЛЬКО для незаблокированного контента */}
            {!shouldHideContent && !isLocked && showFooter && post.media.type !== 'ai-video' && (
              <div className={cn(
                'absolute bottom-0 left-0 right-0 px-3 sm:px-4 pb-3 transition-all duration-300',
                isFooterTextExpanded 
                  ? 'z-50 bg-black/95 pt-4 max-h-[80vh] overflow-y-auto' 
                  : 'z-20 bg-gradient-to-t from-black/80 via-black/60 to-transparent pt-16'
              )}>
                {/* Title */}
                {post.content.title && (
                  <h3 className={cn(
                    'font-bold text-white drop-shadow-lg mb-1.5',
                    variant === 'minimal' ? 'text-xs' : variant === 'compact' ? 'text-sm' : 'text-base sm:text-lg',
                    'line-clamp-2'
                  )}>
                    {post.content.title}
                  </h3>
                )}
                
                {/* Description */}
                {post.content?.text && typeof post.content.text === 'string' && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsFooterTextExpanded(!isFooterTextExpanded)
                    }}
                    className={cn(
                      'text-white/90 drop-shadow-md mb-2.5 cursor-pointer transition-all duration-300 hover:text-white',
                      variant === 'minimal' ? 'text-xs' : 'text-xs sm:text-sm',
                      isFooterTextExpanded ? 'whitespace-pre-line' : 'line-clamp-2'
                    )}
                  >
                    {post.content.text}
                    {!isFooterTextExpanded && post.content.text.length > 100 && (
                      <span className="text-white/70 ml-1 font-medium">... ещё</span>
                    )}
                  </div>
                )}
                
                {/* PostActions */}
                {!isFooterTextExpanded && (
                  <PostActions
                    post={post}
                    commentCount={commentCount}
                    onAction={onAction}
                    variant={variant}
                    overlay={true}
                  />
                )}
              </div>
            )}

            {/* Sold overlay */}
            {isSold && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <div className="text-white text-2xl font-bold">ПРОДАНО</div>
              </div>
            )}

            {/* Remix Navigation Controls - внутри медиа-контейнера */}
            {post.postRemixes && post.postRemixes.length > 1 && (
              <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-3 z-30 px-4">
                {/* Кнопка назад */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePreviousRemix()
                  }}
                  className="p-2.5 bg-black/70 hover:bg-black/80 rounded-full shadow-xl border border-white/20 backdrop-blur-sm transition-all duration-200 group"
                  aria-label="Предыдущий ремикс"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-white group-hover:text-purple-400 transition-colors" />
                </button>

                {/* Индикатор текущего ремикса */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full shadow-lg border border-white/20">
                  <ArrowPathIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-semibold text-white">
                    {currentRemixIndex + 1} / {post.postRemixes.length}
                  </span>
                </div>

                {/* Кнопка вперед */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNextRemix()
                  }}
                  className="p-2.5 bg-black/70 hover:bg-black/80 rounded-full shadow-xl border border-white/20 backdrop-blur-sm transition-all duration-200 group"
                  aria-label="Следующий ремикс"
                >
                  <ChevronRightIcon className="w-5 h-5 text-white group-hover:text-purple-400 transition-colors" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text Content - скрываем когда используем footer */}
      {/* [post_content_render_2025_017] Добавлена проверка типа для предотвращения ошибок рендеринга */}
      {!showFooter && !shouldHideContent && currentPost.content?.text && typeof currentPost.content.text === 'string' && (
        <div className="space-y-2">
          <p className={cn(
            'text-gray-700 dark:text-slate-300 whitespace-pre-line',
            getContentSize(),
            shouldShowExpandButton && !isTextExpanded && 'line-clamp-3'
          )}>
            {currentPost.content.text}
          </p>
          
          {/* Кнопка разворачивания/сворачивания */}
          {shouldShowExpandButton && (
            <button
              onClick={() => setIsTextExpanded(!isTextExpanded)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
            >
              {isTextExpanded ? 'Свернуть' : 'Развернуть...'}
            </button>
          )}
        </div>
      )}

      {/* Category & Tags & Tier - скрываем когда используем footer или для текстовых постов */}
      {!showFooter && variant === 'full' && currentPost.media.url && (currentPost.content.category || currentPost.content.tags.length > 0 || post?.access?.tier) && (
        <div className="flex flex-wrap items-center gap-2">
          {currentPost.content.category && (
            <Link
              href={`/category/${currentPost.content.category.toLowerCase()}`}
              className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1"
              title={currentPost.content.category}
            >
              {/* Показываем иконку на мобильных устройствах */}
              <div className="md:hidden flex items-center justify-center">
                {(() => {
                  const IconComponent = categoryIcons[currentPost.content.category] || Squares2X2Icon
                  return <div className="w-5"> <IconComponent /> </div>
                })()}
              </div>
              {/* Показываем текст на десктопе */}
              <span className="hidden md:inline">{currentPost.content.category}</span>
            </Link>
          )}
          {currentPost.content.tags.map(tag => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-full text-xs"
            >
              #{tag}
            </span>
          ))}
          {/* Tier Badge */}
          {post?.access?.tier && (
            <TierBadge 
              tier={post.access.tier} 
              interactive={true}
              onClick={() => {
                // TODO: Добавить фильтрацию по тиру
                console.log(`Фильтровать по тиру: ${post.access.tier}`)
              }}
            />
          )}
        </div>
      )}
      
      {/* Remix Modal for Videos */}
      {showRemixModal && (
        <RemixPostModal
          post={post}
          onClose={() => setShowRemixModal(false)}
          onRemixCreated={(remixPost) => {
            console.log('[PostContent] Remix created:', remixPost)
            setShowRemixModal(false)
            // Можно добавить callback для обновления ленты
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
            // Можно добавить callback для обновления ленты
            if (onAction) {
              onAction({ type: 'remix_created', postId: post.id, post: remixPost })
            }
          }}
        />
      )}
    </div>
  )
} 