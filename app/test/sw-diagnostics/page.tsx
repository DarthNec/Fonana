'use client'

import { useState, useEffect } from 'react'

interface FetchLog {
  url: string
  handled: boolean
  error?: string
  timestamp: string
}

export default function ServiceWorkerDiagnosticsPage() {
  const [swState, setSwState] = useState<string>('checking')
  const [version, setVersion] = useState<string>('unknown')
  const [errors, setErrors] = useState<string[]>([])
  const [fetchLogs, setFetchLogs] = useState<FetchLog[]>([])
  const [cacheContents, setCacheContents] = useState<Record<string, string[]>>({})

  useEffect(() => {
    checkServiceWorker()
    setupErrorLogging()
    loadCacheContents()
  }, [])

  const checkServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      setSwState('not supported')
      return
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      
      if (!registration) {
        setSwState('not registered')
        return
      }

      if (registration.active) {
        setSwState('active')
        // Пытаемся определить версию по кешам
        const cacheNames = await caches.keys()
        if (cacheNames.includes('fonana-v3')) {
          setVersion('v3 (latest)')
        } else if (cacheNames.includes('fonana-v2')) {
          setVersion('v2 (outdated)')
        } else if (cacheNames.includes('fonana-v1')) {
          setVersion('v1 (outdated)')
        } else {
          setVersion('unknown')
        }
      } else if (registration.installing) {
        setSwState('installing')
      } else if (registration.waiting) {
        setSwState('waiting')
      } else {
        setSwState('registered but inactive')
      }
    } catch (error) {
      setSwState('error')
      setErrors(prev => [...prev, `SW check error: ${error}`])
    }
  }

  const setupErrorLogging = () => {
    // Перехватываем console.error для SW ошибок
    const originalError = console.error
    console.error = (...args) => {
      const errorStr = args.join(' ')
      if (errorStr.includes('[SW]') || errorStr.includes('Service Worker')) {
        setErrors(prev => [...prev, errorStr])
      }
      originalError.apply(console, args)
    }

    // Слушаем события ошибок SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('error', (event) => {
        setErrors(prev => [...prev, `SW Error Event: ${event}`])
      })
    }
  }

  const loadCacheContents = async () => {
    if (!('caches' in window)) return

    try {
      const cacheNames = await caches.keys()
      const contents: Record<string, string[]> = {}

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()
        contents[cacheName] = requests.map(req => req.url)
      }

      setCacheContents(contents)
    } catch (error) {
      setErrors(prev => [...prev, `Cache inspection error: ${error}`])
    }
  }

  const testFetch = async (url: string) => {
    const timestamp = new Date().toLocaleTimeString()
    
    try {
      const response = await fetch(url)
      const handled = response.headers.get('X-SW-Handled') === 'true'
      
      setFetchLogs(prev => [...prev, {
        url,
        handled,
        timestamp
      }])
    } catch (error) {
      setFetchLogs(prev => [...prev, {
        url,
        handled: false,
        error: String(error),
        timestamp
      }])
    }
  }

  const forceUpdate = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        alert('Update check completed. Check console for details.')
      }
    } catch (error) {
      alert(`Update failed: ${error}`)
    }
  }

  const clearAndReinstall = async () => {
    try {
      // Удаляем регистрацию
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.unregister()
      }
      
      // Очищаем все кеши
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      
      // Перезагружаем страницу для новой установки
      window.location.reload()
    } catch (error) {
      alert(`Clear and reinstall failed: ${error}`)
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Service Worker Diagnostics</h1>
        
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">SW State</h3>
            <p className={`text-lg font-bold ${
              swState === 'active' ? 'text-green-500' : 
              swState.includes('error') ? 'text-red-500' : 
              'text-yellow-500'
            }`}>
              {swState}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Version</h3>
            <p className={`text-lg font-bold ${
              version.includes('v3') ? 'text-green-500' : 'text-yellow-500'
            }`}>
              {version}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Errors</h3>
            <p className={`text-lg font-bold ${
              errors.length === 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {errors.length}
            </p>
          </div>
        </div>

        {/* Error Log */}
        {errors.length > 0 && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-red-400">Errors Detected</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {errors.map((error, index) => (
                <div key={index} className="text-sm font-mono text-red-300">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cache Contents */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Cache Contents</h2>
          {Object.entries(cacheContents).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(cacheContents).map(([cacheName, urls]) => (
                <div key={cacheName}>
                  <h3 className="font-semibold text-blue-400 mb-2">{cacheName}</h3>
                  <div className="text-sm text-gray-400 max-h-40 overflow-y-auto">
                    {urls.length === 0 ? (
                      <p>Empty cache</p>
                    ) : (
                      <ul className="space-y-1">
                        {urls.map((url, index) => (
                          <li key={index} className="truncate">
                            {new URL(url).pathname}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No caches found</p>
          )}
        </div>

        {/* Fetch Testing */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Fetch Testing</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => testFetch('/api/posts')}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Test API
            </button>
            <button
              onClick={() => testFetch('/feed')}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Test Page
            </button>
            <button
              onClick={() => testFetch('/fonanaLogo1.png')}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Test Image
            </button>
            <button
              onClick={() => testFetch('https://example.com/test')}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Test External
            </button>
          </div>
          
          {fetchLogs.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {fetchLogs.map((log, index) => (
                <div key={index} className={`text-sm p-2 rounded ${
                  log.error ? 'bg-red-900/20' : 
                  log.handled ? 'bg-green-900/20' : 'bg-yellow-900/20'
                }`}>
                  <span className="text-gray-400">{log.timestamp}</span> - 
                  <span className="font-mono mx-2">{log.url}</span>
                  <span className={log.handled ? 'text-green-400' : 'text-yellow-400'}>
                    {log.handled ? 'SW Handled' : 'Passed Through'}
                  </span>
                  {log.error && <span className="text-red-400 ml-2">Error: {log.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={checkServiceWorker}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
            >
              Refresh Status
            </button>
            <button
              onClick={loadCacheContents}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
            >
              Reload Caches
            </button>
            <button
              onClick={forceUpdate}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
            >
              Force Update
            </button>
            <button
              onClick={clearAndReinstall}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Clear & Reinstall
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-gray-400 text-sm">
          <h3 className="font-semibold mb-2">How to fix SW errors:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Clear & Reinstall" to remove old SW version</li>
            <li>Page will reload and install fresh SW v3</li>
            <li>Check that Version shows "v3 (latest)"</li>
            <li>Verify no errors appear in the error log</li>
          </ol>
        </div>
      </div>
    </div>
  )
} 