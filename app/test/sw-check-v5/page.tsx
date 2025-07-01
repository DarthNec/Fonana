'use client'

import { useState, useEffect } from 'react'

export default function ServiceWorkerCheckV5() {
  const [swStatus, setSwStatus] = useState('Checking...')
  const [swVersion, setSwVersion] = useState('Unknown')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [promptShown, setPromptShown] = useState(false)

  useEffect(() => {
    checkSWStatus()
    setupLogging()
    
    // Проверяем флаги
    const sessionFlag = sessionStorage.getItem('updatePromptShown')
    const tempFlag = localStorage.getItem('updatePromptShown')
    setPromptShown(!!(sessionFlag || tempFlag))
  }, [])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]) // Keep last 50 logs
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
          if (cacheNames.includes('fonana-v6')) {
            setSwVersion('v6 (latest)')
          } else if (cacheNames.includes('fonana-v5')) {
            setSwVersion('v5 (outdated)')
          } else if (cacheNames.includes('fonana-v4')) {
            setSwVersion('v4 (outdated)')
          } else if (cacheNames.includes('fonana-v3')) {
            setSwVersion('v3 (outdated)')
          } else if (cacheNames.includes('fonana-v2')) {
            setSwVersion('v2 (outdated)')
          } else if (cacheNames.includes('fonana-v1')) {
            setSwVersion('v1 (outdated)')
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
      if (args[0] && typeof args[0] === 'string' && (args[0].includes('[SW') || args[0].includes('[Force Update]') || args[0].includes('[SW Manager]'))) {
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
      localStorage.removeItem('updatePromptShown')
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

  const checkFlags = () => {
    const sessionFlag = sessionStorage.getItem('updatePromptShown')
    const tempFlag = localStorage.getItem('updatePromptShown')
    const tempFlagTime = tempFlag ? new Date(parseInt(tempFlag)).toLocaleString() : 'None'
    
    addLog(`Session flag: ${sessionFlag || 'None'}`)
    addLog(`Temporary flag: ${tempFlag ? tempFlagTime : 'None'}`)
    setPromptShown(!!(sessionFlag || tempFlag))
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Service Worker Check v6</h1>
        
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Status</h2>
            <div className="text-2xl font-bold text-purple-400">{swStatus}</div>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Version</h2>
            <div className="text-2xl font-bold text-blue-400">{swVersion}</div>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Update Available</h2>
            <div className={`text-2xl font-bold ${updateAvailable ? 'text-green-400' : 'text-gray-400'}`}>
              {updateAvailable ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={checkSWStatus}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Check Status
            </button>
            
            <button
              onClick={forceUpdateSW}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Check Updates
            </button>
            
            <button
              onClick={testUpdatePrompt}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Test Prompt
            </button>
            
            <button
              onClick={clearPromptFlags}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Clear Flags
            </button>
            
            <button
              onClick={checkFlags}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Check Flags
            </button>
            
            <button
              onClick={clearCaches}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Clear Caches
            </button>
            
            <button
              onClick={unregisterSW}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Unregister SW
            </button>
            
            <button
              onClick={reloadPage}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>

        {/* Debug Information */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="bg-slate-900 p-4 rounded font-mono text-sm space-y-2">
            <div>• SW Manager: {typeof window !== 'undefined' && (window as any).swManager ? 'Available' : 'Not available'}</div>
            <div>• Service Worker Support: {'serviceWorker' in navigator ? 'Yes' : 'No'}</div>
            <div>• Cache API Support: {'caches' in window ? 'Yes' : 'No'}</div>
            <div>• Session Storage: {typeof sessionStorage !== 'undefined' ? 'Available' : 'Not available'}</div>
            <div>• Prompt Flags Active: {promptShown ? 'Yes' : 'No'}</div>
            <div>• User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'Unknown'}</div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Service Worker Logs</h2>
          <div className="bg-slate-900 p-4 rounded font-mono text-sm max-h-60 overflow-y-auto">
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
        <div className="mt-8 bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• <strong>Check Status:</strong> Check current Service Worker status</p>
            <p>• <strong>Check Updates:</strong> Manually trigger update check</p>
            <p>• <strong>Test Prompt:</strong> Simulate update prompt (if waiting SW exists)</p>
            <p>• <strong>Clear Flags:</strong> Clear all prompt flags to test again</p>
            <p>• <strong>Check Flags:</strong> Show current flag status</p>
            <p>• <strong>Clear Caches:</strong> Clear all caches</p>
            <p>• <strong>Unregister SW:</strong> Remove Service Worker completely</p>
            <p>• <strong>Reload Page:</strong> Reload page to test fresh state</p>
          </div>
        </div>
      </div>
    </div>
  )
} 