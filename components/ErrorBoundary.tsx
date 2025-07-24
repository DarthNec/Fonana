/**
 * Глобальный Error Boundary для обработки ошибок React
 * Обеспечивает graceful degradation и восстановление приложения
 */

'use client'

import React from 'react'
import { GlobalStateProtection } from '../lib/utils/global-protection'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error }>
}

interface State {
  hasError: boolean
  error: Error | null
  isInfiniteLoop: boolean
}

export class ErrorBoundary extends React.Component<Props, State> {
  private isUnmounted = false
  private renderCount = 0
  private lastRenderTime = 0
  // 🔥 M7 PHASE 4: Infinite loop detection
  private errorCount = 0
  private lastErrorTime = 0
  private isRecovering = false

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, isInfiniteLoop: false }
  }

  componentWillUnmount() {
    this.isUnmounted = true
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const now = Date.now()
    
    // 🔥 M7 PHASE 4: Detect rapid error cycles (React Error #185 pattern)
    if (now - this.lastErrorTime < 1000) { // 1 second
      this.errorCount++
    } else {
      this.errorCount = 1
    }
    this.lastErrorTime = now
    
    console.error(`[ErrorBoundary] Error caught (${this.errorCount}/3):`, error.message)
    
    // Log additional debugging info
    console.error('[ErrorBoundary] Error details:', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      renderCount: this.renderCount,
      errorCount: this.errorCount,
      timeSinceLastError: now - this.lastErrorTime
    })
    
    // 🔥 M7 PHASE 4: INFINITE LOOP PROTECTION
    if (this.errorCount >= 3) {
      console.error('[ErrorBoundary] Infinite loop detected - activating circuit breaker')
      GlobalStateProtection.freezeApp('ErrorBoundary infinite loop')
      
      this.setState({ 
        hasError: true, 
        error,
        isInfiniteLoop: true
      })
      
      // 🔥 Extended recovery delay for infinite loops
      setTimeout(() => {
        if (!this.isUnmounted) {
          console.log('[ErrorBoundary] Attempting recovery from infinite loop')
          GlobalStateProtection.unfreezeApp('ErrorBoundary recovery')
          this.errorCount = 0
          this.isRecovering = false
          this.setState({ hasError: false, error: null, isInfiniteLoop: false })
        }
      }, 10000) // 10 second recovery delay
      
      return
    }
    
    // 🔥 M7 PHASE 4: NORMAL ERROR HANDLING with progressive delay
    this.setState({ hasError: true, error, isInfiniteLoop: false })
    
    // Progressive recovery delay: 3s, 6s, 9s max
    const recoveryDelay = Math.min(3000 * this.errorCount, 10000)
    
    setTimeout(() => {
      if (!this.isRecovering && !this.isUnmounted) {
        console.log(`[ErrorBoundary] Auto-recovery after ${recoveryDelay}ms`)
        this.setState({ hasError: false, error: null, isInfiniteLoop: false })
      }
    }, recoveryDelay)
  }

  resetErrorBoundary = () => {
    if (!this.isUnmounted) {
      console.log('[ErrorBoundary] Manual reset triggered')
      this.errorCount = 0
      this.isRecovering = false
      GlobalStateProtection.unfreezeApp('Manual reset')
      this.setState({ hasError: false, error: null, isInfiniteLoop: false })
    }
  }

  render() {
    const now = Date.now()
    
    // Reset render counter every 100ms to track potential infinite loops
    if (now - this.lastRenderTime > 100) {
      this.renderCount = 0
    }
    
    this.renderCount++
    this.lastRenderTime = now
    
    // Detect potential infinite render loops
    if (this.renderCount > 10) {
      console.warn('[ErrorBoundary] Potential infinite render loop detected', {
        renderCount: this.renderCount,
        hasError: this.state.hasError,
        timestamp: new Date().toISOString()
      })
    }

    if (this.state.hasError) {
      const Fallback = this.props.fallback
      if (Fallback) {
        return <Fallback error={this.state.error!} />
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8">
            {this.state.isInfiniteLoop ? (
              <>
                <h2 className="text-xl font-semibold mb-2 text-red-600">🔄 Infinite Loop Detected</h2>
                <p className="text-gray-600 mb-4">
                  The app encountered a serious error loop. Recovery is in progress...
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    🔥 Circuit breaker activated. The app is temporarily frozen to prevent damage.
                    Automatic recovery will occur in 10 seconds.
                  </p>
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Force Refresh
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                <p className="text-gray-600 mb-4">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                <div className="space-y-2">
                  <button 
                    onClick={this.resetErrorBoundary}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg mr-2 hover:bg-green-700"
                  >
                    Try Again
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Refresh Page
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Хук для использования Error Boundary в функциональных компонентах
export const useErrorHandler = () => {
  const isMountedRef = React.useRef(true)
  
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])
  
  const handleError = React.useCallback((error: Error, context?: string) => {
    if (!isMountedRef.current) {
      console.log(`[${context}] Component unmounted, skipping error handling`)
      return
    }
    
    console.error(`[${context || 'Component'}] Error:`, error)
    
    // В продакшене здесь была бы отправка в сервис аналитики
    // sendErrorToAnalytics({ error, context, timestamp: new Date().toISOString() })
  }, [])

  return { handleError }
}

export default ErrorBoundary 