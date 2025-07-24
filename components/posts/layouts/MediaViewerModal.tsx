'use client'

import React, { useState, useEffect, useRef } from 'react'
import { UnifiedPost, PostAction } from '@/types/posts'
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon,
  SpeakerXMarkIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { cn } from '@/lib/utils'
import Avatar from '@/components/Avatar'

export interface MediaViewerModalProps {
  posts: UnifiedPost[]
  currentIndex: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
  onAction?: (action: PostAction) => void
}

export default function MediaViewerModal({
  posts,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
  onAction
}: MediaViewerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const currentPost = posts[currentIndex]
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < posts.length - 1

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (canGoPrevious) onPrevious()
          break
        case 'ArrowRight':
          if (canGoNext) onNext()
          break
        case ' ':
          e.preventDefault()
          if (currentPost.media.type === 'video' || currentPost.media.type === 'audio') {
            setIsPlaying(!isPlaying)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, canGoPrevious, canGoNext, isPlaying, onClose, onPrevious, onNext])

  // Скрываем контролы после бездействия
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isMountedRef.current) {
        console.log('[MediaViewerModal] Component unmounted, skipping setShowControls')
        return
      }
      setShowControls(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [showControls])

  const handleMouseMove = () => {
    setShowControls(true)
  }

  const handleAction = (type: PostAction['type']) => {
    if (onAction) {
      onAction({
        type,
        postId: currentPost.id,
        data: {
          post: currentPost,
          creator: currentPost.creator
        }
      })
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${currentPost.id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentPost.content.title || 'Check out this post',
          text: currentPost.content.text || '',
          url
        })
      } catch (err) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(url)
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  if (!currentPost) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-black/95"
        onClick={onClose}
      />

      {/* Content container */}
      <div 
        className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center p-4"
        onMouseMove={handleMouseMove}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all',
            showControls ? 'opacity-100' : 'opacity-0'
          )}
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Navigation buttons */}
        {canGoPrevious && (
          <button
            onClick={onPrevious}
            className={cn(
              'absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all',
              showControls ? 'opacity-100' : 'opacity-0'
            )}
          >
            <ChevronLeftIcon className="w-8 h-8" />
          </button>
        )}

        {canGoNext && (
          <button
            onClick={onNext}
            className={cn(
              'absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all',
              showControls ? 'opacity-100' : 'opacity-0'
            )}
          >
            <ChevronRightIcon className="w-8 h-8" />
          </button>
        )}

        {/* Media content */}
        <div className="flex flex-col lg:flex-row w-full h-full">
          {/* Media viewer */}
          <div className="flex-1 flex items-center justify-center relative">
            {currentPost.media.type === 'image' && (
              <img
                src={currentPost.media.url}
                alt={currentPost.content.title || 'Image'}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {currentPost.media.type === 'video' && (
              <div className="relative">
                <video
                  src={currentPost.media.url}
                  className="max-w-full max-h-full object-contain"
                  controls={showControls}
                  autoPlay={isPlaying}
                  muted={isMuted}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                {/* Custom play button */}
                {!isPlaying && (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
                      <PlayIcon className="w-10 h-10 text-white ml-1" />
                    </div>
                  </button>
                )}
              </div>
            )}

            {currentPost.media.type === 'audio' && (
              <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-900 to-pink-900 rounded-lg max-w-md">
                <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mb-6">
                                     {isPlaying ? (
                     <SpeakerWaveIcon className="w-16 h-16 text-white" />
                   ) : (
                     <SpeakerXMarkIcon className="w-16 h-16 text-white" />
                   )}
                </div>
                
                <audio
                  src={currentPost.media.url}
                  controls
                  autoPlay={isPlaying}
                  muted={isMuted}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full"
                />
                
                <h3 className="text-white text-lg font-semibold mt-4 text-center">
                  {currentPost.content.title || 'Audio'}
                </h3>
              </div>
            )}
          </div>

          {/* Sidebar with post info */}
          <div className={cn(
            'lg:w-80 bg-white dark:bg-gray-900 flex flex-col transition-transform lg:translate-x-0',
            showControls ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
          )}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Avatar
                  src={currentPost.creator.avatar}
                  alt={currentPost.creator.name}
                  seed={currentPost.creator.username}
                  size={40}
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {currentPost.creator.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{currentPost.creator.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {currentPost.content.title && (
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {currentPost.content.title}
                </h2>
              )}
              
              {currentPost.content.text && (
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
                  {currentPost.content.text}
                </p>
              )}

              {/* Tags */}
              {currentPost.content.tags && currentPost.content.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentPost.content.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <EyeIcon className="w-4 h-4" />
                  <span>{currentPost.engagement?.views || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <HeartIcon className="w-4 h-4" />
                  <span>{currentPost.engagement?.likes || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  <span>{currentPost.engagement?.comments || 0}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleAction('like')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    {currentPost.engagement?.isLiked ? (
                      <HeartSolidIcon className="w-6 h-6 text-red-500" />
                    ) : (
                      <HeartIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleAction('comment')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <ChatBubbleLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <ShareIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className={cn(
          'absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 transition-opacity',
          showControls ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="flex items-center gap-2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
            <span>{currentIndex + 1}</span>
            <span>/</span>
            <span>{posts.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
} 