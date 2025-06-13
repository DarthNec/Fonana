'use client'

import { useState } from 'react'
import Image from 'next/image'
import AvatarGenerator from './AvatarGenerator'

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
  
  // Проверяем, является ли src внешней ссылкой или локальным файлом
  const isExternalUrl = src?.startsWith('http://') || src?.startsWith('https://')
  const isValidLocalImage = src && !isExternalUrl && src.includes('/avatars/') && (src.includes('.jpg') || src.includes('.png') || src.includes('.webp'))
  
  // Если это внешняя ссылка или невалидный локальный путь, используем генератор
  const shouldUseGenerator = !src || imageError || isExternalUrl || !isValidLocalImage
  
  const roundedClasses = {
    'full': 'rounded-full',
    'xl': 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl'
  }
  
  if (shouldUseGenerator) {
    return (
      <AvatarGenerator 
        seed={seed} 
        size={size} 
        className={`${roundedClasses[rounded]} ${className}`}
      />
    )
  }
  
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
        onError={() => setImageError(true)}
      />
    </div>
  )
} 