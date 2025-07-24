'use client'

import React, { useRef, useEffect } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/lib/store/appStore'

interface ErrorInfo {
  message: string
  component: string
  timestamp: string
  userId?: string
  stack?: string
  queryKey?: string[]
  url?: string
  userAgent?: string
}

interface EnterpriseErrorProps {
  error: Error
  context: string
  onRetry?: () => void
  fallbackData?: any
  queryKey?: string[]
}

export const EnterpriseError: React.FC<EnterpriseErrorProps> = ({
  error,
  context,
  onRetry,
  fallbackData,
  queryKey
}) => {
  const user = useUser()
  const errorCount = useRef(0)
  const lastErrorTime = useRef(0)
  
  useEffect(() => {
    // Create structured error info
    const errorInfo: ErrorInfo = {
      message: error.message,
      component: context,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      stack: error.stack,
      queryKey,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    }
    
    // Track error frequency
    const now = Date.now()
    if (now - lastErrorTime.current < 5000) {
      errorCount.current += 1
    } else {
      errorCount.current = 1
    }
    lastErrorTime.current = now
    
    // Structured logging with enterprise format
    console.error('[ENTERPRISE ERROR]', {
      ...errorInfo,
      errorCount: errorCount.current,
      severity: errorCount.current > 3 ? 'CRITICAL' : 'ERROR',
      repeatCount: errorCount.current
    })
    
    // Warn about repeated errors
    if (errorCount.current > 3) {
      console.warn(`[REPEATED ERROR] ${context}: ${errorCount.current} times in 5 seconds`)
    }
  }, [error, context, queryKey])
  
  const handleRetry = () => {
    console.info(`[RETRY ATTEMPT] ${context}: User initiated retry`)
    onRetry?.()
  }
  
  const handleReload = () => {
    console.info(`[PAGE RELOAD] ${context}: User initiated page reload`)
    window.location.reload()
  }
  
  return (
    <div className="enterprise-error-container p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 max-w-2xl mx-auto">
      <div className="flex items-start gap-4">
        <ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Something went wrong
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          
          {/* Error frequency warning */}
          {errorCount.current > 2 && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
              <p className="text-orange-800 dark:text-orange-200 text-sm">
                ⚠️ This error has occurred {errorCount.current} times. Please check your connection.
              </p>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            {onRetry && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            )}
            
            <button
              onClick={handleReload}
              className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Reload Page
            </button>
            
            {fallbackData && (
              <button
                onClick={() => console.info('[FALLBACK DATA] Using cached data')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Use Cached Data
              </button>
            )}
          </div>
          
          {/* Technical details (expandable) */}
          <details className="text-sm">
            <summary className="cursor-pointer text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
              <div className="space-y-2">
                <div><strong>Component:</strong> {context}</div>
                <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
                <div><strong>Error:</strong> {error.name}: {error.message}</div>
                {queryKey && <div><strong>Query Key:</strong> {JSON.stringify(queryKey)}</div>}
                <div><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-gray-600 dark:text-gray-400">Stack Trace</summary>
                    <pre className="mt-1 text-xs whitespace-pre-wrap">{error.stack}</pre>
                  </details>
                )}
              </div>
            </div>
          </details>
          
          {/* Help text */}
          <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
            If this problem persists, please refresh the page or contact support.
          </div>
        </div>
      </div>
    </div>
  )
} 