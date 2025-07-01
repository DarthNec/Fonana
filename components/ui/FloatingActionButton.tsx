'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { PlusIcon } from '@heroicons/react/24/outline'

export interface FloatingActionButtonProps {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  offset?: { bottom?: number; right?: number; left?: number; top?: number }
  className?: string
  hideOnScroll?: boolean
  showLabel?: boolean
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon = <PlusIcon className="w-6 h-6" />,
  label = 'Create',
  position = 'bottom-right',
  offset = { bottom: 80, right: 20 },
  className,
  hideOnScroll = true,
  showLabel = false
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!hideOnScroll) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Показываем кнопку при скролле вверх или в самом верху
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    // Debounce для оптимизации
    let ticking = false
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', scrollListener, { passive: true })
    return () => window.removeEventListener('scroll', scrollListener)
  }, [lastScrollY, hideOnScroll])

  // Позиционирование
  const positionStyles = {
    'bottom-right': {
      bottom: offset.bottom || 80,
      right: offset.right || 20
    },
    'bottom-left': {
      bottom: offset.bottom || 80,
      left: offset.left || 20
    },
    'top-right': {
      top: offset.top || 80,
      right: offset.right || 20
    },
    'top-left': {
      top: offset.top || 80,
      left: offset.left || 20
    }
  }

  return (
    <div
      className={cn(
        'fixed z-50 transition-all duration-300 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none',
        className
      )}
      style={positionStyles[position]}
    >
      {/* Label (показывается при hover или если showLabel = true) */}
      {label && (
        <div
          className={cn(
            'absolute whitespace-nowrap transition-all duration-300',
            position.includes('right') ? 'right-full mr-3' : 'left-full ml-3',
            'top-1/2 -translate-y-1/2',
            (isHovered || showLabel) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
          )}
        >
          <div className="bg-gray-900 dark:bg-slate-800 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg">
            {label}
          </div>
        </div>
      )}

      {/* Button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'group relative',
          'w-14 h-14 sm:w-16 sm:h-16',
          'bg-gradient-to-r from-purple-600 to-pink-600',
          'hover:from-purple-700 hover:to-pink-700',
          'text-white rounded-full',
          'shadow-lg hover:shadow-xl',
          'transform hover:scale-110 active:scale-95',
          'transition-all duration-300',
          'flex items-center justify-center',
          'focus:outline-none focus:ring-4 focus:ring-purple-500/50',
          // Пульсирующая анимация для привлечения внимания
          'before:absolute before:inset-0',
          'before:bg-gradient-to-r before:from-purple-600 before:to-pink-600',
          'before:rounded-full before:animate-ping',
          'before:opacity-20'
        )}
        aria-label={label}
      >
        {/* Ripple effect на клик */}
        <span className="absolute inset-0 rounded-full overflow-hidden">
          <span className="absolute inset-0 rounded-full bg-white opacity-0 group-active:opacity-20 transition-opacity" />
        </span>
        
        {/* Icon */}
        <span className="relative z-10 transform group-hover:rotate-90 transition-transform duration-300">
          {icon}
        </span>
      </button>

      {/* Mobile touch feedback */}
      <div className="absolute inset-0 rounded-full bg-white opacity-0 pointer-events-none group-active:opacity-10" />
    </div>
  )
}

export default FloatingActionButton 