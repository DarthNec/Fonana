'use client'

import { useEffect, useState } from 'react'

export default function MobileDebugPage() {
  const [error, setError] = useState<string>('')
  const [info, setInfo] = useState<any>({})
  
  useEffect(() => {
    // Ловим любые ошибки
    window.onerror = (message, source, lineno, colno, error) => {
      setError(`${message} at ${source}:${lineno}:${colno}`)
      return true
    }
    
    window.addEventListener('unhandledrejection', (event) => {
      setError(`Unhandled promise rejection: ${event.reason}`)
    })
    
    // Собираем информацию о браузере
    setInfo({
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      crypto: typeof window.crypto !== 'undefined',
      solana: !!(window as any).solana,
      phantom: !!(window as any).phantom,
    })
  }, [])
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <h1 className="text-2xl font-bold mb-4">Mobile Debug Page</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-900 rounded">
          <h2 className="font-bold">Error:</h2>
          <pre className="text-xs">{error}</pre>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <h2 className="font-bold mb-2">Browser Info:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(info, null, 2)}
          </pre>
        </div>
        
        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded">
          <h2 className="font-bold mb-2">Test Results:</h2>
          <ul className="text-sm space-y-1">
            <li>✅ Page loaded</li>
            <li>✅ JavaScript working</li>
            <li>✅ React rendering</li>
            <li>{info.solana ? '✅' : '❌'} Solana wallet detected</li>
            <li>{info.online ? '✅' : '❌'} Internet connection</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 