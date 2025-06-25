'use client'

import { useState, useEffect } from 'react'

export default function BarePage() {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    try {
      setMounted(true)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  return (
    <html>
      <head>
        <title>Bare Test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 20, fontFamily: 'sans-serif' }}>
        <h1>Bare React Page</h1>
        <p>This page has NO providers, NO wallet adapter, NO layout</p>
        
        <div style={{ marginTop: 20, padding: 10, backgroundColor: mounted ? '#90EE90' : '#FFB6C1' }}>
          Status: {mounted ? '✅ React Mounted' : '⏳ Loading...'}
        </div>
        
        {error && (
          <div style={{ marginTop: 20, padding: 10, backgroundColor: '#FFB6C1', color: 'red' }}>
            Error: {error}
          </div>
        )}
        
        <div style={{ marginTop: 20, fontSize: 12, color: '#666' }}>
          <p>User Agent: {typeof window !== 'undefined' ? navigator.userAgent : 'SSR'}</p>
        </div>
      </body>
    </html>
  )
} 