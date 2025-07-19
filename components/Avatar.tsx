'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface AvatarProps {
  src?: string | null
  alt: string
  seed: string // для генерации (обычно username или id)
  size?: number
  className?: string
  rounded?: 'full' | 'xl' | '2xl' | '3xl'
}

export default function Avatar({ 
  src, 
  alt, 
  seed, 
  size = 40, 
  className = '',
  rounded = '2xl'
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [generatorError, setGeneratorError] = useState(false)
  
  // Сбрасываем ошибки при изменении src
  useEffect(() => {
    console.log(`[Avatar] Src changed: ${src}`)
    setImageError(false)
    setGeneratorError(false)
  }, [src])
  
  // Проверяем есть ли валидный src для изображения
  const hasValidSrc = src && src.length > 0 && src !== 'undefined' && src !== 'null'
  
  // Используем DiceBear ТОЛЬКО если нет src ИЛИ произошла ошибка загрузки
  const shouldUseGenerator = !hasValidSrc || imageError
  
  const roundedClasses = {
    'full': 'rounded-full',
    'xl': 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl'
  }
  
  // Если генератор не сработал или нет seed, показываем fallback
  if (generatorError || (shouldUseGenerator && !seed)) {
    return (
      <div 
        className={`${roundedClasses[rounded]} ${className} bg-gray-300 dark:bg-gray-600 flex items-center justify-center`}
        style={{ width: size, height: size }}
      >
        <span className="text-gray-600 dark:text-gray-300 font-medium" style={{ fontSize: size * 0.4 }}>
          {(seed || alt || 'U')[0].toUpperCase()}
        </span>
      </div>
    )
  }
  
  // Используем DiceBear API
  if (shouldUseGenerator) {
    // Генерируем цвет фона на основе seed
    const backgroundColor = generateBackgroundColor(seed)
    const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${backgroundColor}`
    
    return (
      <div 
        className={`relative overflow-hidden ${roundedClasses[rounded]} ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={avatarUrl}
          alt={alt}
          width={size}
          height={size}
          className="w-full h-full"
          unoptimized
          onError={(e) => {
            console.log(`[Avatar] DiceBear error for URL: ${avatarUrl}`, e)
            setGeneratorError(true)
          }}
          onLoad={() => {
            console.log(`[Avatar] DiceBear loaded: ${avatarUrl}`)
          }}
        />
      </div>
    )
  }
  
  // Показываем локальное изображение
  return (
    <div 
      className={`relative overflow-hidden ${roundedClasses[rounded]} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        onError={(e) => {
          console.log(`[Avatar] Image load error for src: ${src}`, e)
          setImageError(true)
        }}
        onLoad={() => {
          console.log(`[Avatar] Image loaded successfully: ${src}`)
        }}
      />
    </div>
  )
}

// Генерация цвета фона
function generateBackgroundColor(str: string): string {
  const colors = [
    'b6e3f4', // Soft Blue
    'c0aede', // Soft Purple  
    'd1d4f9', // Soft Lavender
    'ffd5dc', // Soft Pink
    'ffdfbf', // Soft Peach
    'c9f0d6', // Soft Mint
    'f4c7ab', // Soft Orange
    'a8e6cf', // Soft Green
    'ffd3b6', // Soft Coral
    'dcedc1', // Soft Lime
  ]
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  
  return colors[Math.abs(hash) % colors.length]
} 