'use client'

import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>(['Page loaded'])
  
  const addLog = (msg: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    setLogs(prev => [...prev, `${timestamp}: ${msg}`])
  }

  useEffect(() => {
    addLog('useEffect mounted')
    
    // Test if JavaScript works
    try {
      addLog('JavaScript is working')
      
      // Test localStorage
      try {
        localStorage.setItem('test', 'value')
        addLog('localStorage works')
      } catch (e: any) {
        addLog(`localStorage error: ${e.message}`)
      }
      
      // Test fetch
      fetch('/api/pricing')
        .then(res => {
          addLog(`Fetch status: ${res.status}`)
          return res.json()
        })
        .then(data => {
          addLog(`API responded: SOL=$${data.rate}`)
        })
        .catch(err => {
          addLog(`Fetch error: ${err.message}`)
        })
        
    } catch (error: any) {
      addLog(`General error: ${error.message}`)
    }
  }, [])

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '20px', marginBottom: '10px' }}>Debug Page</h1>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '10px', 
        borderRadius: '5px',
        border: '1px solid #ccc'
      }}>
        {logs.map((log, i) => (
          <div key={i} style={{ 
            padding: '5px',
            borderBottom: i < logs.length - 1 ? '1px solid #eee' : 'none'
          }}>
            {log}
          </div>
        ))}
      </div>
      
      <button 
        onClick={() => addLog('Button clicked!')}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Test Click
      </button>
    </div>
  )
} 