'use client'

import { useState, useEffect } from 'react'

export default function ServiceWorkerCheckV5() {
  const [swStatus, setSwStatus] = useState('Checking...')
  const [swVersion, setSwVersion] = useState('Unknown')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [promptShown, setPromptShown] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]) // Keep last 20 logs
  }

  useEffect(() => {
    checkSWStatus()
    setupLogging()
    checkPromptStatus()
  }, [])

  const checkPromptStatus = () => {
    // Проверяем флаги в sessionStorage
    const sessionFlag = sessionStorage.getItem('updatePromptShown')
    if (sessionFlag) {
      setPromptShown(true)
      addLog('Session prompt flag found in storage')
    }
  }

  const checkSWStatus = async () => {
    if (!('serviceWorker' in navigator)) {
      setSwStatus('Not supported')
      return
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        if (registration.active) {
          setSwStatus('Active')
          // Определяем версию по кешам
          const cacheNames = await caches.keys()
          if (cacheNames.includes('fonana-v9')) {
            setSwVersion('v9 (latest)')
          } else if (cacheNames.includes('fonana-v8')) {
            setSwVersion('v8 (outdated)')
          } else {
            setSwVersion('Unknown')
          }
        } else if (registration.installing) {
          setSwStatus('Installing')
        } else if (registration.waiting) {
          setSwStatus('Waiting to activate')
          setUpdateAvailable(true)
        } else {
          setSwStatus('Registered but not active')
        }
      } else {
        setSwStatus('Not registered')
      }
    } catch (error) {
      setSwStatus('Error')
      addLog(`Error checking status: ${error}`)
    }
  }

  const setupLogging = () => {
    // Перехватываем console.log для отображения в UI
    const originalLog = console.log
    console.log = (...args) => {
      originalLog.apply(console, args)
      if (args[0] && typeof args[0] === 'string' && (args[0].includes('[SW') || args[0].includes('[Force Update]'))) {
        addLog(args.join(' '))
      }
    }
  }

  const forceUpdateSW = async () => {
    if ('serviceWorker' in navigator) {
      try {
        addLog('Checking for updates...')
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.update()
          addLog('Update check completed')
          
          if (registration.waiting) {
            addLog('New version available!')
            setUpdateAvailable(true)
            setSwStatus('Update available')
          } else {
            addLog('Already on latest version')
            setUpdateAvailable(false)
          }
        }
      } catch (error) {
        addLog(`Update error: ${error}`)
      }
    }
  }

  const testUpdatePrompt = async () => {
    if ('serviceWorker' in navigator) {
      try {
        addLog('Testing update prompt...')
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration && registration.waiting) {
          addLog('Simulating update prompt...')
          // Симулируем показ уведомления об обновлении
          if (typeof window !== 'undefined' && (window as any).swManager) {
            (window as any).swManager.promptUpdate()
          } else {
            addLog('SW Manager not available')
          }
        } else {
          addLog('No waiting service worker found')
        }
      } catch (error) {
        addLog(`Test error: ${error}`)
      }
    }
  }

  const clearPromptFlags = () => {
    try {
      addLog('Clearing prompt flags...')
      sessionStorage.removeItem('updatePromptShown')
      setPromptShown(false)
      
      // Сбрасываем флаги в SW Manager если доступен
      if (typeof window !== 'undefined' && (window as any).swManager) {
        const swManager = (window as any).swManager
        swManager.updatePromptShown = false
        swManager.sessionPromptShown = false
        addLog('SW Manager flags cleared')
      }
      
      addLog('All prompt flags cleared')
    } catch (error) {
      addLog(`Clear flags error: ${error}`)
    }
  }

  const unregisterSW = async () => {
    if ('serviceWorker' in navigator) {
      try {
        addLog('Unregistering Service Worker...')
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.unregister()
          // Очищаем все кеши
          const names = await caches.keys()
          await Promise.all(names.map(name => caches.delete(name)))
          addLog('Service Worker unregistered and caches cleared')
          setSwStatus('Unregistered')
          setUpdateAvailable(false)
        }
      } catch (error) {
        addLog(`Unregister error: ${error}`)
      }
    }
  }

  const clearCaches = async () => {
    try {
      addLog('Clearing all caches...')
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      addLog(`Cleared ${cacheNames.length} caches`)
      checkSWStatus()
    } catch (error) {
      addLog(`Clear cache error: ${error}`)
    }
  }

  const reloadPage = () => {
    addLog('Reloading page...')
    window.location.reload()
  }

  return (
    <div className="min-h-screen p-4 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Service Worker Check v5 - Update Loop Fix</h1>
        
        {/* Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Service Worker Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-2 font-semibold ${
                swStatus === 'Active' ? 'text-green-500' : 
                swStatus === 'Update available' ? 'text-yellow-500' :
                swStatus === 'Not registered' ? 'text-red-500' : 
                'text-blue-500'
              }`}>
                {swStatus}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Version:</span>
              <span className="ml-2 font-semibold text-blue-400">{swVersion}</span>
            </div>
          </div>
          {updateAvailable && (
            <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-500/30 rounded">
              <span className="text-yellow-400">⚠️ Update available - waiting for user confirmation</span>
            </div>
          )}
          {promptShown && (
            <div className="mt-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded">
              <span className="text-blue-400">ℹ️ Update prompt already shown in this session</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={checkSWStatus}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Check Status
            </button>
            <button
              onClick={forceUpdateSW}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Check Updates
            </button>
            <button
              onClick={testUpdatePrompt}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
            >
              Test Update Prompt
            </button>
            <button
              onClick={clearPromptFlags}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Clear Prompt Flags
            </button>
            <button
              onClick={clearCaches}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
            >
              Clear Caches
            </button>
            <button
              onClick={unregisterSW}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Unregister SW
            </button>
            <button
              onClick={reloadPage}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="bg-gray-900 p-4 rounded font-mono text-sm space-y-2">
            <div>• SW Manager: {typeof window !== 'undefined' && (window as any).swManager ? 'Available' : 'Not available'}</div>
            <div>• Service Worker Support: {'serviceWorker' in navigator ? 'Yes' : 'No'}</div>
            <div>• Cache API Support: {'caches' in window ? 'Yes' : 'No'}</div>
            <div>• Session Storage: {typeof sessionStorage !== 'undefined' ? 'Available' : 'Not available'}</div>
            <div>• User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'Unknown'}</div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Service Worker Logs</h2>
          <div className="bg-gray-900 p-4 rounded font-mono text-sm max-h-60 overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="text-gray-400 mb-1">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500">No logs yet. Try checking for updates.</div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-gray-400 text-sm">
          <h3 className="font-semibold mb-2">Testing Update Loop Fix:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Check Updates" to trigger update check</li>
            <li>If update is available, click "Test Update Prompt"</li>
            <li>Confirm or decline the update dialog</li>
            <li>Verify that the prompt doesn't appear again immediately</li>
            <li>Use "Clear Prompt Flags" to reset if needed</li>
            <li>Check logs to see the update flow</li>
          </ol>
          
          <h3 className="font-semibold mb-2 mt-4">What's Fixed:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Added session-level prompt tracking</li>
            <li>Removed automatic skipWaiting() from SW installation</li>
            <li>Improved flag management in both SW Manager and Force Update</li>
            <li>Added delays and better state management</li>
            <li>Enhanced logging for debugging</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 