'use client'

import { useMemo } from 'react'

interface AvatarGeneratorProps {
  seed: string // username или id для генерации
  size?: number
  className?: string
}

// Красивые градиенты для Web3 стиля
const gradients = [
  ['#667eea', '#764ba2'], // фиолетовый
  ['#f093fb', '#f5576c'], // розовый
  ['#4facfe', '#00f2fe'], // голубой
  ['#43e97b', '#38f9d7'], // зеленый
  ['#fa709a', '#fee140'], // желто-розовый
  ['#30cfd0', '#330867'], // темно-фиолетовый
  ['#a8edea', '#fed6e3'], // пастельный
  ['#ff9a9e', '#fecfef'], // светло-розовый
  ['#fbc2eb', '#a6c1ee'], // лавандовый
  ['#fddb92', '#d1fdff'], // солнечный
  ['#9890e3', '#b1f4cf'], // мятный
  ['#ebc0fd', '#d9ded8'], // серо-фиолетовый
  ['#96fbc4', '#f9f586'], // лаймовый
  ['#ff9a9e', '#fad0c4'], // коралловый
  ['#a1c4fd', '#c2e9fb'], // небесный
]

// Паттерны для фона
const patterns = [
  'dots', 'lines', 'waves', 'circles', 'squares', 'triangles', 'hexagons'
]

// Эмодзи для центра (Web3 тематика)
const emojis = [
  '🚀', '💎', '🔥', '⚡', '🌟', '💫', '🎯', '🎨', '🎭', '🎪',
  '🦄', '🐉', '🦊', '🐺', '🦅', '🦋', '🐙', '🦈', '🐳', '🦜',
  '🌈', '🌊', '🌸', '🌺', '🍄', '🌙', '☀️', '⭐', '💰', '💸',
  '🎮', '🎲', '🎰', '🏆', '🎖️', '🏅', '💻', '🖥️', '📱', '⌚',
  '🔮', '💠', '🔷', '🔶', '🟣', '🟡', '🟢', '🔵', '🟠', '⚪'
]

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

export default function AvatarGenerator({ seed, size = 40, className = '' }: AvatarGeneratorProps) {
  const avatarData = useMemo(() => {
    const hash = hashCode(seed)
    const gradientIndex = hash % gradients.length
    const patternIndex = (hash >> 8) % patterns.length
    const emojiIndex = (hash >> 16) % emojis.length
    const rotation = (hash % 360)
    
    return {
      gradient: gradients[gradientIndex],
      pattern: patterns[patternIndex],
      emoji: emojis[emojiIndex],
      rotation
    }
  }, [seed])

  const patternElement = useMemo(() => {
    const { pattern } = avatarData
    
    switch (pattern) {
      case 'dots':
        return (
          <pattern id={`pattern-${seed}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.1)" />
          </pattern>
        )
      case 'lines':
        return (
          <pattern id={`pattern-${seed}`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="10" y2="10" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </pattern>
        )
      case 'waves':
        return (
          <pattern id={`pattern-${seed}`} x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 10 Q 10 0 20 10 T 40 10" stroke="rgba(255,255,255,0.1)" fill="none" strokeWidth="2" />
          </pattern>
        )
      case 'circles':
        return (
          <pattern id={`pattern-${seed}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </pattern>
        )
      case 'squares':
        return (
          <pattern id={`pattern-${seed}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect x="5" y="5" width="10" height="10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </pattern>
        )
      case 'triangles':
        return (
          <pattern id={`pattern-${seed}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <polygon points="15,5 25,25 5,25" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </pattern>
        )
      case 'hexagons':
        return (
          <pattern id={`pattern-${seed}`} x="0" y="0" width="30" height="26" patternUnits="userSpaceOnUse">
            <polygon points="15,2 27,8 27,18 15,24 3,18 3,8" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </pattern>
        )
      default:
        return null
    }
  }, [avatarData.pattern, seed])

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id={`gradient-${seed}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={avatarData.gradient[0]} />
            <stop offset="100%" stopColor={avatarData.gradient[1]} />
          </linearGradient>
          {patternElement}
        </defs>
        
        <rect
          width={size}
          height={size}
          fill={`url(#gradient-${seed})`}
          transform={`rotate(${avatarData.rotation} ${size/2} ${size/2})`}
        />
        
        {patternElement && (
          <rect
            width={size}
            height={size}
            fill={`url(#pattern-${seed})`}
          />
        )}
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className="text-white drop-shadow-lg"
          style={{ fontSize: size * 0.4 }}
        >
          {avatarData.emoji}
        </span>
      </div>
    </div>
  )
} 