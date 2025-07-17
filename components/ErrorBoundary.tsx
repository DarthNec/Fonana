/**
 * Глобальный Error Boundary для обработки ошибок React
 * Обеспечивает graceful degradation и восстановление приложения
 */

'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error }>
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback
      if (Fallback) {
        return <Fallback error={this.state.error!} />
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please refresh the page to try again</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Хук для использования Error Boundary в функциональных компонентах
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`[${context || 'Component'}] Error:`, error)
    
    // В продакшене здесь была бы отправка в сервис аналитики
    // sendErrorToAnalytics({ error, context, timestamp: new Date().toISOString() })
  }

  return { handleError }
}

export default ErrorBoundary 