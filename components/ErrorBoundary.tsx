'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 p-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-red-900 mb-4">
              Something went wrong
            </h1>
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Error:</h2>
              <pre className="text-sm text-red-600 whitespace-pre-wrap">
                {this.state.error?.toString()}
              </pre>
              {this.state.errorInfo && (
                <>
                  <h2 className="text-lg font-semibold mt-4 mb-2">Stack:</h2>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-96">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
} 