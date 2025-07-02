import React from 'react'

interface SkeletonLoaderProps {
  variant?: 'default' | 'profile' | 'dashboard' | 'messages'
  className?: string
}

export default function SkeletonLoader({ variant = 'default', className = '' }: SkeletonLoaderProps) {
  const baseClasses = "min-h-screen bg-gray-50 dark:bg-slate-900 pt-24 flex items-center justify-center"
  
  const variants = {
    default: (
      <div className="animate-pulse">
        <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-48 mx-auto" />
      </div>
    ),
    profile: (
      <div className="animate-pulse">
        <div className="w-20 h-20 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-32 mx-auto mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-48 mx-auto" />
      </div>
    ),
    dashboard: (
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-slate-400">Loading dashboard...</p>
      </div>
    ),
    messages: (
      <div className="animate-pulse">
        <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-48 mx-auto" />
      </div>
    )
  }

  return (
    <div className={`${baseClasses} ${className}`}>
      {variants[variant]}
    </div>
  )
} 