'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { UnifiedPost, PostAction, PostCardVariant } from '@/types/posts'
import { PostLocked } from '../PostLocked'
import { TierBadge } from '../TierBadge'
import { 
  needsPayment, 
  needsSubscription, 
  needsTierUpgrade,
  isPostSold 
} from '@/components/posts/utils/postHelpers'
import { cn } from '@/lib/utils'
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
  BriefcaseIcon // Work
} from '@heroicons/react/24/outline'

export interface PostContentProps {
  post: UnifiedPost
  variant?: PostCardVariant
  onAction?: (action: PostAction) => void
  className?: string
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
  className
}: PostContentProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isTextExpanded, setIsTextExpanded] = useState(false)
  
  // Определяем длинный ли текст (больше 200 символов)
  const isLongText = post.content?.text && typeof post.content.text === 'string' && post.content.text.length > 200
  
  // Определяем много ли строк в тексте (больше 3 строк)
  const hasManyLines = post.content?.text && typeof post.content.text === 'string' && 
    post.content.text.split('\n').length > 3
  
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
    if (post.media.type === 'video') {
      return 'h-full'
    }
    
    // Для изображений используем aspect ratio
    switch (post.media.aspectRatio) {
      case 'vertical': return 'aspect-3/4'
      case 'square': return 'aspect-square'
      case 'horizontal': return 'aspect-video'
      default: return 'aspect-video'
    }
  }

  const handleClick = () => {
    if (onAction) {
      // Открываем пост в отдельной странице
      // window.location.href = `/post/${post.id}`
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Title */}
      <h3 className={cn(
        'font-bold text-gray-900 dark:text-white',
        getTitleSize(),
        variant !== 'full' && 'line-clamp-2'
      )}>
        {post.content.title}
      </h3>

      {/* Media Content */}
      {post.media.url && (
        <div className="relative">
          {shouldHideContent || isLocked ? (
            <PostLocked
              post={post}
              onAction={onAction}
              variant={variant}
            />
          ) : (
            <div 
              className={cn(
                'relative overflow-hidden rounded-xl sm:rounded-2xl cursor-pointer',
                'bg-gray-100 dark:bg-slate-800',
                getAspectRatioClass()
              )}
              onClick={handleClick}
            >
              {/* Media based on type */}
              {post.media.type === 'image' && (
                <>
                  {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                  )}
                  <img
                    src={post.media.url}
                    alt={post.content.title}
                    className={cn(
                      'w-full h-full object-cover transition-opacity duration-300',
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
                </>
              )}

              {post.media.type === 'ai-video' && !post.media.error && (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-500 to-pink-500">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-white font-medium mb-1">Generating AI Video...</p>
                    <p className="text-xs text-white/80">This may take a few minutes</p>
                  </div>
                </div>
              )}

              {post.media.type === 'ai-video' && post.media.error && (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-500 to-pink-500">
                  <div className="text-center p-6">
                    <svg className="w-12 h-12 text-white mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-white font-medium mb-2">Generation Failed</p>
                    <p className="text-xs text-white/90 max-w-sm mx-auto">{post.media.error}</p>
                  </div>
                </div>
              )}

              {(post.media.type === 'video') && post.media.error && (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-500 to-pink-500">
                  <div className="text-center p-6">
                    <svg className="w-12 h-12 text-white mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-white font-medium mb-2">Video Error</p>
                    <p className="text-xs text-white/90 max-w-sm mx-auto">{post.media.error}</p>
                  </div>
                </div>
              )}

              {(post.media.type === 'video') && !post.media.error && (
                <div className="relative w-full h-full">
                  <video
                    src={post.media.url}
                    className="w-full h-full object-contain"
                    preload="auto"
                    controls
                  />
                  <a
                    href={post.media.url}
                    download
                    className="absolute bottom-4 right-4 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors sm:hidden backdrop-blur-sm"
                    aria-label="Download video"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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


              {/* Sold overlay */}
              {isSold && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-2xl font-bold">ПРОДАНО</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Text Content */}
      {/* [post_content_render_2025_017] Добавлена проверка типа для предотвращения ошибок рендеринга */}
      {!shouldHideContent && post.content?.text && typeof post.content.text === 'string' && (
        <div className="space-y-2">
          <p className={cn(
            'text-gray-700 dark:text-slate-300 whitespace-pre-line',
            getContentSize(),
            shouldShowExpandButton && !isTextExpanded && 'line-clamp-3'
          )}>
            {post.content.text}
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

      {/* Category & Tags & Tier */}
      {variant === 'full' && (post.content.category || post.content.tags.length > 0 || post?.access?.tier) && (
        <div className="flex flex-wrap items-center gap-2">
          {post.content.category && (
            <Link
              href={`/category/${post.content.category.toLowerCase()}`}
              className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1"
              title={post.content.category}
            >
              {/* Показываем иконку на мобильных устройствах */}
              <div className="md:hidden flex items-center justify-center">
                {(() => {
                  const IconComponent = categoryIcons[post.content.category] || Squares2X2Icon
                  return <div className="w-5"> <IconComponent /> </div>
                })()}
              </div>
              {/* Показываем текст на десктопе */}
              <span className="hidden md:inline">{post.content.category}</span>
            </Link>
          )}
          {post.content.tags.map(tag => (
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
    </div>
  )
} 