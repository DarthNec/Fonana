'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CheckIcon } from '@heroicons/react/24/outline'

interface ToastProps {
  message: string
  isVisible: boolean
  onClose: () => void
  type?: 'success' | 'error' | 'info'
}

export function Toast({ message, isVisible, onClose, type = 'success' }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50',
      'bg-white dark:bg-slate-800',
      'border border-gray-200 dark:border-slate-700',
      'rounded-lg shadow-lg',
      'px-4 py-3 flex items-center gap-3',
      'animate-fade-in'
    )}>
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center',
        type === 'success' && 'bg-green-100 dark:bg-green-900/20',
        type === 'error' && 'bg-red-100 dark:bg-red-900/20',
        type === 'info' && 'bg-blue-100 dark:bg-blue-900/20'
      )}>
        <CheckIcon className={cn(
          'w-4 h-4',
          type === 'success' && 'text-green-600 dark:text-green-400',
          type === 'error' && 'text-red-600 dark:text-red-400',
          type === 'info' && 'text-blue-600 dark:text-blue-400'
        )} />
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {message}
      </span>
    </div>
  )
}
