'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'

export default function WalletDebugPage() {
  const { wallets, select, wallet, connect, connecting, connected, publicKey } = useWallet()
  const { visible, setVisible } = useWalletModal()
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDirectPhantomConnect = async () => {
    try {
      console.log('Attempting direct Phantom connection...')
      setError(null)
      
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom')
      if (phantomWallet) {
        console.log('Found Phantom wallet:', phantomWallet)
        await select(phantomWallet.adapter.name)
        await connect()
      } else {
        throw new Error('Phantom wallet not found in wallets list')
      }
    } catch (err: any) {
      console.error('Direct Phantom connect error:', err)
      setError(err.message || 'Unknown error')
    }
  }

  const handleModalOpen = () => {
    console.log('Opening wallet modal...')
    setError(null)
    try {
      setVisible(true)
    } catch (err: any) {
      console.error('Modal open error:', err)
      setError(err.message || 'Unknown error')
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 pt-20">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet Debug</h1>
        
        {/* Connection Status */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
          <div className="space-y-2 text-sm">
            <p>Connected: <span className={connected ? 'text-green-500' : 'text-red-500'}>{connected ? 'Yes' : 'No'}</span></p>
            <p>Connecting: <span className={connecting ? 'text-yellow-500' : 'text-gray-500'}>{connecting ? 'Yes' : 'No'}</span></p>
            <p>Public Key: <span className="text-gray-600 dark:text-gray-400">{publicKey ? publicKey.toBase58().slice(0, 8) + '...' : 'None'}</span></p>
            <p>Selected Wallet: <span className="text-gray-600 dark:text-gray-400">{wallet?.adapter.name || 'None'}</span></p>
            <p>Modal Visible: <span className={visible ? 'text-green-500' : 'text-gray-500'}>{visible ? 'Yes' : 'No'}</span></p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Available Wallets */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Available Wallets</h2>
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <div key={wallet.adapter.name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded">
                <span className="text-sm font-medium">{wallet.adapter.name}</span>
                <span className="text-xs text-gray-500">
                  {wallet.readyState === 'Installed' ? '✅ Installed' : 
                   wallet.readyState === 'NotDetected' ? '❌ Not Detected' : 
                   wallet.readyState === 'Loadable' ? '⏳ Loadable' : 
                   wallet.readyState}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Environment</h2>
          <div className="space-y-2 text-sm">
            <p>User Agent: <span className="text-gray-600 dark:text-gray-400 text-xs break-all">{typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'}</span></p>
            <p>Has Phantom: <span className={typeof window !== 'undefined' && (window as any).solana?.isPhantom ? 'text-green-500' : 'text-red-500'}>
              {typeof window !== 'undefined' && (window as any).solana?.isPhantom ? 'Yes' : 'No'}
            </span></p>
            <p>Has Solana: <span className={typeof window !== 'undefined' && (window as any).solana ? 'text-green-500' : 'text-red-500'}>
              {typeof window !== 'undefined' && (window as any).solana ? 'Yes' : 'No'}
            </span></p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Actions</h2>
          <div className="space-y-3">
            <button
              onClick={handleModalOpen}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Open Wallet Modal
            </button>
            
            <button
              onClick={handleDirectPhantomConnect}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Direct Phantom Connect
            </button>
            
            {connected && (
              <button
                onClick={() => wallet?.adapter.disconnect()}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 