'use client'

import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { PostCardVariant } from '@/types/posts'
import { cn } from '@/lib/utils'

interface NavigationControlsProps {
  currentIndex: number
  totalCount: number
  onPrevious: () => void
  onNext: () => void
  variant?: PostCardVariant
  className?: string
  showLabels?: boolean
  disabled?: boolean
}

export function NavigationControls({
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
  variant = 'full',
  className,
  showLabels = false,
  disabled = false
}: NavigationControlsProps) {
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < totalCount - 1
  
  return (
    <div className={cn('navigation-controls flex justify-between items-center', className)}>
      <button
        className="nav-button nav-button-previous"
        onClick={onPrevious}
        disabled={disabled || !canGoPrevious}
        aria-label="Previous post"
        title={`Previous post (${currentIndex}/${totalCount - 1})`}
      >
        <ChevronLeftIcon className="w-6 h-6" />
        {showLabels && <span>Previous</span>}
      </button>
      
      <button
        className="nav-button nav-button-next"
        onClick={onNext}
        disabled={disabled || !canGoNext}
        aria-label="Next post"
        title={`Next post (${currentIndex + 2}/${totalCount})`}
      >
        <ChevronRightIcon className="w-6 h-6" />
        {showLabels && <span>Next</span>}
      </button>
    </div>
  )
}
