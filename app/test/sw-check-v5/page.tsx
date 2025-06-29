'use client'

import { useEffect, useState } from 'react'

export default function ServiceWorkerCheckV5() {
  const [swVersion, setSwVersion] = useState<string>('Not detected')
  const [swStatus, setSwStatus] = useState<string>('Checking...')
  const [cacheNames, setCacheNames] = useState<string[]>([])
  const [testResults, setTestResults] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    checkServiceWorker()
  }, [])

  const checkServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        
        if (registration) {
          if (registration.active) {
            setSwStatus('Active')
            
            // Проверяем кеши
            const names = await caches.keys()
            setCacheNames(names)
            
            // Определяем версию по имени кеша
            const v5Cache = names.find(name => name.includes('v5') || name.includes('fonana-v5'))
            if (v5Cache) {
              setSwVersion('v5 ✅')
            } else {
              setSwVersion('Not v5 ❌')
            }
          } else if (registration.installing) {
            setSwStatus('Installing...')
          } else if (registration.waiting) {
            setSwStatus('Waiting to activate')
          }
        } else {
          setSwStatus('Not registered')
        }
      } catch (error) {
        setSwStatus('Error: ' + error)
      }
    } else {
      setSwStatus('Not supported')
    }
  }

  const testImagePath = async () => {
    try {
      const response = await fetch('/posts/images/test.png')
      setTestResults(prev => ({
        ...prev,
        '/posts/ path': response.ok ? '✅ Direct fetch (not cached by SW)' : '❌ Failed to fetch'
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        '/posts/ path': '❌ Error: ' + error
      }))
    }
  }

  const forceUpdateSW = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.update()
          setSwStatus('Update triggered, reloading...')
          setTimeout(() => window.location.reload(), 1000)
        }
      } catch (error) {
        console.error('SW update error:', error)
      }
    }
  }

  const unregisterSW = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.unregister()
          // Очищаем все кеши
          const names = await caches.keys()
          await Promise.all(names.map(name => caches.delete(name)))
          setSwStatus('Unregistered, reloading...')
          setTimeout(() => window.location.reload(), 1000)
        }
      } catch (error) {
        console.error('SW unregister error:', error)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Service Worker v5 Check
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Status
          </h2>
          <div className="space-y-2">
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Status:</span> {swStatus}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Version:</span> {swVersion}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Cache Names
          </h2>
          {cacheNames.length > 0 ? (
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
              {cacheNames.map((name, index) => (
                <li key={index} className={name.includes('v5') ? 'text-green-600' : ''}>
                  {name} {name.includes('v5') ? '✅' : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No caches found</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Path Tests
          </h2>
          <button
            onClick={testImagePath}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test /posts/ Path Exclusion
          </button>
          {Object.entries(testResults).map(([test, result]) => (
            <p key={test} className="text-gray-700 dark:text-gray-300 mb-2">
              <span className="font-medium">{test}:</span> {result}
            </p>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Actions
          </h2>
          <div className="space-x-4">
            <button
              onClick={forceUpdateSW}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Force Update SW
            </button>
            <button
              onClick={unregisterSW}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Unregister & Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 