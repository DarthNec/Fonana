'use client'

import Image from 'next/image'

interface AvatarGeneratorProps {
  seed: string
  size: number
  className?: string
}

export default function AvatarGenerator({ seed, size, className = '' }: AvatarGeneratorProps) {
  // Используем DiceBear API для генерации аватаров
  // Доступные стили: avataaars, bottts, personas, lorelei, micah, notionists
  const style = 'avataaars' // Можно менять на 'bottts', 'personas', 'lorelei', 'micah'
  
  // Генерируем параметры на основе seed
  const params = new URLSearchParams({
    seed: seed,
    size: size.toString(),
    // Добавляем дополнительные параметры для кастомизации
    backgroundColor: generateBackgroundColor(seed),
    // Для avataaars можно настроить цвета
    ...(style === 'avataaars' && {
      accessories: 'prescription02,wayfarers',
      clothingColor: generateClothingColor(seed),
      hairColor: 'variant02,variant03,variant04',
    })
  })
  
  // Формируем URL
  const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`
  
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <Image
        src={avatarUrl}
        alt={`Avatar for ${seed}`}
        width={size}
        height={size}
        className="w-full h-full"
        unoptimized // Для SVG изображений
      />
    </div>
  )
}

// Генерация цвета фона на основе строки
function generateBackgroundColor(str: string): string {
  // Массив приятных цветов для фона
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
  
  // Простой хеш для выбора цвета
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// Генерация цвета одежды для avataaars
function generateClothingColor(str: string): string {
  const colors = [
    '3c4f5c', // Dark Blue Grey
    '65c9ff', // Sky Blue
    '5199e4', // Blue
    '25557c', // Dark Blue
    'e6e6e6', // Light Grey
    '929598', // Grey
    'a7ffc4', // Light Green
    'ff488e', // Pink
    'ff5c5c', // Red
    'ffafb9', // Light Pink
    'ffffff', // White
    '262e33', // Black
  ]
  
  let hash = 7
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 3) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// Функция для получения инициалов (не используется, но оставляем для справки)
function getInitials(str: string): string {
  // Если это кошелек (начинается с цифры или длинная строка), берем первые 2 символа
  if (/^\d/.test(str) || str.length > 20) {
    return str.substring(0, 2).toUpperCase()
  }
  
  // Разбиваем по пробелам или camelCase
  const words = str.split(/[\s_-]+|(?=[A-Z])/).filter(word => word.length > 0)
  
  if (words.length >= 2) {
    // Берем первые буквы первых двух слов
    return (words[0][0] + words[1][0]).toUpperCase()
  } else if (words.length === 1) {
    // Если одно слово, берем первые две буквы
    return words[0].substring(0, 2).toUpperCase()
  }
  
  // Fallback - первые два символа
  return str.substring(0, 2).toUpperCase()
} 