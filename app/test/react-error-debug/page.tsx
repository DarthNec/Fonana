'use client'

import { useState, useEffect } from 'react'

export default function ReactErrorDebugPage() {
  const [error, setError] = useState<string | null>(null)
  const [stackTrace, setStackTrace] = useState<string | null>(null)

  useEffect(() => {
    // Перехватываем ошибки React
    const originalError = console.error
    console.error = (...args) => {
      const errorMessage = args.join(' ')
      if (errorMessage.includes('React error #185')) {
        setError(errorMessage)
        setStackTrace(new Error().stack || 'No stack trace available')
      }
      originalError.apply(console, args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  const triggerError = () => {
    try {
      // Попытка вызвать компонент, который может вызвать ошибку
      window.location.href = '/staging/profile'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStackTrace(err instanceof Error ? err.stack || 'No stack trace' : 'No stack trace')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">React Error #185 Debug</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Staging Environment</h2>
            <p className="text-slate-300 mb-4">
              Эта страница запущена в staging окружении с sourcemaps для отладки React Error #185.
            </p>
            
            <div className="space-y-4">
              <div>
                <strong>Environment:</strong> {process.env.NEXT_PUBLIC_NODE_ENV || 'production'}
              </div>
              <div>
                <strong>Build ID:</strong> {process.env.NEXT_PUBLIC_BUILD_ID || 'unknown'}
              </div>
              <div>
                <strong>Source Maps:</strong> {process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            <button
              onClick={triggerError}
              className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Trigger Error Test
            </button>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Error Information</h2>
            
            {error ? (
              <div className="space-y-4">
                <div>
                  <strong className="text-red-400">Error:</strong>
                  <pre className="mt-2 p-3 bg-slate-700 rounded text-sm overflow-x-auto">
                    {error}
                  </pre>
                </div>
                
                {stackTrace && (
                  <div>
                    <strong className="text-red-400">Stack Trace:</strong>
                    <pre className="mt-2 p-3 bg-slate-700 rounded text-sm overflow-x-auto">
                      {stackTrace}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400">No errors detected yet. Try navigating to different pages or triggering the error test.</p>
            )}
          </div>
        </div>

        <div className="mt-8 bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Debug Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/staging/profile"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-center transition-colors"
            >
              Profile Page
            </a>
            <a
              href="/staging/feed"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-center transition-colors"
            >
              Feed Page
            </a>
            <a
              href="/staging/creators"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-center transition-colors"
            >
              Creators Page
            </a>
            <a
              href="/staging/messages"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-center transition-colors"
            >
              Messages Page
            </a>
          </div>
        </div>

        <div className="mt-8 bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li>Откройте DevTools (F12)</li>
            <li>Перейдите на вкладку Console</li>
            <li>Нажмите на любую из ссылок выше</li>
            <li>Если появится React Error #185, теперь вы увидите читаемый stack trace</li>
            <li>Скопируйте полный stack trace для анализа</li>
          </ol>
        </div>
      </div>
    </div>
  )
} 