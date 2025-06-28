'use client'

import { useState } from 'react'

export default function TestNotificationsAPI() {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  
  const log = (message: string) => {
    setResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }
  
  const clearLog = () => {
    setResults([])
  }
  
  const testWithQueryParam = async () => {
    try {
      setLoading(true)
      log('Testing with query parameter...')
      
      const response = await fetch('/api/user/notifications?wallet=test123')
      const data = await response.json()
      
      log(`Response status: ${response.status}`)
      log(`Response data: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      log(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }
  
  const testWithHeader = async () => {
    try {
      setLoading(true)
      log('Testing with x-user-wallet header...')
      
      const response = await fetch('/api/user/notifications', {
        headers: {
          'x-user-wallet': 'test123'
        }
      })
      const data = await response.json()
      
      log(`Response status: ${response.status}`)
      log(`Response data: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      log(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }
  
  const testWithBothMethods = async () => {
    try {
      setLoading(true)
      log('Testing with both query and header...')
      
      const response = await fetch('/api/user/notifications?wallet=query123', {
        headers: {
          'x-user-wallet': 'header123'
        }
      })
      const data = await response.json()
      
      log(`Response status: ${response.status}`)
      log(`Response data: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      log(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }
  
  const testRealWallet = async () => {
    try {
      setLoading(true)
      const wallet = localStorage.getItem('fonana_user_wallet')
      
      if (!wallet) {
        log('No wallet found in localStorage')
        return
      }
      
      log(`Testing with real wallet: ${wallet}`)
      
      const response = await fetch('/api/user/notifications', {
        headers: {
          'x-user-wallet': wallet
        }
      })
      const data = await response.json()
      
      log(`Response status: ${response.status}`)
      log(`Response data: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      log(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Notification API Test</h1>
      
      <div className="space-y-4 mb-8">
        <div className="flex gap-4">
          <button
            onClick={testWithQueryParam}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
          >
            Test with Query Param
          </button>
          
          <button
            onClick={testWithHeader}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded disabled:opacity-50"
          >
            Test with Header
          </button>
          
          <button
            onClick={testWithBothMethods}
            disabled={loading}
            className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded disabled:opacity-50"
          >
            Test with Both
          </button>
          
          <button
            onClick={testRealWallet}
            disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded disabled:opacity-50"
          >
            Test with Real Wallet
          </button>
          
          <button
            onClick={clearLog}
            className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Clear Log
          </button>
        </div>
      </div>
      
      <div className="bg-gray-900 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Test Results:</h2>
        <div className="font-mono text-sm space-y-1">
          {results.length === 0 ? (
            <div className="text-gray-500">No tests run yet</div>
          ) : (
            results.map((result, index) => (
              <div key={index} className={
                result.includes('Error') ? 'text-red-400' : 
                result.includes('200') ? 'text-green-400' : 
                'text-gray-300'
              }>
                {result}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 