/**
 * Глобальный Error Boundary для обработки ошибок React
 * Обеспечивает graceful degradation и восстановление приложения
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { toast } from 'react-hot-toast'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

class ErrorBoundary extends Component<Props, State> {
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 2000 // 2 секунды

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    
    // Обновляем состояние
    this.setState({
      error,
      errorInfo
    })

    // Вызываем пользовательский обработчик
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Показываем toast уведомление
    toast.error('Произошла ошибка. Попробуйте обновить страницу.', {
      duration: 5000,
      id: 'error-boundary'
    })

    // Логируем ошибку (в продакшене отправляем в сервис аналитики)
    this.logError(error, errorInfo)
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    }

    console.error('[ErrorBoundary] Error details:', errorData)

    // В продакшене здесь была бы отправка в сервис аналитики
    // sendErrorToAnalytics(errorData)
  }

  private handleRetry = () => {
    const { retryCount } = this.state
    
    if (retryCount >= this.MAX_RETRIES) {
      toast.error('Превышено количество попыток. Обновите страницу.', {
        duration: 5000
      })
      return
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1
    }))

    // Показываем уведомление о повторной попытке
    toast.loading(`Повторная попытка ${retryCount + 1}/${this.MAX_RETRIES}...`, {
      duration: this.RETRY_DELAY
    })

    // Сбрасываем ошибку через задержку
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      })
    }, this.RETRY_DELAY)
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Пользовательский fallback
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Стандартный fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
          <div className="max-w-md w-full mx-auto p-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <div className="text-center">
                {/* Иконка ошибки */}
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
                  <svg
                    className="h-6 w-6 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>

                {/* Заголовок */}
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Что-то пошло не так
                </h3>

                {/* Описание */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Произошла неожиданная ошибка. Мы уже работаем над её устранением.
                </p>

                {/* Детали ошибки (только в development) */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-4 text-left">
                    <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                      Детали ошибки
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 dark:bg-slate-700 rounded text-xs font-mono text-red-600 dark:text-red-400 overflow-auto max-h-32">
                      <div className="mb-2">
                        <strong>Сообщение:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack:</strong>
                          <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Кнопки действий */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleRetry}
                    disabled={this.state.retryCount >= this.MAX_RETRIES}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Попробовать снова ({this.state.retryCount}/{this.MAX_RETRIES})
                  </button>
                  
                  <button
                    onClick={this.handleReset}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Сбросить
                  </button>
                  
                  <button
                    onClick={this.handleReload}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Обновить страницу
                  </button>
                </div>

                {/* Дополнительная информация */}
                <div className="mt-4 text-xs text-gray-400">
                  Если проблема повторяется, обратитесь в поддержку
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Хук для использования Error Boundary в функциональных компонентах
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`[${context || 'Component'}] Error:`, error)
    
    toast.error('Произошла ошибка. Попробуйте еще раз.', {
      duration: 4000
    })

    // В продакшене здесь была бы отправка в сервис аналитики
    // sendErrorToAnalytics({ error, context, timestamp: new Date().toISOString() })
  }

  return { handleError }
} 