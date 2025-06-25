'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    phantom?: any
  }
}

export default function MobileErrorPage() {
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  
  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${msg}`])
  }

  useEffect(() => {
    addLog('Page mounted')
    
    // Catch global errors
    const handleError = (event: ErrorEvent) => {
      const errorMsg = `Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`
      setError(errorMsg)
      addLog(errorMsg)
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMsg = `Unhandled Promise Rejection: ${event.reason}`
      setError(errorMsg)
      addLog(errorMsg)
    }
    
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    // Test wallet adapter availability
    try {
      addLog(`window.solana: ${!!window.solana}`)
      addLog(`window.phantom: ${!!window.phantom}`)
    } catch (e: any) {
      addLog(`Error checking wallets: ${e.message}`)
    }
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mobile Error Diagnostics</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error Caught:</strong> {error}
        </div>
      )}
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Logs:</h2>
        <pre className="text-xs overflow-auto">
          {logs.join('\n')}
        </pre>
      </div>
      
      <div className="mt-4 bg-blue-100 p-4 rounded">
        <h2 className="font-bold mb-2">Environment:</h2>
        <p>User Agent: {typeof window !== 'undefined' ? navigator.userAgent : 'SSR'}</p>
      </div>
    </div>
  )
} 