'use client'

import { useEffect, useState, ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="relative">
              {/* Spinning loader */}
              <div className="w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
              
              {/* Fonana text */}
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Fonana
                </div>
              </div>
              
              {/* Pulsing background */}
              <div className="absolute -inset-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-xl animate-pulse"></div>
            </div>
          </div>
        )}
      </>
    )
  }

  return <>{children}</>
} 