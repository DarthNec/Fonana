'use client'

import { useSolRate } from '@/lib/hooks/useSolRate'
import { safeToFixed } from '@/lib/utils/format'

export default function SolanaRateDisplay() {
  const { rate, isLoading } = useSolRate()
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
      <svg 
        viewBox="0 0 101 88" 
        className="w-4 h-4 text-purple-600 dark:text-purple-400"
        fill="currentColor"
      >
        <path d="M100.48 69.367l-16.39 18.272a2.608 2.608 0 01-1.943.868H2.61c-.768 0-1.332-.283-1.61-.85a2.162 2.162 0 01.102-2.108L17.493 67.28a2.608 2.608 0 011.943-.868h79.536c.768 0 1.35.301 1.61.868.295.64.313 1.347-.102 2.09M100.48 49.94L84.09 31.667a2.608 2.608 0 00-1.943-.868H2.61c-.768 0-1.332.301-1.61.868a2.162 2.162 0 00.102 2.09l16.391 18.272a2.608 2.608 0 001.943.868h79.536c.768 0 1.35-.283 1.61-.85.295-.64.313-1.365-.102-2.108M17.493 20.72l16.39-18.272A2.608 2.608 0 0135.828 1.58h79.536c.768 0 1.332.283 1.61.85.295.64.277 1.365-.102 2.108L100.48 22.81a2.608 2.608 0 01-1.943.868H18.984c-.768 0-1.332-.301-1.61-.868a2.162 2.162 0 01.12-2.09z"/>
      </svg>
      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
        {isLoading ? (
          <span className="animate-pulse">SOL</span>
        ) : (
          <>SOL ${safeToFixed(rate, 2)}</>
        )}
      </span>
    </div>
  )
} 