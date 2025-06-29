'use client'

import { useState, useEffect } from 'react'

export default function ServiceWorkerTestPage() {
  const [status, setStatus] = useState('Checking...')
  const [caches, setCaches] = useState<string[]>([])
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  useEffect(() => {
    checkStatus()
    checkCaches()
  }, [])

  const checkStatus = async () => {
    if (!('serviceWorker' in navigator)) {
      setStatus('Service Worker not supported')
      return
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        if (registration.active) {
          setStatus('Active')
        } else if (registration.installing) {
          setStatus('Installing')
        } else if (registration.waiting) {
          setStatus('Waiting to activate')
        } else {
          setStatus('Registered but not active')
        }
      } else {
        setStatus('Not registered')
      }
    } catch (error) {
      setStatus('Error checking status')
      addLog(`Error: ${error}`)
    }
  }

  const checkCaches = async () => {
    if (!('caches' in window)) {
      return
    }

    try {
      const cacheNames = await caches.keys()
      setCaches(Array.from(cacheNames) as unknown as string[])
    } catch (error) {
      addLog(`Failed to get caches: ${error}`)
    }
  }

  const registerSW = async () => {
    try {
      addLog('Registering Service Worker...')
      const registration = await navigator.serviceWorker.register('/sw.js')
      addLog('Service Worker registered successfully')
      checkStatus()
    } catch (error) {
      addLog(`Registration failed: ${error}`)
    }
  }

  const unregisterSW = async () => {
    try {
      addLog('Unregistering Service Worker...')
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.unregister()
        addLog('Service Worker unregistered')
      } else {
        addLog('No Service Worker to unregister')
      }
      checkStatus()
    } catch (error) {
      addLog(`Unregister failed: ${error}`)
    }
  }

  const clearAllCaches = async () => {
    try {
      addLog('Clearing all caches...')
      const cacheNames = await caches.keys()
      const cacheNamesArray = Array.from(cacheNames) as unknown as string[]
      await Promise.all(
        cacheNamesArray.map((cacheName: string) => {
          addLog(`Deleting cache: ${cacheName}`)
          return window.caches.delete(cacheName)
        })
      )
      addLog('All caches cleared')
      checkCaches()
    } catch (error) {
      addLog(`Clear cache failed: ${error}`)
    }
  }

  const updateSW = async () => {
    try {
      addLog('Checking for updates...')
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        addLog('Update check completed')
        
        if (registration.waiting) {
          addLog('New version available!')
          if (confirm('New version available. Update now?')) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
        } else {
          addLog('Already on latest version')
        }
      } else {
        addLog('No Service Worker registered')
      }
    } catch (error) {
      addLog(`Update check failed: ${error}`)
    }
  }

  const testOffline = async () => {
    try {
      addLog('Testing offline functionality...')
      const response = await fetch('/fonanaLogo1.png')
      if (response.ok) {
        addLog('Resource loaded successfully')
        addLog(`From cache: ${response.headers.get('X-From-Cache') === 'true' ? 'Yes' : 'No'}`)
      } else {
        addLog(`Failed to load resource: ${response.status}`)
      }
    } catch (error) {
      addLog(`Fetch failed: ${error}`)
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Service Worker Test Page</h1>
        
        {/* Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Service Worker Status</h2>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Status:</span>
            <span className={`font-semibold ${
              status === 'Active' ? 'text-green-500' : 
              status === 'Not registered' ? 'text-red-500' : 
              'text-yellow-500'
            }`}>
              {status}
            </span>
          </div>
        </div>

        {/* Cache Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cache Storage</h2>
          {caches.length > 0 ? (
            <ul className="space-y-2">
              {caches.map((cache, index) => (
                <li key={index} className="text-gray-400">
                  • {cache}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No caches found</p>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={registerSW}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Register SW
            </button>
            <button
              onClick={unregisterSW}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Unregister SW
            </button>
            <button
              onClick={clearAllCaches}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
            >
              Clear All Caches
            </button>
            <button
              onClick={updateSW}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Check Updates
            </button>
            <button
              onClick={testOffline}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Test Offline
            </button>
            <button
              onClick={() => {
                checkStatus()
                checkCaches()
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </div>

        {/* Console Functions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Functions</h2>
          <p className="text-gray-400 mb-2">Run these in browser console:</p>
          <div className="bg-gray-900 p-4 rounded font-mono text-sm space-y-2">
            <div>• clearServiceWorkerCache() - Clear all caches</div>
            <div>• unregisterServiceWorker() - Unregister and clear</div>
            <div>• swManager.getStatus() - Get current status</div>
            <div>• swManager.checkForUpdates() - Check for updates</div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="bg-gray-900 p-4 rounded font-mono text-sm max-h-60 overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="text-gray-400">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500">No logs yet</div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-gray-400 text-sm">
          <h3 className="font-semibold mb-2">Troubleshooting:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>If you see "Failed to fetch" errors, click "Clear All Caches"</li>
            <li>Then click "Unregister SW"</li>
            <li>Refresh the page (Ctrl+F5)</li>
            <li>The Service Worker will re-register automatically</li>
          </ol>
        </div>
      </div>
    </div>
  )
} 