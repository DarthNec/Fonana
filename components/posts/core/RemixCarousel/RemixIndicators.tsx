'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface RemixIndicatorsProps {
  currentIndex: number
  totalCount: number
  onNavigate: (index: number) => void
  variant?: 'dots' | 'thumbnails' | 'numbers'
  className?: string
  maxVisible?: number
}

export function RemixIndicators({
  currentIndex,
  totalCount,
  onNavigate,
  variant = 'dots',
  className,
  maxVisible = 5
}: RemixIndicatorsProps) {
  const getVisibleIndices = () => {
    if (totalCount <= maxVisible) {
      return Array.from({ length: totalCount }, (_, i) => i)
    }
    
    const start = Math.max(0, currentIndex - Math.floor(maxVisible / 2))
    const end = Math.min(totalCount, start + maxVisible)
    
    return Array.from({ length: end - start }, (_, i) => start + i)
  }

  if (totalCount <= 1) {
    return null
  }

  return (
    <div className={cn('remix-indicators', className)}>
      {variant === 'dots' && (
        <div className="indicators-dots">
          {getVisibleIndices().map(index => (
            <button
              key={index}
              className={cn(
                'indicator-dot',
                index === currentIndex && 'active'
              )}
              onClick={() => onNavigate(index)}
              aria-label={`Go to post ${index + 1}`}
              title={`Go to post ${index + 1}`}
            />
          ))}
        </div>
      )}
      
      {variant === 'thumbnails' && (
        <div className="indicators-thumbnails">
          {getVisibleIndices().map(index => (
            <button
              key={index}
              className={cn(
                'indicator-thumbnail',
                index === currentIndex && 'active'
              )}
              onClick={() => onNavigate(index)}
              aria-label={`Go to post ${index + 1}`}
              title={`Go to post ${index + 1}`}
            >
              <img
                src="/placeholder-thumbnail.jpg"
                alt={`Post ${index + 1}`}
                className="thumbnail-image"
              />
            </button>
          ))}
        </div>
      )}
      
      {variant === 'numbers' && (
        <div className="indicators-numbers">
          <span className="current-number">{currentIndex + 1}</span>
          <span className="separator">/</span>
          <span className="total-number">{totalCount}</span>
        </div>
      )}
    </div>
  )
}
