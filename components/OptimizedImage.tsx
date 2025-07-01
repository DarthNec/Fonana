'use client'

import { useState, useEffect, useRef } from 'react'
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid'
import { isValidThumbnail } from '@/lib/utils/thumbnails'

interface OptimizedImageProps {
  src: string | null | undefined
  thumbnail?: string | null
  preview?: string | null
  alt: string
  className?: string
  type?: 'image' | 'video'
  onClick?: () => void
}

export default function OptimizedImage({
  src,
  thumbnail,
  preview,
  alt,
  className = '',
  type = 'image',
  onClick
}: OptimizedImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isInView, setIsInView] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [imageError, setImageError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const MAX_RETRIES = 3
  const RETRY_DELAYS = [1000, 2000, 4000] // экспоненциальная задержка

  // Определяем, какое изображение показывать
  // Используем централизованную проверку thumbnails
  const isValidThumb = isValidThumbnail(thumbnail)
  
  // Начинаем с оригинального изображения или thumbnail, плейсхолдер только при ошибке
  const thumbSrc = isValidThumb && thumbnail ? thumbnail : src
  const previewSrc = preview || (isValidThumb && thumbnail ? thumbnail : src)

  // Intersection Observer для lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  // Последовательная загрузка изображений
  useEffect(() => {
    if (!isInView) return
    if (!thumbSrc) {
      // Если нет никакого src, показываем плейсхолдер
      setCurrentSrc('/placeholder-image.png')
      setIsLoading(false)
      return
    }

    const loadImage = (attempt = 0) => {
      // Если нет preview, сразу показываем основное изображение
      if (!preview) {
        setCurrentSrc(thumbSrc || undefined)
        setIsLoading(true)
      } else {
        // Если есть preview, показываем его первым
        setCurrentSrc(previewSrc || undefined)
        setIsLoading(true)
      }

      // Загружаем основное изображение (thumbnail или оригинал)
      const mainImage = new Image()
      mainImage.src = thumbSrc
      
      mainImage.onload = () => {
        setCurrentSrc(thumbSrc || undefined)
        setIsLoading(false)
        setImageError(false)
        setRetryCount(0)
      }

      mainImage.onerror = () => {
        console.warn(`Failed to load image: ${thumbSrc}, attempt ${attempt + 1}`)
        
        if (attempt < MAX_RETRIES) {
          // Retry с задержкой
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(attempt + 1)
            loadImage(attempt + 1)
          }, RETRY_DELAYS[attempt])
        } else {
          // После всех попыток показываем плейсхолдер в зависимости от типа
          const placeholder = type === 'video' ? '/placeholder-video-enhanced.png' : '/placeholder-image.png'
          setCurrentSrc(placeholder)
          setIsLoading(false)
          setImageError(true)
        }
      }
    }

    loadImage()
  }, [isInView, preview, thumbSrc, previewSrc, type])

  const handleVideoClick = () => {
    if (!showVideo) {
      setShowVideo(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play()
          setIsPlaying(true)
        }
      }, 100)
    } else {
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause()
          setIsPlaying(false)
        } else {
          videoRef.current.play()
          setIsPlaying(true)
        }
      }
    }
  }

  if (type === 'video') {
    return (
      <div 
        ref={containerRef}
        className={`relative ${className}`}
      >
        {!showVideo ? (
          <>
            <img
              ref={imgRef}
              src={currentSrc || previewSrc || ''}
              alt={alt}
              className={`${className} ${isLoading ? 'blur-sm' : ''} transition-all duration-300`}
              loading="lazy"
            />
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={handleVideoClick}
            >
              <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <PlayIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          </>
        ) : (
          <>
            <video
              ref={videoRef}
              src={src || ''}
              className={className}
              controls
              onClick={handleVideoClick}
              onEnded={() => setIsPlaying(false)}
            >
              Your browser does not support the video tag.
            </video>
            {!isPlaying && (
              <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={handleVideoClick}
              >
                <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                  <PlayIcon className="w-8 h-8 text-white" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${isLoading ? 'bg-gray-100 dark:bg-slate-800 animate-pulse' : ''}`}
      onClick={onClick}
    >
      {isInView && (
        <>
          {/* Preview/Placeholder пока грузится основное изображение */}
          {isLoading && preview && (
            <img
              src={previewSrc || ''}
              alt={alt}
              className={`${className} blur-md`}
            />
          )}
          
          {/* Основное изображение */}
          <img
            ref={imgRef}
            src={currentSrc || previewSrc || ''}
            alt={alt}
            className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </>
      )}
      
      {/* Skeleton loader */}
      {!isInView && (
        <div className={`${className} bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-800`} />
      )}
    </div>
  )
} 