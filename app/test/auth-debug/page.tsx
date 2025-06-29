'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useUserContext } from '@/lib/contexts/UserContext'

export default function AuthDebugPage() {
  const { publicKey, connected, connect, disconnect, wallet } = useWallet()
  const { setVisible } = useWalletModal()
  const { user, isLoading, error, isNewUser, refreshUser } = useUserContext()
  const [logs, setLogs] = useState<string[]>([])
  const [testResult, setTestResult] = useState<any>(null)

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] [${type.toUpperCase()}] ${message}`, ...prev])
  }

  useEffect(() => {
    // Логируем состояние при загрузке
    addLog('Page loaded')
    addLog(`Wallet connected: ${connected}`)
    addLog(`Public key: ${publicKey?.toString() || 'null'}`)
    addLog(`User loaded: ${user ? 'yes' : 'no'}`)
    
    if (error) {
      addLog(`UserContext error: ${error.message}`, 'error')
    }
  }, [])

  useEffect(() => {
    if (connected && publicKey) {
      addLog(`Wallet connected: ${publicKey.toString().substring(0, 8)}...`)
    } else if (!connected) {
      addLog('Wallet disconnected')
    }
  }, [connected, publicKey])

  useEffect(() => {
    if (user) {
      addLog(`User loaded: ${user.nickname || user.wallet.substring(0, 8)}...`, 'success')
    }
  }, [user])

  useEffect(() => {
    if (error) {
      addLog(`UserContext error: ${error.message}`, 'error')
    }
  }, [error])

  const testDirectAPI = async () => {
    addLog('Testing direct API call...')
    
    try {
      // Test 1: GET без параметров
      addLog('Test 1: GET /api/user without params')
      const response1 = await fetch('/api/user')
      const data1 = await response1.json()
      addLog(`Response: ${response1.status} - ${JSON.stringify(data1)}`)
      
      // Test 2: GET с wallet
      if (publicKey) {
        addLog(`Test 2: GET /api/user?wallet=${publicKey.toString()}`)
        const response2 = await fetch(`/api/user?wallet=${publicKey.toString()}`)
        const data2 = await response2.json()
        addLog(`Response: ${response2.status} - ${JSON.stringify(data2)}`)
      }
      
      // Test 3: POST с wallet
      if (publicKey) {
        addLog(`Test 3: POST /api/user with wallet`)
        const response3 = await fetch('/api/user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ wallet: publicKey.toString() }),
        })
        const data3 = await response3.json()
        addLog(`Response: ${response3.status} - ${JSON.stringify(data3)}`, 'success')
        setTestResult(data3)
      }
      
    } catch (error: any) {
      addLog(`Test error: ${error.message}`, 'error')
    }
  }

  const checkLocalStorage = () => {
    addLog('Checking localStorage...')
    
    const items = [
      'fonana_user_data',
      'fonana_user_wallet',
      'fonana_user_timestamp',
      'fonana_referrer',
      'fonana_referrer_timestamp',
      'fonana_jwt_token'
    ]
    
    items.forEach(key => {
      const value = localStorage.getItem(key)
      if (value) {
        addLog(`${key}: ${value.substring(0, 50)}...`)
      } else {
        addLog(`${key}: null`)
      }
    })
  }

  const checkJWT = async () => {
    addLog('Checking JWT token...')
    
    const token = localStorage.getItem('fonana_jwt_token')
    if (!token) {
      addLog('No JWT token found', 'error')
      return
    }
    
    addLog(`JWT token: ${token.substring(0, 20)}...`)
    
    try {
      // Декодируем токен
      const parts = token.split('.')
      if (parts.length !== 3) {
        addLog('Invalid JWT format', 'error')
        return
      }
      
      const payload = JSON.parse(atob(parts[1]))
      addLog(`JWT payload: ${JSON.stringify(payload)}`)
      
      // Проверяем срок действия
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000)
        const now = new Date()
        if (expDate < now) {
          addLog('JWT token expired', 'error')
        } else {
          addLog(`JWT valid until: ${expDate.toLocaleString()}`, 'success')
        }
      }
    } catch (error: any) {
      addLog(`JWT decode error: ${error.message}`, 'error')
    }
  }

  const clearAllData = () => {
    addLog('Clearing all local data...')
    
    const items = [
      'fonana_user_data',
      'fonana_user_wallet',
      'fonana_user_timestamp',
      'fonana_referrer',
      'fonana_referrer_timestamp',
      'fonana_jwt_token'
    ]
    
    items.forEach(key => {
      localStorage.removeItem(key)
    })
    
    addLog('All data cleared', 'success')
    
    // Перезагрузка страницы через секунду
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Auth Debug Page</h1>
      
      {/* Status */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Current Status</h2>
        <div className="space-y-2">
          <div>Wallet Connected: <span className={connected ? 'text-green-500' : 'text-red-500'}>{connected ? 'Yes' : 'No'}</span></div>
          <div>Public Key: <span className="text-blue-400">{publicKey?.toString().substring(0, 20) || 'null'}...</span></div>
          <div>User Loaded: <span className={user ? 'text-green-500' : 'text-red-500'}>{user ? 'Yes' : 'No'}</span></div>
          <div>Is Loading: <span className={isLoading ? 'text-yellow-500' : 'text-gray-500'}>{isLoading ? 'Yes' : 'No'}</span></div>
          <div>Is New User: <span className={isNewUser ? 'text-yellow-500' : 'text-gray-500'}>{isNewUser ? 'Yes' : 'No'}</span></div>
          <div>Error: <span className="text-red-500">{error?.message || 'None'}</span></div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {!connected ? (
            <button
              onClick={() => setVisible(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Connect Wallet
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Disconnect Wallet
            </button>
          )}
          
          <button
            onClick={refreshUser}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
          >
            Refresh User
          </button>
          
          <button
            onClick={testDirectAPI}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
          >
            Test Direct API
          </button>
          
          <button
            onClick={checkLocalStorage}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
          >
            Check LocalStorage
          </button>
          
          <button
            onClick={checkJWT}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded"
          >
            Check JWT
          </button>
          
          <button
            onClick={clearAllData}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
          >
            Clear All Data
          </button>
        </div>
      </div>

      {/* User Data */}
      {user && (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-3">User Data</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-3">Test Result</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Logs */}
      <div className="bg-gray-900 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Logs</h2>
        <div className="h-96 overflow-y-auto font-mono text-sm">
          {logs.map((log, index) => {
            const color = log.includes('[ERROR]') ? 'text-red-500' : 
                         log.includes('[SUCCESS]') ? 'text-green-500' : 
                         'text-gray-400'
            return (
              <div key={index} className={color}>
                {log}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 