'use client'

import { useState, useEffect, useRef } from 'react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import SearchBar from './SearchBar'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen && !isAnimating) return null

  return (
    <div 
      className={`fixed inset-0 z-[100] transition-all duration-300 ${
        isOpen ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleBackdropClick}
      onAnimationEnd={() => !isOpen && setIsAnimating(false)}
    >
      <div 
        ref={modalRef}
        className={`absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-3xl p-4 transition-all duration-300 ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-4'
        }`}
      >
        {/* Search container with glass effect */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <MagnifyingGlassIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Search</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-600 dark:text-slate-400"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Search input with filters */}
          <div className="p-4">
            <SearchBar 
              placeholder="Search creators, posts, categories..."
              showFilters={true}
              autoFocus={true}
              className="w-full"
            />
          </div>

          {/* Quick suggestions */}
          <div className="px-4 pb-4">
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {['Art', 'Music', 'Gaming', 'NFT', 'DeFi'].map((term) => (
                <button
                  key={term}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors"
                  onClick={() => {
                    // Trigger search with this term
                    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
                    if (searchInput) {
                      searchInput.value = term
                      searchInput.dispatchEvent(new Event('input', { bubbles: true }))
                    }
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-500 dark:text-slate-400">
            Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
} 