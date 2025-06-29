'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { getJWTToken, jwtManager } from '@/lib/utils/jwt'
import { wsService } from '@/lib/services/websocket'

export default function JWTDebugPage() {
  const { publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [logs, setLogs] = useState<string[]>([])
  const [jwtToken, setJwtToken] = useState<string | null>(null)
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [testResult, setTestResult] = useState<any>(null)

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] [${type.toUpperCase()}] ${message}`, ...prev])
  }

  // Monitor WebSocket status
  useEffect(() => {
    const handleConnected = () => {
      setWsStatus('connected')
      addLog('WebSocket connected', 'success')
    }

    const handleDisconnected = () => {
      setWsStatus('disconnected')
      addLog('WebSocket disconnected', 'error')
    }

    wsService.on('connected', handleConnected)
    wsService.on('disconnected', handleDisconnected)

    // Check initial status
    if (wsService.isConnected()) {
      setWsStatus('connected')
    }

    return () => {
      wsService.off('connected', handleConnected)
      wsService.off('disconnected', handleDisconnected)
    }
  }, [])

  const testJWTFlow = async () => {
    addLog('Starting JWT flow test...')
    
    try {
      // Step 1: Get JWT token
      addLog('Step 1: Getting JWT token...')
      const token = await getJWTToken()
      
      if (!token) {
        addLog('Failed to get JWT token', 'error')
        return
      }
      
      setJwtToken(token)
      addLog(`JWT token obtained: ${token.substring(0, 20)}...`, 'success')
      
      // Step 2: Check JWT stats
      const stats = jwtManager.getStats()
      addLog(`JWT stats: authenticated=${stats.isAuthenticated}, userId=${stats.userId}`)
      
      // Step 3: Test API with JWT
      addLog('Step 3: Testing API with JWT...')
      const apiResponse = await fetch('/api/auth/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (apiResponse.ok) {
        const data = await apiResponse.json()
        addLog('API authentication successful', 'success')
        addLog(`User ID: ${data.userId}, Wallet: ${data.wallet}`)
      } else {
        addLog(`API authentication failed: ${apiResponse.status}`, 'error')
      }
      
      // Step 4: Test WebSocket reconnection
      addLog('Step 4: Testing WebSocket reconnection...')
      wsService.disconnect()
      
      setTimeout(() => {
        wsService.connect()
        addLog('WebSocket reconnection initiated')
      }, 1000)
      
    } catch (error: any) {
      addLog(`Error: ${error.message}`, 'error')
    }
  }

  const testAuthAPI = async () => {
    addLog('Testing /api/auth/wallet endpoint...')
    
    if (!publicKey) {
      addLog('No wallet connected', 'error')
      return
    }
    
    try {
      const response = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallet: publicKey.toString()
        })
      })
      
      addLog(`Response status: ${response.status}`)
      
      const data = await response.json()
      setTestResult(data)
      
      if (data.token) {
        addLog('Token received successfully', 'success')
        addLog(`Token format: ${typeof data.token}`)
        addLog(`Token length: ${data.token.length}`)
        addLog(`User ID: ${data.user?.id}`)
      } else {
        addLog('No token in response', 'error')
      }
      
    } catch (error: any) {
      addLog(`Error calling API: ${error.message}`, 'error')
      setTestResult({ error: error.message })
    }
  }

  const clearLocalStorage = () => {
    localStorage.removeItem('fonana_jwt_token')
    localStorage.removeItem('fonana_user_wallet')
    localStorage.removeItem('fonana_user_cache')
    addLog('Cleared localStorage', 'info')
    setJwtToken(null)
    jwtManager.logout()
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">JWT & WebSocket Debug</h1>
      
      {/* Status Panel */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Current Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Wallet:</span>{' '}
            <span className={connected ? 'text-green-400' : 'text-red-400'}>
              {connected ? publicKey?.toString().substring(0, 8) + '...' : 'Not connected'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">WebSocket:</span>{' '}
            <span className={wsStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>
              {wsStatus}
            </span>
          </div>
          <div>
            <span className="text-gray-400">JWT Token:</span>{' '}
            <span className={jwtToken ? 'text-green-400' : 'text-yellow-400'}>
              {jwtToken ? 'Present' : 'Not loaded'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">JWT Authenticated:</span>{' '}
            <span className={jwtManager.isAuthenticated() ? 'text-green-400' : 'text-red-400'}>
              {jwtManager.isAuthenticated() ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {!connected ? (
            <button
              onClick={() => setVisible(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
          ) : (
            <>
              <button
                onClick={testAuthAPI}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Test Auth API
              </button>
              <button
                onClick={testJWTFlow}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Test Full JWT Flow
              </button>
              <button
                onClick={clearLocalStorage}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Clear LocalStorage
              </button>
            </>
          )}
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">API Response</h2>
          <pre className="text-xs overflow-auto bg-gray-900 p-3 rounded">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Logs */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Logs</h2>
          <button
            onClick={() => setLogs([])}
            className="text-sm text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
        <div className="bg-gray-900 rounded p-3 h-64 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div 
                key={index} 
                className={
                  log.includes('[ERROR]') ? 'text-red-400' :
                  log.includes('[SUCCESS]') ? 'text-green-400' :
                  'text-gray-300'
                }
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* WebSocket Stats */}
      <div className="bg-gray-800 rounded-lg p-4 mt-6">
        <h2 className="text-xl font-semibold mb-3">WebSocket Stats</h2>
        <pre className="text-xs overflow-auto bg-gray-900 p-3 rounded">
          {JSON.stringify(wsService.getStats(), null, 2)}
        </pre>
      </div>
    </div>
  )
} 