'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { detectWalletEnvironment } from '@/lib/auth/solana'
import { HybridWalletConnect } from '@/components/HybridWalletConnect'

export default function AuthDebugPage() {
  const { connected, publicKey, wallet } = useWallet()
  const [environment, setEnvironment] = useState<any>(null)
  const [authStatus, setAuthStatus] = useState<any>(null)
  const [cookies, setCookies] = useState<string>('')
  const [localStorage, setLocalStorageData] = useState<any>({})

  useEffect(() => {
    // Определяем окружение
    const env = detectWalletEnvironment()
    setEnvironment({
      ...env,
      userAgent: navigator.userAgent,
      cookieEnabled: navigator.cookieEnabled,
      windowSolana: !!(window as any).solana,
      windowPhantom: !!(window as any).phantom,
      windowOpener: window.opener !== null
    })

    // Проверяем localStorage
    const storageData: any = {}
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.includes('fonana')) {
        storageData[key] = window.localStorage.getItem(key)
      }
    }
    setLocalStorageData(storageData)

    // Проверяем cookies (через document.cookie)
    setCookies(document.cookie)
  }, [])

  // Проверяем статус авторизации
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/wallet')
      const data = await response.json()
      setAuthStatus({
        ...data,
        timestamp: new Date().toISOString(),
        headers: {
          'Content-Type': response.headers.get('Content-Type'),
          'Set-Cookie': response.headers.get('Set-Cookie')
        }
      })
    } catch (error: any) {
      setAuthStatus({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }

  useEffect(() => {
    checkAuthStatus()
    const interval = setInterval(checkAuthStatus, 5000) // Проверяем каждые 5 секунд
    return () => clearInterval(interval)
  }, [])

  // Тест создания JWT
  const testJWT = async () => {
    try {
      const response = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          signature: 'invalid-signature',
          publicKey: 'test-public-key'
        })
      })
      const data = await response.json()
      console.log('JWT Test Response:', data)
      alert(`JWT Test: ${JSON.stringify(data, null, 2)}`)
    } catch (error: any) {
      console.error('JWT Test Error:', error)
      alert(`JWT Test Error: ${error.message}`)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🔍 Auth Debug Dashboard</h1>
      
      {/* Wallet Connection */}
      <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
        <HybridWalletConnect />
        <div className="mt-4 space-y-2 text-sm">
          <p>Connected: <span className="font-mono">{connected ? '✅ Yes' : '❌ No'}</span></p>
          <p>Wallet: <span className="font-mono">{wallet?.adapter.name || 'None'}</span></p>
          <p>Public Key: <span className="font-mono">{publicKey?.toString() || 'None'}</span></p>
        </div>
      </div>

      {/* Environment Info */}
      <div className="mb-8 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Environment Detection</h2>
        {environment && (
          <div className="space-y-2 text-sm">
            <p>Is Mobile: <span className="font-mono">{environment.isMobile ? '✅' : '❌'}</span></p>
            <p>Is In Wallet Browser: <span className="font-mono">{environment.isInWalletBrowser ? '✅' : '❌'}</span></p>
            <p>Is Phantom: <span className="font-mono">{environment.isPhantom ? '✅' : '❌'}</span></p>
            <p>Cookies Enabled: <span className="font-mono">{environment.cookieEnabled ? '✅' : '❌'}</span></p>
            <p>Window.solana: <span className="font-mono">{environment.windowSolana ? '✅' : '❌'}</span></p>
            <p>Window.phantom: <span className="font-mono">{environment.windowPhantom ? '✅' : '❌'}</span></p>
            <p>Window.opener: <span className="font-mono">{environment.windowOpener ? '✅' : '❌'}</span></p>
            <details className="mt-2">
              <summary className="cursor-pointer">User Agent</summary>
              <p className="font-mono text-xs mt-2 break-all">{environment.userAgent}</p>
            </details>
          </div>
        )}
      </div>

      {/* Auth Status */}
      <div className="mb-8 p-4 bg-green-100 dark:bg-green-900 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Auth Status</h2>
        {authStatus && (
          <div className="space-y-2 text-sm">
            <p>Authenticated: <span className="font-mono">{authStatus.authenticated ? '✅' : '❌'}</span></p>
            <p>Last Check: <span className="font-mono">{authStatus.timestamp}</span></p>
            {authStatus.user && (
              <details className="mt-2">
                <summary className="cursor-pointer">User Data</summary>
                <pre className="font-mono text-xs mt-2 overflow-auto">
                  {JSON.stringify(authStatus.user, null, 2)}
                </pre>
              </details>
            )}
            {authStatus.error && (
              <p className="text-red-600">Error: <span className="font-mono">{authStatus.error}</span></p>
            )}
          </div>
        )}
      </div>

      {/* Storage Info */}
      <div className="mb-8 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Storage</h2>
        
        <h3 className="font-semibold mt-4">LocalStorage (fonana keys):</h3>
        {Object.keys(localStorage).length > 0 ? (
          <pre className="font-mono text-xs mt-2 overflow-auto bg-black/10 p-2 rounded">
            {JSON.stringify(localStorage, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-gray-600">No fonana keys in localStorage</p>
        )}

        <h3 className="font-semibold mt-4">Cookies:</h3>
        <p className="font-mono text-xs mt-2 break-all bg-black/10 p-2 rounded">
          {cookies || 'No cookies accessible via JavaScript'}
        </p>
      </div>

      {/* Actions */}
      <div className="mb-8 p-4 bg-purple-100 dark:bg-purple-900 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Debug Actions</h2>
        <div className="space-x-4">
          <button
            onClick={checkAuthStatus}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Refresh Auth Status
          </button>
          <button
            onClick={testJWT}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
          >
            Test Invalid JWT
          </button>
          <button
            onClick={() => {
              console.log('Full Debug Info:', {
                environment,
                authStatus,
                localStorage,
                cookies,
                wallet: {
                  connected,
                  publicKey: publicKey?.toString(),
                  adapter: wallet?.adapter.name
                }
              })
              alert('Check console for full debug info')
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            Log Full Debug Info
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">🐛 Debugging Steps</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Check if environment is detected correctly (not showing "In Wallet Browser" in regular browser)</li>
          <li>Try connecting wallet and watch console logs</li>
          <li>Check if auth status updates after connection</li>
          <li>Verify localStorage has JWT token after auth</li>
          <li>Check if cookies are enabled and accessible</li>
          <li>Use "Log Full Debug Info" and check browser console</li>
        </ol>
      </div>
    </div>
  )
} 