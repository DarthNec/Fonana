'use client'

import { useState, useEffect, useRef } from 'react'
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid'

interface OptimizedImageProps {
  src: string | null
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
  const [currentSrc, setCurrentSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInView, setIsInView] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Определяем, какое изображение показывать
  const imageSrc = src || '/placeholder-image.png'
  const thumbSrc = thumbnail || src || '/placeholder-image.png'
  const previewSrc = preview || thumbnail || src || '/placeholder-image.png'

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

  // Последовательная загрузка изображений
  useEffect(() => {
    if (!isInView) return

    // Если нет preview, сразу показываем основное изображение
    if (!preview) {
      setCurrentSrc(thumbSrc)
      setIsLoading(true)
    } else {
      // Если есть preview, показываем его первым
      setCurrentSrc(previewSrc)
      setIsLoading(true)
    }

    // Загружаем основное изображение (thumbnail или оригинал)
    const mainImage = new Image()
    mainImage.src = thumbSrc
    
    mainImage.onload = () => {
      setCurrentSrc(thumbSrc)
      setIsLoading(false)
    }

    mainImage.onerror = () => {
      // При ошибке показываем оригинал или плейсхолдер
      setCurrentSrc(imageSrc)
      setIsLoading(false)
    }
  }, [isInView, preview, thumbSrc, previewSrc, imageSrc])

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
              src={currentSrc || previewSrc}
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
              src={previewSrc}
              alt={alt}
              className={`${className} blur-md`}
            />
          )}
          
          {/* Основное изображение */}
          <img
            ref={imgRef}
            src={currentSrc || previewSrc}
            alt={alt}
            className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            loading="lazy"
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