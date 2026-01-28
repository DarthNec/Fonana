'use client'

import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface CircularNavigationProps {
  onPrevious: () => void
  onNext: () => void
  onLeft?: () => void
  onRight?: () => void
  canGoPrevious?: boolean
  canGoNext?: boolean
  hasRemixes?: boolean
  className?: string
}

/**
 * Круглые кнопки навигации (точная копия Hidden.com)
 * Отдельные круглые кнопки со стрелками
 */
export function CircularNavigation({
  onPrevious,
  onNext,
  onLeft,
  onRight,
  canGoPrevious = true,
  canGoNext = true,
  hasRemixes = false,
  className
}: CircularNavigationProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Крестовина навигации */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Up - Previous post */}
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={cn(
            'absolute top-0 left-1/2 -translate-x-1/2',
            'w-12 h-12 rounded-full flex items-center justify-center transition-all',
            'bg-black/60 backdrop-blur-md border border-white/20',
            canGoPrevious 
              ? 'text-white hover:bg-black/80 hover:scale-110' 
              : 'text-white/30 cursor-not-allowed'
          )}
          aria-label="Previous post"
        >
          <ChevronUpIcon className="w-6 h-6" />
        </button>
        
        {/* Left */}
        <button
          onClick={onLeft}
          disabled={!onLeft}
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2',
            'w-12 h-12 rounded-full flex items-center justify-center transition-all',
            'bg-black/60 backdrop-blur-md border border-white/20',
            onLeft
              ? 'text-white hover:bg-black/80 hover:scale-110'
              : 'text-white/30 cursor-not-allowed'
          )}
          aria-label="Previous remix"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        
        {/* Right */}
        <button
          onClick={onRight}
          disabled={!onRight}
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2',
            'w-12 h-12 rounded-full flex items-center justify-center transition-all',
            'bg-black/60 backdrop-blur-md border border-white/20',
            onRight
              ? 'text-white hover:bg-black/80 hover:scale-110'
              : 'text-white/30 cursor-not-allowed'
          )}
          aria-label="Next remix"
        >
          <ChevronRightIcon className="w-6 h-6" />
        </button>
        
        {/* Down - Next post (активная, розовая) */}
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className={cn(
            'absolute bottom-0 left-1/2 -translate-x-1/2',
            'w-14 h-14 rounded-full flex items-center justify-center transition-all',
            'border-2',
            canGoNext 
              ? 'bg-gradient-to-br from-pink-500 to-pink-600 border-pink-400 text-white hover:scale-110 hover:shadow-lg hover:shadow-pink-500/50' 
              : 'bg-black/40 border-white/20 text-white/30 cursor-not-allowed'
          )}
          aria-label="Next post"
        >
          <ChevronDownIcon className="w-7 h-7" />
        </button>
      </div>
    </div>
  )
}

